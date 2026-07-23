const express   = require('express');
const router    = express.Router();
const requireAuth = require('../middleware/auth');
const Contact   = require('../models/Contact');
const { Resend } = require('resend');

// All routes require auth
router.use(requireAuth);

// ── GET /api/contacts — list all, newest first ────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 30 } = req.query;
    const filter = status ? { status } : {};
    const [docs, total] = await Promise.all([
      Contact.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
      Contact.countDocuments(filter),
    ]);
    res.json({ contacts: docs, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/contacts/:id/read — mark as read ───────────────────────────
router.patch('/:id/read', async (req, res) => {
  try {
    const doc = await Contact.findByIdAndUpdate(
      req.params.id,
      { $set: { status: 'read' } },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/contacts/:id/ai-draft — generate reply draft via DeepSeek ──
router.post('/:id/ai-draft', async (req, res) => {
  try {
    const doc = await Contact.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });

    if (!process.env.DEEPSEEK_API_KEY) {
      return res.status(503).json({ error: 'AI not configured — set DEEPSEEK_API_KEY' });
    }

    const prompt = `You are a helpful support agent for Astric Technologies, a company that makes an AI-powered business suite Android app called Astric.

A user has sent the following contact form message:

Name: ${doc.name}
Subject: ${doc.subject}
Message: ${doc.message}

Write a professional, warm, and concise reply email.
- Start with "Hi ${doc.name},"
- Address their specific concern directly
- Keep it under 150 words
- End with "Best regards,\\nThe Astric Team"
- Do NOT include a subject line, just the body text`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model:       'deepseek-chat',
        max_tokens:  400,
        temperature: 0.7,
        messages:    [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'DeepSeek API error');

    const draft = data.choices[0].message.content.trim();
    res.json({ draft });

  } catch (err) {
    console.error('AI draft error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/contacts/:id/reply — send reply + save to DB ───────────────
router.post('/:id/reply', async (req, res) => {
  try {
    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: 'Reply body is required' });

    const doc = await Contact.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });

    // Send via Resend
    if (!process.env.RESEND_API_KEY) {
      return res.status(503).json({ error: 'RESEND_API_KEY not set' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: sendError } = await resend.emails.send({
      from:    process.env.RESEND_FROM || 'Astric Technologies <onboarding@resend.dev>',
      to:      doc.email,
      subject: `Re: ${doc.subject}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#0d0d0d;line-height:1.7;">
          <div style="background:linear-gradient(135deg,#A6853F,#C8A96E);padding:20px 28px;border-radius:12px 12px 0 0;">
            <span style="color:#fff;font-size:18px;font-weight:600;">✦ Astric Technologies</span>
          </div>
          <div style="padding:28px;background:#fff;border:1px solid #e8e8e4;border-top:none;border-radius:0 0 12px 12px;">
            <div style="white-space:pre-wrap;font-size:15px;">${body.replace(/\n/g, '<br>')}</div>
            <hr style="margin:28px 0;border:none;border-top:1px solid #f0f0f0;" />
            <p style="font-size:12px;color:#888;margin:0;">
              This is a reply to your message: <em>"${doc.subject}"</em><br>
              Astric Technologies · <a href="https://astrictechnologies.com" style="color:#A6853F;">astrictechnologies.com</a>
            </p>
          </div>
        </div>
      `,
    });

    if (sendError) throw new Error(sendError.message);

    // Save reply to DB + update status
    doc.replies  = doc.replies || [];
    doc.replies.push({ body, sentBy: req.user.email });
    doc.status   = 'replied';
    await doc.save();

    res.json({ success: true, contact: doc });

  } catch (err) {
    console.error('Reply error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/contacts/:id ──────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
