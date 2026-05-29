import React from 'react';

/* ── Spinner ── */
export const Spinner = ({ size = 36 }) => (
  <div style={{ width: size, height: size, border: `3px solid var(--gray-200)`, borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
);

export const PageLoader = () => (
  <div className="page-loader"><Spinner /></div>
);

/* ── Alert ── */
export const Alert = ({ type = 'info', children, onClose }) => (
  <div className={`alert alert-${type}`}>
    <span>{type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
    <span style={{ flex: 1 }}>{children}</span>
    {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}>✕</button>}
  </div>
);

/* ── Badge ── */
export const Badge = ({ type = 'gray', children }) => (
  <span className={`badge badge-${type}`}>{children}</span>
);

/* ── Mastery badge ── */
export const MasteryBadge = ({ level }) => {
  const config = {
    weak: { label: 'Weak', cls: 'mastery-weak', icon: '⚠️' },
    developing: { label: 'Developing', cls: 'mastery-developing', icon: '📈' },
    proficient: { label: 'Proficient', cls: 'mastery-proficient', icon: '👍' },
    mastered: { label: 'Mastered', cls: 'mastery-mastered', icon: '⭐' },
    not_started: { label: 'Not Started', cls: '', icon: '○' },
  };
  const c = config[level] || config.not_started;
  return <span className={`badge ${c.cls}`}>{c.icon} {c.label}</span>;
};

/* ── Progress Bar ── */
export const ProgressBar = ({ value, max = 100, color }) => {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const bg = color || (pct < 40 ? 'var(--mastery-weak)' : pct < 70 ? 'var(--mastery-developing)' : 'var(--mastery-mastered)');
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${pct}%`, background: bg }} />
    </div>
  );
};

/* ── Stat Card ── */
export const StatCard = ({ label, value, icon, color, sublabel }) => (
  <div className="stat-card">
    <div className="flex items-center justify-between mb-2">
      <div className="stat-label">{label}</div>
      {icon && <span style={{ fontSize: '1.5rem' }}>{icon}</span>}
    </div>
    <div className="stat-value" style={{ color: color || 'var(--gray-900)' }}>{value ?? '—'}</div>
    {sublabel && <div className="text-xs text-muted mt-1">{sublabel}</div>}
  </div>
);

/* ── Empty State ── */
export const EmptyState = ({ icon = '📭', title, message, action }) => (
  <div className="empty-state">
    <div className="empty-state-icon">{icon}</div>
    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--gray-700)', marginBottom: 8 }}>{title}</div>
    {message && <p style={{ fontSize: '0.9rem', maxWidth: 320, margin: '0 auto' }}>{message}</p>}
    {action && <div style={{ marginTop: 20 }}>{action}</div>}
  </div>
);

/* ── Modal ── */
export const Modal = ({ open, onClose, title, children, size = '' }) => {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size === 'lg' ? 'modal-lg' : ''}`}>
        <div className="flex items-center justify-between mb-4" style={{ borderBottom: '1px solid var(--gray-200)', paddingBottom: 16 }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--gray-500)' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

/* ── Confirm Dialog ── */
export const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) => (
  <Modal open={open} onClose={onClose} title={title}>
    <p style={{ color: 'var(--gray-700)', marginBottom: 24 }}>{message}</p>
    <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmLabel}</button>
    </div>
  </Modal>
);

/* ── Score Circle ── */
export const ScoreCircle = ({ percentage }) => {
  const color = percentage < 40 ? 'var(--mastery-weak)' : percentage < 70 ? 'var(--mastery-developing)' : 'var(--mastery-mastered)';
  return (
    <div className="score-circle" style={{ borderColor: color }}>
      <span className="score-percent" style={{ color }}>{percentage}%</span>
      <span style={{ fontSize: '0.7rem', color: 'var(--gray-500)' }}>Score</span>
    </div>
  );
};

/* ── Pagination ── */
export const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.pages <= 1) return null;
  const { page, pages, hasPrev, hasNext } = pagination;
  return (
    <div className="flex items-center justify-between" style={{ marginTop: 20 }}>
      <span className="text-sm text-muted">Page {page} of {pages}</span>
      <div className="flex gap-2">
        <button className="btn btn-ghost btn-sm" disabled={!hasPrev} onClick={() => onPageChange(page - 1)}>← Prev</button>
        <button className="btn btn-ghost btn-sm" disabled={!hasNext} onClick={() => onPageChange(page + 1)}>Next →</button>
      </div>
    </div>
  );
};

/* ── Search Input ── */
export const SearchInput = ({ value, onChange, placeholder = 'Search...', className = '' }) => (
  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: '100%' }}>
    <span style={{ position: 'absolute', left: 12, color: 'var(--gray-400)' }}>🔍</span>
    <input
      className={`form-input ${className}`}
      style={{ paddingLeft: 36 }}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);

/* ── Section Header ── */
export const SectionHeader = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-900)' }}>{title}</h2>
      {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);
