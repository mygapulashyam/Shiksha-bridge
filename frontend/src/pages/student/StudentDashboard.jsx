import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { PageLoader, Alert, SectionHeader, ProgressBar } from '../../components/common/UI';
import api from '../../api/axios';

const PRIORITY_COLORS = { high: '#D63B3B', medium: '#B45309', low: '#1B7A4E' };
const TYPE_ICONS = { remedial_drill: '🔧', concept_practice: '📖', next_concept: '🚀', revision: '🔁' };
const BADGE_ICONS = { 'First Steps': '🎯', 'Perfect Score': '⭐', 'Week Warrior': '🔥', 'Month Master': '🏆' };

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/student/dashboard')
      .then(r => setData(r.data.data))
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><PageLoader /></Layout>;

  const { student, stats, recentAttempts, recommendations, progressReports, availableQuizzes } = data || {};

  return (
    <Layout>
      {/* Hero greeting */}
      <div style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', borderRadius: 16, padding: '28px 32px', color: 'white', marginBottom: 24 }}>
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.85rem', opacity: 0.8, marginBottom: 4 }}>Welcome back 👋</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>{student?.name}</h2>
            <div style={{ opacity: 0.85, fontSize: '0.9rem' }}>
              {student?.class ? (student.class.section ? `Grade ${student.class.grade} · ${student.class.section}` : student.class.name) : ''} · {student?.school?.name}
            </div>
          </div>
          <div className="flex gap-4">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{student?.streak || 0}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>🔥 Day Streak</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{student?.totalPoints || 0}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>⭐ Points</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{stats?.avgScore || 0}%</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>📊 Avg Score</div>
            </div>
          </div>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Stats Row */}
      <div className="stats-grid mb-6">
        <div className="stat-card">
          <div className="stat-label">Quizzes Taken</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{stats?.totalAttempts || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Score</div>
          <div className="stat-value" style={{ color: stats?.avgScore >= 70 ? 'var(--secondary)' : stats?.avgScore >= 40 ? 'var(--accent-dark)' : 'var(--danger)' }}>
            {stats?.avgScore || 0}%
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tasks Pending</div>
          <div className="stat-value" style={{ color: 'var(--accent-dark)' }}>{stats?.pendingTasks || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Badges Earned</div>
          <div className="stat-value" style={{ color: 'var(--secondary)' }}>{student?.badges?.length || 0}</div>
        </div>
      </div>

      <div className="grid-2 gap-4 mb-6">
        {/* Recommendations */}
        <div className="card">
          <SectionHeader title="📋 Your Tasks" subtitle="Personalized recommendations for you"
            action={<Link to="/student/quizzes" className="btn btn-primary btn-sm">Start Quiz →</Link>} />
          {!recommendations?.length ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="empty-state-icon">🎉</div>
              <p style={{ fontWeight: 700, color: 'var(--gray-700)' }}>All caught up!</p>
              <p className="text-sm text-muted" style={{ marginTop: 4 }}>Take a quiz to get personalized tasks</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recommendations.map(r => (
                <div key={r._id} style={{ padding: '14px 16px', borderRadius: 10, border: `2px solid ${PRIORITY_COLORS[r.priority]}20`, background: `${PRIORITY_COLORS[r.priority]}06` }}>
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{TYPE_ICONS[r.type] || '📌'} {r.task?.title}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: PRIORITY_COLORS[r.priority], padding: '2px 8px', borderRadius: 20, background: `${PRIORITY_COLORS[r.priority]}15` }}>
                      {r.priority}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--gray-600)', lineHeight: 1.4 }}>{r.message}</p>
                  {r.concept && <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 4 }}>📚 {r.concept.name} {r.concept.chapter ? `· ${r.concept.chapter}` : ''}</div>}
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 4 }}>⏱ ~{r.task?.estimatedMinutes} mins</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Badges & Streak */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Streak Card */}
          <div className="card" style={{ background: 'linear-gradient(135deg, #FFF3E8, #fff)', border: '2px solid rgba(232,101,10,0.15)' }}>
            <div className="flex items-center gap-4">
              <div style={{ fontSize: '2.5rem' }}>🔥</div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{student?.streak || 0} days</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)', fontWeight: 500 }}>Current study streak!</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: 2 }}>Keep going — study every day to maintain your streak</div>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="card">
            <SectionHeader title="🏅 My Badges" subtitle={`${student?.badges?.length || 0} earned`} />
            {!student?.badges?.length ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--gray-400)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🏅</div>
                <p style={{ fontSize: '0.85rem' }}>Complete quizzes to earn badges!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {student.badges.map((b, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '8px 12px', background: 'var(--gray-50)', borderRadius: 10, border: '1px solid var(--gray-200)' }}>
                    <div style={{ fontSize: '1.5rem' }}>{b.icon || BADGE_ICONS[b.name] || '🏅'}</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--gray-700)', marginTop: 4 }}>{b.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assigned Quizzes */}
      <div className="card mb-6">
        <SectionHeader title="📝 Assigned Quizzes" subtitle="Attempt diagnostic and practice quizzes assigned by your teacher"
          action={<Link to="/student/quizzes" className="btn btn-outline btn-sm">All Quizzes →</Link>} />
        {!availableQuizzes?.length ? (
          <div className="empty-state" style={{ padding: 32 }}>
            <div className="empty-state-icon">🎉</div>
            <p style={{ fontWeight: 700, color: 'var(--gray-700)' }}>No pending quizzes!</p>
            <p className="text-sm text-muted" style={{ marginTop: 4 }}>You have completed all assigned quizzes.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {availableQuizzes.map(q => (
              <div key={q._id} style={{ padding: 16, borderRadius: 12, border: '2px solid var(--gray-200)', background: 'var(--white)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="flex items-center justify-between">
                  <span className="badge badge-primary" style={{ textTransform: 'capitalize', fontSize: '0.7rem' }}>{q.type}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>⏱ {q.duration} mins</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '1.4rem' }}>{q.subject?.icon || '📚'}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-900)' }}>{q.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{q.subject?.name}</div>
                  </div>
                </div>
                <Link to={`/student/quiz/${q._id}/attempt`} className="btn btn-primary btn-full" style={{ marginTop: 4, justifyContent: 'center' }}>
                  Start Quiz →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Attempts */}
      <div className="card mb-6">
        <SectionHeader title="Recent Quiz Attempts" subtitle="Your latest quiz results"
          action={<Link to="/student/quizzes" className="btn btn-outline btn-sm">All Quizzes →</Link>} />
        {!recentAttempts?.length ? (
          <div className="empty-state" style={{ padding: 32 }}>
            <div className="empty-state-icon">📝</div>
            <p style={{ fontWeight: 700, color: 'var(--gray-700)', marginBottom: 4 }}>No quizzes taken yet</p>
            <Link to="/student/quizzes" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Browse Quizzes →</Link>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Quiz</th><th>Subject</th><th>Score</th><th>Marks</th><th>Date</th><th></th></tr>
              </thead>
              <tbody>
                {recentAttempts.map(a => (
                  <tr key={a._id}>
                    <td style={{ fontWeight: 600 }}>{a.quiz?.title}</td>
                    <td>{a.subject?.icon} {a.subject?.name}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span style={{ fontWeight: 700, color: a.percentage < 40 ? 'var(--danger)' : a.percentage < 70 ? 'var(--accent-dark)' : 'var(--secondary)' }}>{a.percentage}%</span>
                        <div style={{ width: 60 }}>
                          <ProgressBar value={a.percentage} />
                        </div>
                      </div>
                    </td>
                    <td>{a.marksObtained}/{a.totalMarks}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>{new Date(a.createdAt).toLocaleDateString('en-IN')}</td>
                    <td><Link to={`/student/attempts/${a._id}/result`} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>Review →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Progress Summary */}
      {progressReports?.length > 0 && (
        <div className="card">
          <SectionHeader title="Subject Progress" subtitle="Your mastery across subjects"
            action={<Link to="/student/progress" className="btn btn-outline btn-sm">Full Progress →</Link>} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {progressReports.slice(0, 3).map(r => (
              <div key={r._id}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.subject?.icon} {r.subject?.name}</span>
                  <span style={{ fontWeight: 700, color: r.avgScore >= 70 ? 'var(--secondary)' : r.avgScore >= 40 ? 'var(--accent-dark)' : 'var(--danger)' }}>{r.avgScore}%</span>
                </div>
                <ProgressBar value={r.avgScore} />
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 4 }}>
                  {r.totalAttempts} attempts · {r.conceptMastery?.length || 0} concepts tracked
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
