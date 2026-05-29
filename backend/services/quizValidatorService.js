const { Quiz } = require('../models/QuizQuestion');
const { Question } = require('../models/QuizQuestion');

/**
 * ─── Feature 17: Better Quiz Validation ──────────────────────────────────────
 * Validates a quiz before publishing — checks all rules exhaustively
 */

const validateQuizForPublishing = async (quizId) => {
  const errors = [];
  const warnings = [];

  const quiz = await Quiz.findById(quizId).populate({
    path: 'questions.question',
    populate: { path: 'concept', select: 'name' },
  });

  if (!quiz) {
    return { valid: false, errors: ['Quiz not found'], warnings: [] };
  }

  // ── Must have questions ──────────────────────────────────────────────────
  if (!quiz.questions || quiz.questions.length === 0) {
    errors.push('Quiz must have at least one question before publishing.');
  }

  // ── Total marks > 0 ──────────────────────────────────────────────────────
  const totalMarks = quiz.questions.reduce((s, q) => s + (q.marks || 1), 0);
  if (totalMarks === 0) {
    errors.push('Total marks must be greater than 0.');
  }

  // ── Every question must have correct answer ──────────────────────────────
  const questionsWithIssues = [];
  for (const qRef of quiz.questions) {
    const q = qRef.question;
    if (!q) { errors.push(`Question reference missing (id may be invalid).`); continue; }

    if (q.type === 'mcq' || q.type === 'truefalse') {
      const correctOptions = q.options.filter(o => o.isCorrect);
      if (correctOptions.length === 0) {
        questionsWithIssues.push(`"${q.text?.slice(0, 40)}…" has no correct answer marked.`);
      }
      if (correctOptions.length > 1) {
        questionsWithIssues.push(`"${q.text?.slice(0, 40)}…" has multiple correct answers — only one allowed.`);
      }
      // All options must have text
      const emptyOptions = q.options.filter(o => !o.text?.trim());
      if (emptyOptions.length > 0) {
        questionsWithIssues.push(`"${q.text?.slice(0, 40)}…" has ${emptyOptions.length} empty option(s).`);
      }
    }

    if (q.type === 'fillblank' && !q.correctAnswer?.trim()) {
      questionsWithIssues.push(`Fill-in-the-blank question "${q.text?.slice(0, 40)}…" has no correct answer.`);
    }

    if (!q.concept) {
      warnings.push(`Question "${q.text?.slice(0, 40)}…" has no concept assigned — recommendations will be less accurate.`);
    }
  }
  errors.push(...questionsWithIssues);

  // ── Due date must be in the future ───────────────────────────────────────
  if (quiz.dueDate && new Date(quiz.dueDate) < new Date()) {
    errors.push('Due date must be in the future.');
  }

  // ── Assigned class must exist ────────────────────────────────────────────
  if (quiz.assignedClass) {
    const { Class } = require('../models/ClassSubjectConcept');
    const cls = await Class.findById(quiz.assignedClass);
    if (!cls) {
      errors.push('Assigned class no longer exists — please reassign.');
    }
  }

  // ── Assigned students must exist ──────────────────────────────────────────
  if (quiz.assignedTo?.length > 0) {
    const User = require('../models/User');
    const found = await User.countDocuments({ _id: { $in: quiz.assignedTo }, isActive: true });
    if (found < quiz.assignedTo.length) {
      warnings.push(`${quiz.assignedTo.length - found} assigned student(s) could not be found or are inactive.`);
    }
  }

  // ── Warnings (non-blocking) ──────────────────────────────────────────────
  if (!quiz.description) warnings.push('No description — adding one helps students understand what to expect.');
  if (quiz.questions.length < 3) warnings.push('Quizzes with fewer than 3 questions may not give meaningful results.');
  if (!quiz.concepts?.length) warnings.push('No concepts linked — linking concepts improves recommendation accuracy.');
  if (!quiz.assignedClass && !quiz.assignedTo?.length) warnings.push('Quiz is not assigned to any class or student — only visible to those with direct access.');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      questionCount: quiz.questions.length,
      totalMarks,
      hasDescription: !!quiz.description,
      hasConceptLinks: (quiz.concepts?.length || 0) > 0,
      hasDueDate: !!quiz.dueDate,
    },
  };
};

module.exports = { validateQuizForPublishing };
