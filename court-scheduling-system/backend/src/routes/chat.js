const express = require('express');
const { handleChatQuery } = require('../services/ai-service');

const router = express.Router();

// POST /api/chat/query
router.post('/query', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const userId = req.user?.id || null;
        const result = await handleChatQuery(message, userId);

        res.json(result);
    } catch (err) {
        console.error('[Chat] Query error:', err);
        res.status(500).json({
            reply: 'I apologize, but I encountered an error processing your request. Please try again.',
            sources: [],
        });
    }
});

module.exports = router;
