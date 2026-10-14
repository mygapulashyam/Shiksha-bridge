import React, { useEffect, useState } from 'react';
import Layout from '../../components/common/Layout';
import { PageLoader, Alert, EmptyState } from '../../components/common/UI';
import LearningPathCard from '../../components/features/LearningPathCard';
import Icon from '../../components/common/Icon';
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
        <h1 className="page-title flex items-center gap-2">
          <Icon name="map" size={26} color="var(--primary)" />
          <span>My Learning Paths</span>
        </h1>
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
        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="book" size={18} color="var(--accent)" />
          <span>How Learning Paths Work</span>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            ['book','Step 1: Revise','Read the concept notes'],
            ['video','Step 2: Watch','Short explanation video'],
            ['wrench','Step 3: Drill','Remedial practice quiz'],
            ['chart','Step 4: Re-test','Retry the diagnostic'],
            ['rocket','Step 5: Advance','Unlock next concept'],
          ].map(([iconName, title, desc]) => (
            <div key={title} style={{ display: 'flex', gap: 10, alignItems: 'center', flex: '1 1 160px', minWidth: 160 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={iconName} size={18} color="var(--accent)" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'white' }}>{title}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {activePaths.length === 0 && completedPaths.length === 0 ? (
        <EmptyState icon="map" title="No personalized learning paths yet"
          message="Learning paths are generated when you complete quizzes. In the meantime, explore notes and videos uploaded by teachers in the Study Library!"
          action={
            <div className="flex gap-2">
              <a href="/student/resources" className="btn btn-primary">Open Study Library →</a>
              <a href="/student/quizzes" className="btn btn-outline">Browse Quizzes</a>
            </div>
          } />
      ) : (
        <>
          {activePaths.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="flame" size={18} color="#FF6B35" />
                <span>Active Paths ({activePaths.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {activePaths.map(p => <LearningPathCard key={p._id} path={p} onAdvance={handleAdvance} />)}
              </div>
            </div>
          )}

          {completedPaths.length > 0 && (
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 12, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="success" size={18} color="var(--secondary)" />
                <span>Completed Paths ({completedPaths.length})</span>
              </div>
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
