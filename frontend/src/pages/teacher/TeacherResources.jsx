import React, { useEffect, useState } from 'react';
import Layout from '../../components/common/Layout';
import { Alert, EmptyState, Modal, Pagination, SectionHeader } from '../../components/common/UI';
import api from '../../api/axios';

const TYPE_CONFIG = {
  note:          { icon: '📄', color: '#2563EB', label: 'Note' },
  video:         { icon: '🎬', color: '#7C3AED', label: 'Video' },
  worksheet:     { icon: '📝', color: '#E8650A', label: 'Worksheet' },
  example:       { icon: '💡', color: '#1B7A4E', label: 'Example' },
  step_solution: { icon: '🔢', color: '#D63B3B', label: 'Step Solution' },
  practice_set:  { icon: '🎯', color: '#F5B820', label: 'Practice Set' },
};

const BLANK = { title: '', titleHindi: '', type: 'note', language: 'en', concept: '', subject: '', grade: 7, difficulty: 'basic', content: '', videoUrl: '', duration: 10 };

export default function TeacherResources() {
  const [resources, setResources] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState({ type: '', language: '' });
  const [page, setPage] = useState(1);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/teacher/subjects').then(r => setSubjects(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.subject) api.get(`/teacher/concepts?subject=${form.subject}`).then(r => setConcepts(r.data.data)).catch(() => {});
  }, [form.subject]);

  const fetchResources = async (pg = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page: pg, limit: 12 });
    if (filter.type) params.set('type', filter.type);
    if (filter.language) params.set('language', filter.language);
    try {
      const { data } = await api.get(`/features/resources?${params}`);
      setResources(data.data); setPagination(data.pagination);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchResources(page); }, [page, filter]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/features/resources', form);
      setMsg('Resource created! Pending admin approval.'); setModal(false); setForm(BLANK);
      fetchResources(1);
    } catch (err) { setError(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const F = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <Layout>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">📖 Content Library</h1>
            <p className="page-subtitle">Remedial notes, videos, worksheets, and practice sets for students</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>+ Add Resource</button>
        </div>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
      {msg && <Alert type="success" onClose={() => setMsg('')}>{msg}</Alert>}

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button className={`btn btn-sm ${!filter.type ? 'btn-primary' : 'btn-ghost'}`} style={{ border: '1px solid var(--gray-200)' }} onClick={() => setFilter(p => ({ ...p, type: '' }))}>🗂 All</button>
        {Object.entries(TYPE_CONFIG).map(([k, v]) => (
          <button key={k} className={`btn btn-sm ${filter.type === k ? 'btn-primary' : 'btn-ghost'}`}
            style={{ border: '1px solid var(--gray-200)' }} onClick={() => setFilter(p => ({ ...p, type: k }))}>
            {v.icon} {v.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : resources.length === 0 ? (
        <EmptyState icon="📖" title="No resources yet" message="Add study notes, videos, or worksheets to help students."
          action={<button className="btn btn-primary" onClick={() => setModal(true)}>+ Add Resource</button>} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {resources.map(r => {
            const cfg = TYPE_CONFIG[r.type] || TYPE_CONFIG.note;
            return (
              <div key={r._id} style={{ background: 'var(--white)', borderRadius: 14, padding: 18, border: '2px solid var(--gray-200)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: cfg.color + '15', border: `1.5px solid ${cfg.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>{cfg.icon}</div>
                  <div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: cfg.color, textTransform: 'uppercase' }}>{cfg.label}</span>
                    <div style={{ fontSize: '0.65rem', color: 'var(--gray-400)' }}>{r.difficulty} · {r.language?.toUpperCase()}</div>
                  </div>
                  {!r.isApproved && <span className="badge badge-warning" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>Pending</span>}
                  {r.isApproved && <span className="badge badge-success" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>✅ Live</span>}
                </div>
                <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{r.title}</h4>
                {r.titleHindi && <p style={{ fontSize: '0.78rem', color: 'var(--gray-600)', fontFamily: 'var(--font-devanagari)', marginBottom: 6 }}>{r.titleHindi}</p>}
                {r.concept && <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>📚 {r.concept.name} · {r.concept.chapter}</div>}
                {r.content && <p style={{ fontSize: '0.8rem', color: 'var(--gray-600)', marginTop: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{r.content}</p>}
                {r.videoUrl && <a href={r.videoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ marginTop: 10, fontSize: '0.75rem' }}>▶ Watch Video</a>}
                {r.duration && <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: 6 }}>⏱ {r.duration} min read/watch</div>}
              </div>
            );
          })}
        </div>
      )}
      <Pagination pagination={pagination} onPageChange={setPage} />

      {/* Add Resource Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add Content Resource" size="lg">
        <form onSubmit={handleSave}>
          <div className="grid-2 gap-3">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Title (English) *</label>
              <input className="form-input" required value={form.title} onChange={F('title')} placeholder="How to Add Fractions with Different Denominators" />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Title (Hindi)</label>
              <input className="form-input" value={form.titleHindi} onChange={F('titleHindi')} placeholder="अलग-अलग हरों वाले भिन्न कैसे जोड़ें" style={{ fontFamily: 'var(--font-devanagari)' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Resource Type *</label>
              <select className="form-input form-select" value={form.type} onChange={F('type')}>
                {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Language</label>
              <select className="form-input form-select" value={form.language} onChange={F('language')}>
                {[['en','English'],['hi','Hindi'],['gu','Gujarati'],['te','Telugu'],['bilingual','Bilingual']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Subject</label>
              <select className="form-input form-select" value={form.subject} onChange={F('subject')}>
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s._id} value={s._id}>{s.icon} {s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Grade</label>
              <select className="form-input form-select" value={form.grade} onChange={F('grade')}>
                {[6,7,8,9,10].map(g => <option key={g} value={g}>Class {g}</option>)}
              </select>
            </div>
            {concepts.length > 0 && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Concept</label>
                <select className="form-input form-select" value={form.concept} onChange={F('concept')}>
                  <option value="">Select Concept</option>
                  {concepts.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Difficulty</label>
              <select className="form-input form-select" value={form.difficulty} onChange={F('difficulty')}>
                {['foundational','basic','intermediate','advanced'].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Duration (mins)</label>
              <input className="form-input" type="number" min="1" value={form.duration} onChange={F('duration')} />
            </div>
            {form.type === 'video' && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Video URL</label>
                <input className="form-input" value={form.videoUrl} onChange={F('videoUrl')} placeholder="https://youtube.com/watch?v=..." />
              </div>
            )}
            {form.type !== 'video' && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Content (Markdown supported)</label>
                <textarea className="form-input" rows={4} value={form.content} onChange={F('content')} placeholder="Write the notes, examples, or step-by-step solution here…" />
              </div>
            )}
          </div>
          <div className="flex gap-3" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : '✓ Save Resource'}</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
