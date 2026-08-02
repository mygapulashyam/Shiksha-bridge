const User = require('../models/User');
const { Class, Subject, Concept } = require('../models/ClassSubjectConcept');
const { Quiz, Question } = require('../models/QuizQuestion');
const { Attempt, Recommendation, ProgressReport } = require('../models/AttemptRecommendation');
const { LearningPath, Doubt } = require('../models/LearningPathDoubtContent');
const { paginate } = require('../utils/pagination');
const { asyncHandler } = require('../middleware/errorHandler');
const { generateRecommendations, updateConceptMastery, checkAndAwardBadges } = require('../services/recommendationEngine');
const { analyzeLearningGaps } = require('../services/aiService');
const { buildLearningPath, advancePathStep, getStudentPaths } = require('../services/learningPathService');
const { checkAndGenerateAlerts } = require('../services/alertService');
const { generateParentReport } = require('../services/pdfReportService');
const { generateParentReportSummary } = require('../services/aiService');
const mongoose = require('mongoose');

const { isValidConceptId } = require('../utils/validators');

/* ══════════════════════════════════════════════════
   QUIZZES
══════════════════════════════════════════════════ */
const getAvailableQuizzes = asyncHandler(async (req, res) => {
  const student = req.user;
  const filter = { isPublished: true, isActive: true };

  const orConditions = [{ assignedTo: student._id }];

  if (student.class) {
    orConditions.push({ assignedClass: student.class });
    const cls = await Class.findById(student.class).lean();
    if (cls) {
      orConditions.push({
        grade: cls.grade,
        $or: [{ assignedClass: { $exists: false } }, { assignedClass: null }],
      });
    }
  } else {
    orConditions.push({
      $or: [{ assignedClass: { $exists: false } }, { assignedClass: null }],
    });
  }

  filter.$or = orConditions;

  if (req.query.type) filter.type = req.query.type;
  if (req.query.subject) filter.subject = req.query.subject;

  const result = await paginate(Quiz, filter, { populate: [{ path: 'subject', select: 'name icon color' }, { path: 'concepts', select: 'name chapter' }], sort: { publishedAt: -1 } }, req);
  res.json({ success: true, ...result });
});

const getQuizForAttempt = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findOne({ _id: req.params.id, isPublished: true, isActive: true })
    .populate('subject', 'name icon color')
    .populate('concepts', 'name chapter')
    .populate({ path: 'questions.question', select: '-correctAnswer', populate: { path: 'concept', select: 'name' } });
  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

  const questionsShuffled = [...quiz.questions];
  for (let i = questionsShuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questionsShuffled[i], questionsShuffled[j]] = [questionsShuffled[j], questionsShuffled[i]];
  }

  res.json({ success: true, data: { _id: quiz._id, title: quiz.title, description: quiz.description, type: quiz.type, subject: quiz.subject, duration: quiz.duration, totalMarks: quiz.totalMarks, questions: questionsShuffled } });
});

/* ══════════════════════════════════════════════════
   ATTEMPTS
══════════════════════════════════════════════════ */
const startAttempt = asyncHandler(async (req, res) => {
  const { quizId } = req.body;
  const student = req.user;
  const quiz = await Quiz.findById(quizId);
  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

  const existingAttempt = await Attempt.findOne({ student: student._id, quiz: quizId, status: 'in_progress' });
  if (existingAttempt) {
    return res.status(200).json({ success: true, data: { attemptId: existingAttempt._id, answers: existingAttempt.answers, timeTaken: existingAttempt.timeTaken } });
  }

  const prevAttempts = await Attempt.countDocuments({ student: student._id, quiz: quizId });
  const attempt = await Attempt.create({ student: student._id, quiz: quizId, school: student.school, class: student.class, subject: quiz.subject, totalMarks: quiz.totalMarks, status: 'in_progress', attemptNumber: prevAttempts + 1 });
  res.status(201).json({ success: true, data: { attemptId: attempt._id } });
});

