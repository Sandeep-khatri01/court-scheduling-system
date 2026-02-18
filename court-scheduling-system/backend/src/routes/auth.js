const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const valid = bcrypt.compareSync(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = generateToken(user);
        res.json({
            token,
            user: { id: user.id, email: user.email, name: user.full_name, role: user.role }
        });
    } catch (err) {
        console.error('[Auth] Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
    const user = db.prepare('SELECT id, email, full_name, role, phone, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
});

// GET /api/auth/users (Admin only - list all users)
router.get('/users', authenticateToken, (req, res) => {
    const users = db.prepare('SELECT id, email, full_name, role, created_at FROM users').all();
    res.json(users);
});

module.exports = router;
