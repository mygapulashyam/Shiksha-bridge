import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { Alert, Badge, EmptyState, Pagination, SectionHeader } from '../../components/common/UI';
import api from '../../api/axios';

const TYPE_COLORS = { diagnostic: 'badge-primary', practice: 'badge-success', remedial: 'badge-warning', assessment: 'badge-info' };

export default function TeacherQuizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: '', published: '' });
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const fetchQuizzes = async (pg = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: pg, limit: 15 });
    if (filter.type) params.set('type', filter.type);
    if (filter.published) params.set('published', filter.published);
    try {
      const { data } = await api.get(`/teacher/quizzes?${params}`);
      setQuizzes(data.data);
      setPagination(data.pagination);
    } catch { setError('Failed to load quizzes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchQuizzes(page); }, [page, filter]);

  const deleteQuiz = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this quiz?')) return;
    try {
      await api.delete(`/teacher/quizzes/${id}`);
      setQuizzes(prev => prev.filter(q => q._id !== id));
    } catch { setError('Failed to delete quiz'); }
  };

  return (
    <Layout>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">My Quizzes</h1>
            <p className="page-subtitle">Manage diagnostic and practice quizzes for your classes</p>
          </div>
          <Link to="/teacher/quizzes/new" className="btn btn-primary">+ Create Quiz</Link>
        </div>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

      <div className="card">
        <div className="flex gap-3 mb-4 flex-wrap">
          <select className="form-input form-select" style={{ width: 160 }} value={filter.type} onChange={e => setFilter(p => ({ ...p, type: e.target.value }))}>
            <option value="">All Types</option>
            {['diagnostic','practice','remedial','assessment'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
          </select>
          <select className="form-input form-select" style={{ width: 160 }} value={filter.published} onChange={e => setFilter(p => ({ ...p, published: e.target.value }))}>
            <option value="">All Status</option>
            <option value="true">Published</option>
            <option value="false">Draft</option>
          </select>
        </div>

        {loading ? (
          <div className="page-loader" style={{ minHeight: 200 }}><div className="spinner" /></div>
        ) : quizzes.length === 0 ? (
          <EmptyState icon="📝" title="No quizzes yet" message="Create your first quiz to get started."
            action={<Link to="/teacher/quizzes/new" className="btn btn-primary">+ Create Quiz</Link>} />
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Subject</th>
                  <th>Grade</th>
                  <th>Questions</th>
                  <th>Attempts</th>
                  <th>Avg Score</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quizzes.map(q => (
                  <tr key={q._id}>
                    <td style={{ fontWeight: 600 }}>{q.title}</td>
                    <td><span className={`badge ${TYPE_COLORS[q.type] || 'badge-gray'}`} style={{ textTransform: 'capitalize' }}>{q.type}</span></td>
                    <td>{q.subject?.icon} {q.subject?.name}</td>
                    <td>Class {q.grade}</td>
                    <td>{q.questions?.length || 0}</td>
                    <td>{q.attemptCount || 0}</td>
                    <td style={{ fontWeight: 700, color: q.avgScore >= 70 ? 'var(--secondary)' : q.avgScore >= 40 ? 'var(--accent-dark)' : q.avgScore > 0 ? 'var(--danger)' : 'var(--gray-400)' }}>
                      {q.avgScore > 0 ? `${Math.round(q.avgScore)}%` : '—'}
                    </td>
                    <td>
                      <span className={`badge ${q.isPublished ? 'badge-success' : 'badge-gray'}`}>
                        {q.isPublished ? '🟢 Live' : '📋 Draft'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/teacher/quizzes/${q._id}/edit`)} style={{ fontSize: '0.75rem' }}>✏️ Edit</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => deleteQuiz(q._id)} style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>
    </Layout>
  );
}
