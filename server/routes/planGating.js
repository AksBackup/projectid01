// server/routes/planGating.js
// GET  /api/plan-gating        — fetch current screen access + limits config
// PUT  /api/plan-gating        — save full config back to Firestore
// POST /api/plan-gating/reset  — reset to hardcoded defaults

const express      = require('express');
const router       = express.Router();
const requireAuth  = require('../middleware/auth');
const admin        = require('../firebase');
const { FieldValue } = require('firebase-admin/firestore');

router.use(requireAuth);

const DOC = () =>
  admin.firestore().collection('appConfig').doc('planGating');

// ── Hardcoded defaults (mirrors Flutter _kDefaults / _kLimits) ─────────────
const DEFAULT_ACCESS = {
  finance:       'basic',
  invoices:      'basic',
  customers:     'basic',
  leads:         'basic',
  projects:      'basic',
  tasks:         'basic',
  employees:     'basic',
  sales:         'basic',
  currency:      'basic',
  files:         'basic',
  reports:       'standard',
  kpis:          'standard',
  ai_chat:       'standard',
  email:         'standard',
  team_chat:     'standard',
  unified_inbox: 'standard',
  integrations:  'standard',
  data_storage:  'standard',
  pdf_analyst:   'premium',
};

const DEFAULT_LIMITS = {
  max_employees_basic:       3,
  max_employees_standard:    10,
  max_employees_premium:     20,
  max_integrations_basic:    2,
  max_integrations_standard: 6,
  max_integrations_premium:  -1,
  max_storage_mb_basic:      500,
  max_storage_mb_standard:   5120,
  max_storage_mb_premium:    -1,
  ai_tokens_basic:           10000,
  ai_tokens_standard:        50000,
  ai_tokens_premium:         200000,
};

// ── GET /api/plan-gating ───────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const snap = await DOC().get();
    if (!snap.exists) {
      // Return defaults if doc doesn't exist yet
      return res.json({
        screenAccess: DEFAULT_ACCESS,
        screenLimits: DEFAULT_LIMITS,
        updatedAt: null,
      });
    }
    const data = snap.data();
    res.json({
      screenAccess: { ...DEFAULT_ACCESS, ...(data.screenAccess || {}) },
      screenLimits: { ...DEFAULT_LIMITS, ...(data.screenLimits || {}) },
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
    });
  } catch (err) {
    console.error('PlanGating fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/plan-gating ───────────────────────────────────────────────────
router.put('/', async (req, res) => {
  try {
    const { screenAccess, screenLimits } = req.body;

    // Validate all screenAccess values are valid plan names
    const validPlans = ['basic', 'standard', 'premium'];
    for (const [key, val] of Object.entries(screenAccess || {})) {
      if (!validPlans.includes(val)) {
        return res.status(400).json({ error: `Invalid plan "${val}" for screen "${key}"` });
      }
    }

    // Validate all limit values are integers
    for (const [key, val] of Object.entries(screenLimits || {})) {
      if (!Number.isInteger(Number(val))) {
        return res.status(400).json({ error: `Invalid limit value for "${key}" — must be integer (-1 = unlimited)` });
      }
    }

    await DOC().set({
      screenAccess: screenAccess || DEFAULT_ACCESS,
      screenLimits: Object.fromEntries(
        Object.entries(screenLimits || DEFAULT_LIMITS).map(([k, v]) => [k, Number(v)])
      ),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: req.user?.email || 'admin',
    }, { merge: false });

    res.json({ ok: true, message: 'Plan gating config saved. Changes take effect on next user app launch.' });
  } catch (err) {
    console.error('PlanGating save error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/plan-gating/reset ────────────────────────────────────────────
router.post('/reset', async (req, res) => {
  try {
    await DOC().set({
      screenAccess: DEFAULT_ACCESS,
      screenLimits: DEFAULT_LIMITS,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: req.user?.email || 'admin',
    }, { merge: false });
    res.json({ ok: true, screenAccess: DEFAULT_ACCESS, screenLimits: DEFAULT_LIMITS });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
