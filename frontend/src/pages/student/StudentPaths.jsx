import React, { useEffect, useState } from 'react';
import Layout from '../../components/common/Layout';
import { PageLoader, Alert, EmptyState } from '../../components/common/UI';
import LearningPathCard from '../../components/features/LearningPathCard';
import api from '../../api/axios';

export default function StudentPaths() {
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/student/learning-paths')
      .then(r => setPaths(r.data.data))
      .catch(() => setError('Failed to load learning paths'))
      .finally(() => setLoading(false));
  }, []);

  const handleAdvance = (updatedPath) => {
    setPaths(prev => prev.map(p => p._id === updatedPath._id ? updatedPath : p));
  };

  const activePaths = paths.filter(p => p.status === 'active');
  const completedPaths = paths.filter(p => p.status === 'completed');
  const totalXP = paths.reduce((sum, p) => sum + p.steps.filter(s => s.status === 'completed').reduce((s2, step) => s2 + (step.xpReward || 0), 0), 0);

  if (loading) return <Layout><PageLoader /></Layout>;

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">🗺️ My Learning Paths</h1>
        <p className="page-subtitle">Step-by-step guides to master each concept you're working on</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Summary */}
      {paths.length > 0 && (
        <div className="stats-grid mb-6">
          <div className="stat-card">
            <div className="stat-label">Active Paths</div>
            <div className="stat-value" style={{ color: 'var(--primary)' }}>{activePaths.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Completed</div>
            <div className="stat-value" style={{ color: 'var(--secondary)' }}>{completedPaths.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">XP from Paths</div>
            <div className="stat-value" style={{ color: 'var(--accent-dark)' }}>{totalXP}</div>
          </div>
        </div>
      )}

      {/* How it works */}
      <div style={{ background: 'linear-gradient(135deg, #1C1914, #2D2720)', borderRadius: 16, padding: '20px 24px', marginBottom: 24, color: 'white' }}>
        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent)', marginBottom: 12 }}>📖 How Learning Paths Work</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            ['📖','Step 1: Revise','Read the concept notes'],
            ['🎬','Step 2: Watch','Short explanation video'],
            ['🔧','Step 3: Drill','Remedial practice quiz'],
            ['📊','Step 4: Re-test','Retry the diagnostic'],
            ['🚀','Step 5: Advance','Unlock next concept'],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ display: 'flex', gap: 8, alignItems: 'center', flex: '1 1 160px', minWidth: 160 }}>
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'white' }}>{title}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {activePaths.length === 0 && completedPaths.length === 0 ? (
        <EmptyState icon="🗺️" title="No learning paths yet"
          message="Take a quiz to get personalized learning paths for your weak concepts."
          action={<a href="/student/quizzes" className="btn btn-primary">Browse Quizzes →</a>} />
      ) : (
        <>
          {activePaths.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 12 }}>🔥 Active Paths ({activePaths.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {activePaths.map(p => <LearningPathCard key={p._id} path={p} onAdvance={handleAdvance} />)}
              </div>
            </div>
          )}

          {completedPaths.length > 0 && (
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 12, color: 'var(--secondary)' }}>✅ Completed Paths ({completedPaths.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {completedPaths.map(p => <LearningPathCard key={p._id} path={p} onAdvance={handleAdvance} />)}
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
