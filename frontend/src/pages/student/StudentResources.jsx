import React, { useEffect, useState } from 'react';
import Layout from '../../components/common/Layout';
import { Alert, EmptyState, Pagination, SectionHeader } from '../../components/common/UI';
import Icon from '../../components/common/Icon';
import ResourceViewerModal from '../../components/features/ResourceViewerModal';
import api from '../../api/axios';

const TYPE_CONFIG = {
  note:          { icon: 'file',     color: '#2563EB', label: 'Note' },
  video:         { icon: 'clock',    color: '#7C3AED', label: 'Video' },
  worksheet:     { icon: 'quiz',     color: '#E8650A', label: 'Worksheet' },
  example:       { icon: 'bulb',     color: '#1B7A4E', label: 'Example' },
  step_solution: { icon: 'chart',    color: '#D63B3B', label: 'Step Solution' },
  practice_set:  { icon: 'target',   color: '#F5B820', label: 'Practice Set' },
};

export default function StudentResources() {
  const [resources, setResources] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: '', language: '' });
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [viewingResource, setViewingResource] = useState(null);

  const fetchResources = async (pg = 1) => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: pg, limit: 12 });
    if (filter.type) params.set('type', filter.type);
    if (filter.language) params.set('language', filter.language);
    try {
      const { data } = await api.get(`/features/resources?${params}`);
      setResources(data.data || []);
      setPagination(data.pagination);
    } catch (err) {
      setError('Failed to load learning resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources(page);
  }, [page, filter]);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Icon name="resources" size={26} color="var(--primary)" />
            <span>Study Resources & Media</span>
          </h1>
          <p className="page-subtitle">
            Curated videos, explanation notes, and study sheets approved by your school teachers
          </p>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Filters */}
      <div className="flex gap-2 mb-5 flex-wrap items-center">
        <button
          className={`btn btn-sm ${!filter.type ? 'btn-primary' : 'btn-ghost'}`}
          style={{ border: '1px solid var(--gray-200)' }}
          onClick={() => { setFilter(p => ({ ...p, type: '' })); setPage(1); }}
        >
          All Types
        </button>
        {Object.entries(TYPE_CONFIG).map(([k, v]) => (
          <button
            key={k}
            className={`btn btn-sm ${filter.type === k ? 'btn-primary' : 'btn-ghost'}`}
            style={{ border: '1px solid var(--gray-200)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => { setFilter(p => ({ ...p, type: k })); setPage(1); }}
          >
            <Icon name={v.icon} size={14} color={filter.type === k ? 'white' : v.color} />
            <span>{v.label}</span>
          </button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            className="form-input form-select"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            value={filter.language}
            onChange={e => { setFilter(p => ({ ...p, language: e.target.value })); setPage(1); }}
          >
            <option value="">All Languages</option>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="gu">Gujarati</option>
            <option value="te">Telugu</option>
            <option value="bilingual">Bilingual</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : resources.length === 0 ? (
        <EmptyState
          icon="book"
          title="No resources found"
          message="No approved resources available for the selected filters yet. Check back soon!"
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {resources.map(r => {
            const cfg = TYPE_CONFIG[r.type] || TYPE_CONFIG.note;
            return (
              <div
                key={r._id}
                style={{
                  background: 'var(--white)',
                  borderRadius: 14,
                  padding: 18,
                  border: '2px solid var(--gray-200)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: cfg.color + '15',
                      border: `1.5px solid ${cfg.color}30`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Icon name={cfg.icon} size={18} color={cfg.color} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: cfg.color, textTransform: 'uppercase' }}>
                        {cfg.label}
                      </span>
                      <div style={{ fontSize: '0.65rem', color: 'var(--gray-400)' }}>
                        Grade {r.grade || 'All'} · {r.language?.toUpperCase() || 'EN'}
                      </div>
                    </div>
                    {r.subject && (
                      <span className="badge badge-primary" style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>
                        {r.subject.name}
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4, color: 'var(--gray-900)' }}>
                    {r.title}
                  </h3>
                  {r.titleHindi && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--gray-600)', fontFamily: 'var(--font-devanagari)', marginBottom: 6 }}>
                      {r.titleHindi}
                    </p>
                  )}

                  {r.concept && (
                    <div style={{ fontSize: '0.74rem', color: 'var(--gray-500)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                      <Icon name="book" size={13} color="var(--gray-400)" />
                      <span>{r.concept.name} {r.concept.chapter ? `· ${r.concept.chapter}` : ''}</span>
                    </div>
                  )}

                  {r.content && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--gray-600)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', lineHeight: 1.5, marginBottom: 10 }}>
                      {r.content}
                    </p>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 12, marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {r.duration ? (
                    <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="clock" size={12} color="var(--gray-400)" />
                      <span>{r.duration} mins</span>
                    </span>
                  ) : <span />}

                  <button
                    type="button"
                    onClick={() => setViewingResource(r)}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Icon name={r.type === 'video' ? 'video' : 'file'} size={14} color="white" />
                    <span>{r.type === 'video' ? 'Watch In-App' : 'Open In-App'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination pagination={pagination} onPageChange={setPage} />

      <ResourceViewerModal
        open={!!viewingResource}
        onClose={() => setViewingResource(null)}
        resource={viewingResource}
      />
    </Layout>
  );
}
