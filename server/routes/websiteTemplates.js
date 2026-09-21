// server/routes/websiteTemplates.js
//
// CRUD for Website Studio's "Sample Generated Designs" cards - mirrors
// banners.js exactly (same requireAuth, same admin.firestore() pattern,
// same response shapes), just a different collection/field set:
// label/description/prompt/imageUrl/order/enabled instead of banners'
// title/subtitle/buttonText/imageUrl/order/enabled/actionType/actionValue.
//
// Read by the Flutter app via website_studio/providers/
// website_templates_provider.dart, which reads this SAME Firestore
// collection (website_studio_templates) directly - this route is only
// for the admin panel's own CRUD UI, the Flutter app doesn't call it.

const express     = require('express');
const router      = express.Router();
const requireAuth = require('../middleware/auth');
const admin       = require('../firebase');
const { FieldValue } = require('firebase-admin/firestore');

router.use(requireAuth);

const col = () => admin.firestore().collection('website_studio_templates');

// GET /api/website-templates
router.get('/', async (req, res) => {
  try {
    const snap = await col().orderBy('order', 'asc').get();
    const templates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ templates });
  } catch (err) {
    console.error('Website templates fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/website-templates
router.post('/', async (req, res) => {
  try {
    const { label, description, prompt, imageUrl, order, enabled } = req.body;
    if (!label?.trim()) return res.status(400).json({ error: 'Label is required' });
    if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt is required' });

    const data = {
      label:       label.trim(),
      description: description?.trim() || '',
      prompt:      prompt.trim(),
      imageUrl:    imageUrl?.trim()     || '',
      order:       Number(order)        || 0,
      enabled:     enabled !== false,
      createdAt:   FieldValue.serverTimestamp(),
      updatedAt:   FieldValue.serverTimestamp(),
    };

    const ref = await col().add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    console.error('Website template create error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/website-templates/:id
router.patch('/:id', async (req, res) => {
  try {
    const { label, description, prompt, imageUrl, order, enabled } = req.body;
    const updates = { updatedAt: FieldValue.serverTimestamp() };

    if (label       !== undefined) updates.label       = label.trim();
    if (description !== undefined) updates.description = description.trim();
    if (prompt      !== undefined) updates.prompt      = prompt.trim();
    if (imageUrl    !== undefined) updates.imageUrl     = imageUrl.trim();
    if (order       !== undefined) updates.order       = Number(order);
    if (enabled     !== undefined) updates.enabled     = Boolean(enabled);

    await col().doc(req.params.id).update(updates);
    const snap = await col().doc(req.params.id).get();
    res.json({ id: snap.id, ...snap.data() });
  } catch (err) {
    console.error('Website template update error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/website-templates/:id/toggle
router.patch('/:id/toggle', async (req, res) => {
  try {
    const snap = await col().doc(req.params.id).get();
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

// DELETE /api/website-templates/:id
router.delete('/:id', async (req, res) => {
  try {
    await col().doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
