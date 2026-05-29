import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { Alert, EmptyState, PageLoader, Pagination, SearchInput, SectionHeader } from '../../components/common/UI';
import api from '../../api/axios';

const TYPE_COLORS = { diagnostic: 'badge-primary', practice: 'badge-success', remedial: 'badge-warning', assessment: 'badge-info' };
const TYPE_ICONS = { diagnostic: '🔍', practice: '📖', remedial: '🔧', assessment: '📊' };
const DIFF_LABELS = { foundational: '⭐', basic: '⭐⭐', intermediate: '⭐⭐⭐', advanced: '⭐⭐⭐⭐', mixed: '🔀' };

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
            style={{ border: '1px solid var(--gray-200)' }}
            onClick={() => { setFilter(p => ({ ...p, type: t })); setPage(1); }}>
            {t ? `${TYPE_ICONS[t]} ${t.charAt(0).toUpperCase() + t.slice(1)}` : '🗂 All Types'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : quizzes.length === 0 ? (
        <EmptyState icon="📝" title="No quizzes available"
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
                  <span className={`badge ${TYPE_COLORS[q.type] || 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>
                    {TYPE_ICONS[q.type]} {q.type}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>{DIFF_LABELS[q.difficulty]}</span>
                </div>

                {/* Subject */}
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '1.6rem' }}>{q.subject?.icon || '📚'}</span>
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
                  <span>❓ {q.questions?.length || 0} questions</span>
                  <span>⏱ {q.duration} mins</span>
                  <span>📊 {q.totalMarks} marks</span>
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
