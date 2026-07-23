// import { useState, useEffect, useCallback } from 'react';
// import { useAuth } from '../hooks/useAuth.jsx';
// import './AppUsers.css';

// function fmtTokens(n) {
//   if (n >= 100000) return `${(n/100000).toFixed(1)}L`;
//   if (n >= 1000)   return `${(n/1000).toFixed(n%1000===0?0:1)}k`;
//   return String(n);
// }

// function timeAgo(date) {
//   if (!date) return '—';
//   const s = Math.floor((Date.now() - new Date(date)) / 1000);
//   if (s < 3600)   return `${Math.floor(s/60)}m ago`;
//   if (s < 86400)  return `${Math.floor(s/3600)}h ago`;
//   if (s < 604800) return `${Math.floor(s/86400)}d ago`;
//   return new Date(date).toLocaleDateString('en-IN');
// }

// const PLAN_RANK = { premium: 0, standard: 1, basic: 2 };

// export default function AppUsers() {
//   const { apiFetch }   = useAuth();
//   const [users,   setUsers]   = useState([]);
//   const [total,   setTotal]   = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [search,  setSearch]  = useState('');
//   const [planFilter, setPlanFilter] = useState('all');
//   const [sortBy,  setSortBy]  = useState('plan'); // plan | tokens | created

//   const load = useCallback(async () => {
//     setLoading(true);
//     try {
//       const res = await apiFetch('/api/users');
//       const d   = await res.json();
//       setUsers(d.users  || []);
//       setTotal(d.total || 0);
//     } catch (e) { console.error(e); }
//     finally { setLoading(false); }
//   }, [apiFetch]);

//   useEffect(() => { load(); }, [load]);

//   // Filter + sort client-side
//   const visible = users
//     .filter(u => {
//       if (planFilter !== 'all' && u.plan !== planFilter) return false;
//       if (search) {
//         const q = search.toLowerCase();
//         return (u.email||'').includes(q) || (u.displayName||'').toLowerCase().includes(q) || (u.orgName||'').toLowerCase().includes(q);
//       }
//       return true;
//     })
//     .sort((a, b) => {
//       if (sortBy === 'plan')    return (PLAN_RANK[a.plan]??3) - (PLAN_RANK[b.plan]??3);
//       if (sortBy === 'tokens')  return b.tokensUsed - a.tokensUsed;
//       if (sortBy === 'created') return new Date(b.createdAt) - new Date(a.createdAt);
//       return 0;
//     });

//   const progressColor = pct =>
//     pct >= 90 ? 'var(--danger)' : pct >= 60 ? 'var(--warning)' : 'var(--success)';

//   return (
//     <div className="users-page">
//       <div className="page-header">
//         <div>
//           <h1 className="page-title">App Users</h1>
//           <p className="page-sub">{total} registered users on Firebase</p>
//         </div>
//         <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
//       </div>

//       {/* Filters bar */}
//       <div className="users-toolbar">
//         <input
//           className="input search-input"
//           placeholder="Search by email, name, org…"
//           value={search}
//           onChange={e => setSearch(e.target.value)}
//           style={{ maxWidth: 280 }}
//         />
//         <div className="plan-filters">
//           {['all', 'premium', 'standard', 'basic'].map(p => (
//             <button
//               key={p}
//               className={`filter-tab${planFilter === p ? ' active' : ''}`}
//               onClick={() => setPlanFilter(p)}
//             >
//               {p.charAt(0).toUpperCase() + p.slice(1)}
//             </button>
//           ))}
//         </div>
//         <select
//           className="input sort-select"
//           value={sortBy}
//           onChange={e => setSortBy(e.target.value)}
//           style={{ width: 'auto', padding: '7px 12px' }}
//         >
//           <option value="plan">Sort: Plan</option>
//           <option value="tokens">Sort: Token Usage</option>
//           <option value="created">Sort: Newest</option>
//         </select>
//       </div>

