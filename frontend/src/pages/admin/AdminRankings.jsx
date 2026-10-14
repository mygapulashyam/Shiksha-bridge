import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../../components/common/Layout';
import { PageLoader, Alert, SectionHeader, StatCard, EmptyState } from '../../components/common/UI';
import Icon from '../../components/common/Icon';
import api from '../../api/axios';

export default function AdminRankings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [error, setError] = useState('');

  const fetchRankings = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (stateFilter) params.set('state', stateFilter);
    if (districtFilter) params.set('district', districtFilter);
    try {
      const { data: d } = await api.get(`/features/district-rankings?${params}`);
      setData(d.data);
    } catch { setError('Failed to load rankings'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRankings(); }, []);

  if (loading) return <Layout><PageLoader /></Layout>;

  const chartData = (data?.ranked || []).slice(0, 10).map(s => ({
    name: s.school?.name?.slice(0, 14) || 'School',
    avgScore: s.avgScore,
    students: s.activeStudents,
  }));

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Icon name="rankings" size={26} color="var(--primary)" />
          <span>District Rankings</span>
        </h1>
        <p className="page-subtitle">School performance rankings across districts and states</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap items-end">
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">State</label>
          <input className="form-input" style={{ width: 180 }} value={stateFilter} onChange={e => setStateFilter(e.target.value)} placeholder="e.g. Maharashtra" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">District</label>
          <input className="form-input" style={{ width: 180 }} value={districtFilter} onChange={e => setDistrictFilter(e.target.value)} placeholder="e.g. Nagpur" />
        </div>
        <button className="btn btn-primary btn-sm" onClick={fetchRankings} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="search" size={14} color="white" />
          <span>Search</span>
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => { setStateFilter(''); setDistrictFilter(''); setTimeout(fetchRankings, 50); }}>Clear</button>
      </div>

      <div className="stats-grid mb-6">
        <StatCard label="Schools Ranked" value={data?.totalSchools || 0} icon="school" color="var(--primary)" />
        <StatCard label="Top School" value={data?.ranked?.[0]?.school?.name?.slice(0, 20) || '—'} icon="trophy" color="var(--accent-dark)" />
        <StatCard label="Top Score" value={data?.ranked?.[0] ? `${data.ranked[0].avgScore}%` : '—'} icon="star" color="var(--secondary)" />
      </div>

      <div className="grid-2 gap-4 mb-6">
        {/* Bar Chart */}
        <div className="card">
          <SectionHeader title="Top 10 Schools by Avg Score" />
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v, n) => [n === 'avgScore' ? `${v}%` : v, n === 'avgScore' ? 'Avg Score' : 'Active Students']} />
                <Bar dataKey="avgScore" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon="chart" title="No data available" message="No ranking data found for the current filter." />
          )}
        </div>

        {/* Weakest Subjects */}
        <div className="card">
          <SectionHeader title="Weakest Subjects District-wide" subtitle="Subjects needing most attention" />
          {data?.weakSubjects?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.weakSubjects.map((s, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Icon name="book" size={14} color="var(--primary)" />
                      {s.subjectName}
                    </span>
                    <span style={{ fontWeight: 700, color: s.avgScore < 40 ? 'var(--danger)' : 'var(--accent-dark)', fontSize: '0.875rem' }}>
                      {s.avgScore}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${s.avgScore}%`, background: s.avgScore < 40 ? 'var(--danger)' : 'var(--warning)' }} />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 2 }}>{s.attempts} attempts</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="book" title="No subject data" message="No weak subjects reported yet." />
          )}
        </div>
      </div>

      {/* Full Rankings Table */}
      <div className="card">
        <SectionHeader title="Full School Rankings" subtitle={`${data?.totalSchools || 0} schools`} />
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>School</th>
                <th>District</th>
                <th>State</th>
                <th>Type</th>
                <th>Quiz Attempts</th>
                <th>Active Students</th>
                <th>Avg Score</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              {(data?.ranked || []).length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No data available</td></tr>
              ) : (
                data.ranked.map(s => (
                  <tr key={s.rank}>
                    <td>
                      <span style={{ fontWeight: 800, color: s.rank <= 3 ? 'var(--accent-dark)' : 'var(--gray-500)' }}>
                        #{s.rank}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{s.school?.name || '—'}</td>
                    <td style={{ color: 'var(--gray-500)' }}>{s.school?.district || '—'}</td>
                    <td style={{ color: 'var(--gray-500)' }}>{s.school?.state || '—'}</td>
                    <td>
                      <span className="badge badge-info" style={{ textTransform: 'capitalize', fontSize: '0.7rem' }}>{s.school?.type || '—'}</span>
                    </td>
                    <td>{s.attempts}</td>
                    <td>{s.activeStudents}</td>
                    <td style={{ fontWeight: 700, color: s.avgScore >= 70 ? 'var(--secondary)' : s.avgScore >= 40 ? 'var(--accent-dark)' : 'var(--danger)' }}>
                      {s.avgScore}%
                    </td>
                    <td>
                      <span className={`badge ${s.avgScore >= 70 ? 'badge-success' : s.avgScore >= 40 ? 'badge-warning' : 'badge-danger'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon name={s.avgScore >= 70 ? 'success' : s.avgScore >= 40 ? 'trend-up' : 'warning'} size={12} color="currentColor" />
                        {s.avgScore >= 70 ? 'Proficient' : s.avgScore >= 40 ? 'Developing' : 'Needs Support'}
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
