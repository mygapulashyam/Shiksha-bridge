import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../../components/common/Layout';
import { PageLoader, Alert, SectionHeader, MasteryBadge, ScoreCircle } from '../../components/common/UI';
import api from '../../api/axios';

export default function TeacherStudentDetail() {
  const { studentId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/teacher/students/${studentId}/detail`)
      .then(r => setData(r.data.data))
      .catch(() => setError('Failed to load student data'))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <Layout><PageLoader /></Layout>;
  if (!data) return <Layout><Alert type="error">{error}</Alert></Layout>;

  const { student, attempts, recommendations } = data;
  const chartData = [...attempts].reverse().map((a, i) => ({ attempt: i + 1, score: a.percentage, quiz: a.quiz?.title }));
  const avgScore = attempts.length ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length) : 0;
  const TYPE_ICONS = { remedial_drill: '🔧', concept_practice: '📖', next_concept: '🚀' };
  const PRIORITY_COLORS = { high: '#D63B3B', medium: '#B45309', low: '#1B7A4E' };

  return (
    <Layout>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <Link to="/teacher" className="btn btn-ghost btn-sm">← Back</Link>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Student Header */}
      <div className="card mb-6">
        <div className="flex items-center gap-5">
          <div className="avatar avatar-lg" style={{ background: 'var(--info)', width: 60, height: 60, fontSize: '1.3rem' }}>
            {student.name?.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{student.name}</h2>
            <div className="flex gap-4 mt-1" style={{ flexWrap: 'wrap' }}>
              <span className="text-sm text-muted">🏫 {student.school?.name || '—'}</span>
              <span className="text-sm text-muted">📚 {student.class ? (student.class.section ? `Grade ${student.class.grade} – ${student.class.section}` : student.class.name) : '—'}</span>
              <span className="text-sm text-muted">📧 {student.email}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{student.streak || 0}</div>
              <div className="text-xs text-muted">🔥 Streak</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-dark)' }}>{student.totalPoints || 0}</div>
              <div className="text-xs text-muted">⭐ Points</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color: 'var(--secondary)' }}>{student.badges?.length || 0}</div>
              <div className="text-xs text-muted">🏅 Badges</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2 gap-4 mb-6">
        {/* Score Trend */}
        <div className="card">
          <SectionHeader title="Score Trend" subtitle={`Last ${attempts.length} attempts`} />
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                <XAxis dataKey="attempt" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v}%`, 'Score']} />
                <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--primary)' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : attempts.length === 1 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <ScoreCircle percentage={attempts[0].percentage} />
              <p className="text-sm text-muted mt-4">Only one attempt so far</p>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-state-icon">📊</div>
              <p>No attempts yet</p>
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="card">
          <SectionHeader title="Active Recommendations" subtitle="From the engine" />
          {recommendations.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-state-icon">✅</div>
              <p>No pending recommendations</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recommendations.map(r => (
                <div key={r._id} style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--gray-50)', border: `2px solid ${PRIORITY_COLORS[r.priority]}30` }}>
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{TYPE_ICONS[r.type]} {r.task?.title}</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: PRIORITY_COLORS[r.priority], textTransform: 'uppercase' }}>{r.priority}</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>{r.message}</p>
                  {r.concept && <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>Concept: {r.concept.name}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Attempt History */}
      <div className="card">
        <SectionHeader title="Attempt History" subtitle={`${attempts.length} completed quizzes`} />
        {attempts.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-state-icon">📝</div>
            <p>This student hasn't attempted any quizzes yet.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Quiz</th>
                  <th>Subject</th>
                  <th>Score</th>
                  <th>Marks</th>
                  <th>Date</th>
                  <th>Weak Concepts</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map(a => (
                  <tr key={a._id}>
                    <td style={{ fontWeight: 600 }}>{a.quiz?.title}</td>
                    <td>{a.subject?.icon} {a.subject?.name}</td>
                    <td style={{ fontWeight: 700, color: a.percentage < 40 ? 'var(--danger)' : a.percentage < 70 ? 'var(--accent-dark)' : 'var(--secondary)' }}>
                      {a.percentage}%
                    </td>
                    <td>{a.marksObtained}/{a.totalMarks}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>{new Date(a.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        {a.conceptScores?.filter(cs => cs.percentage < 40).slice(0, 2).map(cs => (
                          <span key={cs.concept} style={{ fontSize: '0.72rem', padding: '2px 6px', background: '#FFEBEB', color: 'var(--danger)', borderRadius: 4 }}>
                            ⚠️ {cs.conceptName}
                          </span>
                        ))}
                        {(!a.conceptScores?.some(cs => cs.percentage < 40)) && <span className="text-xs text-muted">None</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
