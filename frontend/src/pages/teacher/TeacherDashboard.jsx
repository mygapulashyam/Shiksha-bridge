import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../../components/common/Layout';
import { StatCard, PageLoader, Alert, SectionHeader, MasteryBadge } from '../../components/common/UI';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classData, setClassData] = useState(null);
  const [weakConcepts, setWeakConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/teacher/classes'),
      api.get('/teacher/quizzes?limit=5'),
    ]).then(([cls, qzz]) => {
      setClasses(cls.data.data);
      setQuizzes(qzz.data.data);
      if (cls.data.data.length > 0) setSelectedClass(cls.data.data[0]);
    }).catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    Promise.all([
      api.get(`/teacher/classes/${selectedClass._id}/performance`),
      api.get(`/teacher/classes/${selectedClass._id}/weak-concepts`),
    ]).then(([perf, weak]) => {
      setClassData(perf.data.data);
      setWeakConcepts(weak.data.data);
    }).catch(() => {});
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

  return (
    <Layout>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Teacher Dashboard</h1>
            <p className="page-subtitle">Welcome back, {user?.name?.split(' ')[0]} 👋 — here's how your class is doing</p>
          </div>
          <Link to="/teacher/quizzes/new" className="btn btn-primary">+ Create Quiz</Link>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Class Selector */}
      {classes.length > 1 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {classes.map(c => (
            <button key={c._id}
              className={`btn btn-sm ${selectedClass?._id === c._id ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSelectedClass(c)}>
              Grade {c.grade} – {c.section}
            </button>
          ))}
        </div>
      )}

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
          <SectionHeader title="Class Performance" subtitle={selectedClass ? `Grade ${selectedClass.grade} – ${selectedClass.section}` : ''} />
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
          subtitle={selectedClass ? `Grade ${selectedClass.grade}–${selectedClass.section} · ${totalStudents} students` : ''}
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
    </Layout>
  );
}