const saveAnswers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { answers = [], timeTaken } = req.body;
  const attempt = await Attempt.findById(id);
  if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });
  if (attempt.student.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Not authorised' });
  if (attempt.status === 'completed') return res.status(400).json({ success: false, message: 'Quiz already completed' });

  attempt.answers = answers.map(a => ({
    question: a.questionId || a.question,
    selectedOption: a.selectedOption,
    enteredAnswer: a.enteredAnswer,
    timeTaken: a.timeTaken,
  }));
  if (timeTaken !== undefined) {
    attempt.timeTaken = timeTaken;
  }
  await attempt.save();
  res.json({ success: true, message: 'Answers saved' });
});

const submitAttempt = asyncHandler(async (req, res) => {
  const { attemptId, answers = [] } = req.body;
  const attempt = await Attempt.findById(attemptId);
  if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });
  if (attempt.student.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Not authorised' });
  if (attempt.status === 'completed') {
    return res.json({
      success: true,
      message: 'Quiz already submitted',
      data: {
        attemptId: attempt._id,
        percentage: attempt.percentage,
        marksObtained: attempt.marksObtained,
        totalMarks: attempt.totalMarks,
        conceptScores: attempt.conceptScores,
        newBadges: [],
        streakUpdated: false,
        aiAnalysis: null,
      },
    });
  }

  const quiz = await Quiz.findById(attempt.quiz).populate({ path: 'questions.question', populate: { path: 'concept', select: '_id name' } });
  let marksObtained = 0;
  const gradedAnswers = [];
  const conceptMap = {};

  for (const qRef of quiz.questions) {
    const question = qRef.question;
    if (!question) continue;
    const studentAnswer = answers.find(a => a.questionId === question._id.toString());
    const conceptId = question.concept?._id?.toString();
    const conceptName = question.concept?.name || 'Unknown';
    const marks = qRef.marks || 1;
    if (!isValidConceptId(conceptId)) {
      let isCorrect = false;
      let selectedOption = null, enteredAnswer = null;
      if (studentAnswer) {
        selectedOption = studentAnswer.selectedOption;
        enteredAnswer = studentAnswer.enteredAnswer;
        if (question.type === 'mcq' || question.type === 'truefalse') {
          const correct = question.options.find(o => o.isCorrect);
          const studentSelectedOpt = question.options.find(o => o.label?.trim().toUpperCase() === selectedOption?.trim().toUpperCase());
          isCorrect = correct && (
            correct.label?.trim().toUpperCase() === selectedOption?.trim().toUpperCase() ||
            (studentSelectedOpt && correct.text?.trim().toLowerCase() === studentSelectedOpt.text?.trim().toLowerCase())
          );
        } else if (question.type === 'fillblank') {
          isCorrect = question.correctAnswer?.toLowerCase().trim() === enteredAnswer?.toLowerCase().trim();
        }
      }
      if (isCorrect) marksObtained += marks;
      gradedAnswers.push({ question: question._id, selectedOption, enteredAnswer, isCorrect, marksAwarded: isCorrect ? marks : 0, timeTaken: studentAnswer?.timeTaken, concept: null });
      continue;
    }
    if (!conceptMap[conceptId]) conceptMap[conceptId] = { correct: 0, total: 0, name: conceptName };
    conceptMap[conceptId].total += 1;
    let isCorrect = false;
    let selectedOption = null, enteredAnswer = null;
    if (studentAnswer) {
      selectedOption = studentAnswer.selectedOption;
      enteredAnswer = studentAnswer.enteredAnswer;
      if (question.type === 'mcq' || question.type === 'truefalse') {
        const correct = question.options.find(o => o.isCorrect);
        const studentSelectedOpt = question.options.find(o => o.label?.trim().toUpperCase() === selectedOption?.trim().toUpperCase());
        isCorrect = correct && (
          correct.label?.trim().toUpperCase() === selectedOption?.trim().toUpperCase() ||
          (studentSelectedOpt && correct.text?.trim().toLowerCase() === studentSelectedOpt.text?.trim().toLowerCase())
        );
      } else if (question.type === 'fillblank') {
        isCorrect = question.correctAnswer?.toLowerCase().trim() === enteredAnswer?.toLowerCase().trim();
      }
    }
    if (isCorrect) { marksObtained += marks; conceptMap[conceptId].correct += 1; }
    gradedAnswers.push({ question: question._id, selectedOption, enteredAnswer, isCorrect, marksAwarded: isCorrect ? marks : 0, timeTaken: studentAnswer?.timeTaken, concept: question.concept?._id });
  }

  const conceptScores = Object.entries(conceptMap).map(([conceptId, data]) => {
    const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
    return { concept: conceptId, conceptName: data.name, totalQuestions: data.total, correctAnswers: data.correct, percentage: pct, mastery: pct < 40 ? 'weak' : pct < 70 ? 'developing' : pct < 90 ? 'proficient' : 'mastered' };
  });

  attempt.answers = gradedAnswers;
  attempt.marksObtained = marksObtained;
  attempt.totalMarks = quiz.totalMarks;
  attempt.conceptScores = conceptScores;
  attempt.status = 'completed';
  attempt.completedAt = new Date();
  attempt.timeTaken = req.body.timeTaken;
  await attempt.save();

  // Update student
  const student = await User.findById(req.user._id);
  student.updateStreak();
  student.addXP(Math.round(attempt.percentage / 5));
  const newBadges = checkAndAwardBadges(student, attempt);
  newBadges.forEach(b => student.badges.push(b));
  await student.save({ validateBeforeSave: false });

  // Fire async services - don't block response
  const afterSubmit = async () => {
    try {
      await generateRecommendations(attempt, student);
      await buildLearningPath(student, attempt);
      await checkAndGenerateAlerts(attempt, student);
      await updateProgressReport(student._id, attempt, quiz);
    } catch(e) { console.error('Post-submit service error:', e.message); }
  };
  afterSubmit();

  // AI Learning Gap Analysis (fast - include in response)
  let aiAnalysis = null;
  try {
    aiAnalysis = await analyzeLearningGaps({
      studentName: student.name,
      quizTitle: quiz.title,
      percentage: attempt.percentage,
      conceptScores,
      subject: (await Subject.findById(attempt.subject).select('name').lean())?.name || 'Subject',
      grade: quiz.grade,
    });
  } catch(e) { /* non-blocking */ }

  res.json({
    success: true,
    message: 'Quiz submitted successfully',
    data: { attemptId: attempt._id, percentage: attempt.percentage, marksObtained, totalMarks: quiz.totalMarks, conceptScores, newBadges, streakUpdated: true, aiAnalysis },
  });
});

