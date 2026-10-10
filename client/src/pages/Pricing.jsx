import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import './Pricing.css';

const PRICE_FIELDS = [
  { key: 'standard_monthly', label: 'Standard — Monthly',  icon: '◎', color: '#C8A96E' },
  { key: 'standard_annual',  label: 'Standard — Annual',   icon: '◎', color: '#C8A96E' },
  { key: 'premium_monthly',  label: 'Premium — Monthly',   icon: '★', color: '#BF5AF2' },
  { key: 'premium_annual',   label: 'Premium — Annual',    icon: '★', color: '#BF5AF2' },
  { key: 'token_pack_price', label: 'Token Pack',          icon: '⬡', color: '#0A84FF' },
  { key: 'website_trial_price',    label: 'Website Studio — Trial (3-4 pages)',    icon: '🌐', color: '#10B981' },
  { key: 'website_standard_price', label: 'Website Studio — Standard (5-6 pages)', icon: '🌐', color: '#10B981' },
  { key: 'website_pro_price',      label: 'Website Studio — Pro (up to 12 pages)', icon: '🌐', color: '#10B981' },
  { key: 'app_trial_price',    label: 'App Studio — Trial',    icon: '📱', color: '#6366F1' },
  { key: 'app_standard_price', label: 'App Studio — Standard', icon: '📱', color: '#6366F1' },
  { key: 'app_pro_price',      label: 'App Studio — Pro',      icon: '📱', color: '#6366F1' },
  { key: 'whatsapp_monthly_price', label: 'WhatsApp Automation — Monthly', icon: '💬', color: '#25D366' },
  { key: 'whatsapp_annual_price',  label: 'WhatsApp Automation — Annual',  icon: '💬', color: '#25D366' },
];

// Astric Voice (AI calling) — prepaid minutes. Same save flow as the prices
// above; `prefix`/`unit`/`step` override the ₹ / INR / whole-number defaults.
const VOICE_FIELDS = [
  { key: 'voice_trial_price',   label: 'Voice — Trial price',            icon: '📞', color: '#6366F1' },
  { key: 'voice_trial_minutes', label: 'Voice — Trial minutes',          icon: '📞', color: '#6366F1', prefix: '', unit: 'min' },
  { key: 'voice_pack_price',    label: 'Voice — Pack price',             icon: '📞', color: '#6366F1' },
  { key: 'voice_pack_minutes',  label: 'Voice — Pack minutes',           icon: '📞', color: '#6366F1', prefix: '', unit: 'min' },
  { key: 'voice_rate_per_min',  label: 'Voice — Pay-as-you-go rate (blank/0 = off)', icon: '📞', color: '#6366F1', unit: 'INR / min', step: '0.01' },
  { key: 'voice_min_recharge',  label: 'Voice — Pay-as-you-go minimum recharge', icon: '📞', color: '#6366F1' },
  { key: 'voice_trial_once',    label: 'Voice — Trial once per account (1 = yes, 0 = no)', icon: '📞', color: '#6366F1', prefix: '', unit: '0 / 1' },
  { key: 'paypal_voice_trial',  label: 'Voice (PayPal) — Trial price',   icon: '📞', color: '#0070BA', prefix: '$', unit: 'USD', step: '0.01' },
  { key: 'paypal_voice_pack',   label: 'Voice (PayPal) — Pack price',    icon: '📞', color: '#0070BA', prefix: '$', unit: 'USD', step: '0.01' },
  { key: 'paypal_voice_rate_per_min',  label: 'Voice (PayPal) — Rate per minute', icon: '📞', color: '#0070BA', prefix: '$', unit: 'USD / min', step: '0.001' },
  { key: 'paypal_voice_min_recharge',  label: 'Voice (PayPal) — Minimum recharge', icon: '📞', color: '#0070BA', prefix: '$', unit: 'USD', step: '0.01' },
];

