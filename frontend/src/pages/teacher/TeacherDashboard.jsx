import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../../components/common/Layout';
import { StatCard, PageLoader, Alert, SectionHeader, MasteryBadge } from '../../components/common/UI';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const GRADE_COLORS = {
  6: { bg: '#EEF2FF', border: '#818CF8', text: '#4338CA', light: '#6366F1' },
  7: { bg: '#F0FDF4', border: '#4ADE80', text: '#166534', light: '#22C55E' },
  8: { bg: '#FFF7ED', border: '#FB923C', text: '#9A3412', light: '#F97316' },
  9: { bg: '#FDF4FF', border: '#C084FC', text: '#6B21A8', light: '#A855F7' },
 10: { bg: '#FFF1F2', border: '#FB7185', text: '#9F1239', light: '#F43F5E' },
};

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classData, setClassData] = useState(null);
  const [weakConcepts, setWeakConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classLoading, setClassLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/teacher/classes'),
      api.get('/teacher/quizzes?limit=5'),
    ]).then(([cls, qzz]) => {
      const assignedClasses = cls.data.data || [];
      setClasses(assignedClasses);
      setQuizzes(qzz.data.data || []);
      if (assignedClasses.length > 0) setSelectedClass(assignedClasses[0]);
    }).catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    setClassLoading(true);
    setClassData(null);
    setWeakConcepts([]);
    Promise.all([
      api.get(`/teacher/classes/${selectedClass._id}/performance`),
      api.get(`/teacher/classes/${selectedClass._id}/weak-concepts`),
    ]).then(([perf, weak]) => {
      setClassData(perf.data.data);
      setWeakConcepts(weak.data.data);
    }).catch(() => {})
      .finally(() => setClassLoading(false));
  }, [selectedClass]);

  if (loading) return <Layout><PageLoader /></Layout>;

  const totalStudents = classData?.length || 0;
  const weak = classData?.filter(s => s.status === 'weak').length || 0;
  const developing = classData?.filter(s => s.status === 'developing').length || 0;
  const proficient = classData?.filter(s => s.status === 'proficient').length || 0;
  const avgScore = classData?.length
    ? Math.round(classData.filter(s => s.avgScore !== null).reduce((a, s) => a + (s.avgScore || 0), 0) / (classData.filter(s => s.avgScore !== null).length || 1))
    : 0;

  const statusData = [
    { name: 'Weak', count: weak, fill: 'var(--danger)' },
    { name: 'Developing', count: developing, fill: 'var(--warning)' },
    { name: 'Proficient', count: proficient, fill: 'var(--secondary)' },
  ];

  const gradeColor = selectedClass ? (GRADE_COLORS[selectedClass.grade] || GRADE_COLORS[6]) : GRADE_COLORS[6];

  return (
    <Layout>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Teacher Dashboard</h1>
            <p className="page-subtitle">Welcome back, {user?.name?.split(' ')[0]} 👋 — here's how your classes are doing</p>
          </div>
          <Link to="/teacher/quizzes/new" className="btn btn-primary">+ Create Quiz</Link>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* No Classes Assigned State */}
      {classes.length === 0 ? (
        <div style={{
          background: 'var(--white)',
          border: '2px dashed var(--gray-200)',
          borderRadius: 'var(--radius-xl)',
          padding: '60px 40px',
          textAlign: 'center',
          marginBottom: 24,
        }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>🎒</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>
            No Classes Assigned Yet
          </h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.95rem', maxWidth: 420, margin: '0 auto 24px' }}>
            You haven't been assigned to any classes. Please contact your school administrator to get assigned to your classes.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/teacher/quizzes" className="btn btn-outline">📝 My Quizzes</Link>
            <Link to="/teacher/quizzes/new" className="btn btn-primary">+ Create Quiz</Link>
          </div>
        </div>
      ) : (
        <>
          {/* Class Selector — Grade Pill Tabs */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Your Assigned Classes ({classes.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {classes.map(c => {
                const col = GRADE_COLORS[c.grade] || GRADE_COLORS[6];
                const isActive = selectedClass?._id === c._id;
                return (
                  <button
                    key={c._id}
                    onClick={() => setSelectedClass(c)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-full)',
                      border: `2px solid ${isActive ? col.border : 'var(--gray-200)'}`,
                      background: isActive ? col.bg : 'var(--white)',
                      color: isActive ? col.text : 'var(--gray-500)',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      transition: 'all 0.18s',
                      boxShadow: isActive ? `0 2px 8px ${col.border}40` : 'none',
                    }}
                  >
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: isActive ? col.border : 'var(--gray-200)',
                      color: isActive ? 'white' : 'var(--gray-500)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.72rem', fontWeight: 800,
                      flexShrink: 0,
                    }}>
                      {c.grade}
                    </span>
                    {c.name}
                    {c.school?.name && (
                      <span style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 500 }}>· {c.school.name}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Class Header */}
          {selectedClass && (
            <div style={{
              background: gradeColor.bg,
              border: `2px solid ${gradeColor.border}`,
              borderRadius: 'var(--radius-lg)',
              padding: '14px 20px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: gradeColor.border,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 800, fontSize: '1rem',
                  fontFamily: 'var(--font-display)',
                }}>
                  {selectedClass.grade}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: gradeColor.text, fontFamily: 'var(--font-display)' }}>
                    {selectedClass.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: gradeColor.text, opacity: 0.7 }}>
                    {selectedClass.school?.name || ''}{selectedClass.academicYear ? ` · ${selectedClass.academicYear}` : ''}
                    {selectedClass.section ? ` · Section ${selectedClass.section}` : ''}
                  </div>
                </div>
              </div>
              <Link
                to={`/teacher/class/${selectedClass._id}`}
                className="btn btn-sm"
                style={{ background: gradeColor.border, color: 'white', border: 'none', fontWeight: 700 }}
              >
                Full Class View →
              </Link>
            </div>
          )}

          {classLoading ? (
            <div className="page-loader" style={{ minHeight: 200 }}><div className="spinner" /></div>
          ) : (
            <>
              {/* Stats */}
              <div className="stats-grid mb-6">
                <StatCard label="Class Students" value={totalStudents} icon="🎒" color="var(--primary)" />
                <StatCard label="Class Avg Score" value={avgScore ? `${avgScore}%` : 'N/A'} icon="🎯"
                  color={avgScore >= 70 ? 'var(--secondary)' : avgScore >= 40 ? 'var(--accent-dark)' : 'var(--danger)'}
                  sublabel={avgScore < 40 ? 'Needs attention' : avgScore < 70 ? 'Good progress' : 'Excellent!'} />
                <StatCard label="Weak Students" value={weak} icon="⚠️" color="var(--danger)" sublabel="Score < 40%" />
                <StatCard label="My Quizzes" value={quizzes.length} icon="📝" color="var(--secondary)" />
              </div>

              <div className="grid-2 gap-4 mb-6">
                {/* Class Performance Distribution */}
                <div className="card">
                  <SectionHeader title="Class Performance" subtitle={selectedClass ? selectedClass.name : ''} />
                  {classData?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={statusData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => [v, 'Students']} />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {statusData.map((s, i) => (
                            <rect key={i} fill={s.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="empty-state" style={{ padding: 40 }}>
                      <div className="empty-state-icon">📊</div>
                      <p>No quiz data yet for this class</p>
                    </div>
                  )}
                </div>

                {/* Top Weak Concepts */}
                <div className="card">
                  <SectionHeader title="Weak Concepts" subtitle="Concepts where most students struggle"
                    action={selectedClass && <Link to={`/teacher/class/${selectedClass._id}`} className="btn btn-ghost btn-sm">View All →</Link>} />
                  {weakConcepts.length === 0 ? (
                    <div className="empty-state" style={{ padding: 40 }}>
                      <div className="empty-state-icon">🎉</div>
                      <p>No weak concepts identified yet</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {weakConcepts.slice(0, 6).map((c, i) => (
                        <div key={i} className="concept-bar">
                          <div className="concept-bar-header">
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.conceptName}</span>
                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--danger)' }}>{c.avgScore}%</span>
                          </div>
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${c.avgScore}%`, background: 'var(--danger)' }} />
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 3 }}>
                            ⚠️ {c.weakStudents} students below 40% · {c.chapter || 'No chapter'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Student List Preview */}
              <div className="card">
                <SectionHeader
                  title="Student Overview"
                  subtitle={selectedClass ? `${selectedClass.name} · ${totalStudents} students` : ''}
                  action={selectedClass && <Link to={`/teacher/class/${selectedClass._id}`} className="btn btn-outline btn-sm">Full Class View →</Link>}
                />
                {!classData || classData.length === 0 ? (
                  <div className="empty-state" style={{ padding: 40 }}>
                    <div className="empty-state-icon">👥</div>
                    <p>No students in this class yet, or no quiz attempts recorded.</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Roll No.</th>
                          <th>Avg Score</th>
                          <th>Attempts</th>
                          <th>Streak</th>
                          <th>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {classData.slice(0, 10).map(s => (
                          <tr key={s._id}>
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="avatar avatar-sm" style={{ background: 'var(--info)' }}>{s.name?.slice(0, 2).toUpperCase()}</div>
                                <span style={{ fontWeight: 600 }}>{s.name}</span>
                              </div>
                            </td>
                            <td style={{ color: 'var(--gray-500)' }}>{s.rollNumber || '—'}</td>
                            <td style={{ fontWeight: 700, color: !s.avgScore ? 'var(--gray-400)' : s.avgScore >= 70 ? 'var(--secondary)' : s.avgScore >= 40 ? 'var(--accent-dark)' : 'var(--danger)' }}>
                              {s.avgScore !== null ? `${s.avgScore}%` : 'N/A'}
                            </td>
                            <td>{s.totalAttempts}</td>
                            <td>{s.streak > 0 ? `🔥 ${s.streak}` : '—'}</td>
                            <td><MasteryBadge level={s.status === 'not_started' ? 'not_started' : s.status} /></td>
                            <td>
                              <Link to={`/teacher/students/${s._id}`} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>Detail →</Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Quick Stats — always visible regardless of class assignment */}
      {classes.length === 0 && (
        <div className="card" style={{ marginTop: 0 }}>
          <SectionHeader title="Recent Quizzes" subtitle="Your quiz activity" />
          {quizzes.length === 0 ? (
            <div className="empty-state" style={{ padding: 30 }}>
              <div className="empty-state-icon">📝</div>
              <p>No quizzes yet. <Link to="/teacher/quizzes/new">Create your first quiz →</Link></p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {quizzes.map(q => (
                <div key={q._id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{q.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{q.subject?.name} · {q.type}</div>
                  </div>
                  <span className={`badge ${q.isPublished ? 'badge-success' : 'badge-gray'}`}>
                    {q.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