async function updateProgressReport(studentId, attempt, quiz) {
  try {
    let report = await ProgressReport.findOne({ student: studentId, subject: attempt.subject });
    if (!report) { report = new ProgressReport({ student: studentId, school: attempt.school, class: attempt.class, subject: attempt.subject, conceptMastery: [] }); }
    report.totalAttempts += 1;
    report.avgScore = Math.round((report.avgScore * (report.totalAttempts - 1) + attempt.percentage) / report.totalAttempts);
    for (const cs of attempt.conceptScores) {
      if (!isValidConceptId(cs.concept)) continue;
      report.conceptMastery = updateConceptMastery(report.conceptMastery, cs.concept, cs.percentage);
    }
    report.weakConcepts = report.conceptMastery.filter(cm => cm.mastery === 'weak').map(cm => cm.concept);
    report.strongConcepts = report.conceptMastery.filter(cm => ['mastered','proficient'].includes(cm.mastery)).map(cm => cm.concept);
    await report.save();
  } catch(err) { console.error('Progress report error:', err); }
}

/* ══════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════ */
const getDashboard = asyncHandler(async (req, res) => {
  const student = await User.findById(req.user._id).populate('class', 'name grade section').populate('school', 'name');

  const quizFilter = { isPublished: true, isActive: true };
  const orConditions = [{ assignedTo: student._id }];
  if (student.class) {
    orConditions.push({ assignedClass: student.class?._id || student.class });
    const cls = await Class.findById(student.class?._id || student.class).lean();
    if (cls) {
      orConditions.push({
        grade: cls.grade,
        $or: [{ assignedClass: { $exists: false } }, { assignedClass: null }]
      });
    }
  } else {
    orConditions.push({ $or: [{ assignedClass: { $exists: false } }, { assignedClass: null }] });
  }
  quizFilter.$or = orConditions;

  const [recentAttempts, pendingRecommendations, progressReports, activePaths, availableQuizzes] = await Promise.all([
    Attempt.find({ student: student._id, status: 'completed' }).sort({ createdAt: -1 }).limit(5).populate('quiz', 'title type').populate('subject', 'name icon color'),
    Recommendation.find({ student: student._id, status: 'pending' }).sort({ priority: 1, createdAt: -1 }).limit(6).populate('concept', 'name chapter').populate('subject', 'name icon color'),
    ProgressReport.find({ student: student._id }).populate('subject', 'name icon color'),
    LearningPath.find({ student: student._id, status: 'active' }).limit(3).populate('concept', 'name chapter'),
    Quiz.find(quizFilter).sort({ publishedAt: -1 }).limit(4).populate('subject', 'name icon color').populate('concepts', 'name chapter'),
  ]);

  const totalAttempts = await Attempt.countDocuments({ student: student._id, status: 'completed' });
  const avgScoreAgg = await Attempt.aggregate([{ $match: { student: student._id, status: 'completed' } }, { $group: { _id: null, avg: { $avg: '$percentage' } } }]);

  res.json({
    success: true,
    data: {
      student: { name: student.name, class: student.class, school: student.school, streak: student.streak, totalPoints: student.totalPoints, xp: student.xp, level: student.level, badges: student.badges, language: student.language },
      stats: { totalAttempts, avgScore: avgScoreAgg[0] ? Math.round(avgScoreAgg[0].avg) : 0, pendingTasks: pendingRecommendations.length },
      recentAttempts,
      recommendations: pendingRecommendations,
      progressReports,
      activePaths,
      availableQuizzes,
    }
  });
});

