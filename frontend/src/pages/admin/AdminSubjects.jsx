import React, { useEffect, useState } from 'react';
import Layout from '../../components/common/Layout';
import { Alert, EmptyState, Modal, SectionHeader } from '../../components/common/UI';
import api from '../../api/axios';

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [activeSubject, setActiveSubject] = useState(null);
  const [subjectModal, setSubjectModal] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [conceptModal, setConceptModal] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', grade: 6, language: 'en', icon: '📚', color: '#4F46E5' });
  const [conceptForm, setConceptForm] = useState({ name: '', nameHindi: '', subject: '', grade: 6, chapter: '', chapterNumber: 1, difficulty: 'basic', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchSubjects = () => api.get('/admin/subjects').then(r => setSubjects(r.data.data)).catch(() => setError('Failed to load subjects'));
  const fetchConcepts = (subjectId) => api.get(`/admin/concepts?subject=${subjectId}`).then(r => setConcepts(r.data.data)).catch(() => {});

  useEffect(() => { fetchSubjects(); }, []);
  useEffect(() => { if (activeSubject) fetchConcepts(activeSubject._id); }, [activeSubject]);

  const saveSubject = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editingSubjectId) {
        await api.put(`/admin/subjects/${editingSubjectId}`, subjectForm);
        setSuccess('Subject updated!');
      } else {
        await api.post('/admin/subjects', subjectForm);
        setSuccess('Subject created!');
      }
      setSubjectModal(false);
      setEditingSubjectId(null);
      fetchSubjects();
    } catch (err) { setError(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const saveConcept = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/admin/concepts', { ...conceptForm, subject: activeSubject?._id || conceptForm.subject });
      setSuccess('Concept created!'); setConceptModal(false);
      if (activeSubject) fetchConcepts(activeSubject._id);
    } catch (err) { setError(err.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const SF = k => e => setSubjectForm(p => ({ ...p, [k]: e.target.value }));
  const CF = k => e => setConceptForm(p => ({ ...p, [k]: e.target.value }));

  const DIFF_COLORS = { foundational: 'badge-danger', basic: 'badge-warning', intermediate: 'badge-info', advanced: 'badge-success' };

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">Subjects & Concepts</h1>
        <p className="page-subtitle">Configure the curriculum — subjects, chapters, and learning concepts for Classes 6–10</p>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <div className="grid-2 gap-4">
        {/* Subjects Panel */}
        <div className="card">
          <SectionHeader title="Subjects" subtitle={`${subjects.length} subjects`}
            action={<button className="btn btn-primary btn-sm" onClick={() => { setSubjectForm({ name: '', code: '', grade: 6, language: 'en', icon: '📚', color: '#4F46E5' }); setEditingSubjectId(null); setSubjectModal(true); }}>+ Add</button>} />

          {subjects.length === 0 ? (
            <EmptyState icon="📚" title="No subjects yet" message="Add a subject to start building the curriculum." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {subjects.map(s => (
                <div key={s._id}
                  onClick={() => setActiveSubject(s)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                    borderRadius: 10, cursor: 'pointer',
                    background: activeSubject?._id === s._id ? 'var(--primary-light)' : 'var(--gray-50)',
                    border: `2px solid ${activeSubject?._id === s._id ? 'var(--primary)' : 'transparent'}`,
                    transition: 'all 0.15s'
                  }}>
                  <span style={{ fontSize: '1.5rem' }}>{s.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                      {s.code && <span style={{ marginRight: 8 }}>Code: {s.code}</span>}
                      {s.grade && <span>Grade {s.grade}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: s.color }} />
                    <div>
                      <button className="btn btn-ghost btn-xs" onClick={(ev) => { ev.stopPropagation(); setSubjectForm({
                        name: s.name || '', code: s.code || '', grade: s.grade || 6, language: s.language || 'en', icon: s.icon || '📚', color: s.color || '#4F46E5'
                      }); setEditingSubjectId(s._id); setSubjectModal(true); }}>Edit</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Concepts Panel */}
        <div className="card">
          <SectionHeader
            title={activeSubject ? `Concepts: ${activeSubject.name}` : 'Concepts'}
            subtitle={activeSubject ? `${concepts.length} concepts` : 'Select a subject to view concepts'}
            action={activeSubject && <button className="btn btn-primary btn-sm" onClick={() => setConceptModal(true)}>+ Add Concept</button>}
          />

          {!activeSubject ? (
            <EmptyState icon="👈" title="Select a subject" message="Click on a subject on the left to see its concepts." />
          ) : concepts.length === 0 ? (
            <EmptyState icon="🧩" title="No concepts yet" message="Add the first concept for this subject."
              action={<button className="btn btn-primary btn-sm" onClick={() => setConceptModal(true)}>+ Add Concept</button>} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {concepts.map(c => (
                <div key={c._id} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--gray-50)', border: '1px solid var(--gray-200)' }}>
                  <div className="flex items-center justify-between">
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.name}</div>
                    <span className={`badge ${DIFF_COLORS[c.difficulty] || 'badge-gray'}`} style={{ textTransform: 'capitalize', fontSize: '0.7rem' }}>{c.difficulty}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: 2 }}>
                    {c.chapter && <span>Ch {c.chapterNumber}: {c.chapter}</span>}
                    {c.nameHindi && <span style={{ marginLeft: 8, color: 'var(--secondary)' }}>• {c.nameHindi}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subject Modal */}
      <Modal open={subjectModal} onClose={() => { setSubjectModal(false); setEditingSubjectId(null); setSubjectForm({ name: '', code: '', grade: 6, language: 'en', icon: '📚', color: '#4F46E5' }); }} title={editingSubjectId ? 'Edit Subject' : 'Add Subject'}>
        <form onSubmit={saveSubject}>
          <div className="form-group">
            <label className="form-label">Subject Name *</label>
            <input className="form-input" required value={subjectForm.name} onChange={SF('name')} placeholder="Mathematics" />
          </div>
          <div className="grid-2 gap-4">
            <div className="form-group">
              <label className="form-label">Code</label>
              <input className="form-input" value={subjectForm.code} onChange={SF('code')} placeholder="MATH" />
            </div>
            <div className="form-group">
              <label className="form-label">Grade</label>
              <select className="form-input form-select" value={subjectForm.grade} onChange={SF('grade')}>
                {[6,7,8,9,10].map(g => <option key={g} value={g}>Class {g}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Icon (emoji)</label>
              <input className="form-input" value={subjectForm.icon} onChange={SF('icon')} placeholder="📐" maxLength={4} />
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <input className="form-input" type="color" value={subjectForm.color} onChange={SF('color')} style={{ padding: 4, height: 42 }} />
            </div>
            <div className="form-group">
              <label className="form-label">Language</label>
              <select className="form-input form-select" value={subjectForm.language} onChange={SF('language')}>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="bilingual">Bilingual</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setSubjectModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Subject'}</button>
          </div>
        </form>
      </Modal>

      {/* Concept Modal */}
      <Modal open={conceptModal} onClose={() => setConceptModal(false)} title={`Add Concept to ${activeSubject?.name}`}>
        <form onSubmit={saveConcept}>
          <div className="form-group">
            <label className="form-label">Concept Name *</label>
            <input className="form-input" required value={conceptForm.name} onChange={CF('name')} placeholder="Addition of Fractions" />
          </div>
          <div className="form-group">
            <label className="form-label">Hindi Name (optional)</label>
            <input className="form-input" value={conceptForm.nameHindi} onChange={CF('nameHindi')} placeholder="भिन्नों का जोड़" style={{ fontFamily: 'var(--font-devanagari)' }} />
          </div>
          <div className="grid-2 gap-4">
            <div className="form-group">
              <label className="form-label">Chapter Name</label>
              <input className="form-input" value={conceptForm.chapter} onChange={CF('chapter')} placeholder="Fractions and Decimals" />
            </div>
            <div className="form-group">
              <label className="form-label">Chapter No.</label>
              <input className="form-input" type="number" min="1" value={conceptForm.chapterNumber} onChange={CF('chapterNumber')} />
            </div>
            <div className="form-group">
              <label className="form-label">Grade</label>
              <select className="form-input form-select" value={conceptForm.grade} onChange={CF('grade')}>
                {[6,7,8,9,10].map(g => <option key={g} value={g}>Class {g}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Difficulty</label>
              <select className="form-input form-select" value={conceptForm.difficulty} onChange={CF('difficulty')}>
                {['foundational','basic','intermediate','advanced'].map(d => <option key={d} value={d} style={{ textTransform: 'capitalize' }}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={2} value={conceptForm.description} onChange={CF('description')} placeholder="Brief description of this concept..." />
          </div>
          <div className="flex gap-3" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setConceptModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Concept'}</button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
