// client/src/pages/PlanGating.jsx
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth.jsx';
import './PlanGating.css';

// ── Screen definitions (label, category, icon, description) ──────────────────
const SCREENS = [
  // Finance
  { key: 'finance',       label: 'Finance',        cat: 'Finance',         icon: '💳', desc: 'Income, expenses & balance tracker' },
  { key: 'invoices',      label: 'Invoices',        cat: 'Finance',         icon: '🧾', desc: 'Create, send & track invoices' },
  // Business
  { key: 'customers',     label: 'Customers',       cat: 'Business',        icon: '👥', desc: 'Manage existing clients' },
  { key: 'leads',         label: 'Leads',           cat: 'Business',        icon: '🎯', desc: 'Track potential customers' },
  { key: 'sales',         label: 'Sales Pipeline',  cat: 'Business',        icon: '📈', desc: 'Deals, pipeline & revenue' },
  // Operations
  { key: 'projects',      label: 'Projects',        cat: 'Operations',      icon: '📁', desc: 'Manage all your projects' },
  { key: 'tasks',         label: 'Tasks',           cat: 'Operations',      icon: '✅', desc: 'Track and assign tasks' },
  { key: 'employees',     label: 'Employees',       cat: 'Operations',      icon: '🪪', desc: 'Team members (count gated by limit)' },
  // Communication
  { key: 'email',         label: 'Email',           cat: 'Communication',   icon: '✉️',  desc: 'Compose & send business emails' },
  { key: 'team_chat',     label: 'Team Chat',       cat: 'Communication',   icon: '💬', desc: 'Instant messaging with your team' },
  { key: 'unified_inbox', label: 'Unified Inbox',   cat: 'Communication',   icon: '📥', desc: 'WhatsApp · Instagram · Telegram & more' },
  // Intelligence
  { key: 'ai_chat',       label: 'AI Assistant',    cat: 'Intelligence',    icon: '🤖', desc: 'Smart AI-powered business insights' },
  { key: 'image_studio',  label: 'Image Studio',    cat: 'Intelligence',    icon: '🖼️', desc: 'AI image generation & editing' },
  { key: 'pdf_analyst',   label: 'PDF Analyst',     cat: 'Intelligence',    icon: '📄', desc: 'AI analysis of business PDFs' },
  // Analytics
  { key: 'reports',       label: 'Reports',         cat: 'Analytics',       icon: '📊', desc: 'Business performance reports' },
  { key: 'kpis',          label: 'KPIs',            cat: 'Analytics',       icon: '🏆', desc: 'Key performance indicators' },
  // Connect & Store
  { key: 'integrations',  label: 'Integrations',    cat: 'Connect & Store', icon: '🔌', desc: 'Salesforce, Slack, HubSpot & more' },
  { key: 'data_storage',  label: 'Data & Storage',  cat: 'Connect & Store', icon: '🗄️',  desc: 'Records, files & storage limits' },
  { key: 'files',         label: 'Files',           cat: 'Connect & Store', icon: '📦', desc: 'Store PDFs & images in cloud' },
  // Tools
  { key: 'currency',      label: 'Currency',        cat: 'Tools',           icon: '💱', desc: 'Real-time currency converter' },
];

const LIMITS = [
  { key: 'max_employees_basic',       label: 'Max employees',      plan: 'basic',    icon: '🪪' },
  { key: 'max_employees_standard',    label: 'Max employees',      plan: 'standard', icon: '🪪' },
  { key: 'max_employees_premium',     label: 'Max employees',      plan: 'premium',  icon: '🪪' },
  { key: 'max_integrations_basic',    label: 'Max integrations',   plan: 'basic',    icon: '🔌' },
  { key: 'max_integrations_standard', label: 'Max integrations',   plan: 'standard', icon: '🔌' },
  { key: 'max_integrations_premium',  label: 'Max integrations',   plan: 'premium',  icon: '🔌' },
  { key: 'max_storage_mb_basic',      label: 'Storage (MB)',        plan: 'basic',    icon: '💾' },
  { key: 'max_storage_mb_standard',   label: 'Storage (MB)',        plan: 'standard', icon: '💾' },
  { key: 'max_storage_mb_premium',    label: 'Storage (MB)',        plan: 'premium',  icon: '💾' },
  { key: 'ai_tokens_basic',           label: 'AI tokens/month',    plan: 'basic',    icon: '🤖' },
  { key: 'ai_tokens_standard',        label: 'AI tokens/month',    plan: 'standard', icon: '🤖' },
  { key: 'ai_tokens_premium',         label: 'AI tokens/month',    plan: 'premium',  icon: '🤖' },
];

