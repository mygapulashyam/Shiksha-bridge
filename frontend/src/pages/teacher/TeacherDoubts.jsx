import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../../components/common/Layout';
import { Alert, EmptyState, Modal, Pagination } from '../../components/common/UI';
import api from '../../api/axios';

const STATUS_COLORS = { open: 'badge-danger', answered: 'badge-success', closed: 'badge-gray' };

export default function TeacherDoubts() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [doubts, setDoubts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [answerModal, setAnswerModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [answer, setAnswer] = useState('');
  const [answerHindi, setAnswerHindi] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('open');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [newCount, setNewCount] = useState(0);

  // Load classes on mount
  useEffect(() => {
    api.get('/teacher/classes').then(r => {
      setClasses(r.data.data);
      if (r.data.data[0]) setSelectedClass(r.data.data[0]._id);
    }).catch(() => {});
  }, []);

  const fetchDoubts = useCallback(async (silent = false) => {
    if (!selectedClass) return;
    if (!silent) setLoading(true);
    const params = new URLSearchParams({ page, limit: 15, status: statusFilter });
    try {
      const { data } = await api.get(`/features/doubts/class/${selectedClass}?${params}`);
      if (silent && statusFilter === 'open') {
        // Count new doubts since last refresh
        const prev = doubts.length;
        const next = data.data?.length || 0;
        if (next > prev) setNewCount(n => n + (next - prev));
      }
      setDoubts(data.data || []);
      setPagination(data.pagination);
      setLastRefresh(new Date());
    } catch {
      if (!silent) setError('Failed to load doubts. Please try again.');
    }
    if (!silent) setLoading(false);
  }, [selectedClass, page, statusFilter]);

  // Fetch on filter/page change
  useEffect(() => {
    fetchDoubts(false);
  }, [fetchDoubts]);

  // Auto-poll every 20 seconds so new student doubts appear automatically
  useEffect(() => {
    if (!selectedClass) return;
    const interval = setInterval(() => fetchDoubts(true), 20000);
    return () => clearInterval(interval);
  }, [selectedClass, fetchDoubts]);

  const handleAnswer = async () => {
    if (!answer.trim()) return;
    setSaving(true);
    try {
      await api.patch(`/features/doubts/${selected._id}/answer`, { answer, answerHindi });
      setMsg('Answer submitted successfully!');
      setAnswerModal(false);
      setAnswer(''); setAnswerHindi('');
      setNewCount(0);
      fetchDoubts(false);
    } catch {
      setError('Failed to submit answer. Please try again.');
    } finally { setSaving(false); }
  };

  const handleRefresh = () => {
    setNewCount(0);
    fetchDoubts(false);
  };

  const handleClassChange = (classId) => {
    setSelectedClass(classId);
    setPage(1);
    setNewCount(0);
  };

  const handleStatusFilter = (s) => {
    setStatusFilter(s);
    setPage(1);
    setNewCount(0);
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">❓ Doubt Box</h1>
          <p className="page-subtitle">Answer student doubts submitted after quizzes</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--gray-500)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Live · Refreshed {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleRefresh} style={{ border: '1px solid var(--gray-200)', position: 'relative' }}>
            🔄 Refresh
            {newCount > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -6,
                background: 'var(--danger)', color: 'white',
                borderRadius: '50%', width: 18, height: 18,
                fontSize: '0.65rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{newCount}</span>
            )}
          </button>
        </div>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
      {msg && <Alert type="success" onClose={() => setMsg('')}>{msg}</Alert>}

      {/* New doubts banner */}
      {newCount > 0 && (
        <div onClick={handleRefresh} style={{
          cursor: 'pointer', marginBottom: 16,
          padding: '10px 16px', borderRadius: 10,
          background: 'var(--primary-light)', border: '1px solid var(--primary)',
          color: 'var(--primary-dark)', fontWeight: 600, fontSize: '0.875rem',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          🔔 {newCount} new doubt{newCount > 1 ? 's' : ''} received! Click to refresh.
        </div>
      )}

      {/* Class selector tabs */}
      {classes.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {classes.map(c => (
            <button key={c._id} className={`btn btn-sm ${selectedClass === c._id ? 'btn-primary' : 'btn-ghost'}`}
              style={{ border: '1px solid var(--gray-200)' }}
              onClick={() => handleClassChange(c._id)}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* No class configured */}
      {classes.length === 0 && !loading && (
        <EmptyState icon="🏫" title="No classes assigned"
          message="You need at least one class assigned to your account to view doubts. Contact your admin." />
      )}

      {classes.length > 0 && (
        <div className="card">
          {/* Status filter */}
          <div className="flex gap-2 mb-4 items-center">
            {['open', 'answered', 'closed'].map(s => (
              <button key={s} className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
                style={{ border: '1px solid var(--gray-200)', textTransform: 'capitalize' }}
                onClick={() => handleStatusFilter(s)}>
                {s === 'open' ? '🔴' : s === 'answered' ? '✅' : '🔒'} {s}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--gray-400)' }}>
              {pagination?.totalDocs ?? doubts.length} doubt{(pagination?.totalDocs ?? doubts.length) !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="page-loader" style={{ minHeight: 200 }}><div className="spinner" /></div>
          ) : doubts.length === 0 ? (
            <EmptyState
              icon="❓"
              title={`No ${statusFilter} doubts`}
              message={statusFilter === 'open'
                ? 'No pending doubts from students in this class. Check back later!'
                : `No ${statusFilter} doubts found.`}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {doubts.map(d => (
                <div key={d._id} style={{
                  padding: '14px 16px', borderRadius: 12,
                  background: d.status === 'open' ? '#FFF8F0' : 'var(--gray-50)',
                  border: d.status === 'open' ? '1.5px solid #F5B82050' : '1px solid var(--gray-200)',
                }}>
                  <div className="flex items-start justify-between gap-3">
                    <div style={{ flex: 1 }}>
                      {/* Student info row */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <div className="avatar avatar-sm" style={{ background: '#2563EB' }}>
                          {d.student?.name?.slice(0, 2).toUpperCase() || '?'}
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{d.student?.name || 'Unknown Student'}</span>
                        {d.student?.rollNumber && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>Roll {d.student.rollNumber}</span>
                        )}
                        <span className={`badge ${STATUS_COLORS[d.status]}`}>{d.status}</span>
                        {d.subject && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>
                            {d.subject.icon} {d.subject.name}
                          </span>
                        )}
                        {d.type && d.type !== 'general' && (
                          <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 6, background: 'var(--gray-200)', color: 'var(--gray-600)', textTransform: 'capitalize' }}>
                            {d.type}
                          </span>
                        )}
                      </div>

                      {/* Doubt text */}
                      <p style={{ fontSize: '0.9rem', color: 'var(--gray-800)', lineHeight: 1.6 }}>{d.text}</p>
                      {d.textHindi && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--gray-600)', fontFamily: 'var(--font-devanagari)', marginTop: 4 }}>{d.textHindi}</p>
                      )}
                      {d.concept && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 4, display: 'block' }}>📚 {d.concept.name}</span>
                      )}

                      {/* Answer display */}
                      {d.status === 'answered' && d.answer && (
                        <div style={{ marginTop: 10, padding: '10px 14px', background: 'var(--secondary-light)', borderRadius: 8, borderLeft: '3px solid var(--secondary)' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--secondary-dark)', marginBottom: 4 }}>✅ Your Answer:</div>
                          <p style={{ fontSize: '0.85rem', color: 'var(--secondary-dark)' }}>{d.answer}</p>
                          {d.answerHindi && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--secondary-dark)', fontFamily: 'var(--font-devanagari)', marginTop: 4 }}>{d.answerHindi}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right side: date + action */}
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginBottom: 8 }}>
                        {new Date(d.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        <br />
                        {new Date(d.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {d.status === 'open' && (
                        <button className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }}
                          onClick={() => { setSelected(d); setAnswer(''); setAnswerHindi(''); setAnswerModal(true); }}>
                          ✏️ Answer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      )}

      {/* Answer Modal */}
      <Modal open={answerModal} onClose={() => setAnswerModal(false)} title="Answer Student Doubt">
        {selected && (
          <>
            {/* Student's question */}
            <div style={{ padding: '12px 14px', background: '#FFF8F0', borderRadius: 8, marginBottom: 16, border: '1px solid #F5B82040' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-500)', marginBottom: 4 }}>
                ❓ {selected.student?.name}'s question:
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--gray-700)', lineHeight: 1.5 }}>{selected.text}</p>
              {selected.textHindi && (
                <p style={{ fontSize: '0.82rem', color: 'var(--gray-600)', fontFamily: 'var(--font-devanagari)', marginTop: 4 }}>{selected.textHindi}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Your Answer (English) *</label>
              <textarea className="form-input" rows={4} value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Type a clear, helpful answer. Students will see this immediately after you submit." />
            </div>
            <div className="form-group">
              <label className="form-label">Hindi Answer (optional)</label>
              <textarea className="form-input" rows={2} value={answerHindi}
                onChange={e => setAnswerHindi(e.target.value)}
                placeholder="हिंदी में उत्तर…"
                style={{ fontFamily: 'var(--font-devanagari)' }} />
            </div>
            <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setAnswerModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAnswer} disabled={saving || !answer.trim()}>
                {saving ? '⏳ Submitting…' : '✓ Submit Answer'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </Layout>
  );
}
