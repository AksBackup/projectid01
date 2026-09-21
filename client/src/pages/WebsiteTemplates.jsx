import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth.jsx';
import './WebsiteTemplates.css';

const EMPTY = {
  label: '', description: '', prompt: '', imageUrl: '',
  order: '0', enabled: true,
};

// Card exactly as it will render in the app's "Sample Generated Designs"
// gallery, so admins can see what they're publishing.
function TemplatePreviewCard({ t }) {
  const hasImage = t.imageUrl && t.imageUrl.trim();
  return (
    <div className="wtc-preview-card">
      <div className="wtc-preview-img">
        {hasImage
          ? <img src={t.imageUrl} alt={t.label} onError={e => { e.target.style.display = 'none'; }} />
          : <div className="wtc-no-img">🌐</div>}
      </div>
      <div className="wtc-preview-body">
        <div className="wtc-preview-title">{t.label || 'Template name'}</div>
        <div className="wtc-preview-desc">{t.description || 'Short description shown on the card'}</div>
        <button className="btn btn-ghost btn-sm" disabled>Use</button>
      </div>
    </div>
  );
}

export default function WebsiteTemplates() {
  const { apiFetch } = useAuth();

  const [templates, setTemplates] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [form,      setForm]      = useState(EMPTY);
  const [editId,    setEditId]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await apiFetch('/api/website-templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  function change(e) {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  function startEdit(t) {
    setEditId(t.id);
    setForm({
      label:       t.label       || '',
      description: t.description || '',
      prompt:      t.prompt      || '',
      imageUrl:    t.imageUrl    || '',
      order:       String(t.order ?? 0),
      enabled:     t.enabled     ?? true,
    });
  }

  function cancelEdit() {
    setEditId(null);
    setForm(EMPTY);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.label.trim())  { toast.error('Label is required');  return; }
    if (!form.prompt.trim()) { toast.error('Prompt is required'); return; }

    setSaving(true);
    try {
      const payload = { ...form, order: Number(form.order) || 0 };

      let res, data;
      if (editId) {
        res  = await apiFetch(`/api/website-templates/${editId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setTemplates(ts => ts.map(t => t.id === editId ? data : t).sort((a,b) => (a.order??0)-(b.order??0)));
        toast.success('Template updated!');
        cancelEdit();
      } else {
        res  = await apiFetch('/api/website-templates', { method: 'POST', body: JSON.stringify(payload) });
        data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setTemplates(ts => [...ts, data].sort((a,b) => (a.order??0)-(b.order??0)));
        toast.success('Template added!');
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
      const res  = await apiFetch(`/api/website-templates/${id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTemplates(ts => ts.map(t => t.id === id ? { ...t, enabled: data.enabled } : t));
      toast.success(data.enabled ? 'Template enabled' : 'Template hidden');
    } catch (err) { toast.error(err.message); }
  }

  async function handleDelete(id, label) {
    if (!confirm(`Delete "${label}"?`)) return;
    try {
      await apiFetch(`/api/website-templates/${id}`, { method: 'DELETE' });
      setTemplates(ts => ts.filter(t => t.id !== id));
      if (editId === id) cancelEdit();
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  }

  const liveCount   = templates.filter(t =>  t.enabled).length;
  const hiddenCount = templates.filter(t => !t.enabled).length;
  const previewTemplate = editId ? { ...form, order: Number(form.order) } : EMPTY;

  return (
    <div className="wt-page">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Website Studio — Sample Designs</h1>
          <p className="page-sub">
            {templates.length} templates &nbsp;·&nbsp;
            <span className="success">{liveCount} live</span>
            {hiddenCount > 0 && <span className="warning"> · {hiddenCount} hidden</span>}
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {editId && (
            <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>✕ Cancel Edit</button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      <div className="wt-layout">
        {/* LEFT — form + list */}
        <div className="wt-left">
          <div className="card form-card">
            <div className="form-card-title">
              {editId ? '✎ Edit Sample Design' : '+ New Sample Design'}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label className="field-label">Label *</label>
                <input name="label" className="input" value={form.label}
                  onChange={change} placeholder="e.g. Restaurant" required />
              </div>

              <div className="field">
                <label className="field-label">Description</label>
                <input name="description" className="input" value={form.description}
                  onChange={change} placeholder="Short line shown on the card" />
              </div>

              <div className="field">
                <label className="field-label">Prompt *</label>
                <textarea name="prompt" className="input" rows={3} value={form.prompt}
                  onChange={change}
                  placeholder="The full prompt sent to the AI when someone taps 'Use' on this card"
                  required />
              </div>

              <div className="field">
                <label className="field-label">Image URL</label>
                <input name="imageUrl" className="input" value={form.imageUrl}
                  onChange={change} placeholder="https://…" />
                {form.imageUrl && (
                  <div className="img-preview">
                    <img src={form.imageUrl} alt="preview" onError={e => e.target.style.display='none'} />
                  </div>
                )}
              </div>

              <div className="field-row">
                <div className="field">
                  <label className="field-label">Display Order</label>
                  <input name="order" type="number" min="0" className="input"
                    value={form.order} onChange={change} placeholder="0" />
                </div>
                <div className="field field-row-center">
                  <label className="toggle-label">
                    <div className="toggle-switch">
                      <input type="checkbox" name="enabled" checked={form.enabled} onChange={change} />
                      <span className="toggle-slider" />
                    </div>
                    <span className="toggle-text">{form.enabled ? 'Enabled' : 'Hidden'}</span>
                  </label>
                </div>
              </div>

              <div className="form-footer">
                {editId && (
                  <button type="button" className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>
                )}
                <button type="submit" className="btn btn-gold" disabled={saving}>
                  {saving
                    ? <><span className="spinner" style={{width:14,height:14}} /> Saving…</>
                    : editId ? '✦ Update Design' : '✦ Add Design'}
                </button>
              </div>
            </form>
          </div>

          <div className="wt-list-section">
            <div className="wt-list-title">All Sample Designs</div>
            {loading ? (
              <div className="page-loading"><span className="spinner" /> Loading…</div>
            ) : templates.length === 0 ? (
              <div className="empty-state" style={{ padding:'2rem' }}>
                <span>🌐</span>
                <p>No sample designs yet. Create one above.</p>
              </div>
            ) : (
              <div className="wt-list">
                {templates.map(t => (
                  <div key={t.id} className={`wl-item${!t.enabled ? ' wl-item-dim' : ''}${editId === t.id ? ' wl-item-editing' : ''}`}>
                    <div className="wl-thumb">
                      {t.imageUrl
                        ? <img src={t.imageUrl} alt={t.label} onError={e => e.target.style.display='none'} />
                        : <span>🌐</span>}
                    </div>
                    <div className="wl-info">
                      <div className="wl-title">{t.label}</div>
                      <div className="wl-meta">
                        <span className="wl-order">#{t.order ?? 0}</span>
                        {t.description && <span className="wl-sub">{t.description}</span>}
                      </div>
                    </div>
                    <div className="wl-controls">
                      <span className={`badge ${t.enabled ? 'badge-replied' : 'badge-read'}`}>
                        {t.enabled ? 'Live' : 'Hidden'}
                      </span>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleToggle(t.id)} title={t.enabled ? 'Hide' : 'Show'}>
                        {t.enabled ? '⏸' : '▶'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(t)}>✎</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id, t.label)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — live card preview, exactly as the app renders it */}
        <div className="wt-right">
          <div className="preview-label">Card Preview</div>
          <div className="preview-hint">What this looks like in the app</div>
          <TemplatePreviewCard t={previewTemplate} />
        </div>
      </div>
    </div>
  );
}
