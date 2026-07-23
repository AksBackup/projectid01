import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth.jsx';
import './Subscribers.css';

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return new Date(date).toLocaleDateString('en-IN');
}

const ANNOUNCEMENT_TEMPLATE = `Hi there!

We're excited to share some big news — Astric is now available for early access on Android!

Astric is your all-in-one business suite with an AI assistant built in. Manage leads, tasks, finances, and generate websites — all from your phone.

👉 Download it here: [Play Store link coming soon]

Thank you for being one of our earliest supporters. You've helped us get here.

Best regards,
The Astric Team`;

export default function Subscribers() {
  const { apiFetch }  = useAuth();
  const [subs, setSubs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [subject, setSubject] = useState('🚀 Astric is Live on Android!');
  const [body, setBody] = useState(ANNOUNCEMENT_TEMPLATE);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);

  // ✅ NEW: selected users
  const [selected, setSelected] = useState([]);

  const PER_PAGE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/subscribers?page=${page}&limit=${PER_PAGE}`);
      const d   = await res.json();
      setSubs(d.subscribers || []);
      setTotal(d.total || 0);
      setSelected([]); // reset selection on reload
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [apiFetch, page]);

  useEffect(() => { load(); }, [load]);

  // ✅ Toggle single select
  function toggleSelect(id) {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  }

  // ✅ Select all on page
  function toggleSelectAll() {
    if (selected.length === subs.length) {
      setSelected([]);
    } else {
      setSelected(subs.map(s => s._id));
    }
  }

  async function deleteSub(id) {
    if (!confirm('Remove this subscriber?')) return;
    try {
      await apiFetch(`/api/subscribers/${id}`, { method: 'DELETE' });
      setSubs(s => s.filter(x => x._id !== id));
      setTotal(t => t - 1);
      toast.success('Removed');
    } catch { toast.error('Failed'); }
  }

  async function sendAnnouncement() {
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and body required');
      return;
    }

    const targetCount = selected.length || total;

    if (!confirm(`Send to ${targetCount} subscribers?`)) return;

    setSending(true);
    try {
      const res = await apiFetch('/api/subscribers/announce', {
        method: 'POST',
        body: JSON.stringify({
          subject,
          body,
          // ✅ send selected ids
          ids: selected.length ? selected : null
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`Sent to ${data.sent} subscribers!`);
      setShowModal(false);
      setSelected([]);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }

  const SOURCE_COLORS = {
    'landing-hero': '#0A84FF',
    'footer': '#C8A96E',
    'website': '#34C759',
  };

  return (
    <div className="subscribers-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Waitlist</h1>
          <p className="page-sub">{total} early access signups</p>
        </div>

        {/* ✅ show selected count */}
        <button className="btn btn-gold" onClick={() => setShowModal(true)}>
          ✦ Send ({selected.length || total})
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {/* ✅ Select all checkbox */}
                <th>
                  <input
                    type="checkbox"
                    checked={selected.length === subs.length && subs.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>#</th>
                <th>Email</th>
                <th>Source</th>
                <th>Notified</th>
                <th>Signed up</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {subs.map((s, i) => (
                <tr key={s._id}>
                  {/* ✅ Row checkbox */}
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(s._id)}
                      onChange={() => toggleSelect(s._id)}
                    />
                  </td>

                  <td>{(page-1)*PER_PAGE + i + 1}</td>

                  <td>
                    <span className="sub-email">{s.email}</span>
                  </td>

                  <td>{s.source}</td>

                  <td>
                    {s.announcementSentAt
                      ? 'Sent'
                      : '—'}
                  </td>

                  <td>{timeAgo(s.createdAt)}</td>

                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteSub(s._id)}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Send Announcement</h3>

            <input value={subject} onChange={e => setSubject(e.target.value)} />
            <textarea value={body} onChange={e => setBody(e.target.value)} />

            <button onClick={sendAnnouncement}>
              Send to {selected.length || total}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
