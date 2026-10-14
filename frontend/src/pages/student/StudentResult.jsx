import React, { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import Layout from '../../components/common/Layout';
import { PageLoader, Alert, MasteryBadge, ProgressBar, ScoreCircle } from '../../components/common/UI';
import api from '../../api/axios';

import Icon from '../../components/common/Icon';

const RULE_MESSAGES = {
  score_below_40: { label: 'Needs Practice', color: 'var(--danger)', bg: '#FFEBEB', icon: 'wrench', advice: 'Don\'t worry! Everyone has areas to improve. Your teacher has assigned remedial drills to help you master the basics.' },
  score_40_to_70:  { label: 'Keep Going!',   color: 'var(--accent-dark)', bg: '#FFF8E1', icon: 'book', advice: 'You\'re making good progress! Keep practising the concepts and you\'ll reach mastery.' },
  score_above_70:  { label: 'Excellent!',    color: 'var(--secondary)', bg: 'var(--secondary-light)', icon: 'star', advice: 'Outstanding work! You have a strong grasp of these concepts. Ready for the next challenge!' },
};

export default function StudentResult() {
  const { id: attemptId } = useParams();
  const location = useLocation();
  const [result, setResult] = useState(location.state?.result || null);
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(!result);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!result) {
      api.get(`/student/attempts/${attemptId}`)
        .then(r => setAttempt(r.data.data))
        .catch(() => setError('Failed to load result'))
        .finally(() => setLoading(false));
    } else {
      api.get(`/student/attempts/${attemptId}`)
        .then(r => setAttempt(r.data.data))
        .catch(() => {});
    }
  }, [attemptId]);

  if (loading) return <Layout><PageLoader /></Layout>;

  const pct = result?.percentage ?? attempt?.percentage ?? 0;
  const ruleKey = pct < 40 ? 'score_below_40' : pct <= 70 ? 'score_40_to_70' : 'score_above_70';
  const rule = RULE_MESSAGES[ruleKey];
  const conceptScores = result?.conceptScores || attempt?.conceptScores || [];
  const newBadges = result?.newBadges || [];

  const marksObtained = result?.marksObtained ?? attempt?.marksObtained;
  const totalMarks = result?.totalMarks ?? attempt?.totalMarks;
  const aiAnalysis = result?.aiAnalysis || attempt?.aiAnalysis;

  const radarData = conceptScores.map(cs => ({
    subject: cs.conceptName?.slice(0, 16) || 'Concept',
    score: cs.percentage,
    fullMark: 100,
  }));

  return (
    <Layout>
      {/* Result Hero */}
      <div style={{ background: rule.bg, border: `2px solid ${rule.color}30`, borderRadius: 20, padding: '32px', marginBottom: 24, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', background: 'white', color: rule.color, marginBottom: 12, boxShadow: 'var(--shadow-sm)' }}>
          <Icon name={rule.icon} size={28} color={rule.color} />
        </div>
        <ScoreCircle percentage={pct} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, color: rule.color, marginTop: 16 }}>
          {rule.label}
        </h2>
        <p style={{ color: 'var(--gray-700)', marginTop: 8, maxWidth: 480, margin: '8px auto 0', lineHeight: 1.6 }}>
          {rule.advice}
        </p>
        {marksObtained !== undefined && totalMarks !== undefined && (
          <div style={{ marginTop: 16, fontSize: '0.9rem', color: 'var(--gray-600)' }}>
            You scored <strong>{marksObtained}</strong> out of <strong>{totalMarks}</strong> marks
          </div>
        )}
      </div>

      {/* AI Analysis / Learning Gap Assessment */}
      {aiAnalysis && (
        <div className="card mb-6" style={{ background: 'linear-gradient(135deg, #F0FDF4, #ECFDF5)', border: '1.5px solid var(--secondary-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--secondary)' }}>
              <Icon name="ai" size={20} color="var(--secondary)" />
            </span>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--secondary-dark)' }}>AI Learning Assessment</h3>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--gray-800)', lineHeight: 1.6 }}>
            {aiAnalysis.summary || aiAnalysis}
          </p>
        </div>
      )}

      {/* New Badges */}
      {newBadges?.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #FFF8E1, #FFFDE7)', border: '2px solid var(--accent)', borderRadius: 16, padding: 20, marginBottom: 24, textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent-dark)', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Icon name="sparkles" size={18} color="var(--accent-dark)" />
            <span>You Earned New Badges!</span>
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            {newBadges.map((b, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '12px 20px', background: 'white', borderRadius: 12, boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', margin: '0 auto 6px' }}>
                  <Icon name="badge" size={24} color="var(--primary)" />
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginTop: 4 }}>{b.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <Alert type="error">{error}</Alert>}

      <div className="grid-2 gap-4 mb-6">
        {/* Concept Scores */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="chart" size={18} color="var(--primary)" />
            <span>Concept-wise Performance</span>
          </h3>
          {conceptScores.length === 0 ? (
            <p className="text-muted text-sm">No concept-level data available.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {conceptScores.map((cs, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cs.conceptName}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginLeft: 8 }}>
                        {cs.correctAnswers}/{cs.totalQuestions} correct
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ fontWeight: 700, fontSize: '0.875rem', color: cs.percentage < 40 ? 'var(--danger)' : cs.percentage < 70 ? 'var(--accent-dark)' : 'var(--secondary)' }}>
                        {cs.percentage}%
                      </span>
                      <MasteryBadge level={cs.mastery} />
                    </div>
                  </div>
                  <ProgressBar value={cs.percentage} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Radar Chart */}
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: '1rem' }}>🕸 Skill Radar</h3>
          {radarData.length >= 3 ? (
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--gray-200)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--gray-600)' }} />
                <Radar name="Score" dataKey="score" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.3} />
                <Tooltip formatter={v => [`${v}%`, 'Score']} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0' }}>
              {conceptScores.map((cs, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: '1.25rem', color: cs.percentage < 40 ? 'var(--danger)' : cs.percentage < 70 ? 'var(--accent-dark)' : 'var(--secondary)', width: 48, textAlign: 'right', flexShrink: 0 }}>{cs.percentage}%</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>{cs.conceptName}</div>
                    <ProgressBar value={cs.percentage} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Answer Review */}
      {attempt?.answers?.length > 0 && (
        <div className="card mb-6">
          <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: '1rem' }}>📋 Answer Review</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {attempt.answers.map((ans, i) => {
              const q = ans.question || {};
              const qText = q.text || ans.questionText;
              const qType = q.type || ans.questionType || 'mcq';
              const qOptions = (q.options && q.options.length > 0) ? q.options : (ans.options || []);
              const qExplanation = q.explanation || ans.explanation;
              if (!qText) return null;

              return (
                <div key={i} style={{
                  padding: '16px',
                  borderRadius: 10,
                  border: `2px solid ${ans.isCorrect ? 'rgba(27,122,78,0.3)' : 'rgba(214,59,59,0.3)'}`,
                  background: ans.isCorrect ? 'var(--secondary-light)' : '#FFEBEB'
                }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
                    <span style={{ fontWeight: 800, color: ans.isCorrect ? 'var(--secondary)' : 'var(--danger)', fontSize: '1.1rem', flexShrink: 0 }}>
                      {ans.isCorrect ? '✓' : '✗'}
                    </span>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--gray-900)' }}>
                      Q{i + 1}. {qText}
                    </p>
                  </div>

                  <div style={{ marginLeft: 24, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {qOptions?.map(opt => {
                      const isSelected = ans.selectedOption?.trim().toUpperCase() === opt.label?.trim().toUpperCase();
                      const isCorrectOpt = opt.isCorrect || (isSelected && ans.isCorrect);
                      let bg = 'transparent', color = 'var(--gray-600)', border = 'transparent';
                      if (isSelected && isCorrectOpt) { bg = 'var(--secondary-light)'; color = 'var(--secondary-dark)'; border = 'var(--secondary)'; }
                      else if (isSelected && !isCorrectOpt) { bg = '#FFEBEB'; color = 'var(--danger)'; border = 'var(--danger)'; }
                      else if (!isSelected && isCorrectOpt) { bg = 'var(--secondary-light)'; color = 'var(--secondary-dark)'; border = 'var(--secondary)'; }
                      return (
                        <div key={opt.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: bg, border: `1.5px solid ${border}`, fontSize: '0.85rem', color }}>
                          <span style={{ fontWeight: 700 }}>{opt.label}.</span> {opt.text}
                          {isSelected && !isCorrectOpt && <span style={{ marginLeft: 'auto', fontWeight: 700 }}>← Your answer</span>}
                          {isCorrectOpt && <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--secondary)' }}>✓ Correct</span>}
                        </div>
                      );
                    })}

                    {/* Fill blank */}
                    {qType === 'fillblank' && (
                      <div style={{ fontSize: '0.85rem' }}>
                        <span style={{ color: ans.isCorrect ? 'var(--secondary)' : 'var(--danger)', fontWeight: 700 }}>
                          Your answer: "{ans.enteredAnswer || '—'}"
                        </span>
                        {!ans.isCorrect && q.correctAnswer && <span style={{ color: 'var(--secondary)', fontWeight: 700, marginLeft: 12 }}>Correct: "{q.correctAnswer}"</span>}
                      </div>
                    )}

                    {/* Explanation */}
                    {qExplanation && (
                      <div style={{ marginTop: 6, padding: '8px 12px', background: 'rgba(27,122,78,0.08)', borderRadius: 6, fontSize: '0.82rem', color: 'var(--secondary-dark)', borderLeft: '3px solid var(--secondary)' }}>
                        💡 {qExplanation}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', paddingBottom: 32 }}>
        <Link to="/student" className="btn btn-outline">← Dashboard</Link>
        <Link to="/student/quizzes" className="btn btn-primary">📝 More Quizzes</Link>
        <Link to="/student/progress" className="btn btn-secondary">📈 My Progress</Link>
      </div>
    </Layout>
  );
}
