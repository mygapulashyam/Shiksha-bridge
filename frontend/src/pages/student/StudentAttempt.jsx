import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/common/Layout';
import { Alert, PageLoader } from '../../components/common/UI';
import api from '../../api/axios';
import { useLanguage } from '../../context/LanguageContext';

const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function StudentAttempt() {
  const { id: quizId } = useParams();
  const navigate = useNavigate();
  const { currentLanguage } = useLanguage();

  const [quiz, setQuiz] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // questionId → { selectedOption, enteredAnswer }
  const [timeLeft, setTimeLeft] = useState(null);
  const [startedAt] = useState(Date.now());
  const timerRef = useRef(null);
  const submittingRef = useRef(false);

  // Load quiz + start attempt
  useEffect(() => {
    const init = async () => {
      try {
        const [qRes, aRes] = await Promise.all([
          api.get(`/student/quizzes/${quizId}`),
          api.post('/student/attempts/start', { quizId }),
        ]);
        setQuiz(qRes.data.data);
        setAttemptId(aRes.data.data.attemptId);

        // Load resumed answers
        if (aRes.data.data.answers && aRes.data.data.answers.length > 0) {
          const mappedAnswers = {};
          aRes.data.data.answers.forEach(a => {
            mappedAnswers[a.question] = {
              questionId: a.question,
              selectedOption: a.selectedOption,
              enteredAnswer: a.enteredAnswer,
              timeTaken: a.timeTaken,
            };
          });
          setAnswers(mappedAnswers);
        }

        const durationSec = qRes.data.data.duration * 60;
        const timeTaken = aRes.data.data.timeTaken || 0;
        const remaining = Math.max(0, durationSec - timeTaken);
        setTimeLeft(remaining);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to start quiz');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [quizId]);

  // Timer
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft]);

  // Autosave answers when they change
  useEffect(() => {
    if (!attemptId || Object.keys(answers).length === 0) return;

    const delayDebounceFn = setTimeout(() => {
      const answersArr = Object.values(answers);
      const totalTime = Math.round((Date.now() - startedAt) / 1000);
      api.patch(`/student/attempts/${attemptId}/answers`, {
        answers: answersArr,
        timeTaken: totalTime,
      }).catch(err => console.error('Autosave failed:', err));
    }, 2000);

    return () => clearTimeout(delayDebounceFn);
  }, [answers, attemptId, startedAt]);

  // Before unload listener to warn leaving page
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!submittingRef.current) {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Your quiz attempt progress will be saved but the timer will keep running.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleAnswer = (questionId, type, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        questionId,
        ...(type === 'mcq' || type === 'truefalse' ? { selectedOption: value } : { enteredAnswer: value }),
      },
    }));
  };

  const handleSubmit = async () => {
    if (submitting || submittingRef.current) return;
    submittingRef.current = true;
    clearTimeout(timerRef.current);
    setSubmitting(true);

    const totalTime = Math.round((Date.now() - startedAt) / 1000);
    const answersArr = Object.values(answers);

    try {
      const { data } = await api.post('/student/attempts/submit', {
        attemptId,
        answers: answersArr,
        timeTaken: totalTime,
      });
      navigate(`/student/attempts/${attemptId}/result`, {
        state: { result: data.data },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  if (loading) return <Layout><PageLoader /></Layout>;
  if (error && !quiz) return <Layout><div className="page-loader"><Alert type="error">{error}</Alert></div></Layout>;

  const questions = quiz?.questions || [];
  const current = questions[currentIdx];
  const question = current?.question;
  const totalQ = questions.length;
  const answered = Object.keys(answers).length;
  const currentAnswer = answers[question?._id] || {};
  const isLast = currentIdx === totalQ - 1;
  const timerDanger = timeLeft < 60;

  return (
    <Layout>
      {/* Quiz Header */}
      <div style={{
        background: 'var(--white)', borderRadius: 12, padding: '16px 24px',
        marginBottom: 24, border: '1px solid var(--gray-200)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        position: 'sticky', top: 64, zIndex: 40, boxShadow: 'var(--shadow-sm)'
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--gray-900)' }}>{quiz?.title}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{quiz?.subject?.name} · {totalQ} questions · {quiz?.totalMarks} marks</div>
        </div>
        <div className="flex items-center gap-4">
          <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{answered}</span>/{totalQ} answered
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800, minWidth: 80,
            textAlign: 'center', padding: '6px 16px', borderRadius: 8,
            background: timerDanger ? '#FFEBEB' : 'var(--gray-100)',
            color: timerDanger ? 'var(--danger)' : 'var(--gray-700)',
            animation: timerDanger ? 'pulse 1s ease infinite' : 'none',
          }}>
            ⏱ {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="quiz-progress mb-6">
        <div className="quiz-progress-fill" style={{ width: `${((currentIdx + 1) / totalQ) * 100}%` }} />
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

      {/* Question Navigator (dots) */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {questions.map((_, i) => {
          const qId = questions[i]?.question?._id;
          const isAnswered = !!answers[qId];
          return (
            <button key={i} onClick={() => setCurrentIdx(i)}
              style={{
                width: 32, height: 32, borderRadius: '50%', border: '2px solid',
                cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem',
                borderColor: i === currentIdx ? 'var(--primary)' : isAnswered ? 'var(--secondary)' : 'var(--gray-300)',
                background: i === currentIdx ? 'var(--primary)' : isAnswered ? 'var(--secondary-light)' : 'var(--white)',
                color: i === currentIdx ? 'white' : isAnswered ? 'var(--secondary-dark)' : 'var(--gray-500)',
              }}>{i + 1}</button>
          );
        })}
      </div>

      {/* Question Card */}
      {question ? (
        <div className="question-card" style={{ maxWidth: 720, margin: '0 auto' }}>
          {/* Q number + concept */}
          <div className="flex items-center justify-between mb-4">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ background: 'var(--primary)', color: 'white', fontWeight: 800, width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
                {currentIdx + 1}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>of {totalQ}</span>
            </div>
            <div className="flex gap-2">
              {question.concept?.name && (
                <span style={{ fontSize: '0.72rem', padding: '3px 10px', background: 'var(--primary-light)', color: 'var(--primary-dark)', borderRadius: 20, fontWeight: 600 }}>
                  {question.concept.name}
                </span>
              )}
              <span style={{ fontSize: '0.72rem', padding: '3px 10px', background: 'var(--gray-100)', color: 'var(--gray-600)', borderRadius: 20 }}>
                {current.marks || 1} mark{current.marks !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Question Text */}
          <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--gray-900)', lineHeight: 1.6, marginBottom: 8 }}>
            {(currentLanguage === 'hi' && question.textHindi) ? question.textHindi : question.text}
          </p>
          {(currentLanguage === 'hi' && question.textHindi) && question.text && (
            <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: 20 }}>
              {question.text}
            </p>
          )}
          {currentLanguage !== 'hi' && question.textHindi && (
            <p style={{ fontSize: '0.95rem', color: 'var(--gray-600)', lineHeight: 1.5, marginBottom: 20, fontFamily: 'var(--font-devanagari)', padding: '8px 14px', background: 'var(--gray-50)', borderRadius: 8 }}>
              {question.textHindi}
            </p>
          )}

          {/* MCQ Options */}
          {(question.type === 'mcq' || question.type === 'truefalse') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
              {question.options?.map(opt => (
                <button key={opt.label}
                  className={`option-button ${currentAnswer.selectedOption === opt.label ? 'selected' : ''}`}
                  onClick={() => handleAnswer(question._id, question.type, opt.label)}>
                  <span className="option-label"
                    style={{
                      background: currentAnswer.selectedOption === opt.label ? 'var(--primary)' : 'var(--gray-100)',
                      color: currentAnswer.selectedOption === opt.label ? 'white' : 'var(--gray-700)',
                    }}>
                    {opt.label}
                  </span>
                  <span style={{ flex: 1 }}>{(currentLanguage === 'hi' && opt.textHindi) ? opt.textHindi : opt.text}</span>
                  {currentAnswer.selectedOption === opt.label && <span>✓</span>}
                </button>
              ))}
            </div>
          )}

          {/* Fill in the blank */}
          {question.type === 'fillblank' && (
            <div style={{ marginTop: 20 }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--gray-700)', display: 'block', marginBottom: 8 }}>
                Your Answer:
              </label>
              <input
                className="form-input"
                value={currentAnswer.enteredAnswer || ''}
                onChange={e => handleAnswer(question._id, 'fillblank', e.target.value)}
                placeholder="Type your answer here..."
                style={{ fontSize: '1rem', padding: '14px 16px' }}
              />
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button className="btn btn-ghost" onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}>
              ← Previous
            </button>
            <div className="flex gap-3">
              {!isLast ? (
                <button className="btn btn-primary" onClick={() => setCurrentIdx(i => Math.min(totalQ - 1, i + 1))}>
                  Next →
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={handleSubmit} disabled={submitting}
                  style={{ minWidth: 160 }}>
                  {submitting ? '⏳ Submitting…' : '✅ Submit Quiz'}
                </button>
              )}
            </div>
          </div>

          {/* Submit all from any question */}
          {!isLast && answered === totalQ && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <button className="btn btn-secondary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? '⏳ Submitting…' : '✅ All Answered — Submit Now'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <Alert type="error">Question data not available</Alert>
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }`}</style>
    </Layout>
  );
}
