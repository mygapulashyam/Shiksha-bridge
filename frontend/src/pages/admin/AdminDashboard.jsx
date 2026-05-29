import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import Layout from '../../components/common/Layout';
import { StatCard, PageLoader, SectionHeader, Alert } from '../../components/common/UI';
import api from '../../api/axios';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/analytics')
      .then(r => setData(r.data.data))
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><PageLoader /></Layout>;

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Platform-wide overview — schools, teachers, students, and performance</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Stats */}
      <div className="stats-grid mb-6">
        <StatCard label="Total Schools" value={data?.summary?.totalSchools} icon="🏫" color="var(--primary)" />
        <StatCard label="Teachers" value={data?.summary?.totalTeachers} icon="👩‍🏫" color="var(--secondary)" />
        <StatCard label="Students" value={data?.summary?.totalStudents} icon="🎒" color="#2563EB" />
        <StatCard label="Total Quizzes" value={data?.summary?.totalQuizzes} icon="📝" color="var(--accent-dark)" />
        <StatCard label="Quiz Attempts" value={data?.summary?.totalAttempts} icon="✅" color="var(--primary)" />
        <StatCard label="Platform Avg Score" value={`${data?.summary?.avgScore ?? 0}%`} icon="🎯"
          color={data?.summary?.avgScore >= 70 ? 'var(--secondary)' : data?.summary?.avgScore >= 40 ? 'var(--accent-dark)' : 'var(--danger)'} />
      </div>

      <div className="grid-2 gap-4 mb-6">
        {/* School Performance Chart */}
        <div className="card">
          <SectionHeader title="School Performance" subtitle="Avg score by school (top 8)" />
          {data?.schoolStats?.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.schoolStats.slice(0, 8)} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                <XAxis dataKey="schoolName" tick={{ fontSize: 11 }} tickFormatter={v => v?.slice(0, 10) + '…'} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip formatter={(v) => [`${v}%`, 'Avg Score']} />
                <Bar dataKey="avgScore" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-state-icon">📊</div>
              <p>No school data yet</p>
            </div>
          )}
        </div>

        {/* Recent Attempts */}
        <div className="card">
          <SectionHeader title="Recent Activity" subtitle="Latest quiz attempts" />
          {data?.recentAttempts?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.recentAttempts.map(a => (
                <div key={a._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{a.student?.name || 'Student'}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>{a.quiz?.title || 'Quiz'}</div>
                  </div>
                  <div style={{
                    fontWeight: 700, fontSize: '0.9rem',
                    color: a.percentage >= 70 ? 'var(--secondary)' : a.percentage >= 40 ? 'var(--accent-dark)' : 'var(--danger)'
                  }}>{a.percentage}%</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-state-icon">🕐</div>
              <p>No quiz attempts yet</p>
            </div>
          )}
        </div>
      </div>

      {/* School Stats Table */}
      <div className="card">
        <SectionHeader
          title="District/School Overview"
          action={<Link to="/admin/schools" className="btn btn-outline btn-sm">View All Schools →</Link>}
        />
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>School</th>
                <th>District</th>
                <th>Quiz Attempts</th>
                <th>Avg Score</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              {data?.schoolStats?.length > 0 ? data.schoolStats.map(s => (
                <tr key={s._id}>
                  <td style={{ fontWeight: 600 }}>{s.schoolName || '—'}</td>
                  <td style={{ color: 'var(--gray-500)' }}>{s.district || '—'}</td>
                  <td>{s.attempts}</td>
                  <td style={{ fontWeight: 700, color: s.avgScore >= 70 ? 'var(--secondary)' : s.avgScore >= 40 ? 'var(--accent-dark)' : 'var(--danger)' }}>
                    {s.avgScore}%
                  </td>
                  <td>
                    <div style={{ width: 100 }}>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{
                          width: `${s.avgScore}%`,
                          background: s.avgScore >= 70 ? 'var(--secondary)' : s.avgScore >= 40 ? 'var(--warning)' : 'var(--danger)'
                        }} />
                      </div>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 40 }}>No data available yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
