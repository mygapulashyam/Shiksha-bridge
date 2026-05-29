const { validationResult } = require('express-validator');
const User = require('../models/User');
const School = require('../models/School');
const { Class, Subject, Concept } = require('../models/ClassSubjectConcept');
const { Quiz, Question } = require('../models/QuizQuestion');
const { Attempt, Recommendation, ProgressReport } = require('../models/AttemptRecommendation');
const { paginate } = require('../utils/pagination');
const { asyncHandler } = require('../middleware/errorHandler');

/* ═══════════════════════════════════════════
   SCHOOLS
═══════════════════════════════════════════ */
const createSchool = asyncHandler(async (req, res) => {
  const school = await School.create(req.body);
  res.status(201).json({ success: true, data: school });
});

const getSchools = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.state) filter.state = new RegExp(req.query.state, 'i');
  if (req.query.district) filter.district = new RegExp(req.query.district, 'i');
  if (req.query.type) filter.type = req.query.type;

  const result = await paginate(School, filter, { sort: { name: 1 } }, req);
  res.json({ success: true, ...result });
});

const getSchool = asyncHandler(async (req, res) => {
  const school = await School.findById(req.params.id);
  if (!school) return res.status(404).json({ success: false, message: 'School not found' });
  res.json({ success: true, data: school });
});

const updateSchool = asyncHandler(async (req, res) => {
  const school = await School.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!school) return res.status(404).json({ success: false, message: 'School not found' });
  res.json({ success: true, data: school });
});

/* ═══════════════════════════════════════════
   USERS (Teachers & Students)
═══════════════════════════════════════════ */
const getUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.school) filter.school = req.query.school;
  if (req.query.search) filter.name = new RegExp(req.query.search, 'i');

  const result = await paginate(
    User,
    filter,
    {
      populate: [
        { path: 'school', select: 'name' },
        { path: 'class', select: 'name grade section' },
        { path: 'subjects', select: 'name code icon grade' },
        { path: 'classes', select: 'name grade section' },
      ],
      sort: { name: 1 },
    },
    req
  );
  res.json({ success: true, ...result });
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .populate('school', 'name district')
    .populate('class', 'name grade section')
    .populate('subjects', 'name code icon grade')
    .populate('classes', 'name grade section');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, data: user });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const allowed = [
    'name',
    'email',
    'role',
    'school',
    'class',
    'rollNumber',
    'language',
    'guardianName',
    'guardianEmail',
    'guardianPhone',
    'isActive',
    'subjects',
    'classes',
  ];

  allowed.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      if ((field === 'class' || field === 'school') && (req.body[field] === '' || req.body[field] === null)) {
        user[field] = undefined;
      } else {
        user[field] = req.body[field];
      }
    }
  });

  if (Object.prototype.hasOwnProperty.call(req.body, 'subjects')) {
    user.subjects = Array.isArray(req.body.subjects)
      ? req.body.subjects.filter(Boolean)
      : [];
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'classes')) {
    user.classes = Array.isArray(req.body.classes)
      ? req.body.classes.filter(Boolean)
      : [];
  }

  if (req.body.role === 'student') {
    user.subjects = [];
    user.classes = [];
  }

  if (req.body.role === 'teacher') {
    user.class = undefined;
    user.rollNumber = '';
  }

  if (typeof req.body.password === 'string' && req.body.password.trim()) {
    if (req.body.password.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    user.password = req.body.password.trim();
    user.loginAttempts = 0;
    user.lockUntil = undefined;
  }

  await user.save();

  const updated = await User.findById(user._id)
    .populate('school', 'name district')
    .populate('class', 'name grade section')
    .populate('subjects', 'name code icon grade')
    .populate('classes', 'name grade section');

  res.json({ success: true, data: updated });
});

const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, data: { isActive: user.isActive } });
});

/* ═══════════════════════════════════════════
   SUBJECTS
═══════════════════════════════════════════ */
const createSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.create(req.body);
  res.status(201).json({ success: true, data: subject });
});

const getSubjects = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.grade) filter.grade = parseInt(req.query.grade);
  const subjects = await Subject.find(filter).sort({ name: 1 });
  res.json({ success: true, data: subjects });
});

const updateSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
  res.json({ success: true, data: subject });
});

/* ═══════════════════════════════════════════
   CONCEPTS
═══════════════════════════════════════════ */
const createConcept = asyncHandler(async (req, res) => {
  const concept = await Concept.create(req.body);
  res.status(201).json({ success: true, data: concept });
});

