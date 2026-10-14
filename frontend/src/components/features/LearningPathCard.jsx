import React, { useState } from 'react';
import api from '../../api/axios';
import Icon from '../common/Icon';
import ResourceViewerModal from './ResourceViewerModal';

const STEP_ICONS = {
  revise_concept:     { icon: 'book', color: '#2563EB', bg: '#EFF6FF' },
  watch_explanation:  { icon: 'video', color: '#7C3AED', bg: '#F5F3FF' },
  attempt_remedial:   { icon: 'wrench', color: '#E8650A', bg: '#FFF3E8' },
  retry_diagnostic:   { icon: 'chart', color: '#1B7A4E', bg: '#E8F5EE' },
  unlock_next:        { icon: 'rocket', color: '#F5B820', bg: '#FFF8E1' },
  practice_worksheet: { icon: 'quiz', color: '#D63B3B', bg: '#FFEBEB' },
};

const STATUS_CONFIG = {
  completed:   { badge: 'Done',        color: 'var(--secondary)', ring: '#86efac', icon: 'success' },
  available:   { badge: 'Start',       color: 'var(--primary)',   ring: 'var(--primary)' },
  in_progress: { badge: 'In Progress', color: 'var(--accent-dark)', ring: 'var(--accent)', icon: 'clock' },
  locked:      { badge: 'Locked',      color: 'var(--gray-400)',  ring: 'var(--gray-300)', icon: 'lock' },
};

export default function LearningPathCard({ path, onAdvance }) {
  const [advancing, setAdvancing] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [viewingResource, setViewingResource] = useState(null);

  const completedSteps = path.steps.filter(s => s.status === 'completed').length;

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
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>

      {/* Steps */}
      {expanded && (
        <div style={{ padding: '16px 18px' }}>
          {/* AI Summary if available */}
          {path.aiSummary && (
            <div style={{ padding: '10px 14px', background: 'var(--primary-light)', borderRadius: 8, marginBottom: 14, borderLeft: '3px solid var(--primary)', fontSize: '0.82rem', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="ai" size={16} color="var(--primary)" />
              <span>{path.aiSummary}</span>
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
                    border: `2px solid ${step.status === 'locked' ? 'var(--gray-300)' : isCurrent ? statusCfg.ring : typeConfig.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isCurrent ? `0 0 0 3px ${typeConfig.color}30` : 'none',
                    color: step.status === 'completed' ? '#fff' : typeConfig.color,
                  }}>
                    {step.status === 'completed' ? (
                      <Icon name="check" size={18} color="#fff" />
                    ) : (
                      <Icon name={typeConfig.icon} size={18} color={typeConfig.color} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <div className="flex items-center justify-between gap-2">
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: step.status === 'locked' ? 'var(--gray-400)' : 'var(--gray-900)' }}>
                        {step.title}
                      </div>
                      <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 12, background: step.status === 'completed' ? 'var(--secondary-light)' : isCurrent ? 'var(--primary-light)' : 'var(--gray-100)', color: statusCfg.color, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {statusCfg.icon && <Icon name={statusCfg.icon} size={12} color={statusCfg.color} />}
                        {statusCfg.badge}
                      </span>
                    </div>
                    {step.description && (
                      <p style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: 2 }}>{step.description}</p>
                    )}
                    <div className="flex gap-3 mt-1">
                      {step.estimatedMinutes > 0 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Icon name="clock" size={12} color="var(--gray-400)" />
                          {step.estimatedMinutes} min
                        </span>
                      )}
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-dark)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="star" size={12} color="var(--accent-dark)" />
                        +{step.xpReward} XP
                      </span>
                    </div>

                    <div className="flex gap-2 flex-wrap items-center mt-2">
                      {/* View resource in-app button */}
                      {step.resourceId && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.75rem', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                          onClick={async () => {
                            try {
                              const { data } = await api.get(`/features/resources/${step.resourceId}`);
                              setViewingResource(data.data);
                            } catch {
                              setViewingResource({
                                title: step.title,
                                type: step.resourceType || 'note',
                                content: step.description,
                              });
                            }
                          }}
                        >
                          <Icon name={step.resourceType === 'video' ? 'video' : 'file'} size={12} color="var(--primary)" />
                          <span>{step.resourceType === 'video' ? 'Watch In-App' : 'Read In-App'}</span>
                        </button>
                      )}

                      {/* Advance button for current available step */}
                      {isCurrent && (
                        <button className="btn btn-primary btn-sm" style={{ fontSize: '0.78rem' }}
                          onClick={handleAdvance} disabled={advancing}>
                          {advancing ? 'Marking…' : 'Mark as Done'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {path.status === 'completed' && (
            <div style={{ textAlign: 'center', padding: '14px', background: 'var(--secondary-light)', borderRadius: 10, marginTop: 8, color: 'var(--secondary-dark)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon name="sparkles" size={18} color="var(--secondary-dark)" />
              <span>Path Completed! Concept Mastered!</span>
            </div>
          )}
        </div>
      )}

      <ResourceViewerModal
        open={!!viewingResource}
        onClose={() => setViewingResource(null)}
        resource={viewingResource}
      />
    </div>
  );
}
