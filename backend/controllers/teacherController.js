const { validationResult } = require('express-validator');
const User = require('../models/User');
const { Class, Subject, Concept } = require('../models/ClassSubjectConcept');
const { Quiz, Question } = require('../models/QuizQuestion');
const { Attempt, Recommendation, ProgressReport } = require('../models/AttemptRecommendation');
const { paginate } = require('../utils/pagination');
const { asyncHandler } = require('../middleware/errorHandler');
const mongoose = require('mongoose');

/* ═══════════════════════════════════════════
   QUIZ MANAGEMENT
═══════════════════════════════════════════ */
const createQuiz = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const quiz = await Quiz.create({
    ...req.body,
    createdBy: req.user._id,
    school: req.user.school,
  });

  res.status(201).json({ success: true, data: quiz });
});

const getMyQuizzes = asyncHandler(async (req, res) => {
  const filter = { createdBy: req.user._id };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.subject) filter.subject = req.query.subject;
  if (req.query.grade) filter.grade = parseInt(req.query.grade);
  if (req.query.published) filter.isPublished = req.query.published === 'true';

  const result = await paginate(
    Quiz,
    filter,
    {
      populate: [
        { path: 'subject', select: 'name icon color' },
        { path: 'class', select: 'name grade section' },
        { path: 'concepts', select: 'name chapter' },
      ],
    },
    req
  );
  res.json({ success: true, ...result });
});

const getQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id)
    .populate('subject', 'name icon color')
    .populate('class', 'name grade section')
    .populate('concepts', 'name chapter difficulty')
    .populate({
      path: 'questions.question',
      populate: { path: 'concept', select: 'name' },
    });

  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
  if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorised' });
  }
  res.json({ success: true, data: quiz });
});

const updateQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
  if (quiz.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorised' });
  }

  Object.assign(quiz, req.body);
  await quiz.save();
  res.json({ success: true, data: quiz });
});

const publishQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

  quiz.isPublished = true;
  quiz.publishedAt = new Date();
  await quiz.save();
  res.json({ success: true, message: 'Quiz published successfully', data: quiz });
});

const deleteQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

  // Permanently delete the quiz
  await Quiz.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Quiz permanently deleted successfully' });
});

/* ═══════════════════════════════════════════
   QUESTION MANAGEMENT
═══════════════════════════════════════════ */
const createQuestion = asyncHandler(async (req, res) => {
  const question = await Question.create({
    ...req.body,
    createdBy: req.user._id,
  });

  // If quizId provided, add to quiz
  if (req.body.quizId) {
    await Quiz.findByIdAndUpdate(req.body.quizId, {
      $push: {
        questions: {
          question: question._id,
          order: req.body.order || 0,
          marks: question.marks || 1,
        },
      },
    });
  }

  res.status(201).json({ success: true, data: question });
});

const bulkCreateQuestions = asyncHandler(async (req, res) => {
  const { questions, quizId } = req.body;
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ success: false, message: 'Provide an array of questions' });
  }

  const docs = questions.map((q) => ({ ...q, createdBy: req.user._id }));
  const created = await Question.insertMany(docs);

  if (quizId) {
    const questionRefs = created.map((q, i) => ({
      question: q._id,
      order: i + 1,
      marks: q.marks || 1,
    }));
    await Quiz.findByIdAndUpdate(quizId, {
      $push: { questions: { $each: questionRefs } },
    });
  }

  res.status(201).json({ success: true, count: created.length, data: created });
});

const getQuestions = asyncHandler(async (req, res) => {
  const filter = { createdBy: req.user._id, isActive: true };
  if (req.query.concept) filter.concept = req.query.concept;
  if (req.query.difficulty) filter.difficulty = req.query.difficulty;
  if (req.query.subject) filter.subject = req.query.subject;

  const result = await paginate(
    Question,
    filter,
    { populate: { path: 'concept', select: 'name chapter' } },
    req
  );
  res.json({ success: true, ...result });
});

const updateQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
  if (question.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorised' });
  }

  Object.assign(question, req.body);
  await question.save();
  res.json({ success: true, data: question });
});

const deleteQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
  if (question.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Not authorised' });
  }

  // Remove reference from all quizzes
  await Quiz.updateMany({}, { $pull: { questions: { question: req.params.id } } });

  // Hard delete the question document
  await Question.findByIdAndDelete(req.params.id);

  res.json({ success: true, message: 'Question deleted successfully' });
});

