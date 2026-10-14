import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, languagesList } from '../../context/LanguageContext';
import AlertBell from '../features/AlertBell';

// Minimal SVG Icon Components
const NavIcon = ({ name, size = 18 }) => {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: 'nav-svg-icon',
  };

  switch (name) {
    case 'dashboard':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case 'schools':
      return (
        <svg {...props}>
          <path d="M3 21h18" />
          <path d="M5 21V7l7-4 7 4v14" />
          <path d="M9 10h1" /><path d="M9 14h1" /><path d="M14 10h1" /><path d="M14 14h1" />
          <path d="M10 21v-3a2 2 0 0 1 4 0v3" />
        </svg>
      );
    case 'users':
      return (
        <svg {...props}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'classes':
      return (
        <svg {...props}>
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          <path d="M12 12v3" />
        </svg>
      );
    case 'subjects':
      return (
        <svg {...props}>
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
          <path d="M6 6h10" /><path d="M6 10h7" />
        </svg>
      );
    case 'analytics':
      return (
        <svg {...props}>
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      );
    case 'import':
      return (
        <svg {...props}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      );
    case 'rankings':
      return (
        <svg {...props}>
          <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2" />
          <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" />
          <path d="M6 3h12v7a6 6 0 0 1-12 0V3Z" />
          <path d="M12 16v5" /><path d="M8 21h8" />
        </svg>
      );
    case 'quizzes':
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="m9 15 2 2 4-4" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      );
    case 'ai':
      return (
        <svg {...props}>
          <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
          <path d="M19 3v4" /><path d="M21 5h-4" />
        </svg>
      );
    case 'bell':
      return (
        <svg {...props}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      );
    case 'doubts':
      return (
        <svg {...props}>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case 'resources':
      return (
        <svg {...props}>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      );
    case 'paths':
      return (
        <svg {...props}>
          <circle cx="6" cy="19" r="3" />
          <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
          <circle cx="18" cy="5" r="3" />
        </svg>
      );
    case 'progress':
      return (
        <svg {...props}>
          <path d="M22 12A10 10 0 1 1 12 2" />
          <path d="m16 8 4 4-7 7-4-4" />
        </svg>
      );
    case 'report':
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      );
    case 'academic':
      return (
        <svg {...props}>
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
        </svg>
      );
    case 'logout':
      return (
        <svg {...props}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
    case 'flame':
      return (
        <svg {...props}>
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
};

const NAV = {
  admin: [
    { to: '/admin',           label: 'Dashboard',          icon: 'dashboard', exact: true },
    { to: '/admin/schools',   label: 'Schools',             icon: 'schools' },
    { to: '/admin/users',     label: 'Users',               icon: 'users' },
    { to: '/admin/classes',   label: 'Classes',             icon: 'classes' },
    { to: '/admin/subjects',  label: 'Subjects & Concepts', icon: 'subjects' },
    { to: '/admin/analytics', label: 'Analytics',           icon: 'analytics' },
    { to: '/admin/import',    label: 'CSV Import',          icon: 'import' },
    { to: '/admin/rankings',  label: 'District Rankings',   icon: 'rankings' },
    { to: '/admin/resources', label: 'Content Approvals',   icon: 'resources' },
  ],
  teacher: [
    { to: '/teacher',             label: 'Dashboard',        icon: 'dashboard', exact: true },
    { to: '/teacher/quizzes',     label: 'My Quizzes',       icon: 'quizzes' },
    { to: '/teacher/quizzes/new', label: 'Create Quiz',      icon: 'plus' },
    { to: '/teacher/ai-quiz',     label: 'AI Quiz Generator',icon: 'ai' },
    { to: '/teacher/alerts',      label: 'Alerts',           icon: 'bell' },
    { to: '/teacher/doubts',      label: 'Doubt Box',        icon: 'doubts' },
    { to: '/teacher/resources',   label: 'Content Library',  icon: 'resources' },
  ],
  student: [
    { to: '/student',           label: 'Dashboard',      icon: 'dashboard', exact: true },
    { to: '/student/quizzes',   label: 'My Quizzes',     icon: 'quizzes' },
    { to: '/student/paths',     label: 'Learning Paths', icon: 'paths' },
    { to: '/student/resources', label: 'Study Library',  icon: 'resources' },
    { to: '/student/progress',  label: 'My Progress',    icon: 'progress' },
    { to: '/student/doubts',    label: 'Ask a Doubt',    icon: 'doubts' },
    { to: '/student/report',    label: 'My Report',      icon: 'report' },
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
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
            <img
              src="/logo.png"
              alt="ShikshaBridge"
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                objectFit: 'cover',
                flexShrink: 0
              }}
            />
            <div>
              <div className="sidebar-logo-text">ShikshaBridge</div>
              <div className="sidebar-logo-sub">Learning For Every Child</div>
            </div>
          </Link>
        </div>

        {/* Nav Items */}
        <div className="sidebar-nav" role="list">
          <div className="nav-section-label">Main Menu</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              role="listitem"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-item-icon" aria-hidden="true">
                <NavIcon name={item.icon} size={18} />
              </span>
              <span className="nav-item-label">{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Language Switcher */}
        <div className="sidebar-lang">
          <div className="sidebar-lang-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span>Interface Language</span>
          </div>
          <select
            value={currentLanguage}
            onChange={e => changeLanguage(e.target.value)}
            aria-label="Select language"
            className="sidebar-lang-select"
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
            style={{
              background: ROLE_GRADIENTS[user?.role],
              width: 38,
              height: 38,
              fontSize: '0.82rem',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              flexShrink: 0
            }}
            aria-hidden="true"
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.84rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.01em'
            }}>
              {user?.name}
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.48)',
              fontSize: '0.7rem',
              fontWeight: 600,
              marginTop: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: ROLE_COLORS[user?.role] || '#10B981' }} />
              <span>{ROLE_LABELS[user?.role]}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out of session"
            aria-label="Logout"
            className="sidebar-logout-btn"
          >
            <NavIcon name="logout" size={15} />
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
            <div className="topbar-context">
              <div className="topbar-portal-badge">
                <span className="topbar-portal-dot" style={{ background: ROLE_COLORS[user?.role] || 'var(--primary)' }} />
                <span>{ROLE_LABELS[user?.role]} Space</span>
              </div>
              <div className="topbar-title">
                {user?.school?.name ? user.school.name : 'ShikshaBridge Learning Network'}
              </div>
            </div>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-3">
            {/* Student XP/Streak bar */}
            {user?.role === 'student' && (
              <div className="topbar-gamification">
                <div className="topbar-pill" title="Daily study streak">
                  <NavIcon name="flame" size={15} color="var(--primary)" />
                  <span className="font-bold">{user?.streak || 0}</span>
                  <span className="topbar-pill-sub">day streak</span>
                </div>
                <div className="topbar-pill" title="Current level & earned XP">
                  <NavIcon name="star" size={14} color="var(--accent-dark)" />
                  <span className="font-bold">Lv. {user?.level || 1}</span>
                  <span className="topbar-pill-sub">({user?.xp || 0} XP)</span>
                </div>
              </div>
            )}

            {/* Alert Bell for teacher/admin */}
            {(user?.role === 'teacher' || user?.role === 'admin') && <AlertBell />}

            {/* Topbar User Profile Card */}
            <div
              className="topbar-user-card"
              title={user?.name}
            >
              <div
                className="avatar avatar-sm"
                style={{
                  background: ROLE_GRADIENTS[user?.role],
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
                }}
                aria-hidden="true"
              >
                {initials}
              </div>
              <div className="hidden-mobile" style={{ lineHeight: 1.25 }}>
                <div className="topbar-user-name">
                  {user?.name}
                </div>
                <div className="topbar-user-role">
                  {ROLE_LABELS[user?.role]}
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
