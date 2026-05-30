import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, languagesList } from '../../context/LanguageContext';
import AlertBell from '../features/AlertBell';

const NAV = {
  admin: [
    { to: '/admin',           label: 'Dashboard',          icon: '📊', exact: true },
    { to: '/admin/schools',   label: 'Schools',             icon: '🏫' },
    { to: '/admin/users',     label: 'Users',               icon: '👥' },
    { to: '/admin/classes',   label: 'Classes',             icon: '🎒' },
    { to: '/admin/subjects',  label: 'Subjects & Concepts', icon: '📚' },
    { to: '/admin/analytics', label: 'Analytics',           icon: '📈' },
    { to: '/admin/import',    label: 'CSV Import',          icon: '📥' },
    { to: '/admin/rankings',  label: 'District Rankings',   icon: '🏆' },
  ],
  teacher: [
    { to: '/teacher',             label: 'Dashboard',        icon: '🏠', exact: true },
    { to: '/teacher/quizzes',     label: 'My Quizzes',       icon: '📝' },
    { to: '/teacher/quizzes/new', label: 'Create Quiz',      icon: '➕' },
    { to: '/teacher/ai-quiz',     label: 'AI Quiz Generator',icon: '🤖' },
    { to: '/teacher/alerts',      label: 'Alerts',           icon: '🔔' },
    { to: '/teacher/doubts',      label: 'Doubt Box',        icon: '❓' },
    { to: '/teacher/resources',   label: 'Content Library',  icon: '📖' },
  ],
  student: [
    { to: '/student',          label: 'Dashboard',      icon: '🏠', exact: true },
    { to: '/student/quizzes',  label: 'My Quizzes',     icon: '📝' },
    { to: '/student/paths',    label: 'Learning Paths', icon: '🗺️' },
    { to: '/student/progress', label: 'My Progress',    icon: '📈' },
    { to: '/student/doubts',   label: 'Ask a Doubt',    icon: '❓' },
    { to: '/student/report',   label: 'My Report',      icon: '📄' },
  ],
};

const ROLE_LABELS = { admin: 'Administrator', teacher: 'Teacher', student: 'Student' };
const ROLE_COLORS = { admin: 'hsl(24,93%,49%)', teacher: 'hsl(153,63%,29%)', student: 'hsl(217,89%,53%)' };
const ROLE_GRADIENTS = {
  admin:   'linear-gradient(135deg, hsl(24,93%,49%), hsl(24,91%,38%))',
  teacher: 'linear-gradient(135deg, hsl(153,63%,29%), hsl(153,65%,21%))',
  student: 'linear-gradient(135deg, hsl(217,89%,53%), hsl(217,89%,40%))',
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { currentLanguage, changeLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const navItems = NAV[user?.role] || [];
  const initials = user?.name
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    setSidebarOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <a className="skip-link" href="#main-content">Skip to content</a>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <nav
        className={`sidebar ${sidebarOpen ? 'open' : ''}`}
        aria-label="Main Navigation"
      >
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">
            <span style={{ fontSize: '1.5rem' }}>🎓</span>
            ShikshaBridge
          </div>
          <div className="sidebar-logo-sub">Learning for Every Child</div>
        </div>

        {/* Nav Items */}
        <div className="sidebar-nav" role="list">
          <div className="nav-section-label">Navigation</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              role="listitem"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-item-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Language Switcher */}
        <div className="sidebar-lang">
          <div style={{
            fontSize: '0.6rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1.8px',
            color: 'rgba(255,255,255,0.3)',
            marginBottom: '6px',
          }}>
            🌐 Language
          </div>
          <select
            value={currentLanguage}
            onChange={e => changeLanguage(e.target.value)}
            aria-label="Select language"
          >
            {languagesList.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.label}</option>
            ))}
          </select>
        </div>

        {/* User Profile */}
        <div className="sidebar-user">
          <div
            className="avatar"
            style={{ background: ROLE_GRADIENTS[user?.role] }}
            aria-hidden="true"
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              color: 'rgba(255,255,255,0.92)',
              fontWeight: 700,
              fontSize: '0.82rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {user?.name}
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.38)',
              fontSize: '0.68rem',
              fontWeight: 500,
              marginTop: '1px',
            }}>
              {ROLE_LABELS[user?.role]}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '50%',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              fontSize: '0.95rem',
              flexShrink: 0,
              transition: 'all 200ms ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(214,59,59,0.25)';
              e.currentTarget.style.borderColor = 'rgba(214,59,59,0.5)';
              e.currentTarget.style.color = '#ff8080';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
            }}
          >
            ↩
          </button>
        </div>
      </nav>

      {/* ── Main Area ── */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          {/* Left section */}
          <div className="flex items-center gap-3">
            <button
              className="hamburger"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={sidebarOpen}
            >
              <span style={{
                transform: sidebarOpen ? 'translateY(7px) rotate(45deg)' : 'none',
                transition: 'all 200ms ease',
              }} />
              <span style={{
                opacity: sidebarOpen ? 0 : 1,
                transform: sidebarOpen ? 'scaleX(0)' : 'scaleX(1)',
                transition: 'all 200ms ease',
              }} />
              <span style={{
                transform: sidebarOpen ? 'translateY(-7px) rotate(-45deg)' : 'none',
                transition: 'all 200ms ease',
              }} />
            </button>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: '1rem',
                color: 'var(--gray-900)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}>
                ShikshaBridge
              </div>
              <div style={{
                fontSize: '0.67rem',
                color: 'var(--gray-500)',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginTop: '2px',
              }}>
                {ROLE_LABELS[user?.role]} Portal
              </div>
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-3">
            {/* Student XP/Streak bar */}
            {user?.role === 'student' && (
              <>
                <div className="streak-badge" aria-label={`${user?.streak || 0} day streak`}>
                  🔥 {user?.streak || 0}
                </div>
                <div className="hidden-mobile" style={{
                  fontSize: '0.78rem',
                  color: 'var(--gray-600)',
                  fontWeight: 700,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  lineHeight: 1.2,
                }}>
                  <span>Lv. {user?.level || 1}</span>
                  <span style={{ color: 'var(--gray-400)', fontSize: '0.68rem' }}>{user?.xp || 0} XP</span>
                </div>
              </>
            )}

            {/* Alert Bell for teacher/admin */}
            {(user?.role === 'teacher' || user?.role === 'admin') && <AlertBell />}

            {/* User avatar */}
            <div
              className="flex items-center gap-2"
              style={{ cursor: 'default' }}
              title={user?.name}
            >
              <div
                className="avatar avatar-sm"
                style={{ background: ROLE_GRADIENTS[user?.role] }}
                aria-hidden="true"
              >
                {initials}
              </div>
              <div className="hidden-mobile" style={{ lineHeight: 1.25 }}>
                <div style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--gray-800)',
                }}>
                  {user?.name}
                </div>
                <div style={{
                  fontSize: '0.65rem',
                  color: 'var(--gray-400)',
                  fontWeight: 500,
                }}>
                  {user?.email}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main id="main-content" className="page-body" tabIndex="-1">
          {children}
        </main>
      </div>
    </div>
  );
}
