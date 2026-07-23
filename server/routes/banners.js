const express     = require('express');
const router      = express.Router();
const requireAuth = require('../middleware/auth');
const admin       = require('../firebase');
const { FieldValue } = require('firebase-admin/firestore');

router.use(requireAuth);

const col = () => admin.firestore().collection('plan_banners');

// ── GET /api/banners ──────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const snap    = await col().orderBy('order', 'asc').get();
    const banners = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ banners });
  } catch (err) {
    console.error('Banners fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/banners ─────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { title, subtitle, buttonText, imageUrl, order, enabled, actionType, actionValue } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

    const data = {
      title:       title.trim(),
      subtitle:    subtitle?.trim()    || '',
      buttonText:  buttonText?.trim()  || '',
      imageUrl:    imageUrl?.trim()    || '',
      order:       Number(order)       || 0,
      enabled:     enabled !== false,
      actionType:  actionType          || 'none',
      actionValue: actionValue?.trim() || '',
      createdAt:   FieldValue.serverTimestamp(),
      updatedAt:   FieldValue.serverTimestamp(),
    };

    const ref = await col().add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    console.error('Banner create error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/banners/:id ────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  try {
    const { title, subtitle, buttonText, imageUrl, order, enabled, actionType, actionValue } = req.body;
    const updates = { updatedAt: FieldValue.serverTimestamp() };

    if (title       !== undefined) updates.title       = title.trim();
    if (subtitle    !== undefined) updates.subtitle    = subtitle.trim();
    if (buttonText  !== undefined) updates.buttonText  = buttonText.trim();
    if (imageUrl    !== undefined) updates.imageUrl    = imageUrl.trim();
    if (order       !== undefined) updates.order       = Number(order);
    if (enabled     !== undefined) updates.enabled     = Boolean(enabled);
    if (actionType  !== undefined) updates.actionType  = actionType;
    if (actionValue !== undefined) updates.actionValue = actionValue.trim();

    await col().doc(req.params.id).update(updates);
    const snap = await col().doc(req.params.id).get();
    res.json({ id: snap.id, ...snap.data() });
  } catch (err) {
    console.error('Banner update error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/banners/:id/toggle ────────────────────────────────────────
router.patch('/:id/toggle', async (req, res) => {
  try {
    const snap     = await col().doc(req.params.id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Not found' });
    const newState = !snap.data().enabled;
    await col().doc(req.params.id).update({
      enabled:   newState,
      updatedAt: FieldValue.serverTimestamp(),
    });
    res.json({ id: snap.id, enabled: newState });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/banners/:id ───────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await col().doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