const getMyAttempts = asyncHandler(async (req, res) => {
  const filter = { student: req.user._id, status: 'completed' };
  if (req.query.subject) filter.subject = req.query.subject;
  const result = await paginate(Attempt, filter, { populate: [{ path: 'quiz', select: 'title type' }, { path: 'subject', select: 'name icon' }], sort: { createdAt: -1 } }, req);
  res.json({ success: true, ...result });
});

const getAttemptDetail = asyncHandler(async (req, res) => {
  const attempt = await Attempt.findOne({ _id: req.params.id, student: req.user._id })
    .populate('quiz', 'title type totalMarks')
    .populate('subject', 'name icon color')
    .populate({ path: 'answers.question', populate: { path: 'concept', select: 'name' } })
    .populate('conceptScores.concept', 'name chapter');
  if (!attempt) return res.status(404).json({ success: false, message: 'Attempt not found' });
  res.json({ success: true, data: attempt });
});

/* ══════════════════════════════════════════════════
   RECOMMENDATIONS
══════════════════════════════════════════════════ */
const getMyRecommendations = asyncHandler(async (req, res) => {
  const filter = { student: req.user._id };
  filter.status = req.query.status ? req.query.status : { $in: ['pending', 'in_progress'] };
  const result = await paginate(Recommendation, filter, { populate: [{ path: 'concept', select: 'name chapter difficulty' }, { path: 'subject', select: 'name icon color' }], sort: { priority: 1, createdAt: -1 } }, req);
  res.json({ success: true, ...result });
});

const updateRecommendationStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const rec = await Recommendation.findOne({ _id: req.params.id, student: req.user._id });
  if (!rec) return res.status(404).json({ success: false, message: 'Not found' });
  rec.status = status;
  if (status === 'completed') { rec.completedAt = new Date(); await User.findByIdAndUpdate(req.user._id, { $inc: { xp: 15, totalPoints: 15 } }); }
  await rec.save();
  res.json({ success: true, data: rec });
});

/* ══════════════════════════════════════════════════
   LEARNING PATHS
══════════════════════════════════════════════════ */
const getLearningPaths = asyncHandler(async (req, res) => {
  const paths = await getStudentPaths(req.user._id);
  res.json({ success: true, data: paths });
});

const advanceLearningPath = asyncHandler(async (req, res) => {
  const path = await advancePathStep(req.params.id, req.user._id);
  if (!path) return res.status(404).json({ success: false, message: 'Path not found' });
  // Award XP for completing step
  const completedStep = path.steps[Math.max(0, path.currentStep - 1)];
  if (completedStep) await User.findByIdAndUpdate(req.user._id, { $inc: { xp: completedStep.xpReward || 20, totalPoints: completedStep.xpReward || 20 } });
  res.json({ success: true, data: path });
});

