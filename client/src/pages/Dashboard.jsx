import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import './Dashboard.css';

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="stat-card card">
      <div className="stat-icon" style={{ background: `${color}18`, color }}>{icon}</div>
      <div className="stat-body">
        <div className="stat-value" style={{ color }}>{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

function PlanBar({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="plan-bar-row">
      <div className="plan-bar-label">
        <span className="plan-bar-dot" style={{ background: color }} />
        <span>{label}</span>
        <span className="plan-bar-count">{count}</span>
      </div>
      <div className="progress-bar" style={{ flex: 1, maxWidth: 200 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="plan-bar-pct">{pct}%</span>
    </div>
  );
}

export default function Dashboard() {
  const { apiFetch } = useAuth();
  const [stats,    setStats]    = useState(null);
  const [contacts, setContacts] = useState({ total: 0, new: 0 });
  const [subs,     setSubs]     = useState(0);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, contactsRes, subsRes] = await Promise.all([
          apiFetch('/api/users/stats'),
          apiFetch('/api/contacts?limit=1'),
          apiFetch('/api/subscribers?limit=1'),
        ]);
        const [sd, cd, subd] = await Promise.all([
          statsRes.json(), contactsRes.json(), subsRes.json(),
        ]);
        setStats(sd);
        setContacts({ total: cd.total || 0, new: 0 });
        setSubs(subd.total || 0);

        // Count new contacts
        const newRes  = await apiFetch('/api/contacts?status=new&limit=1');
        const newData = await newRes.json();
        setContacts(c => ({ ...c, new: newData.total || 0 }));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [apiFetch]);

  if (loading) return (
    <div className="page-loading">
      <span className="spinner" /> Loading dashboard…
    </div>
  );

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Astric Technologies — Admin Overview</p>
        </div>
        <div className="page-date">{new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</div>
      </div>

      {/* Stat cards */}
      <div className="stats-row">
        <StatCard label="Total App Users"  value={stats?.total    ?? '—'} sub="on Firebase"      color="#C8A96E" icon="⬡" />
        <StatCard label="Premium Users"    value={stats?.premium  ?? '—'} sub="₹999/mo"          color="#BF5AF2" icon="★" />
        <StatCard label="Standard Users"   value={stats?.standard ?? '—'} sub="₹499/mo"          color="#C8A96E" icon="◎" />
        <StatCard label="Est. MRR"         value={stats ? `₹${(stats.mrr||0).toLocaleString('en-IN')}` : '—'} sub="monthly billing only" color="#34C759" icon="₹" />
        <StatCard label="Contact Messages" value={contacts.total}  sub={contacts.new > 0 ? `${contacts.new} unread` : 'all read'} color="#0A84FF" icon="✉" />
        <StatCard label="Waitlist Signups" value={subs}            sub="early access"             color="#FF9F0A" icon="◈" />
      </div>

      {/* Plan breakdown */}
      <div className="dashboard-grid">
        <div className="card">
          <div className="card-title">Plan Breakdown</div>
          <div className="plan-bars">
            <PlanBar label="Basic"    count={stats?.basic    ?? 0} total={stats?.total ?? 1} color="#555" />
            <PlanBar label="Standard" count={stats?.standard ?? 0} total={stats?.total ?? 1} color="#C8A96E" />
            <PlanBar label="Premium"  count={stats?.premium  ?? 0} total={stats?.total ?? 1} color="#BF5AF2" />
          </div>
          <div className="tokens-total">
            <span>Total tokens used this month</span>
            <strong>{(stats?.totalTokensUsed ?? 0).toLocaleString('en-IN')}</strong>
          </div>
        </div>

        {/* Quick links */}
        <div className="card">
          <div className="card-title">Quick Actions</div>
          <div className="quick-actions">
            <Link to="/contacts?status=new" className="qa-item">
              <span className="qa-icon" style={{ color:'#0A84FF' }}>✉</span>
              <div>
                <div className="qa-label">Unread Messages</div>
                <div className="qa-sub">{contacts.new} waiting for reply</div>
              </div>
              <span className="qa-arrow">→</span>
            </Link>
            <Link to="/waitlist" className="qa-item">
              <span className="qa-icon" style={{ color:'#FF9F0A' }}>◎</span>
              <div>
                <div className="qa-label">Send Announcement</div>
                <div className="qa-sub">Notify {subs} subscribers</div>
              </div>
              <span className="qa-arrow">→</span>
            </Link>
            <Link to="/users" className="qa-item">
              <span className="qa-icon" style={{ color:'#C8A96E' }}>⬡</span>
              <div>
                <div className="qa-label">View All Users</div>
                <div className="qa-sub">{stats?.total ?? 0} registered</div>
              </div>
              <span className="qa-arrow">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
