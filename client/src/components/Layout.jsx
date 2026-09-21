import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import './Layout.css';

const NAV = [
  { to: '/',              icon: '◈',  label: 'Dashboard',      end: true },
  { to: '/contacts',      icon: '✉',  label: 'Contacts'     },
  { to: '/waitlist',      icon: '◎',  label: 'Waitlist'      },
  { to: '/users',         icon: '⬡',  label: 'App Users'     },
  { to: '/banners',       icon: '▣',  label: 'Banners'       },
  { to: '/pricing',       icon: '₹',  label: 'Pricing'       },
  { to: '/website-templates', icon: '🌐', label: 'Website Studio' },
  { to: '/plan-gating',   icon: '🔐', label: 'Plan Gating'   },
  { to: '/notifications', icon: '🔔', label: 'Notifications' },
  { to: '/ai-limits',      icon: '', label: 'AI image Limit'      },
  { to: '/ai-models',     icon: '🤖', label: 'AI Models'     },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="layout">
      {/* Mobile top navbar */}
      <div className="topbar">
        <div className="topbar-left">
          <button
            className={`menu-toggle${sidebarOpen ? ' active' : ''}`}
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <span className="sidebar-mark">✦</span>
          <span className="sidebar-name">Astric</span>
        </div>
      </div>

      {/* Dim backdrop shown behind the drawer on mobile */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' active' : ''}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
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
              onClick={closeSidebar}
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