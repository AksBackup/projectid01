import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth.jsx';
import './Notifications.css';

const PLAN_OPTIONS = [
  { value: 'all',      label: 'All Users',           icon: '🌐' },
  { value: 'basic',    label: 'Basic Plan only',     icon: '🆓' },
  { value: 'standard', label: 'Standard Plan only',  icon: '⭐' },
  { value: 'premium',  label: 'Premium Plan only',   icon: '👑' },
];

const QUICK_TEMPLATES = [
  {
    title: '🎉 New Feature Alert',
    body: 'We just launched something new! Open the app to check it out.'
  },
  {
    title: '🔧 Maintenance Notice',
    body: 'Scheduled maintenance on Sunday 2-4 AM IST. Brief downtime expected.'
  },
  {
    title: '💰 Upgrade & Save',
    body: 'Upgrade to Premium today and unlock all features. Limited time offer!'
  },
  {
    title: '📅 Reminder',
    body: "Don't forget to update your business data for accurate reports."
  },
];

function formatSentAt(sentAt) {
  if (!sentAt) return '—';

  try {
    if (typeof sentAt === 'string' || typeof sentAt === 'number') {
      return new Date(sentAt).toLocaleString('en-IN');
    }

    if (sentAt instanceof Date) {
      return sentAt.toLocaleString('en-IN');
    }

    if (sentAt?._seconds) {
      return new Date(sentAt._seconds * 1000).toLocaleString('en-IN');
    }

    if (typeof sentAt?.toDate === 'function') {
      return sentAt.toDate().toLocaleString('en-IN');
    }
  } catch (_) {
    // Ignore invalid date formats
  }

  return '—';
}

export default function Notifications() {
  const { apiFetch } = useAuth();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetPlan, setTargetPlan] = useState('all');
  const [sending, setSending] = useState(false);

  const [history, setHistory] = useState([]);
  const [loadingLog, setLoadingLog] = useState(true);

  /**
   * Load notification history.
   *
   * IMPORTANT:
   * Use apiFetch() instead of raw fetch().
   *
   * apiFetch() automatically adds:
   *
   * Authorization: Bearer <admin_token>
   */
  const loadHistory = useCallback(async () => {
    setLoadingLog(true);

    try {
      const res = await apiFetch('/api/notifications/log');

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || 'Failed to load notification history'
        );
      }

      setHistory(data.logs || []);
    } catch (err) {
      console.error('Failed to load notification history:', err);

      // Don't show "Session expired" twice if apiFetch already handled 401.
      if (err.message !== 'Session expired') {
        toast.error(err.message || 'Failed to load notification history');
      }

      setHistory([]);
    } finally {
      setLoadingLog(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function send() {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and message are required');
      return;
    }

    setSending(true);

    try {
      /**
       * IMPORTANT:
       * The backend route is mounted at:
       *
       * /api/notifications/broadcast
       *
       * apiFetch() automatically adds the admin Bearer token.
       */
      const res = await apiFetch('/api/notifications/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          targetPlan,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || 'Failed to send notification'
        );
      }

      toast.success(
        `✅ Sent to ${data.sent} device${data.sent !== 1 ? 's' : ''}`
      );

      setTitle('');
      setBody('');

      await loadHistory();
    } catch (e) {
      console.error('Notification broadcast failed:', e);

      toast.error(
        e.message || 'Something went wrong'
      );
    } finally {
      setSending(false);
    }
  }

  const charLimit = 200;

  return (
    <div className="notif-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Push Notifications</h1>
          <p className="page-sub">
            Broadcast messages to your app users via FCM
          </p>
        </div>
      </div>

      <div className="notif-grid">
        <div className="card notif-compose">
          <div className="notif-section-title">
            📤 Compose Broadcast
          </div>

          <div className="notif-templates-label">
            Quick templates
          </div>

          <div className="notif-templates">
            {QUICK_TEMPLATES.map((t, i) => (
              <button
                key={i}
                type="button"
                className="notif-template-btn"
                onClick={() => {
                  setTitle(t.title);
                  setBody(t.body);
                }}
              >
                {t.title}
              </button>
            ))}
          </div>

          <label className="notif-label">
            Target audience
          </label>

          <div className="notif-plan-pills">
            {PLAN_OPTIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`notif-plan-pill ${
                  targetPlan === p.value ? 'active' : ''
                }`}
                onClick={() => setTargetPlan(p.value)}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>

          <label className="notif-label">
            Notification title
          </label>

          <input
            className="notif-input"
            placeholder="e.g. New Feature Alert 🎉"
            value={title}
            maxLength={65}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="notif-char">
            {title.length}/65
          </div>

          <label className="notif-label">
            Message
          </label>

          <textarea
            className="notif-textarea"
            placeholder="What do you want to tell your users?"
            value={body}
            maxLength={charLimit}
            rows={4}
            onChange={(e) => setBody(e.target.value)}
          />

          <div className="notif-char">
            {body.length}/{charLimit}
          </div>

          {(title || body) && (
            <div className="notif-preview">
              <div className="notif-preview-label">
                Preview
              </div>

              <div className="notif-preview-card">
                <div className="notif-preview-icon">
                  ✦
                </div>

                <div className="notif-preview-content">
                  <div className="notif-preview-title">
                    {title || 'Notification Title'}
                  </div>

                  <div className="notif-preview-body">
                    {body || 'Message body here…'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn btn-gold notif-send-btn"
            onClick={send}
            disabled={
              sending ||
              !title.trim() ||
              !body.trim()
            }
          >
            {sending ? (
              <>
                <span className="spinner-sm" />
                Sending…
              </>
            ) : (
              '🔔 Send Notification'
            )}
          </button>
        </div>

        <div className="card notif-history">
          <div className="notif-section-title">
            📋 Broadcast History
          </div>

          {loadingLog ? (
            <div className="notif-loading">
              <span className="spinner" />
              Loading…
            </div>
          ) : history.length === 0 ? (
            <div className="notif-empty">
              No broadcasts sent yet
            </div>
          ) : (
            history.map((h, i) => (
              <div
                key={h.id || i}
                className="notif-log-item"
              >
                <div className="notif-log-header">
                  <span className="notif-log-title">
                    {h.title}
                  </span>

                  <span className="notif-log-plan">
                    {h.targetPlan}
                  </span>
                </div>

                <div className="notif-log-body">
                  {h.body}
                </div>

                <div className="notif-log-meta">
                  <span>
                    📱 {h.totalSent} sent
                  </span>

                  <span>
                    {formatSentAt(h.sentAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}