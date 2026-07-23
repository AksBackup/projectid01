import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth.jsx';
import './Contacts.css';

const STATUS_FILTERS = ['all', 'new', 'read', 'replied'];

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

function ReplyModal({ contact, onClose, onReplied, apiFetch }) {
  const [body,       setBody]       = useState('');
  const [drafting,   setDrafting]   = useState(false);
  const [sending,    setSending]    = useState(false);

  async function getDraft() {
    setDrafting(true);
    try {
      const res  = await apiFetch(`/api/contacts/${contact._id}/ai-draft`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBody(data.draft);
      toast.success('AI draft ready — review and edit before sending');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDrafting(false);
    }
  }

  async function sendReply() {
    if (!body.trim()) { toast.error('Reply cannot be empty'); return; }
    setSending(true);
    try {
      const res  = await apiFetch(`/api/contacts/${contact._id}/reply`, {
        method: 'POST',
        body:   JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Reply sent to ${contact.email}`);
      onReplied(data.contact);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">Reply to {contact.name}</div>
            <div style={{ fontSize:'0.8rem', color:'var(--text-2)', marginTop:4 }}>{contact.email} · Re: {contact.subject}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Original message */}
        <div className="original-msg">
          <div className="original-label">Original message</div>
          <div className="original-body">{contact.message}</div>
        </div>

        {/* Reply editor */}
        <div className="reply-section">
          <div className="reply-toolbar">
            <span className="reply-label">Your reply</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={getDraft}
              disabled={drafting || sending}
            >
              {drafting ? <><span className="spinner" style={{width:12,height:12}} /> Generating…</> : '✦ AI Draft'}
            </button>
          </div>
          <textarea
            className="input reply-textarea"
            placeholder="Write your reply here, or click '✦ AI Draft' to generate one…"
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={10}
          />
        </div>

        {/* Previous replies */}
        {contact.replies?.length > 0 && (
          <div className="prev-replies">
            <div className="prev-label">Previous replies ({contact.replies.length})</div>
            {contact.replies.map((r, i) => (
              <div key={i} className="prev-reply">
                <div className="prev-meta">{r.sentBy} · {timeAgo(r.sentAt)}</div>
                <div className="prev-body">{r.body}</div>
              </div>
            ))}
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} disabled={sending}>Cancel</button>
          <button className="btn btn-gold" onClick={sendReply} disabled={sending || !body.trim()}>
            {sending ? <><span className="spinner" style={{width:14,height:14}} /> Sending…</> : '✦ Send Reply'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Contacts() {
  const { apiFetch }    = useAuth();
  const [searchParams]  = useSearchParams();
  const [contacts,  setContacts]  = useState([]);
  const [total,     setTotal]     = useState(0);
  const [filter,    setFilter]    = useState(searchParams.get('status') || 'all');
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null); // contact for reply modal
  const [page,      setPage]      = useState(1);
  const PER_PAGE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs  = new URLSearchParams({ page, limit: PER_PAGE, ...(filter !== 'all' ? { status: filter } : {}) });
      const res = await apiFetch(`/api/contacts?${qs}`);
      const d   = await res.json();
      setContacts(d.contacts || []);
      setTotal(d.total || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [apiFetch, filter, page]);

  useEffect(() => { load(); }, [load]);

  async function markRead(contact) {
    if (contact.status !== 'new') return;
    try {
      const res = await apiFetch(`/api/contacts/${contact._id}/read`, { method: 'PATCH' });
      const d   = await res.json();
      setContacts(cs => cs.map(c => c._id === d._id ? d : c));
    } catch {}
  }

  async function deleteContact(id) {
    if (!confirm('Delete this message permanently?')) return;
    try {
      await apiFetch(`/api/contacts/${id}`, { method: 'DELETE' });
      setContacts(cs => cs.filter(c => c._id !== id));
      setTotal(t => t - 1);
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  }

  function openReply(contact) {
    setSelected(contact);
    markRead(contact);
  }

  function onReplied(updated) {
    setContacts(cs => cs.map(c => c._id === updated._id ? updated : c));
  }

  return (
    <div className="contacts-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Contact Messages</h1>
          <p className="page-sub">{total} total messages</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs">
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            className={`filter-tab${filter === f ? ' active' : ''}`}
            onClick={() => { setFilter(f); setPage(1); }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loading"><span className="spinner" /> Loading…</div>
      ) : contacts.length === 0 ? (
        <div className="empty-state">
          <span>✉</span>
          <p>No {filter !== 'all' ? filter : ''} messages found.</p>
        </div>
      ) : (
        <div className="contacts-list card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Subject</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Received</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => (
                  <tr key={c._id} className={c.status === 'new' ? 'row-new' : ''}>
                    <td>
                      <div className="contact-name">{c.name}</div>
                      <div className="contact-email">{c.email}</div>
                    </td>
                    <td>
                      <div className="contact-subject">{c.subject}</div>
                      <div className="contact-preview">{c.message.slice(0, 60)}{c.message.length > 60 ? '…' : ''}</div>
                    </td>
                    <td>{c.company || <span style={{color:'var(--text-3)'}}>—</span>}</td>
                    <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                    <td style={{whiteSpace:'nowrap'}}>{timeAgo(c.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => openReply(c)}>
                          {c.status === 'replied' ? 'View' : '↩ Reply'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteContact(c._id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > PER_PAGE && (
            <div className="pagination">
              <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => p-1)} disabled={page === 1}>← Prev</button>
              <span className="page-info">Page {page} of {Math.ceil(total / PER_PAGE)}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => p+1)} disabled={page >= Math.ceil(total / PER_PAGE)}>Next →</button>
            </div>
          )}
        </div>
      )}

      {selected && (
        <ReplyModal
          contact={selected}
          onClose={() => setSelected(null)}
          onReplied={onReplied}
          apiFetch={apiFetch}
        />
      )}
    </div>
  );
}
