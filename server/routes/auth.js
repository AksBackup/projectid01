const express = require('express');
const router  = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const ALLOWED = (process.env.ALLOWED_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

// POST /api/auth/google
// Body: { credential } — the Google ID token from the frontend
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'No credential provided' });

  try {
    // Verify the Google ID token
    const ticket  = await client.verifyIdToken({
      idToken:  credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email   = payload.email.toLowerCase();

    // Check if this Google account is on the allowed list
    if (ALLOWED.length && !ALLOWED.includes(email)) {
      return res.status(403).json({ error: 'Access denied. This Google account is not authorised.' });
    }

    // Issue a JWT valid for 12 hours
    const token = jwt.sign(
      { email, name: payload.name, picture: payload.picture },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({ token, user: { email, name: payload.name, picture: payload.picture } });

  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ error: 'Invalid Google token' });
  }
});

// GET /api/auth/me — validate existing JWT
router.get('/me', require('../middleware/auth'), (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
