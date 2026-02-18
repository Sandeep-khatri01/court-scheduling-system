const express = require('express');
const db = require('../database');
const { v4: uuidv4 } = require('uuid');
const { getSchedulingSuggestion } = require('../services/ai-service');

const router = express.Router();

// GET /api/schedule/hearings - Upcoming hearings
router.get('/hearings', (req, res) => {
    try {
        const { date, judge_id, status = 'SCHEDULED' } = req.query;
        let query = `SELECT h.*, c.title as case_title, c.case_number, c.case_type, c.priority_score, c.urgency, j.full_name as judge_name FROM hearings h JOIN cases c ON h.case_id = c.id LEFT JOIN users j ON h.judge_id = j.id WHERE 1=1`;
        const params = [];

        if (date) { query += ' AND h.hearing_date = ?'; params.push(date); }
        if (judge_id) { query += ' AND h.judge_id = ?'; params.push(judge_id); }
        if (status) { query += ' AND h.status = ?'; params.push(status); }

        query += ' ORDER BY h.hearing_date ASC, h.hearing_time ASC';

        const hearings = db.prepare(query).all(...params);
        res.json(hearings);
    } catch (err) {
        console.error('[Schedule] Hearings error:', err);
        res.status(500).json({ error: 'Failed to fetch hearings' });
    }
});

// POST /api/schedule/suggest - AI Scheduling Suggestion
router.post('/suggest', async (req, res) => {
    try {
        const { case_id } = req.body;
        if (!case_id) return res.status(400).json({ error: 'case_id required' });

        const caseData = db.prepare('SELECT * FROM cases WHERE id = ?').get(case_id);
        if (!caseData) return res.status(404).json({ error: 'Case not found' });

        const suggestion = await getSchedulingSuggestion(caseData);
        res.json(suggestion);
    } catch (err) {
        console.error('[Schedule] Suggest error:', err);
        res.status(500).json({ error: 'Failed to get scheduling suggestion' });
    }
});

// POST /api/schedule/confirm - Confirm and create hearing
router.post('/confirm', (req, res) => {
    try {
        const { case_id, hearing_date, hearing_time, courtroom_id, judge_id, duration_minutes, notes } = req.body;
        if (!case_id || !hearing_date) return res.status(400).json({ error: 'case_id and hearing_date required' });

        // Check judge conflict
        if (judge_id) {
            const conflict = db.prepare("SELECT * FROM hearings WHERE judge_id = ? AND hearing_date = ? AND hearing_time = ? AND status = 'SCHEDULED'").get(judge_id, hearing_date, hearing_time || '10:00');
            if (conflict) return res.status(409).json({ error: 'Judge has a scheduling conflict at this time' });
        }

        // Check courtroom conflict
        if (courtroom_id) {
            const crConflict = db.prepare("SELECT * FROM hearings WHERE courtroom_id = ? AND hearing_date = ? AND hearing_time = ? AND status = 'SCHEDULED'").get(courtroom_id, hearing_date, hearing_time || '10:00');
            if (crConflict) return res.status(409).json({ error: 'Courtroom is already booked at this time' });
        }

        const id = uuidv4();
        db.prepare('INSERT INTO hearings (id, case_id, hearing_date, hearing_time, courtroom_id, judge_id, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
            id, case_id, hearing_date, hearing_time || '10:00', courtroom_id || 'CR-1', judge_id, duration_minutes || 30, notes
        );

        // Update case status
        db.prepare("UPDATE cases SET status = 'SCHEDULED', updated_at = datetime('now') WHERE id = ?").run(case_id);

        const hearing = db.prepare('SELECT * FROM hearings WHERE id = ?').get(id);
        res.status(201).json(hearing);
    } catch (err) {
        console.error('[Schedule] Confirm error:', err);
        res.status(500).json({ error: 'Failed to confirm hearing' });
    }
});

// POST /api/schedule/adjourn - Adjourn a hearing
router.post('/adjourn', (req, res) => {
    try {
        const { hearing_id, reason } = req.body;
        if (!hearing_id || !reason) return res.status(400).json({ error: 'hearing_id and reason required' });

        const hearing = db.prepare('SELECT * FROM hearings WHERE id = ?').get(hearing_id);
        if (!hearing) return res.status(404).json({ error: 'Hearing not found' });

        db.prepare("UPDATE hearings SET status = 'ADJOURNED', adjournment_reason = ? WHERE id = ?").run(reason, hearing_id);
        db.prepare("UPDATE cases SET status = 'ADJOURNED', adjournment_count = adjournment_count + 1, last_adjournment_reason = ?, updated_at = datetime('now') WHERE id = ?").run(reason, hearing.case_id);

        res.json({ message: 'Hearing adjourned', hearing_id, reason });
    } catch (err) {
        console.error('[Schedule] Adjourn error:', err);
        res.status(500).json({ error: 'Failed to adjourn hearing' });
    }
});

// GET /api/schedule/courtrooms - List courtrooms
router.get('/courtrooms', (req, res) => {
    try {
        const courtrooms = db.prepare('SELECT * FROM courtrooms').all();
        res.json(courtrooms);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch courtrooms' });
    }
});

// GET /api/schedule/judge-availability/:judgeId - Check judge schedule
router.get('/judge-availability/:judgeId', (req, res) => {
    try {
        const hearings = db.prepare("SELECT hearing_date, hearing_time, courtroom_id, duration_minutes FROM hearings WHERE judge_id = ? AND status = 'SCHEDULED' AND hearing_date >= date('now') ORDER BY hearing_date ASC").all(req.params.judgeId);
        const judge = db.prepare('SELECT id, full_name, email FROM users WHERE id = ? AND role = ?').get(req.params.judgeId, 'JUDGE');
        res.json({ judge, scheduled_hearings: hearings });
    } catch (err) {
        res.status(500).json({ error: 'Failed to check judge availability' });
    }
});

module.exports = router;
