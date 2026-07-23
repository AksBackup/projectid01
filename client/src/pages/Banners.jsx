import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth.jsx';
import './Banners.css';

const EMPTY = {
  title: '', subtitle: '', imageUrl: '',
  order: '0', enabled: true,
  actionType: 'none', actionValue: '',
};

// ── Phone preview of a single banner card ────────────────────────────────
function PhoneBannerCard({ banner, dim }) {
  const hasImage = banner.imageUrl && banner.imageUrl.trim();
  return (
    <div className={`pbc${dim ? ' pbc-dim' : ''}`}>
      {hasImage && (
        <img
          src={banner.imageUrl}
          alt={banner.title}
          className="pbc-img"
          onError={e => { e.target.style.display = 'none'; }}
        />
      )}
      {!hasImage && <div className="pbc-no-img">📷</div>}
      <div className="pbc-overlay">
        <div className="pbc-title">{banner.title || 'Banner title'}</div>
        <div className="pbc-sub">{banner.subtitle || 'Subtitle goes here'}</div>
        {banner.actionType !== 'none' && (
          <div className="pbc-action-badge">
            {banner.actionType === 'url' ? '🔗 URL' : '📱 Screen'}
          </div>
        )}
      </div>
      {!banner.enabled && <div className="pbc-hidden-tag">Hidden</div>}
    </div>
  );
}

