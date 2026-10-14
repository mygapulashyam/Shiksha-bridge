import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import Layout from '../../components/common/Layout';
import { StatCard, PageLoader, SectionHeader, Alert, EmptyState } from '../../components/common/UI';
import Icon from '../../components/common/Icon';
import api from '../../api/axios';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingResourcesCount, setPendingResourcesCount] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get('/admin/analytics'),
      api.get('/features/resources?isApproved=false&limit=1').catch(() => ({ data: { pagination: { total: 0 } } })),
    ])
      .then(([analyticsRes, resourcesRes]) => {
        setData(analyticsRes.data.data);
        setPendingResourcesCount(resourcesRes.data?.pagination?.total || 0);
      })
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

      {pendingResourcesCount > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(232, 101, 10, 0.08), rgba(245, 184, 32, 0.12))',
          border: '1.5px solid rgba(232, 101, 10, 0.3)',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(232, 101, 10, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="library" size={18} color="var(--primary)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-dark)' }}>
                {pendingResourcesCount} Teacher Resource{pendingResourcesCount > 1 ? 's' : ''} Awaiting Approval
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)' }}>
                Review teacher-submitted videos, notes, or worksheets to publish them for students.
              </div>
            </div>
          </div>
          <Link to="/admin/resources" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>Review Approvals</span>
            <Icon name="arrow-right" size={14} color="white" />
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid mb-6">
        <StatCard label="Total Schools" value={data?.summary?.totalSchools} icon="school" color="var(--primary)" />
        <StatCard label="Teachers" value={data?.summary?.totalTeachers} icon="academic" color="var(--secondary)" />
        <StatCard label="Students" value={data?.summary?.totalStudents} icon="users" color="#2563EB" />
        <StatCard label="Total Quizzes" value={data?.summary?.totalQuizzes} icon="quiz" color="var(--accent-dark)" />
        <StatCard label="Quiz Attempts" value={data?.summary?.totalAttempts} icon="success" color="var(--primary)" />
        <StatCard label="Platform Avg Score" value={`${data?.summary?.avgScore ?? 0}%`} icon="target"
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
            <EmptyState icon="chart" title="No school data" message="No school data recorded yet" />
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
            <EmptyState icon="clock" title="No quiz attempts" message="No quiz attempts recorded yet" />
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
