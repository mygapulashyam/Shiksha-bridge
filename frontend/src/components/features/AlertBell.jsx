import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const ALERT_ICONS = {
  low_score:        { icon: '⚠️', color: '#D63B3B', bg: '#FFEBEB' },
  repeated_failure: { icon: '🔴', color: '#991B1B', bg: '#FEE2E2' },
  inactive:         { icon: '💤', color: '#7C3AED', bg: '#F5F3FF' },
  class_avg_drop:   { icon: '📉', color: '#E8650A', bg: '#FFF3E8' },
  mastery_achieved: { icon: '🌟', color: '#1B7A4E', bg: '#E8F5EE' },
  streak_broken:    { icon: '❄️', color: '#2563EB', bg: '#EFF6FF' },
};

export default function AlertBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUnreadCount();
    let interval = null;

    const startPolling = () => {
      if (!interval) interval = setInterval(fetchUnreadCount, 60000);
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchUnreadCount();
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const { data } = await api.get('/features/alerts?limit=1');
      setUnreadCount(data.unreadCount || 0);
    } catch {}
  };

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/features/alerts?limit=8');
      setAlerts(data.data || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {}
    setLoading(false);
  };

  const handleOpen = () => {
    setOpen(!open);
    if (!open) fetchAlerts();
  };

  const markRead = async (alertId) => {
    try {
      await api.patch(`/features/alerts/${alertId}/read`);
      setAlerts(prev => prev.map(a => a._id === alertId ? { ...a, isRead: true } : a));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const dismiss = async (alertId, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/features/alerts/${alertId}/dismiss`);
      setAlerts(prev => prev.filter(a => a._id !== alertId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.patch('/features/alerts/read-all');
      setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Button */}
      <button onClick={handleOpen}
        aria-label="Alerts"
        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 8, transition: 'background 0.15s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-700)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-100)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: 'var(--danger)', color: 'white',
            borderRadius: '50%', width: 17, height: 17,
            fontSize: '0.65rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid white', lineHeight: 1,
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0,
          width: 360, background: 'var(--white)',
          borderRadius: 14, boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--gray-200)', zIndex: 300,
          overflow: 'hidden',
          animation: 'slideUp 0.15s ease',
        }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              <span>Alerts</span>
              {unreadCount > 0 && <span style={{ fontSize: '0.75rem', background: 'var(--danger)', color: 'white', borderRadius: 10, padding: '1px 7px', marginLeft: 4 }}>{unreadCount}</span>}
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem' }} onClick={markAllRead}>Mark all read</button>
              )}
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.72rem' }}
                onClick={() => {
                  setOpen(false);
                  navigate(user?.role === 'admin' ? '/admin' : '/teacher/alerts');
                }}
              >
                View all →
              </button>
            </div>
          </div>

          {/* Alert list */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--gray-400)' }}>Loading…</div>
            ) : alerts.length === 0 ? (
              <div style={{ padding: 28, textAlign: 'center', color: 'var(--gray-400)' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>✅</div>
                <p style={{ fontSize: '0.85rem' }}>No alerts right now</p>
              </div>
            ) : alerts.map(a => {
              const cfg = ALERT_ICONS[a.type] || ALERT_ICONS.low_score;
              return (
                <div key={a._id}
                  onClick={() => !a.isRead && markRead(a._id)}
                  style={{
                    padding: '12px 16px', borderBottom: '1px solid var(--gray-100)',
                    display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer',
                    background: a.isRead ? 'transparent' : `${cfg.bg}`,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (a.isRead) e.currentTarget.style.background = 'var(--gray-50)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = a.isRead ? 'transparent' : cfg.bg; }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0, border: `1.5px solid ${cfg.color}30` }}>
                    {cfg.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: a.isRead ? 500 : 700, fontSize: '0.82rem', color: 'var(--gray-900)', lineHeight: 1.3 }}>
                      {a.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {a.message}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--gray-400)', marginTop: 3 }}>
                      {a.student?.name && `👤 ${a.student.name} · `}
                      {new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <button onClick={(e) => dismiss(a._id, e)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-300)', fontSize: '0.9rem', padding: 2, flexShrink: 0 }}
                    title="Dismiss">✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
