import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../../components/common/Layout';
import { PageLoader, Alert, SectionHeader, MasteryBadge, ProgressBar } from '../../components/common/UI';
import api from '../../api/axios';

export default function TeacherClassView() {
  const { classId } = useParams();
  const [students, setStudents] = useState([]);
  const [weakConcepts, setWeakConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    Promise.all([
      api.get(`/teacher/classes/${classId}/performance`),
      api.get(`/teacher/classes/${classId}/weak-concepts`),
    ]).then(([s, w]) => {
      setStudents(s.data.data);
      setWeakConcepts(w.data.data);
    }).catch(() => setError('Failed to load class data'))
      .finally(() => setLoading(false));
  }, [classId]);

  if (loading) return <Layout><PageLoader /></Layout>;

  const sorted = [...students].sort((a, b) => {
    if (sortBy === 'score') return (b.avgScore || 0) - (a.avgScore || 0);
    if (sortBy === 'attempts') return b.totalAttempts - a.totalAttempts;
    return a.name.localeCompare(b.name);
  });

  const weak = students.filter(s => s.status === 'weak').length;
  const developing = students.filter(s => s.status === 'developing').length;
  const proficient = students.filter(s => s.status === 'proficient').length;
  const notStarted = students.filter(s => s.status === 'not_started').length;

  const chartData = sorted.filter(s => s.avgScore !== null).slice(0, 15).map(s => ({
    name: s.name.split(' ')[0],
    score: s.avgScore,
  }));

  return (
    <Layout>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Class Performance</h1>
            <p className="page-subtitle">{students.length} students · Detailed view</p>
          </div>
          <Link to="/teacher" className="btn btn-outline btn-sm">← Dashboard</Link>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Summary cards */}
      <div className="stats-grid mb-6">
        {[
          { label: 'Total Students', value: students.length, color: 'var(--primary)' },
          { label: 'Weak (<40%)', value: weak, color: 'var(--danger)' },
          { label: 'Developing (40–70%)', value: developing, color: 'var(--accent-dark)' },
          { label: 'Proficient (>70%)', value: proficient, color: 'var(--secondary)' },
          { label: 'Not Started', value: notStarted, color: 'var(--gray-400)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid-2 gap-4 mb-6">
        {/* Bar chart */}
        <div className="card">
          <SectionHeader title="Student Scores" subtitle="Average score per student (top 15)" />
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => [`${v}%`, 'Score']} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}
                  fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-state-icon">📊</div>
              <p>No quiz attempts yet in this class</p>
            </div>
          )}
        </div>

        {/* Weak Concepts */}
        <div className="card">
          <SectionHeader title="Class-Wide Weak Concepts" subtitle="Needs teacher intervention" />
          {weakConcepts.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-state-icon">🎉</div>
              <p>No weak concepts detected yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 260, overflowY: 'auto' }}>
              {weakConcepts.map((c, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.conceptName}</span>
                      {c.chapter && <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginLeft: 6 }}>{c.chapter}</span>}
                    </div>
                    <div className="flex gap-2 items-center">
                      <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 700 }}>⚠️ {c.weakStudents} weak</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--danger)' }}>{c.avgScore}%</span>
                    </div>
                  </div>
                  <ProgressBar value={c.avgScore} color="var(--danger)" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full Student Table */}
      <div className="card">
        <SectionHeader title="All Students" subtitle={`${students.length} students in this class`}
          action={
            <select className="form-input form-select" style={{ width: 160, fontSize: '0.85rem' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="name">Sort: Name</option>
              <option value="score">Sort: Score</option>
              <option value="attempts">Sort: Attempts</option>
            </select>
          } />
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll No.</th>
                <th>Avg Score</th>
                <th>Last Score</th>
                <th>Attempts</th>
                <th>Streak</th>
                <th>Mastery</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(s => (
                <tr key={s._id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="avatar avatar-sm" style={{ background: s.status === 'weak' ? 'var(--danger)' : s.status === 'proficient' ? 'var(--secondary)' : 'var(--info)' }}>
                        {s.name?.slice(0, 2).toUpperCase()}
                      </div>
                      {s.name}
                    </div>
                  </td>
                  <td style={{ color: 'var(--gray-500)' }}>{s.rollNumber || '—'}</td>
                  <td style={{ fontWeight: 700, color: !s.avgScore ? 'var(--gray-400)' : s.avgScore < 40 ? 'var(--danger)' : s.avgScore < 70 ? 'var(--accent-dark)' : 'var(--secondary)' }}>
                    {s.avgScore !== null ? `${s.avgScore}%` : '—'}
                  </td>
                  <td>{s.lastScore !== null ? `${s.lastScore}%` : '—'}</td>
                  <td>{s.totalAttempts}</td>
                  <td>{s.streak > 0 ? `🔥 ${s.streak}` : '—'}</td>
                  <td><MasteryBadge level={s.status === 'not_started' ? 'not_started' : s.status} /></td>
                  <td>
                    <Link to={`/teacher/students/${s._id}`} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>📋 Detail</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
