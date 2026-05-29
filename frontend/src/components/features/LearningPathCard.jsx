import React, { useState } from 'react';
import api from '../../api/axios';

const STEP_ICONS = {
  revise_concept:     { icon: '📖', color: '#2563EB', bg: '#EFF6FF' },
  watch_explanation:  { icon: '🎬', color: '#7C3AED', bg: '#F5F3FF' },
  attempt_remedial:   { icon: '🔧', color: '#E8650A', bg: '#FFF3E8' },
  retry_diagnostic:   { icon: '📊', color: '#1B7A4E', bg: '#E8F5EE' },
  unlock_next:        { icon: '🚀', color: '#F5B820', bg: '#FFF8E1' },
  practice_worksheet: { icon: '📝', color: '#D63B3B', bg: '#FFEBEB' },
};

const STATUS_CONFIG = {
  completed:   { badge: '✅ Done',       color: 'var(--secondary)', ring: '#86efac' },
  available:   { badge: '▶ Start',       color: 'var(--primary)',   ring: 'var(--primary)' },
  in_progress: { badge: '⏳ In Progress', color: 'var(--accent-dark)', ring: 'var(--accent)' },
  locked:      { badge: '🔒 Locked',     color: 'var(--gray-400)',  ring: 'var(--gray-300)' },
};

export default function LearningPathCard({ path, onAdvance }) {
  const [advancing, setAdvancing] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const completedSteps = path.steps.filter(s => s.status === 'completed').length;
  const currentStep = path.steps[path.currentStep];

  const handleAdvance = async () => {
    setAdvancing(true);
    try {
      const { data } = await api.patch(`/student/learning-paths/${path._id}/advance`);
      if (onAdvance) onAdvance(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div style={{
      background: 'var(--white)', borderRadius: 16, border: '2px solid var(--gray-200)',
      overflow: 'hidden', boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg, #1C1914, #2D2720)', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div>
            <div style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '0.95rem' }}>{path.title}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', marginTop: 2 }}>
              {path.concept?.chapter && `${path.concept.chapter} · `}
              Step {completedSteps} of {path.steps.length} complete
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Circular progress */}
            <svg width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
              <circle cx="20" cy="20" r="16" fill="none" stroke="var(--accent)" strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 16}`}
                strokeDashoffset={`${2 * Math.PI * 16 * (1 - path.completionPercentage / 100)}`}
                strokeLinecap="round" transform="rotate(-90 20 20)" />
              <text x="20" y="24" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">
                {path.completionPercentage}%
              </text>
            </svg>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1rem' }}>{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>

      {/* Steps */}
      {expanded && (
        <div style={{ padding: '16px 18px' }}>
          {/* AI Summary if available */}
          {path.aiSummary && (
            <div style={{ padding: '10px 14px', background: 'var(--primary-light)', borderRadius: 8, marginBottom: 14, borderLeft: '3px solid var(--primary)', fontSize: '0.82rem', color: 'var(--primary-dark)' }}>
              🧠 {path.aiSummary}
            </div>
          )}

          <div style={{ position: 'relative' }}>
            {/* Connector line */}
            <div style={{ position: 'absolute', left: 19, top: 20, bottom: 20, width: 2, background: 'var(--gray-200)', zIndex: 0 }} />

            {path.steps.map((step, idx) => {
              const typeConfig = STEP_ICONS[step.type] || STEP_ICONS.revise_concept;
              const statusCfg = STATUS_CONFIG[step.status] || STATUS_CONFIG.locked;
              const isCurrent = idx === path.currentStep && step.status === 'available';

              return (
                <div key={idx} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12,
                  opacity: step.status === 'locked' ? 0.5 : 1, position: 'relative', zIndex: 1
                }}>
                  {/* Step icon circle */}
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: step.status === 'completed' ? 'var(--secondary)' : step.status === 'locked' ? 'var(--gray-200)' : typeConfig.bg,
                    border: `2.5px solid ${step.status === 'locked' ? 'var(--gray-300)' : isCurrent ? statusCfg.ring : typeConfig.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem',
                    boxShadow: isCurrent ? `0 0 0 3px ${typeConfig.color}30` : 'none',
                  }}>
                    {step.status === 'completed' ? '✓' : typeConfig.icon}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <div className="flex items-center justify-between gap-2">
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: step.status === 'locked' ? 'var(--gray-400)' : 'var(--gray-900)' }}>
                        {step.title}
                      </div>
                      <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 12, background: step.status === 'completed' ? 'var(--secondary-light)' : isCurrent ? 'var(--primary-light)' : 'var(--gray-100)', color: statusCfg.color, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {statusCfg.badge}
                      </span>
                    </div>
                    {step.description && (
                      <p style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: 2 }}>{step.description}</p>
                    )}
                    <div className="flex gap-3 mt-1">
                      {step.estimatedMinutes > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>⏱ {step.estimatedMinutes} min</span>}
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-dark)' }}>⭐ +{step.xpReward} XP</span>
                    </div>

                    {/* Advance button for current available step */}
                    {isCurrent && (
                      <button className="btn btn-primary btn-sm" style={{ marginTop: 8, fontSize: '0.78rem' }}
                        onClick={handleAdvance} disabled={advancing}>
                        {advancing ? '⏳ Marking…' : '✓ Mark as Done'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {path.status === 'completed' && (
            <div style={{ textAlign: 'center', padding: '14px', background: 'var(--secondary-light)', borderRadius: 10, marginTop: 8, color: 'var(--secondary-dark)', fontWeight: 700 }}>
              🎉 Path Completed! Concept Mastered!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
