const express = require('express');
const db = require('../database');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { analyzeCasePriority } = require('../services/ai-service');

const router = express.Router();

// GET /api/cases - List all cases with filters
router.get('/', (req, res) => {
    try {
        const { status, type, urgency, judge_id, search, limit = 50, offset = 0 } = req.query;

        let query = 'SELECT c.*, j.full_name as judge_name, l.full_name as lawyer_name FROM cases c LEFT JOIN users j ON c.presiding_judge_id = j.id LEFT JOIN users l ON c.assigned_lawyer_id = l.id WHERE 1=1';
        const params = [];

        if (status) { query += ' AND c.status = ?'; params.push(status); }
        if (type) { query += ' AND c.case_type = ?'; params.push(type); }
        if (urgency) { query += ' AND c.urgency = ?'; params.push(urgency); }
        if (judge_id) { query += ' AND c.presiding_judge_id = ?'; params.push(judge_id); }
        if (search) { query += ' AND (c.title LIKE ? OR c.case_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

        query += ' ORDER BY c.priority_score DESC, c.filing_date ASC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const cases = db.prepare(query).all(...params);
        const total = db.prepare('SELECT COUNT(*) as count FROM cases').get().count;

        res.json({ cases, total, limit: parseInt(limit), offset: parseInt(offset) });
    } catch (err) {
        console.error('[Cases] List error:', err);
        res.status(500).json({ error: 'Failed to fetch cases' });
    }
});

// GET /api/cases/stats - Dashboard statistics
router.get('/stats', (req, res) => {
    try {
        const total = db.prepare('SELECT COUNT(*) as count FROM cases').get().count;
        const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM cases GROUP BY status').all();
        const byType = db.prepare('SELECT case_type, COUNT(*) as count FROM cases GROUP BY case_type').all();
        const byUrgency = db.prepare('SELECT urgency, COUNT(*) as count FROM cases GROUP BY urgency').all();
        const avgPriority = db.prepare('SELECT AVG(priority_score) as avg FROM cases').get().avg || 0;
        const highPriority = db.prepare('SELECT COUNT(*) as count FROM cases WHERE priority_score >= 70').get().count;
        const pendingCases = db.prepare("SELECT COUNT(*) as count FROM cases WHERE status = 'PENDING'").get().count;
        const adjournedCases = db.prepare("SELECT COUNT(*) as count FROM cases WHERE status = 'ADJOURNED'").get().count;
        const totalAdjournments = db.prepare('SELECT SUM(adjournment_count) as total FROM cases').get().total || 0;
        const upcomingHearings = db.prepare("SELECT COUNT(*) as count FROM hearings WHERE hearing_date >= date('now') AND status = 'SCHEDULED'").get().count;

        res.json({
            totalCases: total,
            avgPriority: parseFloat(avgPriority.toFixed(1)),
            highPriorityCases: highPriority,
            pendingCases,
            adjournedCases,
            totalAdjournments,
            upcomingHearings,
            byStatus,
            byType,
            byUrgency,
        });
    } catch (err) {
        console.error('[Cases] Stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// GET /api/cases/:id - Get single case with hearings
router.get('/:id', (req, res) => {
    try {
        const caseData = db.prepare('SELECT c.*, j.full_name as judge_name, l.full_name as lawyer_name FROM cases c LEFT JOIN users j ON c.presiding_judge_id = j.id LEFT JOIN users l ON c.assigned_lawyer_id = l.id WHERE c.id = ?').get(req.params.id);
        if (!caseData) return res.status(404).json({ error: 'Case not found' });

        const hearings = db.prepare('SELECT h.*, j.full_name as judge_name FROM hearings h LEFT JOIN users j ON h.judge_id = j.id WHERE h.case_id = ? ORDER BY h.hearing_date DESC').all(req.params.id);

        res.json({ ...caseData, hearings });
    } catch (err) {
        console.error('[Cases] Get error:', err);
        res.status(500).json({ error: 'Failed to fetch case' });
    }
});

// POST /api/cases - Create new case
router.post('/', (req, res) => {
    try {
        const { title, description, case_type, urgency, petitioner_name, respondent_name, presiding_judge_id, assigned_lawyer_id } = req.body;
        if (!title || !case_type) return res.status(400).json({ error: 'Title and case type required' });

        const id = uuidv4();
        const caseNumber = `CASE/${new Date().getFullYear()}/${String(Date.now()).slice(-6)}`;
        const filingDate = new Date().toISOString().split('T')[0];

        db.prepare(`INSERT INTO cases (id, case_number, title, description, case_type, urgency, petitioner_name, respondent_name, presiding_judge_id, assigned_lawyer_id, filing_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
            id, caseNumber, title, description, case_type, urgency || 'Medium', petitioner_name, respondent_name, presiding_judge_id, assigned_lawyer_id, filingDate
        );

        const newCase = db.prepare('SELECT * FROM cases WHERE id = ?').get(id);
        res.status(201).json(newCase);
    } catch (err) {
        console.error('[Cases] Create error:', err);
        res.status(500).json({ error: 'Failed to create case' });
    }
});

// POST /api/cases/:id/analyze-priority - AI Priority Analysis
router.post('/:id/analyze-priority', async (req, res) => {
    try {
        const caseData = db.prepare('SELECT * FROM cases WHERE id = ?').get(req.params.id);
        if (!caseData) return res.status(404).json({ error: 'Case not found' });

        const analysis = await analyzeCasePriority(caseData);

        // Update priority score in DB
        if (analysis.priority_score) {
            db.prepare('UPDATE cases SET priority_score = ?, urgency = ?, updated_at = datetime("now") WHERE id = ?').run(
                analysis.priority_score,
                analysis.priority_level === 'Critical' ? 'Critical' : analysis.priority_level === 'High' ? 'High' : analysis.priority_level === 'Low' ? 'Low' : 'Medium',
                req.params.id
            );
        }

        res.json(analysis);
    } catch (err) {
        console.error('[Cases] Priority analysis error:', err);
        res.status(500).json({ error: 'Failed to analyze priority' });
    }
});

module.exports = router;
