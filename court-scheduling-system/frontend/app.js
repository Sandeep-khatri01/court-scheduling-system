/* ═══════════════════════════════════════════════════════
   LawTrack — Frontend Application Logic
   AI Court Case Scheduling System
   ═══════════════════════════════════════════════════════ */

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `http://localhost:3000/api`
    : `/api`;

// ─── State ───
let currentPage = 'dashboard';
let casesData = [];
let statsData = {};

// ─── Initialization ───
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    loadAllLaws();
    // Restore theme
    const saved = localStorage.getItem('theme');
    if (saved === 'light') toggleTheme();
});

// ─── API Helper ───
async function api(endpoint, options = {}) {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options,
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
        }
        return await res.json();
    } catch (err) {
        console.error(`[API] ${endpoint}:`, err);
        throw err;
    }
}

// ═══════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════
function showPage(pageName) {
    currentPage = pageName;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const page = document.getElementById(`page-${pageName}`);
    const nav = document.querySelector(`.nav-item[data-page="${pageName}"]`);
    if (page) page.classList.add('active');
    if (nav) nav.classList.add('active');

    const titles = {
        dashboard: ['Dashboard', 'Overview & Analytics'],
        cases: ['Cases', 'Case Management'],
        scheduling: ['Scheduling', 'AI Scheduling Assistant'],
        laws: ['Law Database', 'Legal Knowledge Base'],
    };
    const [title, subtitle] = titles[pageName] || ['', ''];
    document.getElementById('page-title').textContent = title;
    document.getElementById('page-subtitle').textContent = subtitle;

    // Load page-specific data
    if (pageName === 'dashboard') loadDashboard();
    if (pageName === 'cases') loadCases();
    if (pageName === 'scheduling') loadSchedulingPage();
    if (pageName === 'laws') loadAllLaws();

    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    document.getElementById('theme-icon-moon').classList.toggle('hidden');
    document.getElementById('theme-icon-sun').classList.toggle('hidden');
}

// ═══════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════
async function loadDashboard() {
    try {
        statsData = await api('/cases/stats');
        renderStats(statsData);
        renderCharts(statsData);
        // Load recent high-priority cases
        const { cases } = await api('/cases?limit=5');
        renderRecentCases(cases);
    } catch (err) {
        console.error('Dashboard load failed:', err);
    }
}

function renderStats(stats) {
    animateNumber('stat-total-cases', stats.totalCases);
    animateNumber('stat-pending', stats.pendingCases);
    animateNumber('stat-high-priority', stats.highPriorityCases);
    animateNumber('stat-hearings', stats.upcomingHearings);
}

function animateNumber(elementId, target) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const duration = 1000;
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        el.textContent = Math.round(start + (target - start) * eased);
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

function renderCharts(stats) {
    renderBarChart('chart-type', stats.byType, [
        '#6366f1', '#22d3ee', '#f59e0b', '#f43f5e', '#10b981', '#a78bfa', '#fb923c', '#38bdf8'
    ]);
    renderBarChart('chart-status', stats.byStatus, [
        '#f59e0b', '#6366f1', '#22d3ee', '#f43f5e', '#64748b', '#10b981'
    ]);
    renderBarChart('chart-urgency', stats.byUrgency, [
        '#10b981', '#6366f1', '#f59e0b', '#f43f5e'
    ]);
}

function renderBarChart(containerId, data, colors) {
    const container = document.getElementById(containerId);
    if (!container || !data || data.length === 0) return;
    container.innerHTML = '';

    const maxVal = Math.max(...data.map(d => d.count), 1);

    data.forEach((item, i) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'chart-bar-wrapper';

        const valEl = document.createElement('div');
        valEl.className = 'chart-bar-value';
        valEl.textContent = item.count;

        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.background = `linear-gradient(180deg, ${colors[i % colors.length]}, ${colors[i % colors.length]}88)`;
        bar.style.height = '0px';
        bar.title = `${item.case_type || item.status || item.urgency}: ${item.count}`;

        const label = document.createElement('div');
        label.className = 'chart-bar-label';
        label.textContent = item.case_type || item.status || item.urgency || '';

        wrapper.appendChild(valEl);
        wrapper.appendChild(bar);
        wrapper.appendChild(label);
        container.appendChild(wrapper);

        // Animate bar height
        requestAnimationFrame(() => {
            setTimeout(() => {
                bar.style.height = `${(item.count / maxVal) * 180}px`;
            }, i * 80);
        });
    });
}

