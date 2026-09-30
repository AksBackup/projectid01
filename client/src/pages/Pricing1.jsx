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
];

function PriceInput({ field, value, onChange }) {
  return (
    <div className="price-field">
      <div className="price-field-header">
        <span className="price-field-icon" style={{ color: field.color }}>{field.icon}</span>
        <label className="price-field-label">{field.label}</label>
      </div>
      <div className="price-field-input-wrap">
        <span className="price-field-currency">₹</span>
        <input
          type="number"
          className="input price-input"
          value={value}
          onChange={e => onChange(field.key, e.target.value)}
          min="0"
          step="1"
          placeholder="0"
        />
        <span className="price-field-unit">INR</span>
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
  });
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}