const PLAN_COLORS = { basic: '#34C759', standard: '#0A84FF', premium: '#C8A96E' };
const PLAN_LABELS = { basic: 'Basic',  standard: 'Standard', premium: 'Premium' };
const CATS = [...new Set(SCREENS.map(s => s.cat))];

// ── Plan pill selector ────────────────────────────────────────────────────────
function PlanPill({ value, onChange, disabled }) {
  const plans = ['basic', 'standard', 'premium'];
  return (
    <div className="plan-pill-group">
      {plans.map(p => (
        <button
          key={p}
          disabled={disabled}
          onClick={() => onChange(p)}
          className={`plan-pill ${value === p ? 'active' : ''}`}
          style={value === p ? { background: PLAN_COLORS[p] + '22', borderColor: PLAN_COLORS[p], color: PLAN_COLORS[p] } : {}}
        >
          {PLAN_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

// ── Limit input row ───────────────────────────────────────────────────────────
function LimitInput({ label, plan, icon, value, onChange, disabled }) {
  const isUnlimited = Number(value) === -1;
  return (
    <div className="limit-row">
      <span className="limit-icon">{icon}</span>
      <span className="limit-label">{label}</span>
      <span className="limit-plan-badge" style={{ background: PLAN_COLORS[plan] + '22', color: PLAN_COLORS[plan] }}>
        {PLAN_LABELS[plan]}
      </span>
      <div className="limit-input-wrap">
        <input
          type="number"
          className="limit-input"
          value={isUnlimited ? '' : value}
          placeholder={isUnlimited ? '∞ Unlimited' : ''}
          disabled={disabled || isUnlimited}
          min={-1}
          onChange={e => onChange(Number(e.target.value))}
        />
        <button
          className={`unlimited-btn ${isUnlimited ? 'active' : ''}`}
          disabled={disabled}
          onClick={() => onChange(isUnlimited ? 10 : -1)}
          title={isUnlimited ? 'Set a limit' : 'Set to unlimited'}
        >
          {isUnlimited ? '∞' : '∞'}
        </button>
      </div>
    </div>
  );
}

// ── Phone preview ─────────────────────────────────────────────────────────────
function PhonePreview({ screenAccess }) {
  const planOrder = ['basic', 'standard', 'premium'];
  const sample = SCREENS.slice(0, 6);
  return (
    <div className="pg-phone">
      <div className="pg-phone-notch" />
      <div className="pg-phone-screen">
        <div className="pg-phone-header">✦ Services</div>
        <div className="pg-phone-list">
          {sample.map(s => {
            const req   = screenAccess[s.key] || 'basic';
            const reqIdx = planOrder.indexOf(req);
            return (
              <div key={s.key} className={`pg-phone-item ${reqIdx > 0 ? 'locked' : ''}`}>
                <span className="pg-phone-icon">{s.icon}</span>
                <span className="pg-phone-name">{s.label}</span>
                {reqIdx > 0
                  ? <span className="pg-phone-badge" style={{ color: PLAN_COLORS[req] }}>{PLAN_LABELS[req]}+</span>
                  : <span className="pg-phone-chevron">›</span>}
              </div>
            );
          })}
        </div>
        <div className="pg-phone-hint">Live preview of Services screen</div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PlanGating() {
  const { apiFetch } = useAuth();
  const [access,    setAccess]    = useState({});
  const [limits,    setLimits]    = useState({});
  const [original,  setOriginal]  = useState({ access: {}, limits: {} });
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [tab,       setTab]       = useState('screens'); // 'screens' | 'limits'

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await apiFetch('/api/plan-gating');
      const data = await res.json();
      setAccess(data.screenAccess   || {});
      setLimits(data.screenLimits   || {});
      setOriginal({ access: data.screenAccess || {}, limits: data.screenLimits || {} });
      setUpdatedAt(data.updatedAt);
    } catch (e) {
      toast.error('Failed to load config');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  const isDirty = JSON.stringify(access) !== JSON.stringify(original.access)
               || JSON.stringify(limits)  !== JSON.stringify(original.limits);

  async function save() {
    setSaving(true);
    try {
      const res  = await apiFetch('/api/plan-gating', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenAccess: access, screenLimits: limits }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success('✅ Config saved — takes effect on next user app launch');
      setOriginal({ access: { ...access }, limits: { ...limits } });
      setUpdatedAt(new Date().toISOString());
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!confirm('Reset all plan gates to defaults?')) return;
    setSaving(true);
    try {
      const res  = await apiFetch('/api/plan-gating/reset', { method: 'POST' });
      const data = await res.json();
      setAccess(data.screenAccess);
      setLimits(data.screenLimits);
      setOriginal({ access: data.screenAccess, limits: data.screenLimits });
      toast.success('Reset to defaults');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  // Count screens per plan
  const planCounts = { basic: 0, standard: 0, premium: 0 };
  SCREENS.forEach(s => { planCounts[access[s.key] || 'basic']++; });

  if (loading) return (
    <div className="pg-loading">
      <span className="spinner" /> Loading plan config…
    </div>
  );

  return (
    <div className="pg-page">

      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Plan Gating</h1>
          <p className="page-sub">
            Control which features are available per plan.
            {updatedAt && <span className="pg-updated"> Last saved {new Date(updatedAt).toLocaleString('en-IN')}</span>}
          </p>
        </div>
        <div className="pg-header-actions">
          <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
          <button className="btn btn-ghost btn-sm" onClick={reset} disabled={saving}>Reset defaults</button>
          <button
            className="btn btn-gold"
            onClick={save}
            disabled={saving || !isDirty}
          >
            {saving ? <><span className="spinner-sm" /> Saving…</> : '💾 Save Changes'}
          </button>
        </div>
      </div>

      {isDirty && (
        <div className="pg-dirty-bar">
          ⚠️ You have unsaved changes — click <strong>Save Changes</strong> to publish
        </div>
      )}

      {/* ── Plan summary cards ── */}
      <div className="pg-summary">
        {Object.entries(planCounts).map(([plan, count]) => (
          <div key={plan} className="pg-summary-card card">
            <div className="pg-summary-icon" style={{ background: PLAN_COLORS[plan] + '18', color: PLAN_COLORS[plan] }}>
              {plan === 'basic' ? '🆓' : plan === 'standard' ? '⭐' : '👑'}
            </div>
            <div>
              <div className="pg-summary-count" style={{ color: PLAN_COLORS[plan] }}>{count}</div>
              <div className="pg-summary-label">{PLAN_LABELS[plan]} screens</div>
            </div>
          </div>
        ))}
        <div className="pg-summary-card card pg-summary-info">
          <div className="pg-summary-icon" style={{ background: '#0A84FF18', color: '#0A84FF' }}>ℹ️</div>
          <div>
            <div className="pg-summary-count" style={{ color: '#0A84FF' }}>{SCREENS.length}</div>
            <div className="pg-summary-label">Total screens</div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="pg-tabs">
        <button className={`pg-tab ${tab === 'screens' ? 'active' : ''}`} onClick={() => setTab('screens')}>
          📱 Screen Access
        </button>
        <button className={`pg-tab ${tab === 'limits' ? 'active' : ''}`} onClick={() => setTab('limits')}>
          🔢 Numeric Limits
        </button>
      </div>

      {/* ── Screen Access Tab ── */}
      {tab === 'screens' && (
        <div className="pg-body">
          <div className="pg-categories">
            {CATS.map(cat => {
              const catScreens = SCREENS.filter(s => s.cat === cat);
              return (
                <div key={cat} className="pg-cat card">
                  <div className="pg-cat-header">
                    <span className="pg-cat-name">{cat}</span>
                    <span className="pg-cat-count">{catScreens.length} screens</span>
                  </div>
                  <div className="pg-screen-list">
                    {catScreens.map(s => {
                      const val = access[s.key] || 'basic';
                      return (
                        <div key={s.key} className="pg-screen-row">
                          <div className="pg-screen-info">
                            <span className="pg-screen-icon">{s.icon}</span>
                            <div>
                              <div className="pg-screen-label">{s.label}</div>
                              <div className="pg-screen-desc">{s.desc}</div>
                            </div>
                          </div>
                          <PlanPill
                            value={val}
                            onChange={v => setAccess(a => ({ ...a, [s.key]: v }))}
                            disabled={saving}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Phone preview */}
          <div className="pg-preview-col">
            <div className="pg-preview-sticky">
              <div className="pg-preview-label">Live Preview</div>
              <PhonePreview screenAccess={access} />
              <div className="pg-legend">
                {Object.entries(PLAN_COLORS).map(([p, c]) => (
                  <div key={p} className="pg-legend-item">
                    <span className="pg-legend-dot" style={{ background: c }} />
                    {PLAN_LABELS[p]}+
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Numeric Limits Tab ── */}
      {tab === 'limits' && (
        <div className="pg-limits-grid">
          {/* Employees */}
          <div className="card">
            <div className="pg-limits-section-title">🪪 Team Members (Employees)</div>
            <p className="pg-limits-hint">Max number of employees a user can add on each plan. -1 = unlimited.</p>
            {LIMITS.filter(l => l.key.startsWith('max_employees')).map(l => (
              <LimitInput key={l.key} {...l}
                value={limits[l.key] ?? 0}
                onChange={v => setLimits(lm => ({ ...lm, [l.key]: v }))}
                disabled={saving}
              />
            ))}
          </div>

          {/* Integrations */}
          <div className="card">
            <div className="pg-limits-section-title">🔌 Integrations</div>
            <p className="pg-limits-hint">Max simultaneously connected integrations per plan.</p>
            {LIMITS.filter(l => l.key.startsWith('max_integrations')).map(l => (
              <LimitInput key={l.key} {...l}
                value={limits[l.key] ?? 0}
                onChange={v => setLimits(lm => ({ ...lm, [l.key]: v }))}
                disabled={saving}
              />
            ))}
          </div>

          {/* Storage */}
          <div className="card">
            <div className="pg-limits-section-title">💾 File Storage</div>
            <p className="pg-limits-hint">Max storage in MB per plan. -1 = unlimited.</p>
            {LIMITS.filter(l => l.key.startsWith('max_storage')).map(l => (
              <LimitInput key={l.key} {...l}
                value={limits[l.key] ?? 0}
                onChange={v => setLimits(lm => ({ ...lm, [l.key]: v }))}
                disabled={saving}
              />
            ))}
          </div>

          {/* AI Tokens */}
          <div className="card">
            <div className="pg-limits-section-title">🤖 AI Tokens / Month</div>
            <p className="pg-limits-hint">Max AI tokens per user per month. -1 = unlimited.</p>
            {LIMITS.filter(l => l.key.startsWith('ai_tokens')).map(l => (
              <LimitInput key={l.key} {...l}
                value={limits[l.key] ?? 0}
                onChange={v => setLimits(lm => ({ ...lm, [l.key]: v }))}
                disabled={saving}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
