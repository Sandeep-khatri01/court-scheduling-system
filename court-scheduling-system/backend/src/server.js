const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ─── Initialize Database (auto-seeds on first run) ───
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Request logger
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - start;
        console.log(`[${new Date().toISOString().slice(11, 19)}] ${req.method} ${req.path} → ${res.statusCode} (${ms}ms)`);
    });
    next();
});

// ─── API Routes ───
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cases', require('./routes/cases'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/laws', require('./routes/laws'));

// ─── Health Check ───
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        server: 'LawTrack API',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        aiConfigured: !!process.env.OPENAI_API_KEY,
    });
});

// ─── Serve Frontend ───
app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'index.html'));
    }
});

// ─── Start ───
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║   ⚖️  LawTrack — AI Court Scheduling API          ║
║──────────────────────────────────────────────────║
║   Port: ${PORT}                                     ║
║   AI:   ${process.env.OPENAI_API_KEY ? '✅ OpenAI Configured' : '⚠️  OpenAI NOT configured (fallback mode)'}    ║
║   DB:   ✅ SQLite Ready                           ║
╚══════════════════════════════════════════════════╝
    `);
});
