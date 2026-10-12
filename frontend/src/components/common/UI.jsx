import React from 'react';

/* ══════════════════════════════════════════════════════════════
   ShikshaBridge — Premium UI Components v2.0
   ══════════════════════════════════════════════════════════════ */

/* ── Spinner ── */
export const Spinner = ({ size = 36, color }) => (
  <div style={{
    width: size,
    height: size,
    border: `${Math.max(2, size / 12)}px solid var(--gray-200)`,
    borderTopColor: color || 'var(--primary)',
    borderRadius: '50%',
    animation: 'spin 0.65s linear infinite',
    flexShrink: 0,
  }} />
);

export const PageLoader = ({ text }) => (
  <div className="page-loader">
    <Spinner size={40} />
    {text && <span className="page-loader-text">{text}</span>}
  </div>
);

/* ── Alert ── */
const ALERT_ICONS = {
  success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️',
};
export const Alert = ({ type = 'info', children, onClose }) => (
  <div className={`alert alert-${type}`} role="alert">
    <span aria-hidden="true" style={{ flexShrink: 0, fontSize: '1.05rem' }}>
      {ALERT_ICONS[type]}
    </span>
    <span style={{ flex: 1, lineHeight: 1.5 }}>{children}</span>
    {onClose && (
      <button
        onClick={onClose}
        aria-label="Dismiss"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          opacity: 0.6,
          fontSize: '1rem',
          lineHeight: 1,
          padding: '2px',
          borderRadius: '4px',
          flexShrink: 0,
          transition: 'opacity 150ms ease',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
        onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
      >
        ✕
      </button>
    )}
  </div>
);

/* ── Badge ── */
export const Badge = ({ type = 'gray', children }) => (
  <span className={`badge badge-${type}`}>{children}</span>
);

/* ── Mastery Badge ── */
export const MasteryBadge = ({ level }) => {
  const config = {
    weak:        { label: 'Weak',        cls: 'mastery-weak',        icon: '⚠️' },
    developing:  { label: 'Developing',  cls: 'mastery-developing',  icon: '📈' },
    proficient:  { label: 'Proficient',  cls: 'mastery-proficient',  icon: '👍' },
    mastered:    { label: 'Mastered',    cls: 'mastery-mastered',    icon: '⭐' },
    not_started: { label: 'Not Started', cls: 'badge-gray',          icon: '○'  },
  };
  const c = config[level] || config.not_started;
  return <span className={`badge ${c.cls}`}>{c.icon} {c.label}</span>;
};

/* ── Progress Bar ── */
export const ProgressBar = ({ value, max = 100, color, animated = true }) => {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  const bg = color || (
    pct < 40 ? 'linear-gradient(90deg, var(--mastery-weak), hsl(0,62%,60%))' :
    pct < 70 ? 'linear-gradient(90deg, var(--mastery-developing), var(--accent))' :
               'linear-gradient(90deg, var(--secondary), hsl(153,63%,42%))'
  );
  return (
    <div className="progress-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div
        className="progress-fill"
        style={{
          width: `${pct}%`,
          background: bg,
          transition: animated ? undefined : 'none',
          boxShadow: pct > 0 ? '0 0 6px rgba(0,0,0,0.12)' : 'none',
        }}
      />
    </div>
  );
};

/* ── Stat Card ── */
export const StatCard = ({ label, value, icon, color, sublabel, trend, onClick }) => (
  <div
    className={`stat-card ${onClick ? 'card-interactive' : ''}`}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? e => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
  >
    <div className="flex items-center justify-between mb-2">
      <div className="stat-label">{label}</div>
      {icon && (
        <span style={{ fontSize: '1.6rem', lineHeight: 1 }} aria-hidden="true">
          {icon}
        </span>
      )}
    </div>
    <div className="stat-value" style={{ color: color || 'var(--gray-900)' }}>
      {value ?? '—'}
    </div>
    {(sublabel || trend) && (
      <div
        className="flex items-center gap-2 mt-2"
        style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}
      >
        {trend && (
          <span style={{
            color: trend > 0 ? 'var(--success)' : trend < 0 ? 'var(--danger)' : 'var(--gray-400)',
            fontWeight: 700,
          }}>
            {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
          </span>
        )}
        {sublabel && <span>{sublabel}</span>}
      </div>
    )}
  </div>
);

/* ── Empty State ── */
export const EmptyState = ({ icon = '📭', title, message, action }) => (
  <div className="empty-state">
    <span className="empty-state-icon" aria-hidden="true">{icon}</span>
    <div className="empty-state-title">{title}</div>
    {message && (
      <p style={{
        fontSize: 'var(--text-sm)',
        maxWidth: 340,
        margin: 'var(--space-2) auto 0',
        lineHeight: 1.6,
      }}>
        {message}
      </p>
    )}
    {action && <div style={{ marginTop: 'var(--space-5)' }}>{action}</div>}
  </div>
);