const getConcepts = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.subject) filter.subject = req.query.subject;
  if (req.query.grade) filter.grade = parseInt(req.query.grade);
  if (req.query.chapter) filter.chapter = new RegExp(req.query.chapter, 'i');

  const concepts = await Concept.find(filter)
    .populate('subject', 'name icon color')
    .sort({ chapterNumber: 1, order: 1 });
  res.json({ success: true, data: concepts });
});

/* ═══════════════════════════════════════════
   ANALYTICS (Admin)
═══════════════════════════════════════════ */
const getPlatformAnalytics = asyncHandler(async (req, res) => {
  const [
    totalSchools,
    totalTeachers,
    totalStudents,
    totalQuizzes,
    totalAttempts,
    recentAttempts,
  ] = await Promise.all([
    School.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'teacher', isActive: true }),
    User.countDocuments({ role: 'student', isActive: true }),
    Quiz.countDocuments({ isActive: true }),
    Attempt.countDocuments({ status: 'completed' }),
    Attempt.find({ status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('student', 'name')
      .populate('quiz', 'title')
      .select('student quiz percentage createdAt'),
  ]);

  // Average score across all attempts
  const avgScoreAgg = await Attempt.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, avg: { $avg: '$percentage' } } },
  ]);

  // School-wise stats
  const schoolStats = await Attempt.aggregate([
    { $match: { status: 'completed' } },
    {
      $group: {
        _id: '$school',
        attempts: { $sum: 1 },
        avgScore: { $avg: '$percentage' },
      },
    },
    { $sort: { attempts: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'schools',
        localField: '_id',
        foreignField: '_id',
        as: 'school',
      },
    },
    { $unwind: { path: '$school', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        schoolName: '$school.name',
        district: '$school.district',
        attempts: 1,
        avgScore: { $round: ['$avgScore', 1] },
      },
    },
  ]);

  res.json({
    success: true,
    data: {
      summary: {
        totalSchools,
        totalTeachers,
        totalStudents,
        totalQuizzes,
        totalAttempts,
        avgScore: avgScoreAgg[0] ? Math.round(avgScoreAgg[0].avg) : 0,
      },
      schoolStats,
      recentAttempts,
    },
  });
});

const getSchoolAnalytics = asyncHandler(async (req, res) => {
  const { schoolId } = req.params;

  const [teachers, students, attempts] = await Promise.all([
    User.countDocuments({ school: schoolId, role: 'teacher', isActive: true }),
    User.countDocuments({ school: schoolId, role: 'student', isActive: true }),
    Attempt.countDocuments({ school: schoolId, status: 'completed' }),
  ]);

  const avgScore = await Attempt.aggregate([
    { $match: { school: require('mongoose').Types.ObjectId.createFromHexString(schoolId), status: 'completed' } },
    { $group: { _id: null, avg: { $avg: '$percentage' } } },
  ]);

  // Weak concepts at school level
  const weakConcepts = await Attempt.aggregate([
    { $match: { school: require('mongoose').Types.ObjectId.createFromHexString(schoolId), status: 'completed' } },
    { $unwind: '$conceptScores' },
    { $match: { 'conceptScores.percentage': { $lt: 40 } } },
    { $group: { _id: '$conceptScores.concept', conceptName: { $first: '$conceptScores.conceptName' }, count: { $sum: 1 }, avgScore: { $avg: '$conceptScores.percentage' } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  res.json({
    success: true,
    data: {
      teachers,
      students,
      attempts,
      avgScore: avgScore[0] ? Math.round(avgScore[0].avg) : 0,
      weakConcepts,
    },
  });
});

/* ═══════════════════════════════════════════
   CLASSES
═══════════════════════════════════════════ */
const createClass = asyncHandler(async (req, res) => {
  const cls = await Class.create(req.body);
  res.status(201).json({ success: true, data: cls });
});

const getClasses = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.school) filter.school = req.query.school;
  if (req.query.grade) filter.grade = parseInt(req.query.grade);

  const classes = await Class.find(filter)
    .populate('school', 'name')
    .populate('classTeacher', 'name')
    .sort({ grade: 1, section: 1 });
  res.json({ success: true, data: classes });
});

module.exports = {
  createSchool, getSchools, getSchool, updateSchool,
  getUsers, getUserById, updateUser, toggleUserStatus,
  createSubject, getSubjects, updateSubject,
  createConcept, getConcepts,
  getPlatformAnalytics, getSchoolAnalytics,
  createClass, getClasses,
};
