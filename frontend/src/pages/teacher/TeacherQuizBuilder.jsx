import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { Alert, Modal } from '../../components/common/UI';
import api from '../../api/axios';

const BLANK_Q = { text: '', textHindi: '', type: 'mcq', difficulty: 'basic', marks: 1, explanation: '', concept: '',
  options: [{ label: 'A', text: '', isCorrect: true }, { label: 'B', text: '', isCorrect: false }, { label: 'C', text: '', isCorrect: false }, { label: 'D', text: '', isCorrect: false }] };

export default function TeacherQuizBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [quiz, setQuiz] = useState({ title: '', description: '', type: 'diagnostic', subject: '', grade: 6, chapter: '', duration: 20, difficulty: 'mixed', assignedClass: '' });
  const [questions, setQuestions] = useState([]);
  const [qModal, setQModal] = useState(false);
  const [qForm, setQForm] = useState(BLANK_Q);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [savedQuizId, setSavedQuizId] = useState(id || null);
  const [editingQuestionId, setEditingQuestionId] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/teacher/subjects'), api.get('/teacher/classes')]).then(([s, c]) => {
      setSubjects(s.data.data);
      setClasses(c.data.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit && id) {
      api.get(`/teacher/quizzes/${id}`)
        .then(r => {
          const q = r.data.data;
          setQuiz({
            title: q.title || '',
            description: q.description || '',
            type: q.type || 'diagnostic',
            subject: q.subject?._id || q.subject || '',
            grade: q.grade || 6,
            chapter: q.chapter || '',
            duration: q.duration || 20,
            difficulty: q.difficulty || 'mixed',
            assignedClass: q.assignedClass?._id || q.assignedClass || q.class?._id || q.class || ''
          });
          if (q.questions) {
            setQuestions(q.questions.map(qRef => qRef.question).filter(Boolean));
          }
        })
        .catch(() => setError('Failed to load quiz content'));
    }
  }, [id, isEdit]);

  useEffect(() => {
    if (quiz.subject) {
      api.get(`/teacher/concepts?subject=${quiz.subject}`).then(r => setConcepts(r.data.data)).catch(() => {});
    }
  }, [quiz.subject]);

  const QF = k => e => setQForm(p => ({ ...p, [k]: e.target.value }));
  const ZF = k => e => setQuiz(p => ({ ...p, [k]: e.target.value }));

  const setOptionText = (i, val) => setQForm(p => ({ ...p, options: p.options.map((o, idx) => idx === i ? { ...o, text: val } : o) }));
  const setCorrectOption = (i) => setQForm(p => ({ ...p, options: p.options.map((o, idx) => ({ ...o, isCorrect: idx === i })) }));

  const saveQuiz = async () => {
    if (!quiz.title || !quiz.subject) { setError('Title and Subject are required'); return; }
    setSaving(true);
    try {
      let qId = savedQuizId;
      if (!qId) {
        const { data } = await api.post('/teacher/quizzes', quiz);
        qId = data.data._id;
        setSavedQuizId(qId);
        setSuccess('Quiz saved! Now add questions below.');
      } else {
        await api.put(`/teacher/quizzes/${qId}`, quiz);
        setSuccess('Quiz updated!');
      }
    } catch (err) { setError(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const saveQuestion = async (e) => {
    e.preventDefault();
    if (!qForm.text) { setError('Question text is required'); return; }
    setSaving(true);
    try {
      const questionData = {
        ...qForm,
        concept: qForm.concept || null,
        subject: quiz.subject,
        grade: quiz.grade
      };
      if (editingQuestionId) {
        const { data } = await api.put(`/teacher/questions/${editingQuestionId}`, questionData);
        setQuestions(prev => prev.map(q => q._id === editingQuestionId ? data.data : q));
        setSuccess('Question updated!');
      } else {
        const { data } = await api.post('/teacher/questions', { ...questionData, quizId: savedQuizId });
        setQuestions(prev => [...prev, data.data]);
        setSuccess('Question added!');
      }
      setQModal(false);
      setQForm(BLANK_Q);
      setEditingQuestionId(null);
    } catch (err) { setError(err.response?.data?.message || 'Failed to save question'); }
    finally { setSaving(false); }
  };

  const startEditQuestion = (q) => {
    setEditingQuestionId(q._id);
    setQForm({
      text: q.text || '',
      textHindi: q.textHindi || '',
      type: q.type || 'mcq',
      difficulty: q.difficulty || 'basic',
      marks: q.marks || 1,
      explanation: q.explanation || '',
      concept: q.concept?._id || q.concept || '',
      options: q.options || BLANK_Q.options,
      correctAnswer: q.correctAnswer || ''
    });
    setQModal(true);
  };

  const deleteQuestion = async (qId) => {
    if (!window.confirm('Are you sure you want to permanently delete this question?')) return;
    setSaving(true);
    try {
      await api.delete(`/teacher/questions/${qId}`);
      setQuestions(prev => prev.filter(q => q._id !== qId));
      setSuccess('Question deleted successfully!');
    } catch (err) { setError(err.response?.data?.message || 'Failed to delete question'); }
    finally { setSaving(false); }
  };

  const publishQuiz = async () => {
    if (!savedQuizId) { setError('Save the quiz first'); return; }
    if (questions.length === 0) { setError('Add at least one question before publishing'); return; }
    setPublishing(true);
    try {
      await api.patch(`/teacher/quizzes/${savedQuizId}/publish`);
      setSuccess('Quiz published successfully! Students can now attempt it.');
      setTimeout(() => navigate('/teacher/quizzes'), 1200);
    } catch (err) { setError(err.response?.data?.message || 'Publish failed'); }
    finally { setPublishing(false); }
  };

  const DIFF_COLORS = { foundational: '#D63B3B', basic: '#F5B820', intermediate: '#2563EB', advanced: '#1B7A4E' };

  return (
    <Layout>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">{isEdit ? 'Edit Quiz' : 'Create New Quiz'}</h1>
            <p className="page-subtitle">Build a diagnostic or practice quiz for your class</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-outline" onClick={() => navigate('/teacher/quizzes')}>← Back</button>
            {savedQuizId && questions.length > 0 && (
              <button className="btn btn-secondary" onClick={publishQuiz} disabled={publishing}>
                {publishing ? '⏳ Publishing…' : '🚀 Publish Quiz'}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <div className="grid-2 gap-4">
        {/* Quiz Config */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 20, color: 'var(--gray-900)' }}>📋 Quiz Details</h3>
          <div className="form-group">
            <label className="form-label">Quiz Title *</label>
            <input className="form-input" value={quiz.title} onChange={ZF('title')} placeholder="Fractions Diagnostic – Class 7" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={2} value={quiz.description} onChange={ZF('description')} placeholder="A short quiz to identify learning gaps in fractions..." />
          </div>
          <div className="grid-2 gap-3">
            <div className="form-group">
              <label className="form-label">Quiz Type *</label>
              <select className="form-input form-select" value={quiz.type} onChange={ZF('type')}>
                {['diagnostic','practice','remedial','assessment'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Subject *</label>
              <select className="form-input form-select" value={quiz.subject} onChange={ZF('subject')}>
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Grade</label>
              <select className="form-input form-select" value={quiz.grade} onChange={ZF('grade')}>
                {[6,7,8,9,10].map(g => <option key={g} value={g}>Class {g}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Duration (minutes)</label>
              <input className="form-input" type="number" min="5" max="120" value={quiz.duration} onChange={ZF('duration')} />
            </div>
            <div className="form-group">
              <label className="form-label">Chapter</label>
              <input className="form-input" value={quiz.chapter} onChange={ZF('chapter')} placeholder="Fractions and Decimals" />
            </div>
            <div className="form-group">
              <label className="form-label">Difficulty</label>
              <select className="form-input form-select" value={quiz.difficulty} onChange={ZF('difficulty')}>
                {['mixed','foundational','basic','intermediate','advanced'].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Assign to Class</label>
              <select className="form-input form-select" value={quiz.assignedClass} onChange={ZF('assignedClass')}>
                <option value="">Select Class (optional)</option>
                {classes.map(c => <option key={c._id} value={c._id}>{c.name} – Grade {c.grade}{c.section}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-primary btn-full" onClick={saveQuiz} disabled={saving} style={{ marginTop: 8 }}>
            {saving ? '⏳ Saving…' : savedQuizId ? '✓ Update Quiz Details' : '✓ Save Quiz & Add Questions'}
          </button>
        </div>

        {/* Questions Panel */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontWeight: 700, color: 'var(--gray-900)' }}>❓ Questions ({questions.length})</h3>
            {savedQuizId && (
              <button className="btn btn-primary btn-sm" onClick={() => setQModal(true)}>+ Add Question</button>
            )}
          </div>

          {!savedQuizId ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-state-icon">💡</div>
              <p className="text-muted">Save the quiz details first, then add questions here.</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-state-icon">➕</div>
              <p className="text-muted">No questions yet. Add your first question!</p>
              <button className="btn btn-primary btn-sm mt-4" onClick={() => setQModal(true)}>+ Add First Question</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {questions.map((q, i) => (
                <div key={q._id} style={{ padding: '14px 16px', background: 'var(--gray-50)', borderRadius: 10, border: '1px solid var(--gray-200)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontWeight: 700, color: 'var(--gray-500)', fontSize: '0.78rem' }}>Q{i + 1}</span>
                    <div className="flex gap-2 items-center">
                      <span className="badge badge-gray" style={{ textTransform: 'uppercase', fontSize: '0.68rem' }}>{q.type}</span>
                      <span className="badge" style={{ background: DIFF_COLORS[q.difficulty] + '20', color: DIFF_COLORS[q.difficulty], fontSize: '0.68rem' }}>{q.difficulty}</span>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: '0.75rem', height: 'auto' }} onClick={() => startEditQuestion(q)}>✏️ Edit</button>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: '0.75rem', height: 'auto', color: 'var(--danger)' }} onClick={() => deleteQuestion(q._id)}>🗑️</button>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{q.text}</p>
                  {q.type === 'mcq' && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {q.options?.map(o => (
                        <span key={o.label} style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: 4,
                          background: o.isCorrect ? 'var(--secondary-light)' : 'var(--gray-200)',
                          color: o.isCorrect ? 'var(--secondary-dark)' : 'var(--gray-600)',
                          fontWeight: o.isCorrect ? 700 : 400 }}>
                          {o.label}. {o.text} {o.isCorrect && '✓'}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                    Marks: {q.marks} · Concept: {concepts.find(c => c._id === (q.concept?._id || q.concept))?.name || '—'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {savedQuizId && questions.length > 0 && (
            <div style={{ marginTop: 20, padding: '14px', background: 'var(--primary-light)', borderRadius: 10, border: '1px solid rgba(232,101,10,0.2)' }}>
              <div style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: '0.9rem' }}>
                📊 Total: {questions.length} questions · {questions.reduce((a, q) => a + (q.marks || 1), 0)} marks
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: 4 }}>
                Ready to publish! Click "Publish Quiz" to make it available to students.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Question Modal */}
      <Modal open={qModal} onClose={() => { setQModal(false); setQForm(BLANK_Q); setEditingQuestionId(null); }} title={editingQuestionId ? "✏️ Edit Question" : "Add Question"} size="lg">
        <form onSubmit={saveQuestion}>
          <div className="form-group">
            <label className="form-label">Question Text (English) *</label>
            <textarea className="form-input" rows={2} required value={qForm.text} onChange={QF('text')} placeholder="What is 3/4 + 1/4?" />
          </div>
          <div className="form-group">
            <label className="form-label">Question Text (Hindi)</label>
            <textarea className="form-input" rows={2} value={qForm.textHindi} onChange={QF('textHindi')} placeholder="3/4 + 1/4 क्या है?" style={{ fontFamily: 'var(--font-devanagari)' }} />
          </div>
          <div className="grid-2 gap-3">
            <div className="form-group">
              <label className="form-label">Question Type</label>
              <select className="form-input form-select" value={qForm.type} onChange={QF('type')}>
                <option value="mcq">Multiple Choice (MCQ)</option>
                <option value="truefalse">True / False</option>
                <option value="fillblank">Fill in the Blank</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Concept</label>
              <select className="form-input form-select" value={qForm.concept} onChange={QF('concept')}>
                <option value="">Select Concept</option>
                {concepts.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Difficulty</label>
              <select className="form-input form-select" value={qForm.difficulty} onChange={QF('difficulty')}>
                {['foundational','basic','intermediate','advanced'].map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Marks</label>
              <input className="form-input" type="number" min="1" max="10" value={qForm.marks} onChange={QF('marks')} />
            </div>
          </div>

          {/* MCQ Options */}
          {qForm.type === 'mcq' && (
            <div className="form-group">
              <label className="form-label">Answer Options (click the correct one)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {qForm.options.map((opt, i) => (
                  <div key={opt.label} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button type="button"
                      style={{
                        width: 32, height: 32, borderRadius: '50%', border: '2px solid', flexShrink: 0,
                        borderColor: opt.isCorrect ? 'var(--secondary)' : 'var(--gray-300)',
                        background: opt.isCorrect ? 'var(--secondary)' : 'white',
                        color: opt.isCorrect ? 'white' : 'var(--gray-500)',
                        fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem'
                      }}
                      onClick={() => setCorrectOption(i)}>{opt.label}</button>
                    <input className="form-input" style={{ flex: 1 }} value={opt.text}
                      onChange={e => setOptionText(i, e.target.value)}
                      placeholder={`Option ${opt.label}`} />
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 6 }}>Click the letter button to mark the correct answer (shown in green)</p>
            </div>
          )}

          {qForm.type === 'truefalse' && (
            <div className="form-group">
              <label className="form-label">Correct Answer</label>
              <select className="form-input form-select" value={qForm.options[0]?.isCorrect ? 'true' : 'false'}
                onChange={e => setQForm(p => ({ ...p, options: [{ label: 'True', text: 'True', isCorrect: e.target.value === 'true' }, { label: 'False', text: 'False', isCorrect: e.target.value === 'false' }] }))}>
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>
          )}

          {qForm.type === 'fillblank' && (
            <div className="form-group">
              <label className="form-label">Correct Answer *</label>
              <input className="form-input" value={qForm.correctAnswer || ''} onChange={e => setQForm(p => ({ ...p, correctAnswer: e.target.value }))} placeholder="The exact answer students should enter" />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Explanation (shown after attempt)</label>
            <textarea className="form-input" rows={2} value={qForm.explanation} onChange={QF('explanation')} placeholder="3/4 + 1/4 = 4/4 = 1. When denominators are same, just add the numerators." />
          </div>

          <div className="flex gap-3" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => { setQModal(false); setQForm(BLANK_Q); setEditingQuestionId(null); }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '⏳ Saving…' : editingQuestionId ? '✓ Save Changes' : '+ Add Question'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
