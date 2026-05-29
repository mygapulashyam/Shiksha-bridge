import React, { useEffect, useState } from 'react';
import api from '../../api/axios';

const MASTERY_CONFIG = {
  mastered:    { label: 'Mastered',    bg: '#dcfce7', text: '#166534', border: '#86efac' },
  proficient:  { label: 'Proficient',  bg: '#dbeafe', text: '#1e3a8a', border: '#93c5fd' },
  developing:  { label: 'Developing',  bg: '#fef9c3', text: '#854d0e', border: '#fde047' },
  weak:        { label: 'Weak',        bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  not_started: { label: 'Not Started', bg: '#f4f3f1', text: '#7a7268', border: '#d1ccc4' },
};

const getColor = (pct) => {
  if (pct === null || pct === undefined) return MASTERY_CONFIG.not_started;
  if (pct >= 70) return MASTERY_CONFIG.mastered;
  if (pct >= 40) return MASTERY_CONFIG.developing;
  return MASTERY_CONFIG.weak;
};

/* ─── Student Heatmap ─────────────────────────────────────── */
export function StudentHeatmap({ studentId, compact = false }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    const url = `/features/heatmap/student/${studentId}${subjectFilter ? `?subject=${subjectFilter}` : ''}`;
    api.get(url)
      .then(r => {
        setData(r.data.data);
        const seen = new Set();
        const subs = r.data.data
          .filter(d => d.subject && !seen.has(d.subject._id) && seen.add(d.subject._id))
          .map(d => d.subject);
        setSubjects(subs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [studentId, subjectFilter]);

  if (loading) return <div style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)' }}>Loading heatmap…</div>;
  if (!data.length) return (
    <div style={{ textAlign: 'center', padding: 32, color: 'var(--gray-400)' }}>
      <div style={{ fontSize: '2rem', marginBottom: 8 }}>🗺️</div>
      <p>No concept data yet. Complete a quiz to see your heatmap.</p>
    </div>
  );

  // Group by subject
  const grouped = {};
  data.forEach(d => {
    const key = d.subject?.name || 'Other';
    if (!grouped[key]) grouped[key] = { icon: d.subject?.icon || '📚', color: d.subject?.color, items: [] };
    grouped[key].items.push(d);
  });

  return (
    <div>
      {!compact && subjects.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-4">
          <button className={`btn btn-sm ${!subjectFilter ? 'btn-primary' : 'btn-ghost'}`}
            style={{ border: '1px solid var(--gray-200)' }} onClick={() => setSubjectFilter('')}>All</button>
          {subjects.map(s => (
            <button key={s._id} className={`btn btn-sm ${subjectFilter === s._id ? 'btn-primary' : 'btn-ghost'}`}
              style={{ border: '1px solid var(--gray-200)' }} onClick={() => setSubjectFilter(s._id)}>
              {s.icon} {s.name}
            </button>
          ))}
        </div>
      )}

      {Object.entries(grouped).map(([subjectName, group]) => (
        <div key={subjectName} style={{ marginBottom: 20 }}>
          {!compact && (
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--gray-700)', marginBottom: 8 }}>
              {group.icon} {subjectName}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {group.items.map((item) => {
              const cfg = getColor(item.percentage);
              return (
                <div key={item.conceptId} title={`${item.conceptName}: ${item.percentage}% (${item.attempts} attempts)`}
                  style={{
                    padding: compact ? '4px 8px' : '6px 12px',
                    borderRadius: 8,
                    background: cfg.bg,
                    border: `1.5px solid ${cfg.border}`,
                    color: cfg.text,
                    fontSize: compact ? '0.72rem' : '0.8rem',
                    fontWeight: 600,
                    cursor: 'default',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    transition: 'transform 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = ''}>
                  <span style={{ fontSize: '0.7rem' }}>
                    {item.percentage >= 70 ? '✅' : item.percentage >= 40 ? '📈' : '⚠️'}
                  </span>
                  {item.conceptName?.slice(0, compact ? 16 : 22)}
                  {!compact && <span style={{ opacity: 0.7, marginLeft: 2 }}>{item.percentage}%</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Legend */}
      {!compact && (
        <div className="flex gap-3 flex-wrap mt-4" style={{ paddingTop: 12, borderTop: '1px solid var(--gray-200)' }}>
          {Object.entries(MASTERY_CONFIG).filter(([k]) => k !== 'not_started').map(([k, v]) => (
            <div key={k} className="flex items-center gap-1">
              <div style={{ width: 12, height: 12, borderRadius: 3, background: v.bg, border: `1.5px solid ${v.border}` }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--gray-600)' }}>{v.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Class Heatmap ───────────────────────────────────────── */
export function ClassHeatmap({ classId }) {
  const [data, setData] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('avgScore');

  useEffect(() => {
    api.get(`/features/heatmap/class/${classId}`)
      .then(r => { setData(r.data.data); setTotalStudents(r.data.totalStudents); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [classId]);

  if (loading) return <div style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)' }}>Loading class heatmap…</div>;
  if (!data.length) return (
    <div style={{ textAlign: 'center', padding: 32, color: 'var(--gray-400)' }}>
      <div style={{ fontSize: '2rem', marginBottom: 8 }}>🗺️</div>
      <p>No class data yet. Students need to attempt quizzes first.</p>
    </div>
  );

  const sorted = [...data].sort((a, b) => sortBy === 'avgScore' ? a.avgScore - b.avgScore : b.weakCount - a.weakCount);

  return (
    <div>
      <div className="flex gap-2 mb-4 items-center" style={{ flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>Sort by:</span>
        {[['avgScore','Avg Score'],['weakCount','Most Weak Students']].map(([val, label]) => (
          <button key={val} className={`btn btn-sm ${sortBy === val ? 'btn-primary' : 'btn-ghost'}`}
            style={{ border: '1px solid var(--gray-200)' }} onClick={() => setSortBy(val)}>{label}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--gray-500)' }}>{totalStudents} students</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map(item => {
          const cfg = getColor(item.avgScore);
          const weakPct = totalStudents > 0 ? Math.round((item.weakCount / totalStudents) * 100) : 0;
          return (
            <div key={item.conceptId} style={{ padding: '10px 14px', borderRadius: 10, background: cfg.bg, border: `1.5px solid ${cfg.border}` }}>
              <div className="flex items-center justify-between">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: cfg.text }}>{item.conceptName}</div>
                  {item.chapter && <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 2 }}>{item.subject?.icon} {item.chapter}</div>}
                </div>
                <div className="flex gap-4 items-center" style={{ flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: cfg.text }}>{item.avgScore}%</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--gray-500)' }}>Class avg</div>
                  </div>
                  {item.weakCount > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--danger)' }}>⚠️ {item.weakCount}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--gray-500)' }}>weak ({weakPct}%)</div>
                    </div>
                  )}
                  {item.masteredCount > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--secondary)' }}>✅ {item.masteredCount}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--gray-500)' }}>mastered</div>
                    </div>
                  )}
                </div>
              </div>
              {/* Student distribution bar */}
              <div style={{ height: 6, background: 'rgba(0,0,0,0.08)', borderRadius: 3, marginTop: 8, overflow: 'hidden', display: 'flex' }}>
                {item.weakCount > 0 && <div style={{ width: `${(item.weakCount/totalStudents)*100}%`, background: 'var(--danger)', borderRadius: '3px 0 0 3px' }} />}
                {item.developingCount > 0 && <div style={{ width: `${(item.developingCount/totalStudents)*100}%`, background: 'var(--warning)' }} />}
                {item.masteredCount > 0 && <div style={{ width: `${(item.masteredCount/totalStudents)*100}%`, background: 'var(--secondary)', borderRadius: '0 3px 3px 0' }} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
