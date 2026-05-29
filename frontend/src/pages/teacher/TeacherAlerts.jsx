import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { Alert, EmptyState, Pagination, SectionHeader } from '../../components/common/UI';
import api from '../../api/axios';

const TYPE_CONFIG = {
  low_score:        { icon: '⚠️', label: 'Low Score',         color: 'var(--danger)',   bg: '#FFEBEB' },
  repeated_failure: { icon: '🔴', label: 'Repeated Failure',  color: '#991B1B',         bg: '#FEE2E2' },
  inactive:         { icon: '💤', label: 'Student Inactive',  color: '#7C3AED',         bg: '#F5F3FF' },
  class_avg_drop:   { icon: '📉', label: 'Class Avg Dropped', color: 'var(--primary)',  bg: '#FFF3E8' },
  mastery_achieved: { icon: '🌟', label: 'Mastery Achieved',  color: 'var(--secondary)',bg: 'var(--secondary-light)' },
};
const PRIORITY_BADGE = { high: 'badge-danger', medium: 'badge-warning', low: 'badge-success' };

export default function TeacherAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: '', unread: '' });
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState('');

  const fetchAlerts = async (pg = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: pg, limit: 15 });
    if (filter.type) params.set('type', filter.type);
    if (filter.unread) params.set('unread', filter.unread);
    try {
      const { data } = await api.get(`/features/alerts?${params}`);
      setAlerts(data.data); setPagination(data.pagination); setUnreadCount(data.unreadCount || 0);
    } catch { setMsg('Failed to load alerts'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAlerts(page); }, [page, filter]);

  const markRead = async (id) => {
    await api.patch(`/features/alerts/${id}/read`).catch(() => {});
    setAlerts(prev => prev.map(a => a._id === id ? { ...a, isRead: true } : a));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const dismiss = async (id) => {
    await api.patch(`/features/alerts/${id}/dismiss`).catch(() => {});
    setAlerts(prev => prev.filter(a => a._id !== id));
  };

  const markAllRead = async () => {
    await api.patch('/features/alerts/read-all').catch(() => {});
    setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    setUnreadCount(0);
    setMsg('All alerts marked as read');
  };

  return (
    <Layout>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">🔔 Teacher Alerts</h1>
            <p className="page-subtitle">Automatic intervention alerts — {unreadCount} unread</p>
          </div>
          {unreadCount > 0 && (
            <button className="btn btn-outline btn-sm" onClick={markAllRead}>✓ Mark All Read</button>
          )}
        </div>
      </div>

      {msg && <Alert type="success" onClose={() => setMsg('')}>{msg}</Alert>}

      {/* Filter bar */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button className={`btn btn-sm ${!filter.type && !filter.unread ? 'btn-primary' : 'btn-ghost'}`}
          style={{ border: '1px solid var(--gray-200)' }}
          onClick={() => setFilter({ type: '', unread: '' })}>🗂 All</button>
        <button className={`btn btn-sm ${filter.unread === 'true' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ border: '1px solid var(--gray-200)' }}
          onClick={() => setFilter({ type: '', unread: filter.unread === 'true' ? '' : 'true' })}>
          🔵 Unread {unreadCount > 0 && `(${unreadCount})`}
        </button>
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
          <button key={type} className={`btn btn-sm ${filter.type === type ? 'btn-primary' : 'btn-ghost'}`}
            style={{ border: '1px solid var(--gray-200)' }}
            onClick={() => setFilter(p => ({ ...p, type: p.type === type ? '' : type }))}>
            {cfg.icon} {cfg.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : alerts.length === 0 ? (
        <EmptyState icon="✅" title="No alerts" message="Everything looks good! Alerts will appear here when students need attention." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.map(a => {
            const cfg = TYPE_CONFIG[a.type] || TYPE_CONFIG.low_score;
            return (
              <div key={a._id} style={{
                padding: '16px 20px', borderRadius: 14,
                background: a.isRead ? 'var(--white)' : cfg.bg,
                border: `2px solid ${a.isRead ? 'var(--gray-200)' : cfg.color + '30'}`,
                display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: cfg.bg, border: `2px solid ${cfg.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-2 mb-1" style={{ flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: a.isRead ? 600 : 800, fontSize: '0.9rem', color: 'var(--gray-900)' }}>{a.title}</span>
                    <span className={`badge ${PRIORITY_BADGE[a.priority] || 'badge-gray'}`} style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>{a.priority}</span>
                    {!a.isRead && <span style={{ width: 8, height: 8, background: 'var(--primary)', borderRadius: '50%', display: 'inline-block' }} />}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', lineHeight: 1.5 }}>{a.message}</p>
                  <div className="flex gap-4 mt-2 items-center" style={{ flexWrap: 'wrap' }}>
                    {a.student && <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>👤 {a.student.name}</span>}
                    {a.class && <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>🏫 {a.class.name}</span>}
                    <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                      {new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {a.student && (
                      <Link to={`/teacher/students/${a.student._id}`} className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                        View Student →
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {!a.isRead && (
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem' }} onClick={() => markRead(a._id)}>✓ Read</button>
                  )}
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }} onClick={() => dismiss(a._id)}>✕ Dismiss</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Pagination pagination={pagination} onPageChange={setPage} />
    </Layout>
  );
}