/* ══════════════════════════════════════════════════
   PROGRESS
══════════════════════════════════════════════════ */
const getProgressReport = asyncHandler(async (req, res) => {
  const reports = await ProgressReport.find({ student: req.user._id })
    .populate('subject', 'name icon color')
    .populate('conceptMastery.concept', 'name chapter');
  res.json({ success: true, data: reports });
});

/* ══════════════════════════════════════════════════
   DOUBTS
══════════════════════════════════════════════════ */
const submitDoubt = asyncHandler(async (req, res) => {
  const { text, textHindi, quizId, questionId, conceptId, subjectId, type } = req.body;
  if (!text?.trim()) return res.status(400).json({ success: false, message: 'Doubt text is required' });
  const doubt = await Doubt.create({ student: req.user._id, school: req.user.school, class: req.user.class, quiz: quizId, question: questionId, concept: conceptId, subject: subjectId, text: text.trim(), textHindi, type: type || 'question' });
  res.status(201).json({ success: true, data: doubt });
});

const getMyDoubts = asyncHandler(async (req, res) => {
  const doubts = await Doubt.find({ student: req.user._id }).sort({ createdAt: -1 }).limit(20)
    .populate('concept', 'name').populate('subject', 'name icon');
  res.json({ success: true, data: doubts });
});

/* ══════════════════════════════════════════════════
   PARENT PDF REPORT
══════════════════════════════════════════════════ */
const downloadParentReport = asyncHandler(async (req, res) => {
  const studentId = req.user.role === 'student' ? req.user._id : req.params.studentId;
  const [student, reports, recentAttempts] = await Promise.all([
    User.findById(studentId).populate('class', 'name grade section').populate('school', 'name district'),
    ProgressReport.find({ student: studentId }).populate('subject', 'name icon').populate('conceptMastery.concept', 'name'),
    Attempt.find({ student: studentId, status: 'completed' }).sort({ createdAt: -1 }).limit(8).populate('quiz', 'title').populate('subject', 'name icon'),
  ]);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

  if (req.user.role === 'student' && studentId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorised' });
  }
  if (req.user.role === 'teacher' && student.school?._id?.toString() !== req.user.school?.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorised' });
  }

  // AI or rule-based summary
  const mainReport = reports[0];
  const weakConcepts = mainReport?.weakConcepts?.map(c => c.name || c.conceptName) || [];
  const strongConcepts = mainReport?.strongConcepts?.map(c => c.name || c.conceptName) || [];
  const aiResult = await generateParentReportSummary({
    studentName: student.name,
    avgScore: mainReport?.avgScore || 0,
    weakConcepts,
    strongConcepts,
    totalAttempts: mainReport?.totalAttempts || 0,
    improvement: mainReport?.improvement || 0,
    subject: mainReport?.subject?.name || 'all subjects',
  });

  const pdfBuffer = await generateParentReport({
    student,
    school: student.school,
    classInfo: student.class,
    reports,
    recentAttempts,
    aiSummary: aiResult.summary,
    teacherNote: req.query.note || '',
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="ShikshaBridge_Report_${student.name.replace(/\s+/g, '_')}.pdf"`);
  res.send(pdfBuffer);
});

const getStudentSubjects = asyncHandler(async (req, res) => {
  const filter = {};
  let grade;

  if (req.user.class) {
    const cls = await Class.findById(req.user.class).lean();
    if (cls) grade = cls.grade;
  }

  if (grade) {
    filter.grade = grade;
  } else if (req.query.grade) {
    filter.grade = parseInt(req.query.grade);
  }

  const subjects = await Subject.find(filter).sort({ name: 1 }).lean();

  // Filter unique subjects by name to prevent duplicates across grades
  const unique = [];
  const seen = new Set();
  for (const s of subjects) {
    const key = s.name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(s);
    }
  }

  res.json({ success: true, data: unique });
});

module.exports = {
  getAvailableQuizzes, getQuizForAttempt,
  startAttempt, saveAnswers, submitAttempt,
  getDashboard, getMyAttempts, getAttemptDetail,
  getMyRecommendations, updateRecommendationStatus,
  getLearningPaths, advanceLearningPath,
  getProgressReport,
  submitDoubt, getMyDoubts,
  getStudentSubjects,
  downloadParentReport,
};
