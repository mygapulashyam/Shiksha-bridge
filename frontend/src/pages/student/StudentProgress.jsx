import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Layout from '../../components/common/Layout';
import { PageLoader, Alert, MasteryBadge, ProgressBar, SectionHeader } from '../../components/common/UI';
import api from '../../api/axios';

const BADGE_ICONS = { 'First Steps': '🎯', 'Perfect Score': '⭐', 'Week Warrior': '🔥', 'Month Master': '🏆' };
const MASTERY_ORDER = { mastered: 4, proficient: 3, developing: 2, weak: 1, not_started: 0 };

export default function StudentProgress() {
  const [reports, setReports] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSubject, setActiveSubject] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/student/progress'),
      api.get('/student/attempts?limit=20'),
      api.get('/student/recommendations?status=pending&limit=10'),
      api.get('/auth/me'),
    ]).then(([r, a, rec, me]) => {
      setReports(r.data.data);
      setAttempts(a.data.data);
      setRecommendations(rec.data.data);
      setUser(me.data.data);
      if (r.data.data.length > 0) setActiveSubject(r.data.data[0]);
    }).catch(() => setError('Failed to load progress data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><PageLoader /></Layout>;

  const activeReport = activeSubject || reports[0];
  const sortedConcepts = [...(activeReport?.conceptMastery || [])].sort(
    (a, b) => (MASTERY_ORDER[b.mastery] || 0) - (MASTERY_ORDER[a.mastery] || 0)
  );

  // Attempt trend chart
  const trendData = [...attempts].reverse().map((a, i) => ({
    n: i + 1,
    score: a.percentage,
    subject: a.subject?.name,
  }));

  // Concept mastery bar data for active subject
  const conceptBarData = sortedConcepts.slice(0, 8).map(c => ({
    name: c.conceptName?.slice(0, 14) || 'Concept',
    score: c.lastScore || 0,
    best: c.bestScore || 0,
  }));

  const masteryCount = (level) => sortedConcepts.filter(c => c.mastery === level).length;

  const markComplete = async (id) => {
    try {
      await api.patch(`/student/recommendations/${id}/status`, { status: 'completed' });
      setRecommendations(prev => prev.filter(r => r._id !== id));
    } catch {}
  };

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">My Progress</h1>
        <p className="page-subtitle">Track your learning journey, concept mastery, and achievements</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Gamification Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'linear-gradient(135deg, #FF6B35, #FF4500)', borderRadius: 14, padding: '20px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{user?.streak || 0}</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: 4 }}>🔥 Day Streak</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))', borderRadius: 14, padding: '20px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{user?.totalPoints || 0}</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: 4 }}>⭐ Total Points</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, var(--secondary), var(--secondary-dark))', borderRadius: 14, padding: '20px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{attempts.length}</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: 4 }}>📝 Quizzes Done</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', borderRadius: 14, padding: '20px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{user?.badges?.length || 0}</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: 4 }}>🏅 Badges Earned</div>
        </div>
      </div>

      {/* Score Trend */}
      {trendData.length > 1 && (
        <div className="card mb-6">
          <SectionHeader title="📈 Score Trend" subtitle={`Last ${trendData.length} quiz attempts`} />
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
              <XAxis dataKey="n" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, _, p) => [`${v}% — ${p.payload.subject}`, 'Score']} />
              <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2.5}
                dot={{ r: 4, fill: 'var(--primary)' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid-2 gap-4 mb-6">
        {/* Subject Progress */}
        <div className="card">
          <SectionHeader title="📚 Subject Overview" subtitle={`${reports.length} subjects tracked`} />
          {reports.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <div className="empty-state-icon">📚</div>
              <p className="text-muted">No subject progress yet. Attempt a quiz to start tracking!</p>
              <Link to="/student/quizzes" className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>Browse Quizzes</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {reports.map(r => (
                <div key={r._id}
                  onClick={() => setActiveSubject(r)}
                  style={{
                    padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                    border: `2px solid ${activeReport?._id === r._id ? 'var(--primary)' : 'var(--gray-200)'}`,
                    background: activeReport?._id === r._id ? 'var(--primary-light)' : 'var(--gray-50)',
                  }}>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontWeight: 700 }}>{r.subject?.icon} {r.subject?.name}</span>
                    <span style={{ fontWeight: 800, color: r.avgScore >= 70 ? 'var(--secondary)' : r.avgScore >= 40 ? 'var(--accent-dark)' : 'var(--danger)' }}>{r.avgScore}%</span>
                  </div>
                  <ProgressBar value={r.avgScore} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 6 }}>
                    {r.totalAttempts} attempts · {r.conceptMastery?.length} concepts
                    {r.improvement !== 0 && (
                      <span style={{ marginLeft: 8, color: r.improvement > 0 ? 'var(--secondary)' : 'var(--danger)', fontWeight: 600 }}>
                        {r.improvement > 0 ? '↑' : '↓'} {Math.abs(r.improvement)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Concept Mastery for active subject */}
        <div className="card">
          <SectionHeader title={`🧩 Concept Mastery${activeReport?.subject ? ` — ${activeReport.subject.name}` : ''}`}
            subtitle="Click a subject to see its concepts" />
          {!activeReport ? (
            <div className="empty-state" style={{ padding: 32 }}>
              <p className="text-muted">Select a subject on the left</p>
            </div>
          ) : (
            <>
              {/* Mastery Summary */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {[['mastered', '⭐', 'var(--secondary)'], ['proficient', '👍', 'var(--info)'], ['developing', '📈', 'var(--accent-dark)'], ['weak', '⚠️', 'var(--danger)']].map(([level, icon, color]) => (
                  <div key={level} style={{ flex: 1, minWidth: 70, textAlign: 'center', padding: '8px', background: `${color}12`, borderRadius: 8 }}>
                    <div style={{ fontSize: '1.2rem' }}>{icon}</div>
                    <div style={{ fontWeight: 800, color, fontSize: '1rem' }}>{masteryCount(level)}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--gray-500)', textTransform: 'capitalize' }}>{level}</div>
                  </div>
                ))}
              </div>

              {sortedConcepts.length === 0 ? (
                <p className="text-muted text-sm">No concept data yet</p>
              ) : (
                <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sortedConcepts.map((c, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{c.conceptName}</span>
                        <MasteryBadge level={c.mastery} />
                      </div>
                      <ProgressBar value={c.lastScore || 0} />
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 2 }}>
                        Best: {c.bestScore}% · Last: {c.lastScore}% · {c.attempts} attempt{c.attempts !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Concept Bar Chart */}
      {conceptBarData.length > 0 && (
        <div className="card mb-6">
          <SectionHeader title={`📊 Concept Scores${activeReport?.subject ? ` — ${activeReport.subject.name}` : ''}`} subtitle="Last score vs best score per concept" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={conceptBarData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, n) => [`${v}%`, n === 'score' ? 'Last Score' : 'Best Score']} />
              <Bar dataKey="score" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Last Score" />
              <Bar dataKey="best" fill="var(--secondary)" radius={[4, 4, 0, 0]} name="Best Score" opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* My Tasks (Recommendations) */}
      <div className="card mb-6">
        <SectionHeader title="📋 Pending Tasks" subtitle="Complete these to improve your weak areas"
          action={<Link to="/student/quizzes" className="btn btn-primary btn-sm">Find Quizzes →</Link>} />
        {recommendations.length === 0 ? (
          <div className="empty-state" style={{ padding: 28 }}>
            <div className="empty-state-icon">🎉</div>
            <p style={{ fontWeight: 700 }}>All caught up!</p>
            <p className="text-sm text-muted">Attempt more quizzes to get personalised tasks.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recommendations.map(r => (
              <div key={r._id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
                borderRadius: 10, background: 'var(--gray-50)', border: '1px solid var(--gray-200)'
              }}>
                <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>
                  {r.type === 'remedial_drill' ? '🔧' : r.type === 'next_concept' ? '🚀' : '📖'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{r.task?.title}</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginTop: 2 }}>{r.message}</p>
                  {r.concept && <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 2 }}>📚 {r.concept.name}</div>}
                </div>
                <button onClick={() => markComplete(r._id)} className="btn btn-success btn-sm"
                  style={{ flexShrink: 0, background: 'var(--secondary)', color: 'white', fontSize: '0.75rem' }}>
                  ✓ Done
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="card">
        <SectionHeader title="🏅 Achievements" subtitle="Badges earned through your hard work" />
        {!user?.badges?.length ? (
          <div className="empty-state" style={{ padding: 28 }}>
            <div className="empty-state-icon">🏅</div>
            <p className="text-muted text-sm">Start taking quizzes to earn your first badge!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {user.badges.map((b, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '16px 20px', background: 'var(--gray-50)', borderRadius: 12, border: '2px solid var(--gray-200)', minWidth: 90 }}>
                <div style={{ fontSize: '2rem', marginBottom: 6 }}>{b.icon || BADGE_ICONS[b.name] || '🏅'}</div>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--gray-800)' }}>{b.name}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--gray-400)', marginTop: 2 }}>
                  {b.awardedAt ? new Date(b.awardedAt).toLocaleDateString('en-IN') : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
