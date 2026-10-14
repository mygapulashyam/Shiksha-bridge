import React, { useEffect, useState } from 'react';
import Layout from '../../components/common/Layout';
import { Alert, EmptyState, Pagination, SectionHeader, PageLoader } from '../../components/common/UI';
import Icon from '../../components/common/Icon';
import ResourceViewerModal from '../../components/features/ResourceViewerModal';
import api from '../../api/axios';

const TYPE_CONFIG = {
  note:          { icon: 'file',     color: '#2563EB', label: 'Note' },
  video:         { icon: 'video',    color: '#7C3AED', label: 'Video' },
  worksheet:     { icon: 'quiz',     color: '#E8650A', label: 'Worksheet' },
  example:       { icon: 'bulb',     color: '#1B7A4E', label: 'Example' },
  step_solution: { icon: 'chart',    color: '#D63B3B', label: 'Step Solution' },
  practice_set:  { icon: 'target',   color: '#F5B820', label: 'Practice Set' },
};

export default function AdminResources() {
  const [resources, setResources] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending'); // 'all' | 'pending' | 'approved'
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [viewingResource, setViewingResource] = useState(null);

  const fetchResources = async (pg = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: pg, limit: 12 });
    if (statusFilter === 'pending') params.set('isApproved', 'false');
    if (statusFilter === 'approved') params.set('isApproved', 'true');
    if (typeFilter) params.set('type', typeFilter);

    try {
      const { data } = await api.get(`/features/resources?${params}`);
      setResources(data.data || []);
      setPagination(data.pagination || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources(page);
  }, [page, statusFilter, typeFilter]);

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await api.patch(`/features/resources/${id}/approve`);
      setMsg('Resource approved successfully! It is now live for students.');
      fetchResources(page);
    } catch (err) {
      setError(err.response?.data?.message || 'Approval failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      await api.patch(`/features/resources/${id}/reject`);
      setMsg('Resource rejected.');
      fetchResources(page);
    } catch (err) {
      setError(err.response?.data?.message || 'Rejection failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title flex items-center gap-2">
              <Icon name="library" size={26} color="var(--primary)" />
              <span>Content Library & Approvals</span>
            </h1>
            <p className="page-subtitle">Review teacher-submitted notes, videos, worksheets, and approve them for students</p>
          </div>
          <div className="flex gap-2">
            <button
              className={`btn btn-sm ${statusFilter === 'pending' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setStatusFilter('pending'); setPage(1); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Icon name="clock" size={14} color={statusFilter === 'pending' ? 'white' : 'currentColor'} />
              <span>Pending Review</span>
            </button>
            <button
              className={`btn btn-sm ${statusFilter === 'approved' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setStatusFilter('approved'); setPage(1); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Icon name="check" size={14} color={statusFilter === 'approved' ? 'white' : 'currentColor'} />
              <span>Approved (Live)</span>
            </button>
            <button
              className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ border: '1px solid var(--gray-200)' }}
              onClick={() => { setStatusFilter('all'); setPage(1); }}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
      {msg && <Alert type="success" onClose={() => setMsg('')}>{msg}</Alert>}

      {/* Type filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          className={`btn btn-sm ${!typeFilter ? 'btn-primary' : 'btn-ghost'}`}
          style={{ border: '1px solid var(--gray-200)' }}
          onClick={() => { setTypeFilter(''); setPage(1); }}
        >
          All Types
        </button>
        {Object.entries(TYPE_CONFIG).map(([k, v]) => (
          <button
            key={k}
            className={`btn btn-sm ${typeFilter === k ? 'btn-primary' : 'btn-ghost'}`}
            style={{ border: '1px solid var(--gray-200)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => { setTypeFilter(k); setPage(1); }}
          >
            <Icon name={v.icon} size={14} color={typeFilter === k ? 'white' : v.color} />
            <span>{v.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader />
      ) : resources.length === 0 ? (
        <EmptyState
          icon="library"
          title={statusFilter === 'pending' ? 'No pending resources' : 'No resources found'}
          message={statusFilter === 'pending' ? 'All teacher-submitted resources have been reviewed.' : 'No resources match current filter.'}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {resources.map(r => {
            const cfg = TYPE_CONFIG[r.type] || TYPE_CONFIG.note;
            const isPending = !r.isApproved;
            const isProcessing = actionLoading === r._id;

            return (
              <div
                key={r._id}
                style={{
                  background: 'var(--white)',
                  borderRadius: 14,
                  padding: 20,
                  border: isPending ? '2px solid rgba(232, 101, 10, 0.4)' : '2px solid var(--gray-200)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'between',
                }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: cfg.color + '15', border: `1.5px solid ${cfg.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={cfg.icon} size={18} color={cfg.color} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: cfg.color, textTransform: 'uppercase' }}>{cfg.label}</span>
                      <div style={{ fontSize: '0.65rem', color: 'var(--gray-400)' }}>
                        {r.grade ? `Class ${r.grade} · ` : ''}{r.difficulty} · {r.language?.toUpperCase()}
                      </div>
                    </div>
                    {isPending ? (
                      <span className="badge badge-warning" style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>Pending Approval</span>
                    ) : (
                      <span className="badge badge-success" style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>Live</span>
                    )}
                  </div>

                  <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4, color: 'var(--gray-900)' }}>{r.title}</h3>
                  {r.titleHindi && <p style={{ fontSize: '0.8rem', color: 'var(--gray-600)', fontFamily: 'var(--font-devanagari)', marginBottom: 6 }}>{r.titleHindi}</p>}

                  <div className="flex gap-2 flex-wrap mb-2" style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>
                    {r.subject?.name && (
                      <span style={{ background: 'var(--gray-100)', padding: '2px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="book" size={11} color="var(--gray-500)" />
                        {r.subject.name}
                      </span>
                    )}
                    {r.concept?.name && (
                      <span style={{ background: 'var(--gray-100)', padding: '2px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="target" size={11} color="var(--gray-500)" />
                        {r.concept.name}
                      </span>
                    )}
                    {r.createdBy?.name && (
                      <span style={{ background: 'var(--gray-100)', padding: '2px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="user" size={11} color="var(--gray-500)" />
                        By: {r.createdBy.name}
                      </span>
                    )}
                    {r.school?.name && (
                      <span style={{ background: 'var(--gray-100)', padding: '2px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="school" size={11} color="var(--gray-500)" />
                        {r.school.name}
                      </span>
                    )}
                  </div>

                  {r.content && (
                    <div style={{ marginTop: 8 }}>
                      <p style={{ fontSize: '0.82rem', color: 'var(--gray-600)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>
                        {r.content}
                      </p>
                      <button
                        type="button"
                        onClick={() => setViewingResource(r)}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.75rem', padding: '2px 0', marginTop: 4, color: 'var(--primary)', fontWeight: 600 }}
                      >
                        Read full note in-app →
                      </button>
                    </div>
                  )}

                  {r.videoUrl && (
                    <div style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => setViewingResource(r)}
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <Icon name="video" size={14} color="white" />
                        <span>Watch Video In-App</span>
                      </button>
                    </div>
                  )}

                  {r.fileUrl && (
                    <div style={{ marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => setViewingResource(r)}
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <Icon name="file" size={14} color="white" />
                        <span>View Document In-App</span>
                      </button>
                    </div>
                  )}

                  {r.duration && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="clock" size={12} color="var(--gray-400)" />
                      <span>{r.duration} min read/watch</span>
                    </div>
                  )}
                </div>

                {/* Approval actions */}
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--gray-100)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  {isPending ? (
                    <>
                      <button
                        className="btn btn-outline btn-sm"
                        disabled={isProcessing}
                        onClick={() => handleReject(r._id)}
                        style={{ color: 'var(--danger)', borderColor: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Icon name="close" size={13} color="var(--danger)" />
                        <span>Reject</span>
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={isProcessing}
                        onClick={() => handleApprove(r._id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Icon name="check" size={13} color="white" />
                        <span>{isProcessing ? 'Approving…' : 'Approve & Publish'}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={isProcessing}
                      onClick={() => handleReject(r._id)}
                      style={{ color: 'var(--gray-500)', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <Icon name="refresh" size={12} color="var(--gray-500)" />
                      <span>Move to Pending</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination pagination={pagination} onPageChange={setPage} />

      <ResourceViewerModal
        open={!!viewingResource}
        onClose={() => setViewingResource(null)}
        resource={viewingResource}
      />
    </Layout>
  );
}
