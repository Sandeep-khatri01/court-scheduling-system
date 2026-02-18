const OpenAI = require('openai');
const db = require('../database');
const { v4: uuidv4 } = require('uuid');

const openai = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

// ─── Law Retrieval (Simple RAG) ───
function retrieveRelevantLaws(query) {
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/).filter(w => w.length > 2);

    // Build a dynamic search across keywords, title, description
    let allLaws = db.prepare('SELECT * FROM laws').all();

    const scored = allLaws.map(law => {
        let score = 0;
        const searchable = `${law.title} ${law.description} ${law.keywords} ${law.section} ${law.act_name} ${law.penalty}`.toLowerCase();
        for (const word of words) {
            if (searchable.includes(word)) score += 1;
        }
        // Boost exact section matches
        if (law.section && queryLower.includes(law.section.toLowerCase())) score += 5;
        if (law.act_name && queryLower.includes(law.act_name.toLowerCase())) score += 3;
        return { ...law, relevance_score: score };
    });

    return scored
        .filter(l => l.relevance_score > 0)
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, 5);
}

// ─── Scheduling Suggestion AI ───
async function getSchedulingSuggestion(caseData) {
    const prompt = `You are an AI court scheduling assistant for Indian courts.
Analyze this case and suggest optimal hearing schedule:

Case: ${caseData.title}
Type: ${caseData.case_type}
Priority Score: ${caseData.priority_score}/100
Urgency: ${caseData.urgency}
Adjournments So Far: ${caseData.adjournment_count}
Last Adjournment Reason: ${caseData.last_adjournment_reason || 'None'}
Filing Date: ${caseData.filing_date}
Current Status: ${caseData.status}

Based on Indian court scheduling best practices, provide:
1. Suggested number of days until next hearing
2. Recommended hearing duration in minutes
3. Priority reasoning
4. Risk assessment of further delays

Return STRICT JSON format:
{
    "suggested_days_range": "7-14 days",
    "hearing_duration_minutes": 45,
    "confidence_score": 85,
    "scheduling_reasoning": "explanation",
    "delay_risk": "Low|Medium|High",
    "recommendations": ["rec1", "rec2"]
}`;

    return await callAI(prompt, 'SCHEDULE_SUGGESTION', 'json');
}

// ─── Priority Analysis AI ───
async function analyzeCasePriority(caseData) {
    const prompt = `You are a court case prioritization AI for Indian judiciary.
Analyze this case and assign a priority score:

Case: ${caseData.title}
Type: ${caseData.case_type}
Filing Date: ${caseData.filing_date}
Adjournments: ${caseData.adjournment_count}
Last Adjournment: ${caseData.last_adjournment_reason || 'None'}
Current Urgency: ${caseData.urgency}

Consider: case age, number of adjournments, case type severity, impact on parties.

Return STRICT JSON:
{
    "priority_score": number(0-100),
    "priority_level": "Low|Medium|High|Critical",
    "delay_risk": "Low|Medium|High",
    "reasoning": "short explanation",
    "recommendations": ["rec1", "rec2"]
}`;

    return await callAI(prompt, 'PRIORITY_ANALYSIS', 'json');
}

// ─── Chatbot Query Handler ───
async function handleChatQuery(message, userId) {
    // Step 1: Retrieve relevant laws
    const relevantLaws = retrieveRelevantLaws(message);

    let context = '';
    if (relevantLaws.length > 0) {
        context = relevantLaws.map(l =>
            `[${l.act_name} - ${l.section}] ${l.title}: ${l.description} | Penalty: ${l.penalty} | Bailable: ${l.is_bailable ? 'Yes' : 'No'}`
        ).join('\n\n');
    }

    const systemPrompt = `You are "LawBot", an AI legal assistant for Indian courts.

IMPORTANT RULES:
- ONLY answer based on the provided LEGAL CONTEXT below
- If the context does not contain relevant information, say: "I don't have specific information about this in my database. Please consult a qualified lawyer."
- NEVER invent or fabricate any law, section, or penalty
- Always include relevant section numbers in your answer
- Add a disclaimer at the end: "⚖️ Disclaimer: This is AI-generated information for awareness only. Please consult a licensed advocate for legal advice."
- Be concise, clear, and use simple language
- Format your response with proper structure using bullet points

LEGAL CONTEXT FROM DATABASE:
${context || 'No specific laws found matching this query.'}`;

    const prompt = `${systemPrompt}\n\nUser Question: ${message}`;

    const result = await callAI(prompt, 'CHAT_QUERY', 'text', userId);

    return {
        reply: result.text || result,
        sources: relevantLaws.map(l => ({ act: l.act_name, section: l.section, title: l.title })),
    };
}

// ─── Core AI Caller with Fallback ───
async function callAI(prompt, actionType, responseFormat = 'json', userId = null) {
    const startTime = Date.now();

    if (!openai) {
        console.log('[AI] OpenAI not configured. Returning fallback.');
        return getFallback(actionType);
    }

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1000,
            temperature: 0.3,
        });

        const text = completion.choices[0].message.content;
        const tokens = completion.usage?.total_tokens || 0;
        const latency = Date.now() - startTime;

        // Audit log
        try {
            db.prepare('INSERT INTO ai_audit_logs (id, user_id, action_type, prompt_summary, ai_response, tokens_used, latency_ms) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                uuidv4(), userId, actionType, prompt.substring(0, 200), text.substring(0, 500), tokens, latency
            );
        } catch (e) { /* audit log failure should not break flow */ }

        if (responseFormat === 'json') {
            const cleaned = text.replace(/```json|```/g, '').trim();
            return JSON.parse(cleaned);
        }
        return { text };

    } catch (error) {
        console.error('[AI Error]', error.message);
        return getFallback(actionType);
    }
}

// ─── Fallback Responses ───
function getFallback(type) {
    const fallbacks = {
        'SCHEDULE_SUGGESTION': {
            suggested_days_range: '14-21 days',
            hearing_duration_minutes: 30,
            confidence_score: 50,
            scheduling_reasoning: 'AI service unavailable. Default suggestion based on standard court procedures.',
            delay_risk: 'Medium',
            recommendations: ['Review case manually', 'Check judge availability']
        },
        'PRIORITY_ANALYSIS': {
            priority_score: 50,
            priority_level: 'Medium',
            delay_risk: 'Medium',
            reasoning: 'AI service unavailable. Default priority assigned.',
            recommendations: ['Manual review recommended']
        },
        'CHAT_QUERY': {
            text: 'I apologize, but the AI service is currently unavailable. Please try again later or consult with the court clerk for assistance.\n\n⚖️ Disclaimer: This is an automated fallback response.'
        }
    };
    return fallbacks[type] || { error: 'AI service unavailable' };
}

module.exports = {
    retrieveRelevantLaws,
    getSchedulingSuggestion,
    analyzeCasePriority,
    handleChatQuery,
};
