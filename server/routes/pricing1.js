/**
 * /api/pricing
 *
 * Proxies pricing updates to the Cashfree payment server.
 * The ADMIN_API_KEY never leaves the server — it's never sent to the browser.
 *
 * ENV VARS required (add to your .env):
 *   CASHFREE_SERVER_URL      e.g. https://your-payment-server.onrender.com
 *   CASHFREE_SERVER_ADMIN_KEY  The ADMIN_API_KEY you set on the payment server
 */

const express     = require('express');
const router      = express.Router();
const requireAuth = require('../middleware/auth');

router.use(requireAuth);

const PRICE_KEYS = [
  'standard_monthly',
  'standard_annual',
  'premium_monthly',
  'premium_annual',
  'token_pack_price',
  'website_trial_price',
  'website_standard_price',
  'website_pro_price',
];

// ── GET /api/pricing ──────────────────────────────────────────────────────────
// Fetches current prices from the payment server's Firestore via /health or a
// dedicated endpoint. Since the payment server doesn't expose a GET /prices
// endpoint by default, we return the last-known values from a lightweight
// Firestore-mirroring strategy: the admin dashboard just caches prices locally
// via the POST response.
//
// For now we return an empty object and let the frontend start with blank fields
// (admin types in the prices they want to set). If you add a GET /pricing
// endpoint to the payment server in the future, proxy it here the same way.
router.get('/', async (req, res) => {
  // If you later add GET /pricing to the payment server, uncomment + adapt:
  //
  // const serverUrl  = process.env.CASHFREE_SERVER_URL;
  // const adminKey   = process.env.CASHFREE_SERVER_ADMIN_KEY;
  // if (!serverUrl || !adminKey) {
  //   return res.status(500).json({ error: 'Payment server not configured. Set CASHFREE_SERVER_URL and CASHFREE_SERVER_ADMIN_KEY in .env' });
  // }
  // const upstream = await fetch(`${serverUrl}/pricing`, {
  //   headers: { Authorization: `Bearer ${adminKey}` },
  // });
  // const data = await upstream.json();
  // return res.json(data);

  return res.json({ prices: {} });
});

// ── POST /api/pricing ─────────────────────────────────────────────────────────
// Validates the payload, then forwards it to the payment server's /update-pricing.
router.post('/', async (req, res) => {
  const serverUrl = process.env.CASHFREE_SERVER_URL;
  const adminKey  = process.env.CASHFREE_SERVER_ADMIN_KEY;

  if (!serverUrl || !adminKey) {
    return res.status(500).json({
      error: 'Payment server not configured. Set CASHFREE_SERVER_URL and CASHFREE_SERVER_ADMIN_KEY in .env',
    });
  }

  // Validate fields
  const payload = {};
  for (const key of PRICE_KEYS) {
    if (req.body[key] !== undefined) {
      const val = Number(req.body[key]);
      if (isNaN(val) || val < 0) {
        return res.status(400).json({ error: `${key} must be a non-negative number.` });
      }
      payload[key] = val;
    }
  }

  if (Object.keys(payload).length === 0) {
    return res.status(400).json({ error: 'No valid price fields provided.' });
  }

  // Attach audit info
  payload.updatedBy = req.user?.email || 'admin';

  try {
    const upstream = await fetch(`${serverUrl}/update-pricing`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${adminKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error('Payment server rejected pricing update:', data);
      return res.status(upstream.status).json({ error: data.error || 'Payment server error.' });
    }

    return res.json(data); // { success, updated, message }

  } catch (err) {
    console.error('Pricing proxy error:', err.message);
    return res.status(500).json({ error: `Could not reach payment server: ${err.message}` });
  }
});

module.exports = router;
