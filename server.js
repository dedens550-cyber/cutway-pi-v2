// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initFirebase } = require('./src/utils/firebase');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Init Firebase ──
initFirebase();

// ── Security middleware ──
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.APP_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ──
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
const paymentLimiter = rateLimit({ windowMs: 60 * 1000, max: 20 });
app.use('/api/', apiLimiter);
app.use('/api/payment/', paymentLimiter);

// ── Static files ──
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ──
app.use('/api/payment', require('./src/pages/paymentRoutes'));
app.use('/api/store', require('./src/pages/storeRoutes'));

// ── Health check ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: Date.now() });
});

// ── SPA fallback — serve index.html for all non-API routes ──
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 Cutway.pi v2 running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.PI_SANDBOX === 'true' ? 'SANDBOX' : 'PRODUCTION'}`);
  console.log(`💰 Platform fee: ${process.env.PLATFORM_FEE_PI || 1} Pi per transaction\n`);
});

module.exports = app;