// ── Phone frame ───────────────────────────────────────────────────────────
function PhonePreview({ banners, activeBanner }) {
  const live = banners.filter(b => b.enabled);

  return (
    <div className="phone-frame">
      {/* Notch */}
      <div className="phone-notch" />

      <div className="phone-screen">
        <div className="phone-status">
          <span>9:41</span>
          <span style={{ display:'flex', gap:4 }}>▲ ● ■</span>
        </div>

        <div className="phone-app-header">
          <div className="phone-app-logo">✦ Astric</div>
          <div className="phone-app-icons">🔔 ☰</div>
        </div>

        {/* Banner carousel area */}
        <div className="phone-banner-area">
          {banners.length === 0 ? (
            <div className="phone-empty">No banners yet</div>
          ) : (
            <>
              {/* Show active/highlighted banner large, others small */}
              <div className="phone-banner-main">
                {activeBanner
                  ? <PhoneBannerCard banner={activeBanner} dim={false} />
                  : banners[0]
                  ? <PhoneBannerCard banner={banners[0]} dim={false} />
                  : null}
              </div>
              {/* Dot indicators */}
              {banners.length > 1 && (
                <div className="phone-dots">
                  {banners.map((_, i) => (
                    <div key={i} className={`phone-dot${i === 0 ? ' phone-dot-active' : ''}`} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Rest of the app mockup */}
        <div className="phone-body">
          <div className="phone-section-label">Quick Actions</div>
          <div className="phone-grid">
            {['🤖 AI Chat', '👥 CRM', '✅ Tasks', '💰 Finance'].map(item => (
              <div key={item} className="phone-grid-item">{item}</div>
            ))}
          </div>
          <div className="phone-section-label" style={{ marginTop: 10 }}>Recent Activity</div>
          {[1,2].map(i => (
            <div key={i} className="phone-list-item">
              <div className="phone-li-dot" />
              <div className="phone-li-lines">
                <div className="phone-li-line phone-li-line-l" />
                <div className="phone-li-line phone-li-line-s" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Home indicator */}
      <div className="phone-home" />
    </div>
  );
}

// ── Main Banners page ─────────────────────────────────────────────────────
export default function Banners() {
  const { apiFetch } = useAuth();

  const [banners,  setBanners]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState(EMPTY);
  const [editId,   setEditId]   = useState(null);   // null = create mode
  const [hoverId,  setHoverId]  = useState(null);   // for preview highlight

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await apiFetch('/api/banners');
      const data = await res.json();
      setBanners(data.banners || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  function change(e) {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  function startEdit(banner) {
    setEditId(banner.id);
    setForm({
      title:       banner.title       || '',
      subtitle:    banner.subtitle    || '',
      imageUrl:    banner.imageUrl    || '',
      order:       String(banner.order ?? 0),
      enabled:     banner.enabled     ?? true,
      actionType:  banner.actionType  || 'none',
      actionValue: banner.actionValue || '',
    });
  }

  function cancelEdit() {
    setEditId(null);
    setForm(EMPTY);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        order: Number(form.order) || 0,
      };

      let res, data;
      if (editId) {
        res  = await apiFetch(`/api/banners/${editId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setBanners(bs => bs.map(b => b.id === editId ? data : b).sort((a,b) => (a.order??0)-(b.order??0)));
        toast.success('Banner updated!');
        cancelEdit();
      } else {
        res  = await apiFetch('/api/banners', { method: 'POST', body: JSON.stringify(payload) });
        data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setBanners(bs => [...bs, data].sort((a,b) => (a.order??0)-(b.order??0)));
        toast.success('Banner added!');
        setForm(EMPTY);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id) {
    try {
      const res  = await apiFetch(`/api/banners/${id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBanners(bs => bs.map(b => b.id === id ? { ...b, enabled: data.enabled } : b));
      toast.success(data.enabled ? 'Banner enabled' : 'Banner hidden');
    } catch (err) { toast.error(err.message); }
  }

  async function handleDelete(id, title) {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      await apiFetch(`/api/banners/${id}`, { method: 'DELETE' });
      setBanners(bs => bs.filter(b => b.id !== id));
      if (editId === id) cancelEdit();
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  }

  const activeBanner = hoverId
    ? banners.find(b => b.id === hoverId)
    : editId
    ? { ...form, id: editId, order: Number(form.order) }
    : banners[0] || null;

  const liveCount   = banners.filter(b =>  b.enabled).length;
  const hiddenCount = banners.filter(b => !b.enabled).length;

  return (
    <div className="banners-page">

      {/* ── Page header ──────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Banner Manager</h1>
          <p className="page-sub">
            {banners.length} banners &nbsp;·&nbsp;
            <span className="success">{liveCount} live</span>
            {hiddenCount > 0 && <span className="warning"> · {hiddenCount} hidden</span>}
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {editId && (
            <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>
              ✕ Cancel Edit
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────── */}
      <div className="banners-layout">

        {/* LEFT — form + banner list */}
        <div className="banners-left">

          {/* Form card */}
          <div className="card form-card">
            <div className="form-card-title">
              {editId ? '✎ Edit Banner' : '+ New Banner'}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label className="field-label">Title *</label>
                <input name="title" className="input" value={form.title}
                  onChange={change} placeholder="e.g. Upgrade to Premium" required />
              </div>

              <div className="field">
                <label className="field-label">Subtitle</label>
                <input name="subtitle" className="input" value={form.subtitle}
                  onChange={change} placeholder="Short description shown on the banner" />
              </div>

              <div className="field">
                <label className="field-label">Image URL</label>
                <input name="imageUrl" className="input" value={form.imageUrl}
                  onChange={change} placeholder="https://…" />
                {form.imageUrl && (
                  <div className="img-preview">
                    <img src={form.imageUrl} alt="preview"
                      onError={e => e.target.style.display='none'} />
                  </div>
                )}
              </div>

              <div className="field-row">
                <div className="field">
                  <label className="field-label">Display Order</label>
                  <input name="order" type="number" min="0" className="input"
                    value={form.order} onChange={change} placeholder="0" />
                </div>
                <div className="field">
                  <label className="field-label">Action Type</label>
                  <select name="actionType" className="input select-input"
                    value={form.actionType} onChange={change}>
                    <option value="none">No Action</option>
                    <option value="url">Open URL</option>
                    <option value="screen">Open Screen</option>
                  </select>
                </div>
              </div>

              {form.actionType !== 'none' && (
                <div className="field">
                  <label className="field-label">
                    {form.actionType === 'url' ? 'URL' : 'Screen Route'}
                  </label>
                  <input name="actionValue" className="input" value={form.actionValue}
                    onChange={change}
                    placeholder={form.actionType === 'url' ? 'https://…' : '/home, /upgrade, etc.'} />
                </div>
              )}

              <div className="field-row field-row-center">
                <label className="toggle-label">
                  <div className="toggle-switch">
                    <input type="checkbox" name="enabled" checked={form.enabled} onChange={change} />
                    <span className="toggle-slider" />
                  </div>
                  <span className="toggle-text">{form.enabled ? 'Enabled — visible in app' : 'Disabled — hidden from app'}</span>
                </label>
              </div>

              <div className="form-footer">
                {editId && (
                  <button type="button" className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>
                )}
                <button type="submit" className="btn btn-gold" disabled={saving}>
                  {saving
                    ? <><span className="spinner" style={{width:14,height:14}} /> Saving…</>
                    : editId ? '✦ Update Banner' : '✦ Add Banner'}
                </button>
              </div>
            </form>
          </div>

          {/* Banner list */}
          <div className="banner-list-section">
            <div className="bls-title">All Banners</div>
            {loading ? (
              <div className="page-loading"><span className="spinner" /> Loading…</div>
            ) : banners.length === 0 ? (
              <div className="empty-state" style={{ padding:'2rem' }}>
                <span>▣</span>
                <p>No banners yet. Create one above.</p>
              </div>
            ) : (
              <div className="banner-list">
                {banners.map(b => (
                  <div
                    key={b.id}
                    className={`bl-item${!b.enabled ? ' bl-item-dim' : ''}${editId === b.id ? ' bl-item-editing' : ''}`}
                    onMouseEnter={() => setHoverId(b.id)}
                    onMouseLeave={() => setHoverId(null)}
                  >
                    {/* Thumbnail */}
                    <div className="bl-thumb">
                      {b.imageUrl
                        ? <img src={b.imageUrl} alt={b.title} onError={e => e.target.style.display='none'} />
                        : <span>▣</span>}
                    </div>

                    {/* Info */}
                    <div className="bl-info">
                      <div className="bl-title">{b.title}</div>
                      <div className="bl-meta">
                        <span className="bl-order">#{b.order ?? 0}</span>
                        {b.subtitle && <span className="bl-sub">{b.subtitle}</span>}
                      </div>
                      {b.actionType !== 'none' && (
                        <div className="bl-action">
                          {b.actionType === 'url' ? '🔗' : '📱'} {b.actionValue || b.actionType}
                        </div>
                      )}
                    </div>

                    {/* Controls */}
                    <div className="bl-controls">
                      <span className={`badge ${b.enabled ? 'badge-replied' : 'badge-read'}`}>
                        {b.enabled ? 'Live' : 'Hidden'}
                      </span>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleToggle(b.id)}
                        title={b.enabled ? 'Hide' : 'Show'}
                      >
                        {b.enabled ? '⏸' : '▶'}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => startEdit(b)}
                      >✎</button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(b.id, b.title)}
                      >✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — phone preview */}
        <div className="banners-right">
          <div className="preview-label">Live Preview</div>
          <div className="preview-hint">
            {hoverId ? 'Hovering banner' : editId ? 'Editing banner' : 'First live banner'}
          </div>
          <PhonePreview banners={banners} activeBanner={activeBanner} />
        </div>
      </div>
    </div>
  );
}
