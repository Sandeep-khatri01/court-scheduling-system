const express = require('express');
const db = require('../database');
const { retrieveRelevantLaws } = require('../services/ai-service');

const router = express.Router();

// GET /api/laws/search?q=helmet
router.get('/search', (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.status(400).json({ error: 'Search query required (use ?q=...)' });

        const results = retrieveRelevantLaws(q);
        res.json({ query: q, results, count: results.length });
    } catch (err) {
        console.error('[Laws] Search error:', err);
        res.status(500).json({ error: 'Failed to search laws' });
    }
});

// GET /api/laws - List all laws
router.get('/', (req, res) => {
    try {
        const { category } = req.query;
        let query = 'SELECT * FROM laws';
        const params = [];
        if (category) { query += ' WHERE category = ?'; params.push(category); }
        query += ' ORDER BY act_name, section';
        const laws = db.prepare(query).all(...params);
        res.json(laws);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch laws' });
    }
});

// GET /api/laws/:id
router.get('/:id', (req, res) => {
    try {
        const law = db.prepare('SELECT * FROM laws WHERE id = ?').get(req.params.id);
        if (!law) return res.status(404).json({ error: 'Law not found' });
        res.json(law);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch law' });
    }
});

module.exports = router;
