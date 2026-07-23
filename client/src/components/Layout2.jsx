import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import './Layout.css';

const NAV = [
  { to: '/',             icon: '◈',  label: 'Dashboard',    end: true },
  { to: '/contacts',     icon: '✉',  label: 'Contacts'   },
  { to: '/waitlist',     icon: '◎',  label: 'Waitlist'    },
  { to: '/users',        icon: '⬡',  label: 'App Users'   },
  { to: '/banners',      icon: '▣',  label: 'Banners'     },
  { to: '/pricing',      icon: '₹',  label: 'Pricing'     },
  { to: '/plan-gating',  icon: '🔐', label: 'Plan Gating' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-mark">✦</span>
          <span className="sidebar-name">Astric</span>
          <span className="sidebar-tag">Admin</span>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User info at bottom */}
        <div className="sidebar-user">
          {user?.picture
            ? <img src={user.picture} alt="" className="user-avatar" referrerPolicy="no-referrer" />
            : <div className="user-avatar-placeholder">{user?.name?.[0]}</div>}
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-email">{user?.email}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Sign out">⎋</button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