/* ── Modal ── */
export const Modal = ({ open, onClose, title, children, size = '' }) => {
  if (!open) return null;
  const sizeClass = size === 'xl' ? 'modal-xl' : size === 'lg' ? 'modal-lg' : size === 'md' ? 'modal-md' : size === 'sm' ? 'modal-sm' : '';
  return (
    <div
      className="modal-overlay"
      onClick={e => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={`modal ${sizeClass}`}>
        <div
          className="flex items-center justify-between"
          style={{
            borderBottom: '1.5px solid var(--gray-150)',
            paddingBottom: 'var(--space-4)',
            marginBottom: 'var(--space-5)',
          }}
        >
          <h2
            id="modal-title"
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 800,
              color: 'var(--gray-900)',
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'var(--gray-100)',
              border: '1px solid var(--gray-200)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '1rem',
              color: 'var(--gray-500)',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--danger-light)';
              e.currentTarget.style.color = 'var(--danger)';
              e.currentTarget.style.borderColor = 'rgba(214,59,59,0.25)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--gray-100)';
              e.currentTarget.style.color = 'var(--gray-500)';
              e.currentTarget.style.borderColor = 'var(--gray-200)';
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

/* ── Confirm Dialog ── */
export const ConfirmDialog = ({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', danger = false,
}) => (
  <Modal open={open} onClose={onClose} title={title} size="sm">
    <p style={{ color: 'var(--gray-600)', marginBottom: 'var(--space-6)', lineHeight: 1.65 }}>
      {message}
    </p>
    <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button
        className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
        onClick={onConfirm}
      >
        {confirmLabel}
      </button>
    </div>
  </Modal>
);

/* ── Score Circle ── */
export const ScoreCircle = ({ score, total, percentage, size = 130 }) => {
  const pct = percentage !== undefined
    ? Math.round(percentage)
    : (total > 0 ? Math.round((score / total) * 100) : 0);
  const color = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)';
  const borderColor = pct >= 80 ? 'var(--secondary-light)' : pct >= 60 ? 'var(--accent-light)' : 'var(--danger-light)';
  return (
    <div
      className="score-circle"
      style={{
        width: size,
        height: size,
        borderColor: borderColor,
        borderWidth: Math.max(6, size / 20),
        boxShadow: `0 0 0 6px ${borderColor}, 0 8px 24px rgba(0,0,0,0.1)`,
      }}
      aria-label={`Score: ${pct}%`}
    >
      <div className="score-percent" style={{ color, fontSize: Math.max(1.6, size / 65) + 'rem' }}>
        {pct}%
      </div>
      {score !== undefined && total !== undefined && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', fontWeight: 600, marginTop: 2 }}>
          {score}/{total}
        </div>
      )}
    </div>
  );
};

/* ── Divider ── */
export const Divider = ({ label, style }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', margin: 'var(--space-4) 0', ...style }}>
    <div style={{ flex: 1, height: '1px', background: 'var(--gray-200)' }} />
    {label && (
      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    )}
    <div style={{ flex: 1, height: '1px', background: 'var(--gray-200)' }} />
  </div>
);

/* ── Section Header ── */
export const SectionHeader = ({ title, subtitle, action }) => (
  <div
    className="flex items-start justify-between"
    style={{ marginBottom: 'var(--space-4)', gap: 'var(--space-3)' }}
  >
    <div>
      <h3 style={{
        fontSize: 'var(--text-lg)',
        fontWeight: 700,
        color: 'var(--gray-900)',
        letterSpacing: '-0.01em',
      }}>
        {title}
      </h3>
      {subtitle && (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', marginTop: '2px' }}>
          {subtitle}
        </p>
      )}
    </div>
    {action}
  </div>
);

/* ── Info Row ── */
export const InfoRow = ({ label, value, icon }) => (
  <div
    className="flex items-center"
    style={{
      padding: 'var(--space-3) 0',
      borderBottom: '1px solid var(--gray-100)',
      gap: 'var(--space-3)',
    }}
  >
    {icon && <span style={{ fontSize: '1.1rem', width: 22, textAlign: 'center' }} aria-hidden="true">{icon}</span>}
    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', fontWeight: 600, minWidth: 120 }}>
      {label}
    </span>
    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-800)', fontWeight: 500, flex: 1 }}>
      {value ?? '—'}
    </span>
  </div>
);

/* ── Skeleton Loader ── */
export const Skeleton = ({ width = '100%', height = 16, rounded = false, style }) => (
  <div
    className="skeleton"
    style={{
      width,
      height,
      borderRadius: rounded ? 'var(--radius-full)' : 'var(--radius-sm)',
      ...style,
    }}
    aria-hidden="true"
  />
);

export const SkeletonCard = () => (
  <div className="card card-sm" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
    <Skeleton height={14} width="60%" />
    <Skeleton height={28} width="40%" />
    <Skeleton height={10} width="80%" />
  </div>
);

/* ── Search Input ── */
export const SearchInput = ({ value, onChange, placeholder = 'Search…', style }) => (
  <div style={{ position: 'relative', ...style }}>
    <span style={{
      position: 'absolute',
      left: 12,
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'var(--gray-400)',
      fontSize: '0.9rem',
      pointerEvents: 'none',
    }} aria-hidden="true">
      🔍
    </span>
    <input
      className="form-input"
      type="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        paddingLeft: 36,
        width: '100%',
      }}
    />
  </div>
);

/* ── Pagination ── */
export const Pagination = ({ pagination, onPageChange }) => {
  const totalPages = pagination?.totalPages || pagination?.pages || 0;
  const page = pagination?.page || 1;
  if (!pagination || totalPages <= 1) return null;

  return (
    <div
      className="flex items-center justify-center gap-2"
      style={{ marginTop: 'var(--space-5)', flexWrap: 'wrap' }}
      aria-label="Pagination"
    >
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        ← Prev
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
        <button
          key={p}
          className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => onPageChange(p)}
          aria-label={`Page ${p}`}
          aria-current={p === page ? 'page' : undefined}
          style={{ minWidth: 36 }}
        >
          {p}
        </button>
      ))}

      <button
        className="btn btn-ghost btn-sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        Next →
      </button>
    </div>
  );
};
