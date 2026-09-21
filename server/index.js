require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');
const admin    = require('./firebase');

const db = admin.firestore();

const authRouter        = require('./routes/auth');
const contactsRouter    = require('./routes/contacts');
const subscribersRouter = require('./routes/subscribers');
const usersRouter       = require('./routes/users');
const bannersRouter     = require('./routes/banners');
const planGatingRouter  = require('./routes/planGating');
const pricingRouter     = require('./routes/pricing');
// notificationRoutes exports a FACTORY — (db, admin) => router — and must be
// called with real arguments. The previous code passed the bare factory
// function straight to app.use(), which Express would call as (req, res),
// throwing on every request to /api/notifications/*. Fixed below.
const notificationRouter = require('./routes/notificationRoutes')(db, admin);
const ailimitRouter     = require('./routes/ailimit');
const aiModelRouter     = require('./routes/aiModel');
const websiteTemplatesRouter = require('./routes/websiteTemplates');
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
app.use('/api/plan-gating', planGatingRouter);
app.use('/api/pricing',     pricingRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/images-limits', ailimitRouter);
app.use('/api/ai-models', aiModelRouter);
app.use('/api/website-templates', websiteTemplatesRouter);
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
