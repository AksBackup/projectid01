require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');

const authRouter        = require('./routes/auth');
const contactsRouter    = require('./routes/contacts');
const subscribersRouter = require('./routes/subscribers');
const usersRouter       = require('./routes/users');
const bannersRouter     = require('./routes/banners');

const app  = express();
const PORT = process.env.PORT || 5001;

// ── Trust proxy (Render) ──────────────────────────────────────────────────
app.set('trust proxy', 1);

// ── CORS ──────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? (process.env.CLIENT_URL || '').split(',').map(s => s.trim())
  : ['http://localhost:5174'];

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '50kb' }));

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',        authRouter);
app.use('/api/contacts',    contactsRouter);
app.use('/api/subscribers', subscribersRouter);
app.use('/api/users',       usersRouter);
app.use('/api/banners',     bannersRouter);

app.get('/api/health', (_, res) =>
  res.json({ status: 'ok', service: 'astric-admin', time: new Date().toISOString() }));

// ── Serve React build in production ──────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (_, res) =>
    res.sendFile(path.join(__dirname, '../client/dist/index.html')));
}

// ── MongoDB ───────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Admin server on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB failed:', err.message);
    process.exit(1);
  });