/* ═══════════════════════════════════════════
   CLASS PERFORMANCE & ANALYTICS
═══════════════════════════════════════════ */
const getClassPerformance = asyncHandler(async (req, res) => {
  const { classId } = req.params;

  const students = await User.find({ class: classId, role: 'student', isActive: true })
    .select('name rollNumber streak totalPoints badges');

  const studentIds = students.map((s) => s._id);

  // Latest attempt per student
  const attempts = await Attempt.aggregate([
    { $match: { student: { $in: studentIds }, status: 'completed' } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$student',
        avgScore: { $avg: '$percentage' },
        totalAttempts: { $sum: 1 },
        lastAttemptScore: { $first: '$percentage' },
        lastAttemptDate: { $first: '$createdAt' },
      },
    },
  ]);

  // Map attempt stats onto students
  const attemptMap = {};
  attempts.forEach((a) => {
    attemptMap[a._id.toString()] = a;
  });

  const enrichedStudents = students.map((s) => {
    const stats = attemptMap[s._id.toString()] || {};
    return {
      _id: s._id,
      name: s.name,
      rollNumber: s.rollNumber,
      streak: s.streak,
      totalPoints: s.totalPoints,
      badges: s.badges?.length || 0,
      avgScore: stats.avgScore ? Math.round(stats.avgScore) : null,
      totalAttempts: stats.totalAttempts || 0,
      lastScore: stats.lastAttemptScore || null,
      lastAttemptDate: stats.lastAttemptDate || null,
      status:
        !stats.avgScore ? 'not_started'
        : stats.avgScore < 40 ? 'weak'
        : stats.avgScore < 70 ? 'developing'
        : 'proficient',
    };
  });

  res.json({ success: true, data: enrichedStudents });
});

const getWeakConcepts = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const students = await User.find({ class: classId, role: 'student' }).select('_id');
  const studentIds = students.map((s) => s._id);

  const weakConcepts = await Attempt.aggregate([
    { $match: { student: { $in: studentIds }, status: 'completed' } },
    { $unwind: '$conceptScores' },
    {
      $group: {
        _id: '$conceptScores.concept',
        conceptName: { $first: '$conceptScores.conceptName' },
        avgScore: { $avg: '$conceptScores.percentage' },
        weakStudents: {
          $sum: { $cond: [{ $lt: ['$conceptScores.percentage', 40] }, 1, 0] },
        },
        totalAttempts: { $sum: 1 },
      },
    },
    { $sort: { avgScore: 1 } },
    { $limit: 15 },
    {
      $lookup: {
        from: 'concepts',
        localField: '_id',
        foreignField: '_id',
        as: 'conceptDetails',
      },
    },
    { $unwind: { path: '$conceptDetails', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        conceptName: 1,
        avgScore: { $round: ['$avgScore', 1] },
        weakStudents: 1,
        totalAttempts: 1,
        chapter: '$conceptDetails.chapter',
        difficulty: '$conceptDetails.difficulty',
      },
    },
  ]);

  res.json({ success: true, data: weakConcepts });
});

const getStudentDetail = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const [student, attempts, recommendations] = await Promise.all([
    User.findById(studentId).select('-password').populate('class', 'name grade'),
    Attempt.find({ student: studentId, status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('quiz', 'title type')
      .populate('subject', 'name icon'),
    Recommendation.find({ student: studentId, status: 'pending' })
      .sort({ priority: 1, createdAt: -1 })
      .limit(5)
      .populate('concept', 'name chapter'),
  ]);

  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

  res.json({ success: true, data: { student, attempts, recommendations } });
});

/* ═══════════════════════════════════════════
   MY STUDENTS
═══════════════════════════════════════════ */
const getMyStudents = asyncHandler(async (req, res) => {
  const filter = { role: 'student', school: req.user.school, isActive: true };
  if (req.query.class) filter.class = req.query.class;
  if (req.query.search) filter.name = new RegExp(req.query.search, 'i');

  const result = await paginate(
    User,
    filter,
    { populate: { path: 'class', select: 'name grade section' }, sort: { name: 1 } },
    req
  );
  res.json({ success: true, ...result });
});

const getMyClasses = asyncHandler(async (req, res) => {
  const classes = await Class.find({
    school: req.user.school,
    isActive: true,
  }).sort({ grade: 1, section: 1 });
  res.json({ success: true, data: classes });
});

const getSubjects = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.grade) filter.grade = parseInt(req.query.grade);

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

const getConcepts = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.subject) filter.subject = req.query.subject;
  if (req.query.grade) filter.grade = parseInt(req.query.grade);

  const concepts = await Concept.find(filter)
    .populate('subject', 'name icon color')
    .sort({ chapterNumber: 1, name: 1 });

  res.json({ success: true, data: concepts });
});

module.exports = {
  createQuiz, getMyQuizzes, getQuiz, updateQuiz, publishQuiz, deleteQuiz,
  createQuestion, bulkCreateQuestions, getQuestions, updateQuestion, deleteQuestion,
  getClassPerformance, getWeakConcepts, getStudentDetail,
  getMyStudents, getMyClasses,
  getSubjects, getConcepts,
};
