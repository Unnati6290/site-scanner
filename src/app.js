const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const scanRoutes = require('./routes/scan');
const authRoutes = require('./routes/auth');
const requireAuth = require('./middleware/auth');

const app = express();

app.use(helmet());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100}));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/scan', requireAuth, scanRoutes);

module.exports = app;
