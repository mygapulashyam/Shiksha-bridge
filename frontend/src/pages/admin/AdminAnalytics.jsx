import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import Layout from '../../components/common/Layout';
import { StatCard, PageLoader, Alert, SectionHeader } from '../../components/common/UI';
import api from '../../api/axios';

const COLORS = ['#E8650A', '#1B7A4E', '#2563EB', '#F5B820', '#D63B3B', '#7C3AED'];

export default function AdminAnalytics() {
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

  const schoolChartData = (data?.schoolStats || []).slice(0, 8).map(s => ({
    name: s.schoolName?.slice(0, 14) || 'School',
    avgScore: s.avgScore,
    attempts: s.attempts,
  }));

  const scoreDist = [
    { name: 'Weak (<40%)', value: 0 },
    { name: 'Developing (40-70%)', value: 0 },
    { name: 'Proficient (>70%)', value: 0 },
  ];
  // Approximate from avgScore
  (data?.schoolStats || []).forEach(s => {
    if (s.avgScore < 40) scoreDist[0].value += s.attempts;
    else if (s.avgScore < 70) scoreDist[1].value += s.attempts;
    else scoreDist[2].value += s.attempts;
  });

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">Platform Analytics</h1>
        <p className="page-subtitle">District and school-level learning metrics</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="stats-grid mb-6">
        <StatCard label="Schools" value={data?.summary?.totalSchools} icon="🏫" color="var(--primary)" />
        <StatCard label="Teachers" value={data?.summary?.totalTeachers} icon="👩‍🏫" color="var(--secondary)" />
        <StatCard label="Students" value={data?.summary?.totalStudents} icon="🎒" color="#2563EB" />
        <StatCard label="Quiz Attempts" value={data?.summary?.totalAttempts} icon="✅" color="var(--accent-dark)" />
        <StatCard label="Platform Avg" value={`${data?.summary?.avgScore ?? 0}%`} icon="🎯"
          color={data?.summary?.avgScore >= 70 ? 'var(--secondary)' : 'var(--danger)'} />
      </div>

      <div className="grid-2 gap-4 mb-6">
        {/* Bar chart – avg score by school */}
        <div className="card">
          <SectionHeader title="Average Score by School" subtitle="Top performing schools" />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={schoolChartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, n) => [n === 'avgScore' ? `${v}%` : v, n === 'avgScore' ? 'Avg Score' : 'Attempts']} />
              <Bar dataKey="avgScore" name="avgScore" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart – score distribution */}
        <div className="card">
          <SectionHeader title="Score Distribution" subtitle="Students by performance band" />
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={scoreDist} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                dataKey="value" nameKey="name" paddingAngle={3} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                {scoreDist.map((_, i) => <Cell key={i} fill={['var(--danger)', 'var(--warning)', 'var(--secondary)'][i]} />)}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attempts table */}
      <div className="card">
        <SectionHeader title="School Performance Table" subtitle="All schools ranked by average score" />
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>School</th>
                <th>District</th>
                <th>Attempts</th>
                <th>Avg Score</th>
                <th>Performance Level</th>
              </tr>
            </thead>
            <tbody>
              {(data?.schoolStats || []).length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No data available yet</td></tr>
              ) : (
                [...(data?.schoolStats || [])].sort((a, b) => b.avgScore - a.avgScore).map((s, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--gray-500)' }}>#{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{s.schoolName || '—'}</td>
                    <td style={{ color: 'var(--gray-500)' }}>{s.district || '—'}</td>
                    <td>{s.attempts}</td>
                    <td style={{ fontWeight: 700, color: s.avgScore >= 70 ? 'var(--secondary)' : s.avgScore >= 40 ? 'var(--accent-dark)' : 'var(--danger)' }}>
                      {s.avgScore}%
                    </td>
                    <td>
                      <span className={`badge ${s.avgScore >= 70 ? 'badge-success' : s.avgScore >= 40 ? 'badge-warning' : 'badge-danger'}`}>
                        {s.avgScore >= 70 ? '✅ Proficient' : s.avgScore >= 40 ? '📈 Developing' : '⚠️ Needs Support'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