//       {loading ? (
//         <div className="page-loading"><span className="spinner" /> Loading Firebase users…</div>
//       ) : visible.length === 0 ? (
//         <div className="empty-state">
//           <span>⬡</span>
//           <p>No users found.</p>
//         </div>
//       ) : (
//         <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
//           <div className="table-wrap">
//             <table>
//               <thead>
//                 <tr>
//                   <th>User</th>
//                   <th>Plan</th>
//                   <th>Cycle</th>
//                   <th>Tokens Used</th>
//                   <th>Usage</th>
//                   <th>Add-on Left</th>
//                   <th>Last Reset</th>
//                   <th>Last Sign-in</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {visible.map(u => (
//                   <tr key={u.uid}>
//                     <td>
//                       <div className="user-row">
//                         {u.photoURL
//                           ? <img src={u.photoURL} alt="" className="user-thumb" referrerPolicy="no-referrer" />
//                           : <div className="user-thumb-placeholder">{(u.displayName||u.email||'?')[0].toUpperCase()}</div>}
//                         <div>
//                           <div className="user-dname">{u.displayName || '—'}</div>
//                           <div className="user-uemail">{u.email}</div>
//                           {u.orgName && <div className="user-org">{u.orgName}</div>}
//                         </div>
//                       </div>
//                     </td>
//                     <td><span className={`badge badge-${u.plan}`}>{u.plan}</span></td>
//                     <td style={{ fontSize:'0.8rem', color:'var(--text-2)' }}>{u.cycle}</td>
//                     <td>
//                       <div className="token-cell">
//                         <span className="token-used">{fmtTokens(u.tokensUsed)}</span>
//                         <span className="token-sep">/</span>
//                         <span className="token-alloc">{fmtTokens(u.allocation)}</span>
//                       </div>
//                     </td>
//                     <td>
//                       <div style={{ display:'flex', alignItems:'center', gap:8 }}>
//                         <div className="progress-bar" style={{ width:80 }}>
//                           <div
//                             className="progress-fill"
//                             style={{ width:`${u.usagePct}%`, background: progressColor(u.usagePct) }}
//                           />
//                         </div>
//                         <span style={{ fontSize:'0.75rem', color:'var(--text-2)', width:32 }}>{u.usagePct}%</span>
//                       </div>
//                     </td>
//                     <td>
//                       <span style={{ color: u.addonLeft > 0 ? 'var(--gold)' : 'var(--text-3)', fontSize:'0.85rem', fontWeight: u.addonLeft > 0 ? 600 : 400 }}>
//                         {u.addonLeft > 0 ? `+${fmtTokens(u.addonLeft)}` : '—'}
//                       </span>
//                     </td>
//                     <td style={{ fontSize:'0.8rem', color:'var(--text-3)' }}>{u.lastReset || '—'}</td>
//                     <td style={{ fontSize:'0.8rem', color:'var(--text-3)', whiteSpace:'nowrap' }}>{timeAgo(u.lastSignIn)}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//           <div className="table-footer">
//             Showing {visible.length} of {total} users
//             {search || planFilter !== 'all' ? ` (filtered)` : ''}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';
import './AppUsers.css';

function fmtTokens(n) {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return String(n || 0);
}

function timeAgo(date) {
  if (!date) return '—';
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(date).toLocaleDateString('en-IN');
}

const PLAN_RANK = { premium: 0, standard: 1, basic: 2 };

