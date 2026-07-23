const express     = require('express');
const router      = express.Router();
const requireAuth = require('../middleware/auth');
const Subscriber  = require('../models/Subscriber');
const { Resend }  = require('resend');

router.use(requireAuth);

// ── GET /api/subscribers ──────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const [docs, total] = await Promise.all([
      Subscriber.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
      Subscriber.countDocuments(),
    ]);
    res.json({ subscribers: docs, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/subscribers/announce — send launch email to ALL active ──────
router.post('/announce', async (req, res) => {
  try {
    const { subject, body, ids } = req.body;

    if (!subject || !body)
      return res.status(400).json({ error: 'Subject and body required' });

    if (!process.env.RESEND_API_KEY)
      return res.status(503).json({ error: 'RESEND_API_KEY not set' });

    // ✅ SUPPORT SELECTED USERS
    let query = { active: true };

    if (ids && Array.isArray(ids) && ids.length > 0) {
      query._id = { $in: ids };
    }

    const subscribers = await Subscriber.find(query);

    if (!subscribers.length) return res.json({ sent: 0 });

    const resend = new Resend(process.env.RESEND_API_KEY);
    let sent = 0;

    const BATCH = 10;

    for (let i = 0; i < subscribers.length; i += BATCH) {
      const batch = subscribers.slice(i, i + BATCH);

      await Promise.all(
        batch.map(sub =>
          resend.emails.send({
            from: process.env.RESEND_FROM || 'Astric Technologies <onboarding@resend.dev>',
            to: sub.email,
            subject,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                <div style="background:linear-gradient(135deg,#A6853F,#C8A96E);padding:20px 28px;border-radius:12px 12px 0 0;">
                  <span style="color:#fff;font-size:18px;font-weight:600;">✦ Astric Technologies</span>
                </div>
                <div style="padding:28px;background:#fff;border:1px solid #e8e8e4;border-top:none;border-radius:0 0 12px 12px;">
                  <div style="white-space:pre-wrap;font-size:15px;line-height:1.7;color:#0d0d0d;">
                    ${body.replace(/\n/g, '<br>')}
                  </div>
                  <hr style="margin:24px 0;border:none;border-top:1px solid #f0f0f0;" />
                  <p style="font-size:12px;color:#888;margin:0;">
                    You're receiving this because you signed up for early access at
                    <a href="https://astrictechnologies.com" style="color:#A6853F;">astrictechnologies.com</a>
                  </p>
                </div>
              </div>
            `,
          })
          .then(() => {
            sent++;
            sub.announcementSentAt = new Date();
            return sub.save();
          })
          .catch(err =>
            console.warn(`Failed to send to ${sub.email}:`, err.message)
          )
        )
      );
    }

    res.json({
      success: true,
      sent,
      total: subscribers.length,
      mode: ids && ids.length ? 'selected' : 'all' // ✅ helpful debug
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ── DELETE /api/subscribers/:id ───────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await Subscriber.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
