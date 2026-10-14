import React, { useEffect, useState } from 'react';
import Layout from '../../components/common/Layout';
import { Alert, EmptyState } from '../../components/common/UI';
import Icon from '../../components/common/Icon';
import api from '../../api/axios';

const STATUS_COLORS = {
  open: { bg: '#FFF3E8', color: 'var(--primary)', border: '#F5B82030', label: 'Pending', icon: 'clock' },
  answered: { bg: 'var(--secondary-light)', color: 'var(--secondary-dark)', border: '#86efac', label: 'Answered', icon: 'success' },
  closed: { bg: 'var(--gray-50)', color: 'var(--gray-500)', border: 'var(--gray-200)', label: 'Closed', icon: 'lock' }
};

export default function StudentDoubts() {
  const [doubts, setDoubts] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ text: '', textHindi: '', subjectId: '', type: 'general' });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = () => api.get('/student/doubts')
      .then(d => setDoubts(d.data.data))
      .catch(() => setError('Failed to load doubts'))
      .finally(() => setLoading(false));

    // Load subjects separately — use student endpoint
    api.get('/student/subjects').then(s => setSubjects(s.data.data)).catch(() => {});

    load();

    // Auto-refresh every 30s so student sees teacher answers without manual reload
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.text.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/student/doubts', { text: form.text, textHindi: form.textHindi, subjectId: form.subjectId || undefined, type: form.type });
      setDoubts(prev => [data.data, ...prev]);
      setForm({ text: '', textHindi: '', subjectId: '', type: 'general' });
      setMsg('Doubt submitted! Your teacher will answer soon.');
    } catch { setError('Failed to submit doubt'); }
    finally { setSubmitting(false); }
  };

  const F = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Icon name="doubts" size={26} color="var(--primary)" />
          <span>Ask a Doubt</span>
        </h1>
        <p className="page-subtitle">Submit questions to your teacher — they'll answer as soon as possible</p>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
      {msg && <Alert type="success" onClose={() => setMsg('')}>{msg}</Alert>}

      <div className="grid-2 gap-4">
        {/* Submit form */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="edit" size={18} color="var(--primary)" />
            <span>Submit a New Doubt</span>
          </h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Your Question *</label>
              <textarea className="form-input" rows={3} required value={form.text} onChange={F('text')} placeholder="Write your doubt clearly. e.g. 'I don't understand how to add fractions with different denominators.'" />
            </div>
            <div className="form-group">
              <label className="form-label">Hindi (optional)</label>
              <textarea className="form-input" rows={2} value={form.textHindi} onChange={F('textHindi')} placeholder="हिंदी में लिखें (वैकल्पिक)…" style={{ fontFamily: 'var(--font-devanagari)' }} />
            </div>
            <div className="grid-2 gap-3">
              <div className="form-group">
                <label className="form-label">Subject</label>
                <select className="form-input form-select" value={form.subjectId} onChange={F('subjectId')}>
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-input form-select" value={form.type} onChange={F('type')}>
                  <option value="general">General</option>
                  <option value="concept">Concept doubt</option>
                  <option value="question">About a question</option>
                  <option value="topic">Topic doubt</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={submitting || !form.text.trim()}>
              {submitting ? 'Submitting…' : 'Submit Doubt'}
            </button>
          </form>

          <div style={{ marginTop: 16, padding: 12, background: 'var(--gray-50)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--gray-600)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <Icon name="bulb" size={16} color="var(--accent-dark)" style={{ marginTop: 2 }} />
            <span><strong>Tip:</strong> Be as specific as possible. Mention the chapter, topic, and exactly what you don't understand. Your teacher will see it on the Doubt Box.</span>
          </div>
        </div>

        {/* My doubts */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="clipboard" size={18} color="var(--primary)" />
            <span>My Doubts ({doubts.length})</span>
          </h3>
          {loading ? (
            <div className="page-loader" style={{ minHeight: 200 }}><div className="spinner" /></div>
          ) : doubts.length === 0 ? (
            <EmptyState icon="doubts" title="No doubts yet" message="Submit your first doubt using the form!" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 520, overflowY: 'auto' }}>
              {doubts.map(d => {
                const cfg = STATUS_COLORS[d.status] || STATUS_COLORS.open;
                return (
                  <div key={d._id} style={{ padding: '14px', borderRadius: 10, background: cfg.bg, border: `1.5px solid ${cfg.border}` }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex gap-2 items-center">
                        {d.subject && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--gray-600)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Icon name="book" size={12} color="var(--gray-500)" />
                            {d.subject.name}
                          </span>
                        )}
                        <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 10, background: 'rgba(0,0,0,0.06)', color: cfg.color, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Icon name={cfg.icon} size={11} color={cfg.color} />
                          {cfg.label}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--gray-400)' }}>{new Date(d.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--gray-800)', lineHeight: 1.5 }}>{d.text}</p>
                    {d.status === 'answered' && d.answer && (
                      <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(27,122,78,0.1)', borderRadius: 8, borderLeft: '3px solid var(--secondary)' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--secondary-dark)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Icon name="academic" size={14} color="var(--secondary-dark)" />
                          <span>Teacher's Answer:</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--secondary-dark)' }}>{d.answer}</p>
                        {d.answerHindi && <p style={{ fontSize: '0.8rem', color: 'var(--secondary-dark)', marginTop: 4, fontFamily: 'var(--font-devanagari)' }}>{d.answerHindi}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
