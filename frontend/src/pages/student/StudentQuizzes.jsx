import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { Alert, EmptyState, PageLoader, Pagination, SearchInput, SectionHeader } from '../../components/common/UI';
import api from '../../api/axios';

import Icon from '../../components/common/Icon';

const TYPE_COLORS = { diagnostic: 'badge-primary', practice: 'badge-success', remedial: 'badge-warning', assessment: 'badge-info' };
const TYPE_ICON_NAMES = { diagnostic: 'search', practice: 'book', remedial: 'wrench', assessment: 'chart' };

export default function StudentQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: '', subject: '' });
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get('/student/subjects').then(r => setSubjects(r.data.data)).catch(() => {});
  }, []);

  const fetchQuizzes = async (pg = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: pg, limit: 12 });
    if (filter.type) params.set('type', filter.type);
    if (filter.subject) params.set('subject', filter.subject);
    try {
      const { data } = await api.get(`/student/quizzes?${params}`);
      setQuizzes(data.data);
      setPagination(data.pagination);
    } catch { setError('Failed to load quizzes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchQuizzes(page); }, [page, filter]);

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">My Quizzes</h1>
        <p className="page-subtitle">Attempt diagnostic and practice quizzes assigned by your teacher</p>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {['', 'diagnostic', 'practice', 'remedial', 'assessment'].map(t => (
          <button key={t}
            className={`btn btn-sm ${filter.type === t ? 'btn-primary' : 'btn-ghost'}`}
            style={{ border: '1px solid var(--gray-200)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => { setFilter(p => ({ ...p, type: t })); setPage(1); }}>
            {t ? (
              <>
                <Icon name={TYPE_ICON_NAMES[t] || 'quiz'} size={14} />
                <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
              </>
            ) : (
              <>
                <Icon name="dashboard" size={14} />
                <span>All Types</span>
              </>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : quizzes.length === 0 ? (
        <EmptyState icon="quiz" title="No quizzes available"
          message="Your teacher hasn't assigned any quizzes yet. Check back soon!" />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
            {quizzes.map(q => (
              <div key={q._id} style={{
                background: 'var(--white)', borderRadius: 16, padding: 20,
                border: '2px solid var(--gray-200)', boxShadow: 'var(--shadow-sm)',
                display: 'flex', flexDirection: 'column', gap: 12,
                transition: 'all 0.15s'
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gray-200)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className={`badge ${TYPE_COLORS[q.type] || 'badge-gray'}`} style={{ textTransform: 'capitalize', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Icon name={TYPE_ICON_NAMES[q.type] || 'quiz'} size={12} />
                    <span>{q.type}</span>
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase' }}>{q.difficulty}</span>
                </div>

                {/* Subject */}
                <div className="flex items-center gap-2">
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, background: 'var(--primary-light)', color: 'var(--primary)' }}>
                    <Icon name="book" size={20} color="var(--primary)" />
                  </span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--gray-900)', lineHeight: 1.2 }}>{q.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: 2 }}>{q.subject?.name}</div>
                  </div>
                </div>

                {/* Concepts */}
                {q.concepts?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {q.concepts.slice(0, 3).map(c => (
                      <span key={c._id} style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'var(--primary-light)', color: 'var(--primary-dark)', borderRadius: 20 }}>
                        {c.name}
                      </span>
                    ))}
                    {q.concepts.length > 3 && <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>+{q.concepts.length - 3} more</span>}
                  </div>
                )}

                {/* Meta */}
                <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Icon name="question" size={13} color="var(--gray-400)" />
                    <span>{q.questions?.length || 0} Qs</span>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Icon name="clock" size={13} color="var(--gray-400)" />
                    <span>{q.duration} mins</span>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Icon name="chart" size={13} color="var(--gray-400)" />
                    <span>{q.totalMarks} marks</span>
                  </span>
                </div>

                {/* CTA */}
                <Link to={`/student/quiz/${q._id}/attempt`}
                  className="btn btn-primary btn-full"
                  style={{ marginTop: 4, justifyContent: 'center' }}>
                  Start Quiz →
                </Link>
              </div>
            ))}
          </div>
          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}
    </Layout>
  );
}