export default function AppUsers() {
  const { apiFetch } = useAuth();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [sortBy, setSortBy] = useState('plan');

  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/users');
      const d = await res.json();
      setUsers(d.users || []);
      setTotal(d.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  const openDetails = async (uid) => {
    setDetailsLoading(true);
    setSelectedUser(null);
    try {
      const res = await apiFetch(`/api/users/${uid}`);
      const d = await res.json();
      setSelectedUser(d.user || null);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailsLoading(false);
    }
  };

  const toggleRestrict = async (u) => {
    const restricted = !(u.disabled || u.restricted);
    const reason = restricted ? 'Restricted by admin from AppUsers panel' : '';
    setActionLoading(u.uid);
    try {
      await apiFetch(`/api/users/${u.uid}/restrict`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restricted, reason }),
      });
      await load();
      if (selectedUser?.uid === u.uid) {
        await openDetails(u.uid);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to update user status.');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (u) => {
    const ok = window.confirm(`Delete ${u.email || u.name || u.uid}? This is permanent.`);
    if (!ok) return;

    setActionLoading(u.uid);
    try {
      await apiFetch(`/api/users/${u.uid}`, { method: 'DELETE' });
      setSelectedUser(null);
      await load();
    } catch (e) {
      console.error(e);
      alert('Failed to delete user.');
    } finally {
      setActionLoading(null);
    }
  };

  const visible = users
    .filter(u => {
      if (planFilter !== 'all' && u.plan !== planFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (u.email || '').toLowerCase().includes(q) ||
          (u.name || u.displayName || '').toLowerCase().includes(q) ||
          (u.orgName || '').toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'plan') return (PLAN_RANK[a.plan] ?? 3) - (PLAN_RANK[b.plan] ?? 3);
      if (sortBy === 'tokens') return (b.tokensUsed || 0) - (a.tokensUsed || 0);
      if (sortBy === 'created') return new Date(b.createdAt) - new Date(a.createdAt);
      return 0;
    });

  const progressColor = pct =>
    pct >= 90 ? 'var(--danger)' : pct >= 60 ? 'var(--warning)' : 'var(--success)';

  const isRestricted = u => !!(u?.disabled || u?.restricted);

  return (
    <div className="users-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">App Users</h1>
          <p className="page-sub">{total} registered users on Firebase</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
      </div>

      <div className="users-toolbar">
        <input
          className="input search-input"
          placeholder="Search by email, name, org…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <div className="plan-filters">
          {['all', 'premium', 'standard', 'basic'].map(p => (
            <button
              key={p}
              className={`filter-tab${planFilter === p ? ' active' : ''}`}
              onClick={() => setPlanFilter(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <select
          className="input sort-select"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{ width: 'auto', padding: '7px 12px' }}
        >
          <option value="plan">Sort: Plan</option>
          <option value="tokens">Sort: Token Usage</option>
          <option value="created">Sort: Newest</option>
        </select>
      </div>

      {loading ? (
        <div className="page-loading"><span className="spinner" /> Loading Firebase users…</div>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <span>⬡</span>
          <p>No users found.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Cycle</th>
                  <th>Tokens Used</th>
                  <th>Usage</th>
                  <th>Add-on Left</th>
                  <th>Last Reset</th>
                  <th>Last Sign-in</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(u => (
                  <tr key={u.uid}>
                    <td>
                      <div className="user-row">
                        {u.photoURL
                          ? <img src={u.photoURL} alt="" className="user-thumb" referrerPolicy="no-referrer" />
                          : <div className="user-thumb-placeholder">{(u.name || u.displayName || u.email || '?')[0].toUpperCase()}</div>}
                        <div>
                          <div className="user-dname">{u.name || u.displayName || '—'}</div>
                          <div className="user-uemail">{u.email}</div>
                          {u.orgName && <div className="user-org">{u.orgName}</div>}
                          {isRestricted(u) && <div className="user-org" style={{ color: 'var(--danger)' }}>Restricted</div>}
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge badge-${u.plan}`}>{u.plan}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>{u.cycle}</td>
                    <td>
                      <div className="token-cell">
                        <span className="token-used">{fmtTokens(u.tokensUsed)}</span>
                        <span className="token-sep">/</span>
                        <span className="token-alloc">{fmtTokens(u.allocation)}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar" style={{ width: 80 }}>
                          <div
                            className="progress-fill"
                            style={{ width: `${u.usagePct}%`, background: progressColor(u.usagePct) }}
                          />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', width: 32 }}>{u.usagePct}%</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: u.addonLeft > 0 ? 'var(--gold)' : 'var(--text-3)', fontSize: '0.85rem', fontWeight: u.addonLeft > 0 ? 600 : 400 }}>
                        {u.addonLeft > 0 ? `+${fmtTokens(u.addonLeft)}` : '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{u.lastReset || '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{timeAgo(u.lastSignIn)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openDetails(u.uid)}
                        >
                          View
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => toggleRestrict(u)}
                          disabled={actionLoading === u.uid}
                          style={isRestricted(u) ? { borderColor: 'var(--warning)' } : {}}
                        >
                          {isRestricted(u) ? 'Unrestrict' : 'Restrict'}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => deleteUser(u)}
                          disabled={actionLoading === u.uid}
                          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            Showing {visible.length} of {total} users
            {search || planFilter !== 'all' ? ' (filtered)' : ''}
          </div>
        </div>
      )}

      {selectedUser || detailsLoading ? (
        <div
          onClick={() => setSelectedUser(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 'min(980px, 96vw)',
              maxHeight: '90vh',
              overflow: 'auto',
              background: 'var(--bg)',
              borderRadius: 20,
              boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
              padding: 20,
            }}
          >
            {detailsLoading ? (
              <div className="page-loading"><span className="spinner" /> Loading user details…</div>
            ) : selectedUser ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ margin: 0 }}>{selectedUser.name || selectedUser.displayName || selectedUser.email}</h2>
                    <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>{selectedUser.email}</p>
                    {selectedUser.organizationName && (
                      <p style={{ margin: '6px 0 0', color: 'var(--text-2)' }}>{selectedUser.organizationName}</p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span className={`badge badge-${selectedUser.plan}`}>{selectedUser.plan}</span>
                    <span className="badge" style={{ background: isRestricted(selectedUser) ? 'rgba(220,38,38,0.15)' : 'rgba(34,197,94,0.15)' }}>
                      {isRestricted(selectedUser) ? 'restricted' : 'active'}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedUser(null)}>Close</button>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 12,
                  marginTop: 18,
                }}>
                  <InfoBox title="Auth" rows={[
                    ['UID', selectedUser.uid],
                    ['Created', selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : '—'],
                    ['Last sign-in', selectedUser.lastSignIn ? new Date(selectedUser.lastSignIn).toLocaleString() : '—'],
                    ['Disabled', String(!!selectedUser.disabled)],
                  ]} />

                  <InfoBox title="Subscription" rows={[
                    ['Plan', selectedUser.subscription?.plan || selectedUser.plan || 'basic'],
                    ['Cycle', selectedUser.subscription?.cycle || selectedUser.cycle || 'monthly'],
                    ['Active', String(!!selectedUser.subscription?.active)],
                    ['Expires at', selectedUser.subscription?.expiresAt ? String(selectedUser.subscription.expiresAt) : '—'],
                  ]} />

                  <InfoBox title="Usage" rows={[
                    ['Allocation', fmtTokens(selectedUser.allocation)],
                    ['Tokens used', fmtTokens(selectedUser.tokensUsed)],
                    ['Tokens left', fmtTokens(selectedUser.tokensLeft)],
                    ['Add-on left', fmtTokens(selectedUser.addonLeft)],
                    ['Usage %', `${selectedUser.usagePct}%`],
                    ['Last reset', selectedUser.lastReset || '—'],
                  ]} />

                  <InfoBox title="Firestore Profile" rows={[
                    ['Name', selectedUser.firestore?.name || selectedUser.name || '—'],
                    ['Organization', selectedUser.firestore?.organizationName || selectedUser.organizationName || '—'],
                    ['Role', selectedUser.firestore?.role || selectedUser.role || 'user'],
                    ['Restricted', String(!!selectedUser.firestore?.restricted)],
                    ['Restriction reason', selectedUser.firestore?.restrictionReason || selectedUser.restrictionReason || '—'],
                  ]} />
                </div>

                <div style={{ marginTop: 18 }}>
                  <h3 style={{ marginBottom: 10 }}>Raw Firestore Document</h3>
                  <pre style={{
                    margin: 0,
                    padding: 16,
                    background: 'rgba(127,127,127,0.12)',
                    borderRadius: 14,
                    overflow: 'auto',
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}>
{JSON.stringify(selectedUser.firestore || {}, null, 2)}
                  </pre>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => toggleRestrict(selectedUser)}
                    disabled={actionLoading === selectedUser.uid}
                  >
                    {isRestricted(selectedUser) ? 'Unrestrict' : 'Restrict'}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => deleteUser(selectedUser)}
                    disabled={actionLoading === selectedUser.uid}
                    style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                  >
                    Delete User
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InfoBox({ title, rows }) {
  return (
    <div style={{
      background: 'rgba(127,127,127,0.08)',
      borderRadius: 16,
      padding: 16,
      minHeight: 180,
    }}>
      <h3 style={{ marginTop: 0, marginBottom: 12 }}>{title}</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
            <span style={{ opacity: 0.75 }}>{k}</span>
            <span style={{ textAlign: 'right', wordBreak: 'break-word' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}