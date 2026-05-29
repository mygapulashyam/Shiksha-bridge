import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { Alert, Modal } from '../../components/common/UI';
import api from '../../api/axios';

const DIFF_COLORS = { foundational: '#D63B3B', basic: '#F5B820', intermediate: '#2563EB', advanced: '#1B7A4E' };

export default function TeacherAIQuiz() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ grade: 7, subject: '', chapter: '', difficulty: 'basic', count: 5, language: 'en', conceptId: '' });
  const [generated, setGenerated] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [quizForm, setQuizForm] = useState({ title: '', assignedClass: '' });
  const [saveModal, setSaveModal] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [editQuestion, setEditQuestion] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/teacher/subjects'), api.get('/teacher/classes')]).then(([s, c]) => {
      setSubjects(s.data.data);
      setClasses(c.data.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.subject) api.get(`/teacher/concepts?subject=${form.subject}&grade=${form.grade}`).then(r => setConcepts(r.data.data)).catch(() => {});
  }, [form.subject, form.grade]);

  const F = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleGenerate = async () => {
    if (!form.subject || !form.chapter) { setError('Subject and Chapter are required'); return; }
    setGenerating(true); setError(''); setGenerated([]);
    try {
      const { data } = await api.post('/features/ai/generate-questions', form);
      setGenerated(data.data || []);
      setQuizForm(q => ({ ...q, title: `AI Quiz: ${form.chapter} – Class ${form.grade}` }));
      if (!data.data?.length) setError('No questions generated. Check your API key or try different inputs.');
    } catch (err) {
      setError(err.response?.data?.message || 'Generation failed. Ensure NVIDIA_API_KEY is configured.');
    } finally { setGenerating(false); }
  };

  const removeQuestion = (idx) => setGenerated(prev => prev.filter((_, i) => i !== idx));

  const openEdit = (idx) => { setEditIdx(idx); setEditQuestion({ ...generated[idx] }); };

  const saveEdit = () => {
    setGenerated(prev => prev.map((q, i) => i === editIdx ? editQuestion : q));
    setEditIdx(null); setEditQuestion(null);
  };

  const saveAsQuiz = async () => {
    if (!quizForm.title) { setError('Quiz title required'); return; }
    if (!generated.length) { setError('No questions to save'); return; }
    setSaving(true);
    try {
      // Create quiz
      const { data: quizData } = await api.post('/teacher/quizzes', {
        title: quizForm.title,
        type: 'diagnostic',
        subject: form.subject,
        grade: parseInt(form.grade),
        chapter: form.chapter,
        difficulty: form.difficulty,
        assignedClass: quizForm.assignedClass || undefined,
      });
      const quizId = quizData.data._id;
      // Bulk add questions
      await api.post('/teacher/questions/bulk', {
        quizId,
        questions: generated.map(q => ({ ...q, subject: form.subject, grade: parseInt(form.grade) })),
      });

      // Publish immediately so the quiz appears in the student dashboard.
      await api.patch(`/teacher/quizzes/${quizId}/publish`);

      setSuccess('Quiz saved and published! Redirecting to edit…');
      setSaveModal(false);
      setTimeout(() => navigate(`/teacher/quizzes/${quizId}/edit`), 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">🤖 AI Quiz Generator</h1>
        <p className="page-subtitle">Generate curriculum-aligned quiz questions instantly using AI — save hours of prep work</p>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      <div className="grid-2 gap-4">
        {/* Config panel */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 20 }}>⚙️ Generation Parameters</h3>

          <div className="grid-2 gap-3">
            <div className="form-group">
              <label className="form-label">Grade / Class *</label>
              <select className="form-input form-select" value={form.grade} onChange={F('grade')}>
                {[6,7,8,9,10].map(g => <option key={g} value={g}>Class {g}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Subject *</label>
              <select className="form-input form-select" value={form.subject} onChange={F('subject')}>
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s._id} value={s._id}>{s.icon} {s.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Chapter / Topic *</label>
              <input className="form-input" value={form.chapter} onChange={F('chapter')} placeholder="e.g. Fractions and Decimals" />
            </div>
            {concepts.length > 0 && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Specific Concept (optional)</label>
                <select className="form-input form-select" value={form.conceptId} onChange={F('conceptId')}>
                  <option value="">Any concept in this chapter</option>
                  {concepts.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Difficulty</label>
              <select className="form-input form-select" value={form.difficulty} onChange={F('difficulty')}>
                {['foundational','basic','intermediate','advanced'].map(d => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Number of Questions</label>
              <select className="form-input form-select" value={form.count} onChange={F('count')}>
                {[3,5,8,10,15,20].map(n => <option key={n} value={n}>{n} questions</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Language</label>
              <div className="flex gap-2 flex-wrap">
                {[['en','English'],['hi','हिंदी'],['gu','ગુજરાતી'],['te','తెలుగు']].map(([v,l]) => (
                  <button key={v} type="button"
                    className={`btn btn-sm ${form.language === v ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ border: '1px solid var(--gray-200)' }}
                    onClick={() => setForm(p => ({ ...p, language: v }))}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button className="btn btn-primary btn-full" style={{ marginTop: 8 }} onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <span className="flex items-center gap-2"><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Generating with AI…</span>
            ) : '🤖 Generate Questions'}
          </button>

          {/* Info box */}
          <div style={{ marginTop: 16, padding: 12, background: 'var(--primary-light)', borderRadius: 10, fontSize: '0.8rem', color: 'var(--primary-dark)' }}>
            <strong>ℹ️ How it works:</strong> AI generates NCERT-aligned MCQ questions based on your specifications. You can review, edit, or remove questions before saving as a quiz.
          </div>
        </div>

        {/* Generated questions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontWeight: 700 }}>
              {generated.length > 0 ? `✅ ${generated.length} Questions Generated` : '❓ Generated Questions'}
            </h3>
            {generated.length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={() => setSaveModal(true)}>
                💾 Save as Quiz
              </button>
            )}
          </div>

          {generating ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div className="spinner" style={{ margin: '0 auto 16px', width: 40, height: 40 }} />
              <p style={{ color: 'var(--gray-500)' }}>AI is generating questions…</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 6 }}>This takes 10–15 seconds</p>
            </div>
          ) : generated.length === 0 ? (
            <div className="empty-state" style={{ padding: 48 }}>
              <div className="empty-state-icon">🤖</div>
              <p style={{ fontWeight: 700, color: 'var(--gray-700)' }}>No questions yet</p>
              <p className="text-sm text-muted" style={{ marginTop: 4 }}>Fill in the parameters and click Generate</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 580, overflowY: 'auto' }}>
              {generated.map((q, i) => (
                <div key={i} style={{ padding: '14px 16px', background: 'var(--gray-50)', borderRadius: 10, border: '1px solid var(--gray-200)', position: 'relative' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontWeight: 700, color: 'var(--gray-500)', fontSize: '0.78rem' }}>Q{i+1}</span>
                    <div className="flex gap-1">
                      <span className="badge" style={{ background: DIFF_COLORS[q.difficulty]+'20', color: DIFF_COLORS[q.difficulty], fontSize: '0.68rem' }}>{q.difficulty}</span>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem', padding: '3px 8px' }} onClick={() => openEdit(i)}>✏️ Edit</button>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem', padding: '3px 8px', color: 'var(--danger)' }} onClick={() => removeQuestion(i)}>🗑️</button>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 500, marginBottom: 8 }}>{q.text}</p>
                  {q.textHindi && <p style={{ fontSize: '0.82rem', color: 'var(--gray-600)', fontFamily: 'var(--font-devanagari)', marginBottom: 8 }}>{q.textHindi}</p>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {q.options?.map(o => (
                      <span key={o.label} style={{
                        fontSize: '0.78rem', padding: '3px 10px', borderRadius: 6,
                        background: o.isCorrect ? 'var(--secondary-light)' : 'var(--gray-200)',
                        color: o.isCorrect ? 'var(--secondary-dark)' : 'var(--gray-600)',
                        fontWeight: o.isCorrect ? 700 : 400, border: o.isCorrect ? '1px solid var(--secondary)' : 'none',
                      }}>{o.label}. {o.text} {o.isCorrect && '✓'}</span>
                    ))}
                  </div>
                  {q.explanation && (
                    <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--secondary-dark)', padding: '5px 10px', background: 'var(--secondary-light)', borderRadius: 6 }}>
                      💡 {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Question Modal */}
      {editQuestion && (
        <Modal open={editIdx !== null} onClose={() => { setEditIdx(null); setEditQuestion(null); }} title={`Edit Question ${editIdx + 1}`} size="lg">
          <div className="form-group">
            <label className="form-label">Question Text</label>
            <textarea className="form-input" rows={2} value={editQuestion.text} onChange={e => setEditQuestion(p => ({ ...p, text: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Hindi Text</label>
            <textarea className="form-input" rows={2} value={editQuestion.textHindi || ''} onChange={e => setEditQuestion(p => ({ ...p, textHindi: e.target.value }))} style={{ fontFamily: 'var(--font-devanagari)' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Options (click to mark correct)</label>
            {editQuestion.options?.map((opt, i) => (
              <div key={opt.label} className="flex gap-2 items-center" style={{ marginBottom: 8 }}>
                <button type="button" onClick={() => setEditQuestion(p => ({ ...p, options: p.options.map((o, j) => ({ ...o, isCorrect: j === i })) }))}
                  style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid', cursor: 'pointer', flexShrink: 0, borderColor: opt.isCorrect ? 'var(--secondary)' : 'var(--gray-300)', background: opt.isCorrect ? 'var(--secondary)' : 'white', color: opt.isCorrect ? 'white' : 'var(--gray-500)', fontWeight: 700, fontSize: '0.8rem' }}>
                  {opt.label}
                </button>
                <input className="form-input" value={opt.text} onChange={e => setEditQuestion(p => ({ ...p, options: p.options.map((o, j) => j === i ? { ...o, text: e.target.value } : o) }))} />
              </div>
            ))}
          </div>
          <div className="form-group">
            <label className="form-label">Explanation</label>
            <input className="form-input" value={editQuestion.explanation || ''} onChange={e => setEditQuestion(p => ({ ...p, explanation: e.target.value }))} />
          </div>
          <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => { setEditIdx(null); setEditQuestion(null); }}>Cancel</button>
            <button className="btn btn-primary" onClick={saveEdit}>✓ Save Changes</button>
          </div>
        </Modal>
      )}

      {/* Save as Quiz Modal */}
      <Modal open={saveModal} onClose={() => setSaveModal(false)} title="💾 Save as Quiz">
        <div className="form-group">
          <label className="form-label">Quiz Title *</label>
          <input className="form-input" value={quizForm.title} onChange={e => setQuizForm(p => ({ ...p, title: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Assign to Class (optional)</label>
          <select className="form-input form-select" value={quizForm.assignedClass} onChange={e => setQuizForm(p => ({ ...p, assignedClass: e.target.value }))}>
            <option value="">Select Class</option>
            {classes.map(c => <option key={c._id} value={c._id}>{c.name} (Grade {c.grade})</option>)}
          </select>
        </div>
        <div style={{ padding: 12, background: 'var(--gray-50)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--gray-600)', marginBottom: 16 }}>
          📊 {generated.length} questions · {generated.reduce((s, q) => s + (q.marks || 1), 0)} marks · {form.difficulty} difficulty
        </div>
        <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={() => setSaveModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveAsQuiz} disabled={saving}>
            {saving ? 'Saving…' : '💾 Save Quiz'}
          </button>
        </div>
      </Modal>
    </Layout>
  );
}
