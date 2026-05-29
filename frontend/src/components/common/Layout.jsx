import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AlertBell from '../features/AlertBell';

const NAV = {
  admin: [
    { to: '/admin',           label: 'Dashboard',         icon: '📊', exact: true },
    { to: '/admin/schools',   label: 'Schools',            icon: '🏫' },
    { to: '/admin/users',     label: 'Users',              icon: '👥' },
    { to: '/admin/classes',   label: 'Classes',            icon: '🎒' },
    { to: '/admin/subjects',  label: 'Subjects & Concepts',icon: '📚' },
    { to: '/admin/analytics', label: 'Analytics',          icon: '📈' },
    { to: '/admin/import',    label: 'CSV Import',         icon: '📥' },
    { to: '/admin/rankings',  label: 'District Rankings',  icon: '🏆' },
  ],
  teacher: [
    { to: '/teacher',              label: 'Dashboard',       icon: '🏠', exact: true },
    { to: '/teacher/quizzes',      label: 'My Quizzes',      icon: '📝' },
    { to: '/teacher/quizzes/new',  label: 'Create Quiz',     icon: '➕' },
    { to: '/teacher/ai-quiz',      label: 'AI Quiz Generator',icon: '🤖' },
    { to: '/teacher/alerts',       label: 'Alerts',          icon: '🔔' },
    { to: '/teacher/doubts',       label: 'Doubt Box',       icon: '❓' },
    { to: '/teacher/resources',    label: 'Content Library', icon: '📖' },
  ],
  student: [
    { to: '/student',           label: 'Dashboard',      icon: '🏠', exact: true },
    { to: '/student/quizzes',   label: 'My Quizzes',     icon: '📝' },
    { to: '/student/paths',     label: 'Learning Paths', icon: '🗺️' },
    { to: '/student/progress',  label: 'My Progress',    icon: '📈' },
    { to: '/student/doubts',    label: 'Ask a Doubt',    icon: '❓' },
    { to: '/student/report',    label: 'My Report',      icon: '📄' },
  ],
};

const ROLE_LABELS = { admin: 'Administrator', teacher: 'Teacher', student: 'Student' };
const ROLE_COLORS = { admin: '#E8650A', teacher: '#1B7A4E', student: '#2563EB' };

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = NAV[user?.role] || [];
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
          onClick={() => setSidebarOpen(false)} />
      )}

      <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">🎓 ShikshaBridge</div>
          <div className="sidebar-logo-sub">Learning for Every Child</div>
        </div>

        <div className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.exact}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}>
              <span className="nav-item-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="sidebar-user">
          <div className="avatar" style={{ background: ROLE_COLORS[user?.role] }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'white', fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>{ROLE_LABELS[user?.role]}</div>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.1rem', padding: 4 }} title="Logout">🚪</button>
        </div>
      </nav>

      <div className="main-content">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
              <span /><span /><span />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--gray-900)' }}>ShikshaBridge</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>{ROLE_LABELS[user?.role]} Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user?.role === 'student' && (
              <>
                <div className="streak-badge">🔥 {user?.streak || 0}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', fontWeight: 600 }}>
                  Lv.{user?.level || 1} · {user?.xp || 0} XP
                </div>
              </>
            )}
            {(user?.role === 'teacher' || user?.role === 'admin') && <AlertBell />}
            <div className="flex items-center gap-2">
              <div className="avatar avatar-sm" style={{ background: ROLE_COLORS[user?.role] }}>{initials}</div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)' }} className="hidden-mobile">{user?.name}</span>
            </div>
          </div>
        </header>

        <main className="page-body">{children}</main>
      </div>
    </div>
  );
}
