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
const admin       = require('../firebase');

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
  'app_trial_price',
  'app_standard_price',
  'app_pro_price',
  'whatsapp_monthly_price',
  'whatsapp_annual_price',
  // ── PayPal (USD) price list — fully separate from the INR prices above.
  // 0 = "not set" → the payment server falls back to converting the INR price.
  'paypal_standard_monthly',
  'paypal_standard_annual',
  'paypal_premium_monthly',
  'paypal_premium_annual',
  'paypal_token_pack_price',      // USD for ONE token pack
  'paypal_website_trial',
  'paypal_website_standard',
  'paypal_website_pro',
  'paypal_app_trial',
  'paypal_app_standard',
  'paypal_app_pro',
  'paypal_whatsapp_monthly',
  'paypal_whatsapp_annual',
];
// Whole-number fields (not money): tokens contained in ONE PayPal pack.
const INT_KEYS = ['paypal_token_pack_size'];

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
  // Read the live values straight from Firestore (pricing_config/plans) so the
  // form opens pre-filled instead of blank. Falls back to {} on any problem.
  try {
    const snap = await admin.firestore().collection('pricing_config').doc('plans').get();
    const data = snap.exists ? snap.data() : {};
    const prices = {};
    for (const key of [...PRICE_KEYS, ...INT_KEYS]) {
      if (typeof data[key] === 'number') prices[key] = data[key];
    }
    if (typeof data.whatsapp_api_base_url === 'string') {
      prices.whatsapp_api_base_url = data.whatsapp_api_base_url;
    }
    return res.json({ prices });
  } catch (err) {
    console.error('Pricing GET error:', err.message);
    return res.json({ prices: {} });
  }
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
  for (const key of INT_KEYS) {
    if (req.body[key] !== undefined) {
      const val = Number(req.body[key]);
      if (!Number.isInteger(val) || val < 0) {
        return res.status(400).json({ error: `${key} must be a whole number (0 to clear).` });
      }
      payload[key] = val;
    }
  }
  // Base URL of the deployed PHP WhatsApp backend — a string, not a price,
  // so it's validated/forwarded separately from PRICE_KEYS above.
  if (req.body.whatsapp_api_base_url !== undefined) {
    payload.whatsapp_api_base_url = String(req.body.whatsapp_api_base_url).trim();
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