function PriceInput({ field, value, onChange }) {
  return (
    <div className="price-field">
      <div className="price-field-header">
        <span className="price-field-icon" style={{ color: field.color }}>{field.icon}</span>
        <label className="price-field-label">{field.label}</label>
      </div>
      <div className="price-field-input-wrap">
        <span className="price-field-currency">{field.prefix ?? '₹'}</span>
        <input
          type="number"
          className="input price-input"
          value={value}
          onChange={e => onChange(field.key, e.target.value)}
          min="0"
          step={field.step ?? '1'}
          placeholder="0"
        />
        <span className="price-field-unit">{field.unit ?? 'INR'}</span>
      </div>
    </div>
  );
}

export default function Pricing() {
  const { apiFetch } = useAuth();

  const [prices,   setPrices]   = useState({
    standard_monthly: '',
    standard_annual:  '',
    premium_monthly:  '',
    premium_annual:   '',
    token_pack_price: '',
    website_trial_price:    '',
    website_standard_price: '',
    website_pro_price:      '',
    app_trial_price:        '',
    app_standard_price:     '',
    app_pro_price:          '',
    whatsapp_monthly_price: '',
    whatsapp_annual_price:  '',
    voice_trial_price: '', voice_trial_minutes: '', voice_pack_price: '', voice_pack_minutes: '',
    voice_rate_per_min: '', voice_min_recharge: '', voice_trial_once: '',
    paypal_voice_trial: '', paypal_voice_pack: '', paypal_voice_rate_per_min: '', paypal_voice_min_recharge: '',
  });
  // WhatsApp backend URL is a string, not a price — kept separate from
  // `prices` so it doesn't go through the Number() validation in handleSave.
  const [whatsappApiBaseUrl, setWhatsappApiBaseUrl] = useState('');
  const [voiceApiBaseUrl, setVoiceApiBaseUrl] = useState('');
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [status,   setStatus]   = useState(null); // { type: 'success'|'error', msg }

  // Load current prices from server
  useEffect(() => {
    async function load() {
      try {
        const res  = await apiFetch('/api/pricing');
        const data = await res.json();
        if (res.ok && data.prices) {
          setPrices(prev => ({ ...prev, ...data.prices }));
          if (data.prices.whatsapp_api_base_url) setWhatsappApiBaseUrl(data.prices.whatsapp_api_base_url);
          if (data.prices.voice_api_base_url) setVoiceApiBaseUrl(data.prices.voice_api_base_url);
        }
      } catch (e) {
        console.error('Failed to load pricing:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [apiFetch]);

  function handleChange(key, val) {
    setPrices(prev => ({ ...prev, [key]: val }));
    setStatus(null);
  }

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    try {
      const payload = {};
      for (const [k, v] of Object.entries(prices)) {
        if (v !== '' && v !== null && v !== undefined) {
          const n = Number(v);
          if (isNaN(n) || n < 0) {
            setStatus({ type: 'error', msg: `Invalid value for ${k}: must be a non-negative number.` });
            setSaving(false);
            return;
          }
          payload[k] = n;
        }
      }
      if (whatsappApiBaseUrl.trim() !== '') {
        payload.whatsapp_api_base_url = whatsappApiBaseUrl.trim();
      }
      if (voiceApiBaseUrl.trim() !== '') {
        payload.voice_api_base_url = voiceApiBaseUrl.trim();
      }
      if (payload.voice_trial_once !== undefined && ![0, 1].includes(payload.voice_trial_once)) {
        setStatus({ type: 'error', msg: 'Voice — Trial once per account must be 1 or 0.' });
        setSaving(false);
        return;
      }

      if (Object.keys(payload).length === 0) {
        setStatus({ type: 'error', msg: 'No price values entered.' });
        setSaving(false);
        return;
      }

      const res  = await apiFetch('/api/pricing', {
        method: 'POST',
        body:   JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', msg: `Updated: ${(data.updated || []).join(', ')}. Flutter reflects changes in ~1 second.` });
      } else {
        setStatus({ type: 'error', msg: data.error || 'Update failed.' });
      }
    } catch (e) {
      setStatus({ type: 'error', msg: e.message || 'Network error.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pricing-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pricing Config</h1>
          <p className="page-sub">Update plan prices — changes reflect in the Flutter app within ~1 second</p>
        </div>
      </div>

      {loading ? (
        <div className="page-loading"><span className="spinner" /> Loading current prices…</div>
      ) : (
        <>
          <div className="pricing-grid">
            {PRICE_FIELDS.map(field => (
              <PriceInput
                key={field.key}
                field={field}
                value={prices[field.key]}
                onChange={handleChange}
              />
            ))}
          </div>

          <h3 style={{ margin: '28px 0 12px' }}>Astric Voice — AI calling minutes</h3>
          <div className="pricing-grid">
            {VOICE_FIELDS.map(field => (
              <PriceInput
                key={field.key}
                field={field}
                value={prices[field.key]}
                onChange={handleChange}
              />
            ))}
          </div>

          <div className="price-field" style={{ marginTop: 16 }}>
            <div className="price-field-header">
              <span className="price-field-icon" style={{ color: '#6366F1' }}>📞</span>
              <label className="price-field-label">Astric Voice — Backend URL</label>
            </div>
            <div className="price-field-input-wrap">
              <input
                type="text"
                className="input"
                value={voiceApiBaseUrl}
                onChange={e => { setVoiceApiBaseUrl(e.target.value); setStatus(null); }}
                placeholder="https://your-voice-backend-domain.com"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div className="price-field" style={{ marginTop: 16 }}>
            <div className="price-field-header">
              <span className="price-field-icon" style={{ color: '#25D366' }}>💬</span>
              <label className="price-field-label">WhatsApp Automation — Backend URL</label>
            </div>
            <div className="price-field-input-wrap">
              <input
                type="text"
                className="input"
                value={whatsappApiBaseUrl}
                onChange={e => { setWhatsappApiBaseUrl(e.target.value); setStatus(null); }}
                placeholder="https://your-whatsapp-backend-domain.com"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {status && (
            <div className={`pricing-status ${status.type}`}>
              {status.type === 'success' ? '✓ ' : '✗ '}{status.msg}
            </div>
          )}

          <div className="pricing-actions">
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <><span className="spinner spinner-sm" /> Saving…</> : '↑ Push to Cashfree Server'}
            </button>
          </div>

          <div className="pricing-info card">
            <div className="card-title">How it works</div>
            <div className="pricing-info-body">
              <div className="info-row">
                <span className="info-icon" style={{ color: '#C8A96E' }}>◎</span>
                <span>Prices are stored in Firestore <code>pricing_config/plans</code>. Your Cashfree payment server reads them on every order — the client-sent amount is always ignored.</span>
              </div>
              <div className="info-row">
                <span className="info-icon" style={{ color: '#34C759' }}>↻</span>
                <span>Flutter listens on a real-time Firestore stream — prices update in the app within ~1 second of saving here.</span>
              </div>
              <div className="info-row">
                <span className="info-icon" style={{ color: '#0A84FF' }}>⬡</span>
                <span>Token pack price is used for add-on token purchases. Leave a field blank to skip updating it.</span>
              </div>
              <div className="info-row">
                <span className="info-icon" style={{ color: '#25D366' }}>💬</span>
                <span>The WhatsApp backend URL points the app at your deployed PHP WhatsApp service — change it here any time it moves, no app update needed.</span>
              </div>
              <div className="info-row">
                <span className="info-icon" style={{ color: '#6366F1' }}>📞</span>
                <span>Voice minutes: trial and pack have fixed prices and minutes; pay-as-you-go gives floor(amount ÷ rate) minutes and stays off until you set a rate. Keep the rate above your carrier + AI cost per minute (about ₹3.13). The Voice backend URL is the https address of the Astric Voice server.</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
