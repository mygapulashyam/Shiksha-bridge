import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { PageLoader, Alert, SectionHeader, ProgressBar, EmptyState } from '../../components/common/UI';
import api from '../../api/axios';

import Icon, { getIconNameForEmoji } from '../../components/common/Icon';
import ResourceViewerModal from '../../components/features/ResourceViewerModal';

const PRIORITY_COLORS = { high: '#D63B3B', medium: '#B45309', low: '#1B7A4E' };
const TYPE_ICON_NAMES = { remedial_drill: 'wrench', concept_practice: 'book', next_concept: 'trend-up', revision: 'paths' };
const BADGE_ICON_NAMES = { 'First Steps': 'target', 'Perfect Score': 'star', 'Week Warrior': 'flame', 'Month Master': 'rankings' };

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [resources, setResources] = useState([]);
  const [viewingResource, setViewingResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/student/dashboard'),
      api.get('/features/resources?limit=6')
    ])
      .then(([dashRes, resRes]) => {
        setData(dashRes.data.data);
        setResources(resRes.data.data || []);
      })
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
            <div style={{ fontSize: '0.85rem', opacity: 0.85, marginBottom: 4, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Welcome back</span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>{student?.name}</h2>
            <div style={{ opacity: 0.85, fontSize: '0.9rem' }}>
              {student?.class ? (student.class.section ? `Grade ${student.class.grade} · ${student.class.section}` : student.class.name) : ''} · {student?.school?.name}
            </div>
          </div>
          <div className="flex gap-4">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{student?.streak || 0}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.85, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Icon name="flame" size={14} color="#FFA726" />
                <span>Day Streak</span>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{student?.totalPoints || 0}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.85, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Icon name="star" size={14} color="#FBBF24" />
                <span>Points</span>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{stats?.avgScore || 0}%</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.85, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Icon name="analytics" size={14} color="rgba(255,255,255,0.9)" />
                <span>Avg Score</span>
              </div>
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
          <SectionHeader title="Your Tasks" subtitle="Personalized recommendations for you"
            action={<Link to="/student/quizzes" className="btn btn-primary btn-sm">Start Quiz →</Link>} />
          {!recommendations?.length ? (
            <EmptyState icon="success" title="All caught up!" message="Take a quiz to get personalized tasks" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recommendations.map(r => {
                const iconName = TYPE_ICON_NAMES[r.type] || 'bulb';
                return (
                  <div key={r._id} style={{ padding: '14px 16px', borderRadius: 10, border: `2px solid ${PRIORITY_COLORS[r.priority]}20`, background: `${PRIORITY_COLORS[r.priority]}06` }}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Icon name={iconName} size={15} color={PRIORITY_COLORS[r.priority]} />
                        <span>{r.task?.title}</span>
                      </span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: PRIORITY_COLORS[r.priority], padding: '2px 8px', borderRadius: 20, background: `${PRIORITY_COLORS[r.priority]}15` }}>
                        {r.priority}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--gray-600)', lineHeight: 1.4 }}>{r.message}</p>
                    {r.concept && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 4, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Icon name="book" size={13} color="var(--gray-400)" />
                        <span>{r.concept.name} {r.concept.chapter ? `· ${r.concept.chapter}` : ''}</span>
                      </div>
                    )}
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 4, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Icon name="clock" size={12} color="var(--gray-400)" />
                      <span>~{r.task?.estimatedMinutes} mins</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Badges & Streak */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Streak Card */}
          <div className="card" style={{ background: 'linear-gradient(135deg, #FFF3E8, #fff)', border: '2px solid rgba(232,101,10,0.15)' }}>
            <div className="flex items-center gap-4">
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 14, background: 'rgba(232,101,10,0.12)', color: 'var(--primary)' }}>
                <Icon name="flame" size={32} color="var(--primary)" />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{student?.streak || 0} days</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)', fontWeight: 500 }}>Current study streak!</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: 2 }}>Keep going — study every day to maintain your streak</div>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="card">
            <SectionHeader title="My Badges" subtitle={`${student?.badges?.length || 0} earned`} />
            {!student?.badges?.length ? (
              <EmptyState icon="award" title="No badges yet" message="Complete quizzes to earn badges!" />
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {student.badges.map((b, i) => {
                  const badgeIcon = BADGE_ICON_NAMES[b.name] || 'award';
                  return (
                    <div key={i} style={{ textAlign: 'center', padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 10, border: '1px solid var(--gray-200)', minWidth: 80 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: 'var(--white)', boxShadow: 'var(--shadow-sm)', color: 'var(--primary)', margin: '0 auto 6px' }}>
                        <Icon name={badgeIcon} size={20} color="var(--primary)" />
                      </div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--gray-700)' }}>{b.name}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assigned Quizzes */}
      <div className="card mb-6">
        <SectionHeader title="Assigned Quizzes" subtitle="Attempt diagnostic and practice quizzes assigned by your teacher"
          action={<Link to="/student/quizzes" className="btn btn-outline btn-sm">All Quizzes →</Link>} />
        {!availableQuizzes?.length ? (
          <EmptyState icon="success" title="No pending quizzes!" message="You have completed all assigned quizzes." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {availableQuizzes.map(q => (
              <div key={q._id} style={{ padding: 16, borderRadius: 12, border: '2px solid var(--gray-200)', background: 'var(--white)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="flex items-center justify-between">
                  <span className="badge badge-primary" style={{ textTransform: 'capitalize', fontSize: '0.7rem' }}>{q.type}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Icon name="clock" size={12} color="var(--gray-400)" />
                    <span>{q.duration} mins</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'var(--primary-light)', color: 'var(--primary)' }}>
                    <Icon name="book" size={18} color="var(--primary)" />
                  </span>
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
          <EmptyState
            icon="quiz"
            title="No quizzes taken yet"
            action={<Link to="/student/quizzes" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Browse Quizzes →</Link>}
          />
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
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Icon name="book" size={14} color="var(--primary)" />
                        <span>{a.subject?.name}</span>
                      </span>
                    </td>
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

      {/* Study Materials & Media */}
      <div className="card mb-6">
        <SectionHeader
          title="Study Library & Media"
          subtitle="Videos, notes, and study sheets approved by your school"
          action={<Link to="/student/resources" className="btn btn-outline btn-sm">Explore All ({resources?.length || 0}) →</Link>}
        />
        {!resources?.length ? (
          <EmptyState
            icon="book"
            title="No study resources added yet"
            message="Your teachers will upload video lessons and revision sheets here."
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {resources.slice(0, 3).map(r => (
              <div
                key={r._id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  border: '2px solid var(--gray-200)',
                  background: 'var(--white)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="badge badge-primary" style={{ textTransform: 'capitalize', fontSize: '0.7rem' }}>
                      {r.type}
                    </span>
                    {r.duration && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Icon name="clock" size={12} color="var(--gray-400)" />
                        <span>{r.duration} mins</span>
                      </span>
                    )}
                  </div>
                  <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-900)', marginBottom: 4 }}>
                    {r.title}
                  </h4>
                  {r.subject && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                      {r.subject.name} · Grade {r.grade || 'All'}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setViewingResource(r)}
                  className="btn btn-primary btn-sm btn-full"
                  style={{ justifyContent: 'center', gap: 6, fontSize: '0.78rem' }}
                >
                  <Icon name={r.type === 'video' ? 'video' : 'file'} size={14} color="white" />
                  <span>{r.type === 'video' ? 'Watch In-App' : 'Read In-App'}</span>
                </button>
              </div>
            ))}
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

      {/* In-App Resource Viewer */}
      <ResourceViewerModal
        open={!!viewingResource}
        onClose={() => setViewingResource(null)}
        resource={viewingResource}
      />
    </Layout>
  );
}