function renderRecentCases(cases) {
    const list = document.getElementById('recent-cases-list');
    if (!list) return;
    list.innerHTML = cases.map(c => `
        <div class="recent-item">
            <div>
                <div class="recent-item-title">${escapeHtml(c.title)}</div>
                <div class="recent-item-meta">${c.case_number} • ${c.case_type}</div>
            </div>
            <div style="text-align:right">
                ${priorityBadge(c.urgency)}
                <div class="priority-bar-wrap" style="margin-top:4px">
                    <div class="priority-bar">
                        <div class="priority-bar-fill ${priorityClass(c.priority_score)}" style="width:${c.priority_score}%"></div>
                    </div>
                    <span style="font-size:0.7rem;color:var(--text-muted)">${c.priority_score}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// ═══════════════════════════════════════════════════════
// CASES PAGE
// ═══════════════════════════════════════════════════════
async function loadCases() {
    try {
        const status = document.getElementById('filter-status')?.value || '';
        const type = document.getElementById('filter-type')?.value || '';
        const urgency = document.getElementById('filter-urgency')?.value || '';

        const params = new URLSearchParams();
        if (status) params.set('status', status);
        if (type) params.set('type', type);
        if (urgency) params.set('urgency', urgency);

        const data = await api(`/cases?${params.toString()}`);
        casesData = data.cases;
        renderCasesTable(casesData);
    } catch (err) {
        console.error('Cases load failed:', err);
    }
}

function renderCasesTable(cases) {
    const tbody = document.getElementById('cases-tbody');
    if (!tbody) return;

    tbody.innerHTML = cases.map(c => `
        <tr>
            <td style="font-weight:600;font-size:0.8rem;color:var(--accent-cyan)">${escapeHtml(c.case_number)}</td>
            <td>
                <div style="font-weight:600">${escapeHtml(c.title)}</div>
                <div style="font-size:0.7rem;color:var(--text-muted)">${c.petitioner_name || ''} vs ${c.respondent_name || ''}</div>
            </td>
            <td><span class="badge badge-medium">${c.case_type}</span></td>
            <td>${statusBadge(c.status)}</td>
            <td>
                <div class="priority-bar-wrap">
                    <div class="priority-bar">
                        <div class="priority-bar-fill ${priorityClass(c.priority_score)}" style="width:${c.priority_score}%"></div>
                    </div>
                    <span style="font-size:0.75rem;font-weight:600">${c.priority_score}</span>
                </div>
            </td>
            <td style="font-size:0.8rem">${c.judge_name || '—'}</td>
            <td style="font-size:0.8rem;color:var(--text-muted)">${c.filing_date}</td>
            <td>
                <div style="display:flex;gap:4px">
                    <button class="btn-icon" onclick="analyzePriority('${c.id}')" title="AI Priority Analysis">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function analyzePriority(caseId) {
    const btn = event.currentTarget;
    btn.innerHTML = '<div class="spinner"></div>';
    btn.disabled = true;
    try {
        const result = await api(`/cases/${caseId}/analyze-priority`, { method: 'POST' });
        alert(`AI Priority Analysis:\n\nScore: ${result.priority_score}/100\nLevel: ${result.priority_level}\nDelay Risk: ${result.delay_risk}\n\n${result.reasoning}`);
        loadCases();
    } catch (err) {
        alert('Priority analysis failed: ' + err.message);
    } finally {
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>';
        btn.disabled = false;
    }
}

// ═══════════════════════════════════════════════════════
// NEW CASE MODAL
// ═══════════════════════════════════════════════════════
function openNewCaseModal() {
    document.getElementById('new-case-modal').classList.remove('hidden');
}
function closeNewCaseModal() {
    document.getElementById('new-case-modal').classList.add('hidden');
    document.getElementById('new-case-form').reset();
}

async function submitNewCase(e) {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
        await api('/cases', { method: 'POST', body: JSON.stringify(data) });
        closeNewCaseModal();
        loadCases();
        loadDashboard();
    } catch (err) {
        alert('Failed to create case: ' + err.message);
    }
}

// ═══════════════════════════════════════════════════════
// SCHEDULING PAGE
// ═══════════════════════════════════════════════════════
async function loadSchedulingPage() {
    try {
        // Populate case dropdown
        const { cases } = await api('/cases');
        const select = document.getElementById('schedule-case-select');
        select.innerHTML = '<option value="">— Select a Case —</option>';
        cases.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.case_number} — ${escapeHtml(c.title)}</option>`;
        });

        // Load upcoming hearings
        const hearings = await api('/schedule/hearings');
        renderHearingsList(hearings);
    } catch (err) {
        console.error('Scheduling page load failed:', err);
    }
}

function onScheduleCaseSelect() {
    const caseId = document.getElementById('schedule-case-select').value;
    const detailsEl = document.getElementById('schedule-case-details');
    const btn = document.getElementById('btn-get-suggestion');
    document.getElementById('ai-suggestion-result').classList.add('hidden');

    if (!caseId) {
        detailsEl.classList.add('hidden');
        btn.disabled = true;
        return;
    }

    const c = casesData.find(x => x.id === caseId);
    if (c) {
        detailsEl.classList.remove('hidden');
        detailsEl.innerHTML = `
            <div class="label">Case</div>
            <div class="value">${escapeHtml(c.title)}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
                <div><div class="label">Type</div><div class="value">${c.case_type}</div></div>
                <div><div class="label">Urgency</div><div class="value">${priorityBadge(c.urgency)}</div></div>
                <div><div class="label">Priority</div><div class="value">${c.priority_score}/100</div></div>
                <div><div class="label">Adjournments</div><div class="value">${c.adjournment_count}</div></div>
            </div>
        `;
    }
    btn.disabled = false;
}

async function getScheduleSuggestion() {
    const caseId = document.getElementById('schedule-case-select').value;
    if (!caseId) return;

    const btn = document.getElementById('btn-get-suggestion');
    const resultEl = document.getElementById('ai-suggestion-result');

    btn.innerHTML = '<div class="spinner"></div> Analyzing...';
    btn.disabled = true;

    try {
        const result = await api('/schedule/suggest', {
            method: 'POST',
            body: JSON.stringify({ case_id: caseId }),
        });

        resultEl.classList.remove('hidden');
        resultEl.innerHTML = `
            <h4>🤖 AI Scheduling Suggestion</h4>
            <div class="suggestion-detail"><span class="label">Suggested Window</span><span class="value" style="font-weight:700;color:var(--accent-cyan)">${result.suggested_days_range}</span></div>
            <div class="suggestion-detail"><span class="label">Duration</span><span class="value">${result.hearing_duration_minutes} min</span></div>
            <div class="suggestion-detail"><span class="label">Confidence</span><span class="value">${result.confidence_score}%</span></div>
            <div class="suggestion-detail"><span class="label">Delay Risk</span><span class="value">${priorityBadge(result.delay_risk)}</span></div>
            <div style="margin-top:0.75rem;font-size:0.85rem;color:var(--text-secondary)">
                <strong style="color:var(--text-primary)">Reasoning:</strong> ${escapeHtml(result.scheduling_reasoning)}
            </div>
            ${result.recommendations ? `<div style="margin-top:0.5rem"><strong style="font-size:0.8rem">Recommendations:</strong><ul style="margin:0.25rem 0 0 1.2rem;font-size:0.8rem;color:var(--text-secondary)">${result.recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul></div>` : ''}
        `;
    } catch (err) {
        resultEl.classList.remove('hidden');
        resultEl.innerHTML = `<h4 style="color:var(--accent-rose)">⚠️ Error</h4><p style="font-size:0.85rem">${err.message}</p>`;
    } finally {
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg> Get AI Suggestion';
        btn.disabled = false;
    }
}

function renderHearingsList(hearings) {
    const list = document.getElementById('hearings-list');
    if (!list) return;

    if (hearings.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem">No upcoming hearings scheduled.</p>';
        return;
    }

    list.innerHTML = hearings.map(h => {
        const d = new Date(h.hearing_date);
        const day = d.getDate();
        const month = d.toLocaleString('en', { month: 'short' });
        return `
            <div class="hearing-item">
                <div class="hearing-date-badge">
                    <span class="day">${day}</span>
                    <span class="month">${month}</span>
                </div>
                <div class="hearing-info">
                    <div class="hearing-case-title">${escapeHtml(h.case_title || 'Unknown Case')}</div>
                    <div class="hearing-meta">${h.case_number || ''} • ${h.hearing_time} • ${h.courtroom_id} • Judge: ${h.judge_name || 'TBD'}</div>
                </div>
                ${statusBadge(h.status)}
            </div>
        `;
    }).join('');
}

// ═══════════════════════════════════════════════════════
// LAWS PAGE
// ═══════════════════════════════════════════════════════
async function searchLaws() {
    const q = document.getElementById('law-search-input').value.trim();
    if (!q) return;
    try {
        const data = await api(`/laws/search?q=${encodeURIComponent(q)}`);
        renderLawCards('law-results', data.results);
    } catch (err) {
        console.error('Law search failed:', err);
    }
}

async function loadAllLaws() {
    try {
        const laws = await api('/laws');
        renderLawCards('all-laws-list', laws);
    } catch (err) {
        console.error('All laws load failed:', err);
    }
}

function renderLawCards(containerId, laws) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (laws.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem;grid-column:1/-1">No laws found matching your query.</p>';
        return;
    }

    container.innerHTML = laws.map((l, i) => `
        <div class="law-card" style="animation-delay:${i * 0.05}s">
            <div class="law-card-header">
                <span class="law-card-act">${escapeHtml(l.act_name)}</span>
                <span class="law-card-section">${escapeHtml(l.section || '')}</span>
            </div>
            <div class="law-card-title">${escapeHtml(l.title)}</div>
            <div class="law-card-desc">${escapeHtml(l.description).substring(0, 200)}${l.description.length > 200 ? '...' : ''}</div>
            <div class="law-card-footer">
                <span class="law-card-penalty">⚖️ ${escapeHtml(l.penalty || 'N/A')}</span>
                <span class="law-card-bailable ${l.is_bailable ? 'yes' : 'no'}">${l.is_bailable ? '✅ Bailable' : '🚫 Non-Bailable'}</span>
            </div>
        </div>
    `).join('');
}

// ═══════════════════════════════════════════════════════
// CHATBOT
// ═══════════════════════════════════════════════════════
function toggleChatbot() {
    const panel = document.getElementById('chatbot-panel');
    const fabChat = document.getElementById('fab-icon-chat');
    const fabClose = document.getElementById('fab-icon-close');
    panel.classList.toggle('hidden');
    fabChat.classList.toggle('hidden');
    fabClose.classList.toggle('hidden');

    if (!panel.classList.contains('hidden')) {
        document.getElementById('chatbot-input').focus();
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();
    if (!message) return;

    addChatMsg(message, 'user');
    input.value = '';

    // Add typing indicator
    const typingId = addTypingIndicator();

    try {
        const data = await api('/chat/query', {
            method: 'POST',
            body: JSON.stringify({ message }),
        });

        removeTypingIndicator(typingId);

        let reply = data.reply || data.text || 'No response received.';
        // Format markdown-ish text
        reply = reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        reply = reply.replace(/\n/g, '<br>');

        let sourcesHtml = '';
        if (data.sources && data.sources.length > 0) {
            sourcesHtml = `<div class="chat-sources">📚 Sources: ${data.sources.map(s => `${s.act} ${s.section}`).join(', ')}</div>`;
        }

        addChatMsg(reply + sourcesHtml, 'bot', true);
    } catch (err) {
        removeTypingIndicator(typingId);
        addChatMsg('Sorry, I encountered an error. Please try again.', 'bot');
    }
}

function addChatMsg(content, sender, isHtml = false) {
    const container = document.getElementById('chatbot-messages');
    const msg = document.createElement('div');
    msg.className = `chat-msg ${sender}`;

    const avatarContent = sender === 'bot'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>'
        : 'You';

    msg.innerHTML = `
        <div class="chat-msg-avatar">${avatarContent}</div>
        <div class="chat-msg-bubble">${isHtml ? content : `<p>${escapeHtml(content)}</p>`}</div>
    `;

    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
}

function addTypingIndicator() {
    const container = document.getElementById('chatbot-messages');
    const id = 'typing-' + Date.now();
    const el = document.createElement('div');
    el.id = id;
    el.className = 'chat-msg bot';
    el.innerHTML = `
        <div class="chat-msg-avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg></div>
        <div class="chat-msg-bubble">
            <div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>
        </div>
    `;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// ═══════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function priorityBadge(level) {
    const classes = { Critical: 'badge-critical', High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };
    return `<span class="badge ${classes[level] || 'badge-medium'}">${level || 'Medium'}</span>`;
}

function statusBadge(status) {
    const map = {
        PENDING: 'badge-pending', SCHEDULED: 'badge-scheduled',
        IN_PROGRESS: 'badge-in-progress', ADJOURNED: 'badge-adjourned',
        DISPOSED: 'badge-disposed', CLOSED: 'badge-closed', COMPLETED: 'badge-disposed', CANCELLED: 'badge-adjourned'
    };
    return `<span class="badge ${map[status] || ''}">${(status || '').replace('_', ' ')}</span>`;
}

function priorityClass(score) {
    if (score >= 80) return 'p-critical';
    if (score >= 60) return 'p-high';
    if (score >= 30) return 'p-medium';
    return 'p-low';
}

function globalSearch() {
    const q = document.getElementById('global-search').value.trim();
    if (!q) return;
    // Navigate to cases page with search
    showPage('cases');
    // Apply search
    api(`/cases?search=${encodeURIComponent(q)}`).then(data => {
        casesData = data.cases;
        renderCasesTable(casesData);
    });
}

function showNotifications() {
    alert('🔔 Notification Center\n\n• Case CASE/2024/0001 hearing tomorrow\n• 3 cases pending priority review\n• Judge Sharma updated availability\n\n(Full notification panel coming soon)');
}
