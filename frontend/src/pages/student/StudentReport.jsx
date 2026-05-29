import React, { useEffect, useState } from 'react';
import Layout from '../../components/common/Layout';
import { PageLoader, Alert, ProgressBar, MasteryBadge } from '../../components/common/UI';
import { StudentHeatmap } from '../../components/features/Heatmap';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

export default function StudentReport() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/student/progress')
      .then(r => setReports(r.data.data))
      .catch(() => setError('Failed to load report data'))
      .finally(() => setLoading(false));
  }, []);

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await api.get('/student/report/pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `ShikshaBridge_Report_${user?.name?.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setMsg('Report downloaded successfully!');
    } catch { setError('Failed to generate PDF. Try again.'); }
    finally { setDownloading(false); }
  };

  if (loading) return <Layout><PageLoader /></Layout>;

  const totalAttempts = reports.reduce((s, r) => s + r.totalAttempts, 0);
  const overallAvg = reports.length
    ? Math.round(reports.reduce((s, r) => s + r.avgScore, 0) / reports.length)
    : 0;
  const weakCount = reports.reduce((s, r) => s + (r.weakConcepts?.length || 0), 0);
  const strongCount = reports.reduce((s, r) => s + (r.strongConcepts?.length || 0), 0);

  return (
    <Layout>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">📄 My Learning Report</h1>
            <p className="page-subtitle">Comprehensive overview of your learning journey</p>
          </div>
          <button className="btn btn-primary" onClick={downloadPDF} disabled={downloading}>
            {downloading
              ? <span className="flex items-center gap-2"><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Generating…</span>
              : '⬇️ Download Parent Report'}
          </button>
        </div>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
      {msg && <Alert type="success" onClose={() => setMsg('')}>{msg}</Alert>}

      {/* Student banner */}
      <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', borderRadius: 16, padding: '24px 28px', color: 'white', marginBottom: 24 }}>
        <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800 }}>{user?.name}</div>
            <div style={{ opacity: 0.8, fontSize: '0.9rem', marginTop: 4 }}>
              {user?.class ? `Grade ${user.class.grade} – ${user.class.section}` : ''} · {user?.school?.name}
            </div>
          </div>
          <div className="flex gap-5">
            {[
              [totalAttempts, 'Quizzes'],
              [`${overallAvg}%`, 'Avg Score'],
              [user?.streak || 0, '🔥 Streak'],
              [user?.totalPoints || 0, '⭐ Points'],
            ].map(([val, label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800 }}>{val}</div>
                <div style={{ fontSize: '0.72rem', opacity: 0.75 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="stats-grid mb-6">
        <div className="stat-card">
          <div className="stat-label">Subjects Tracked</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{reports.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Weak Concepts</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>{weakCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Strong Concepts</div>
          <div className="stat-value" style={{ color: 'var(--secondary)' }}>{strongCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Badges Earned</div>
          <div className="stat-value" style={{ color: 'var(--accent-dark)' }}>{user?.badges?.length || 0}</div>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📝</div>
          <h3 style={{ fontWeight: 700, marginBottom: 8 }}>No report data yet</h3>
          <p style={{ color: 'var(--gray-500)' }}>Complete some quizzes to generate your learning report.</p>
          <a href="/student/quizzes" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>Browse Quizzes →</a>
        </div>
      ) : (
        <>
          {/* Per-subject report */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 }}>
            {reports.map(r => (
              <div key={r._id} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: '1.8rem' }}>{r.subject?.icon || '📚'}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{r.subject?.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>{r.totalAttempts} attempts · {r.conceptMastery?.length || 0} concepts</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, color: r.avgScore >= 70 ? 'var(--secondary)' : r.avgScore >= 40 ? 'var(--accent-dark)' : 'var(--danger)' }}>
                      {r.avgScore}%
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>Average Score</div>
                  </div>
                </div>

                <ProgressBar value={r.avgScore} />

                {/* Concept mastery grid */}
                {r.conceptMastery?.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: 10 }}>Concept Mastery</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                      {r.conceptMastery.map((cm, i) => (
                        <div key={i} style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>{cm.conceptName || cm.concept?.name}</div>
                          <div className="flex items-center justify-between">
                            <MasteryBadge level={cm.mastery} />
                            <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>{cm.lastScore}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Heatmap */}
          <div className="card mb-6">
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>🗺️ Concept Weakness Heatmap</h3>
            <StudentHeatmap studentId={user?._id} />
          </div>

          {/* Badges */}
          {user?.badges?.length > 0 && (
            <div className="card mb-6">
              <h3 style={{ fontWeight: 700, marginBottom: 16 }}>🏅 Achievements</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {user.badges.map((b, i) => (
                  <div key={i} style={{ textAlign: 'center', padding: '14px 18px', background: 'var(--gray-50)', borderRadius: 12, border: '2px solid var(--gray-200)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 4 }}>{b.icon || '🏅'}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{b.name}</div>
                    {b.awardedAt && <div style={{ fontSize: '0.65rem', color: 'var(--gray-400)', marginTop: 2 }}>{new Date(b.awardedAt).toLocaleDateString('en-IN')}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download CTA */}
          <div style={{ textAlign: 'center', padding: '28px', background: 'var(--primary-light)', borderRadius: 16, border: '2px solid rgba(232,101,10,0.2)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>📄</div>
            <h3 style={{ fontWeight: 800, color: 'var(--primary-dark)', marginBottom: 6 }}>Share with your Parents/Guardian</h3>
            <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem', marginBottom: 16, maxWidth: 400, margin: '0 auto 16px' }}>
              Download a detailed PDF report with your scores, concept mastery, AI analysis, and teacher suggestions.
            </p>
            <button className="btn btn-primary btn-lg" onClick={downloadPDF} disabled={downloading}>
              {downloading ? '⏳ Generating PDF…' : '⬇️ Download Parent Report PDF'}
            </button>
          </div>
        </>
      )}
    </Layout>
  );
}
