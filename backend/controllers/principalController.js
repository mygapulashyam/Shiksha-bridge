const mongoose = require('mongoose');
const User = require('../models/User');
const School = require('../models/School');
const Alert = require('../models/Alert');
const { Class, Subject } = require('../models/ClassSubjectConcept');
const { Attempt, Recommendation } = require('../models/AttemptRecommendation');
const { Quiz } = require('../models/QuizQuestion');
const { Doubt } = require('../models/LearningPathDoubtContent');
const { asyncHandler } = require('../middleware/errorHandler');
const { paginate } = require('../utils/pagination');
const { escapeRegex } = require('../utils/validators');
const { syncClassTeacherLink, syncTeacherClassAssignments } = require('../services/classAssignmentSyncService');

const getDateRange = (req, res) => {
  const range = {};
  for (const [key, value] of [['from', req.query.from], ['to', req.query.to]]) {
    if (!value) continue;
    const dateMatch = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const dateOnly = Boolean(dateMatch);
    const date = dateOnly ? new Date(`${value}T00:00:00+05:30`) : new Date(value);
    const calendarDate = dateMatch
      ? new Date(Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3])))
      : date;
    const validCalendarDate = !dateMatch || (
      Number(dateMatch[1]) === calendarDate.getUTCFullYear() &&
      Number(dateMatch[2]) === calendarDate.getUTCMonth() + 1 &&
      Number(dateMatch[3]) === calendarDate.getUTCDate()
    );
    if (Number.isNaN(date.getTime()) || !validCalendarDate) {
      res.status(400).json({ success: false, message: `Invalid ${key} date` });
      return null;
    }
    if (key === 'from') range.$gte = date;
    else {
      if (dateOnly) date.setUTCDate(date.getUTCDate() + 1);
      range.$lt = date;
    }
  }
  if (range.$gte && range.$lt && range.$gte >= range.$lt) {
    res.status(400).json({ success: false, message: 'The from date must be earlier than the to date' });
    return null;
  }
  return Object.keys(range).length ? range : null;
};

const getClassInSchool = async (classId, schoolId, res) => {
  if (!mongoose.isValidObjectId(classId)) {
    res.status(400).json({ success: false, message: 'Invalid class ID' });
    return null;
  }
  const classRecord = await Class.findOne({ _id: classId, school: schoolId, isActive: true })
    .populate({ path: 'classTeacher', match: { school: schoolId, role: 'teacher' }, select: 'name email' });
  if (!classRecord) {
    res.status(404).json({ success: false, message: 'Class not found in your school' });
    return null;
  }
  return classRecord;
};

const dashboard = asyncHandler(async (req, res) => {
  const schoolId = req.user.school;
  const dateRange = getDateRange(req, res);
  if (dateRange === null && (req.query.from || req.query.to)) return;

  const attemptFilter = { school: schoolId, status: 'completed' };
  if (dateRange) attemptFilter.createdAt = dateRange;

  const [school, students, teachers, classes, quizzes, attemptSummary, scoreTrend, weakConcepts, performanceBands] = await Promise.all([
    School.findById(schoolId).select('name udiseCode district state block type medium board principalName stats').lean(),
    User.countDocuments({ school: schoolId, role: 'student', isActive: true }),
    User.countDocuments({ school: schoolId, role: 'teacher', isActive: true }),
    Class.countDocuments({ school: schoolId, isActive: true }),
    Quiz.countDocuments({ school: schoolId, isActive: true }),
    Attempt.aggregate([
      { $match: attemptFilter },
      { $group: { _id: null, attempts: { $sum: 1 }, avgScore: { $avg: '$percentage' }, students: { $addToSet: '$student' } } },
    ]),
    Attempt.aggregate([
      { $match: attemptFilter },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, attempts: { $sum: 1 }, avgScore: { $avg: '$percentage' } } },
      { $sort: { _id: -1 } },
      { $limit: 90 },
      { $sort: { _id: 1 } },
    ]),
    Attempt.aggregate([
      { $match: attemptFilter },
      { $sort: { createdAt: -1 } },
      { $unwind: '$conceptScores' },
      { $group: { _id: { concept: '$conceptScores.concept', student: '$student' }, name: { $first: '$conceptScores.conceptName' }, score: { $first: '$conceptScores.percentage' } } },
      { $group: { _id: '$_id.concept', name: { $first: '$name' }, avgScore: { $avg: '$score' }, weakStudentIds: { $addToSet: { $cond: [{ $lt: ['$score', 40] }, '$_id.student', null] } }, assessedStudents: { $addToSet: '$_id.student' } } },
      { $project: { name: 1, avgScore: 1, assessedStudents: 1, weakStudents: { $size: { $setDifference: ['$weakStudentIds', [null]] } } } },
      { $sort: { avgScore: 1 } },
      { $limit: 8 },
    ]),
    Attempt.aggregate([
      { $match: attemptFilter },
      { $group: { _id: '$student', avgScore: { $avg: '$percentage' } } },
      { $group: { _id: null, weak: { $sum: { $cond: [{ $lt: ['$avgScore', 40] }, 1, 0] } }, developing: { $sum: { $cond: [{ $and: [{ $gte: ['$avgScore', 40] }, { $lt: ['$avgScore', 70] }] }, 1, 0] } }, proficient: { $sum: { $cond: [{ $gte: ['$avgScore', 70] }, 1, 0] } }, assessedStudents: { $sum: 1 } } },
    ]),
  ]);

  const summary = attemptSummary[0] || { attempts: 0, avgScore: null, students: [] };
  const bands = performanceBands[0] || { weak: 0, developing: 0, proficient: 0, assessedStudents: 0 };
  res.json({
    success: true,
    data: {
      school,
      summary: {
        activeStudents: students,
        activeTeachers: teachers,
        activeClasses: classes,
        activeQuizzes: quizzes,
        completedAttempts: summary.attempts,
        participatingStudents: summary.students.length,
        averageAttemptScore: summary.avgScore === null ? null : Math.round(summary.avgScore),
        assessedStudents: bands.assessedStudents,
        unassessedStudents: Math.max(0, students - bands.assessedStudents),
        performanceBands: { weak: bands.weak, developing: bands.developing, proficient: bands.proficient },
      },
      scoreTrend: scoreTrend.map((item) => ({ date: item._id, attempts: item.attempts, averageScore: Math.round(item.avgScore) })),
      weakConcepts: weakConcepts.map((item) => ({ conceptId: item._id, name: item.name || 'Concept', averageScore: Math.round(item.avgScore), weakStudents: item.weakStudents, assessedStudents: item.assessedStudents.length })),
      period: { from: dateRange?.$gte || null, to: dateRange?.$lt || null },
    },
  });
});

const getClasses = asyncHandler(async (req, res) => {
  const schoolId = req.user.school;
  const dateRange = getDateRange(req, res);
  if (dateRange === null && (req.query.from || req.query.to)) return;
  const filter = { school: schoolId, isActive: true };
  if (req.query.grade) {
    const grade = Number(req.query.grade);
    if (!Number.isInteger(grade) || grade < 6 || grade > 10) {
      return res.status(400).json({ success: false, message: 'Grade must be between 6 and 10' });
    }
    filter.grade = grade;
  }

  const classRecords = await Class.find(filter)
    .populate({ path: 'classTeacher', match: { school: schoolId, role: 'teacher' }, select: 'name email' })
    .sort({ grade: 1, section: 1 }).lean();
  const classIds = classRecords.map((item) => item._id);
  const attemptMatch = { school: schoolId, class: { $in: classIds }, status: 'completed' };
  if (dateRange) attemptMatch.createdAt = dateRange;
  const [studentCounts, attemptStats] = await Promise.all([
    User.aggregate([{ $match: { school: schoolId, class: { $in: classIds }, role: 'student', isActive: true } }, { $group: { _id: '$class', count: { $sum: 1 } } }]),
    Attempt.aggregate([
      { $match: attemptMatch },
      { $group: { _id: '$class', attempts: { $sum: 1 }, avgScore: { $avg: '$percentage' }, students: { $addToSet: '$student' } } },
    ]),
  ]);
  const counts = new Map(studentCounts.map((item) => [item._id.toString(), item.count]));
  const stats = new Map(attemptStats.map((item) => [item._id.toString(), item]));
  res.json({
    success: true,
    data: classRecords.map((item) => {
      const classStats = stats.get(item._id.toString());
      return {
        ...item,
        studentCount: counts.get(item._id.toString()) || 0,
        completedAttempts: classStats?.attempts || 0,
        participatingStudents: classStats?.students.length || 0,
        averageScore: classStats ? Math.round(classStats.avgScore) : null,
      };
    }),
  });
});

const getClassPerformance = asyncHandler(async (req, res) => {
  const classRecord = await getClassInSchool(req.params.classId, req.user.school, res);
  if (!classRecord) return;
  const dateRange = getDateRange(req, res);
  if (dateRange === null && (req.query.from || req.query.to)) return;

  const students = await User.find({ school: req.user.school, class: classRecord._id, role: 'student' })
    .select('name email rollNumber isActive streak totalPoints')
    .sort({ name: 1 })
    .lean();
  const studentIds = students.map((student) => student._id);
  const match = { school: req.user.school, class: classRecord._id, student: { $in: studentIds }, status: 'completed' };
  if (dateRange) match.createdAt = dateRange;
  const [attempts, weakConcepts] = await Promise.all([
    Attempt.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$student', averageScore: { $avg: '$percentage' }, completedAttempts: { $sum: 1 }, lastScore: { $first: '$percentage' }, lastAttemptAt: { $first: '$createdAt' } } },
    ]),
    Attempt.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $unwind: '$conceptScores' },
      { $group: { _id: { concept: '$conceptScores.concept', student: '$student' }, name: { $first: '$conceptScores.conceptName' }, score: { $first: '$conceptScores.percentage' } } },
      { $group: { _id: '$_id.concept', name: { $first: '$name' }, averageScore: { $avg: '$score' }, weakStudentIds: { $addToSet: { $cond: [{ $lt: ['$score', 40] }, '$_id.student', null] } }, students: { $addToSet: '$_id.student' } } },
      { $project: { name: 1, averageScore: 1, students: 1, weakCount: { $size: { $setDifference: ['$weakStudentIds', [null]] } } } },
      { $sort: { averageScore: 1 } },
      { $limit: 15 },
    ]),
  ]);
  const attemptMap = new Map(attempts.map((item) => [item._id.toString(), item]));
  res.json({
    success: true,
    data: {
      class: classRecord,
      students: students.map((student) => {
        const result = attemptMap.get(student._id.toString());
        const averageScore = result ? Math.round(result.averageScore) : null;
        return {
          ...student,
          averageScore,
          completedAttempts: result?.completedAttempts || 0,
          lastScore: result?.lastScore ?? null,
          lastAttemptAt: result?.lastAttemptAt || null,
          mastery: averageScore === null ? 'not_started' : averageScore < 40 ? 'weak' : averageScore < 70 ? 'developing' : 'proficient',
        };
      }),
      weakConcepts: weakConcepts.map((item) => ({ conceptId: item._id, name: item.name || 'Concept', averageScore: Math.round(item.averageScore), weakStudents: item.weakCount, assessedStudents: item.students.length })),
    },
  });
});

const getStudents = asyncHandler(async (req, res) => {
  const schoolId = req.user.school;
  const filter = { school: schoolId, role: 'student' };
  if (req.query.active !== 'all') filter.isActive = req.query.active === 'false' ? false : true;
  if (req.query.search) filter.name = new RegExp(escapeRegex(String(req.query.search).trim()), 'i');
  if (req.query.class) {
    const classRecord = await getClassInSchool(req.query.class, schoolId, res);
    if (!classRecord) return;
    filter.class = classRecord._id;
  }
  if (req.query.grade) {
    const grade = Number(req.query.grade);
    if (!Number.isInteger(grade) || grade < 6 || grade > 10) {
      return res.status(400).json({ success: false, message: 'Grade must be between 6 and 10' });
    }
    const gradeClasses = await Class.find({ school: schoolId, grade, isActive: true }).select('_id').lean();
    filter.class = { $in: gradeClasses.map((item) => item._id) };
  }
  const result = await paginate(User, filter, {
    select: 'name email class rollNumber isActive streak totalPoints',
    populate: { path: 'class', match: { school: schoolId }, select: 'name grade section' },
    sort: { name: 1 },
  }, req);
  res.json({ success: true, ...result });
});

const getStudentDetail = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.studentId)) {
    return res.status(400).json({ success: false, message: 'Invalid student ID' });
  }
  const [student, attempts, recommendations] = await Promise.all([
    User.findOne({ _id: req.params.studentId, school: req.user.school, role: 'student' })
      .select('-password -refreshTokens')
      .populate({ path: 'class', match: { school: req.user.school }, select: 'name grade section' })
      .populate('school', 'name district state'),
    Attempt.find({ student: req.params.studentId, school: req.user.school, status: 'completed' })
      .sort({ createdAt: -1 }).limit(20)
      .populate('quiz', 'title type')
      .populate('subject', 'name icon')
      .populate('conceptScores.concept', 'name chapter'),
    Recommendation.find({ student: req.params.studentId, school: req.user.school, status: { $in: ['pending', 'in_progress'] } })
      .sort({ createdAt: -1 }).limit(10).populate('concept', 'name chapter').populate('subject', 'name icon'),
  ]);
  if (!student) return res.status(404).json({ success: false, message: 'Student not found in your school' });
  res.json({ success: true, data: { student, attempts, recommendations } });
});

const getTeachers = asyncHandler(async (req, res) => {
  const filter = { school: req.user.school, role: 'teacher' };
  if (req.query.active !== 'all') filter.isActive = req.query.active === 'false' ? false : true;
  if (req.query.search) filter.name = new RegExp(escapeRegex(String(req.query.search).trim()), 'i');
  const result = await paginate(User, filter, {
    select: 'name email isActive subjects classes lastLogin',
    populate: [
      { path: 'subjects', select: 'name icon grade' },
      { path: 'classes', match: { school: req.user.school }, select: 'name grade section isActive' },
    ],
    sort: { name: 1 },
  }, req);
  res.json({ success: true, ...result });
});

const validateClassIds = async (classIds, schoolId, res) => {
  if (!Array.isArray(classIds) || classIds.some((id) => !mongoose.isValidObjectId(id))) {
    res.status(400).json({ success: false, message: 'Classes must be a list of valid class IDs' });
    return null;
  }
  const uniqueClassIds = [...new Set(classIds.map((id) => id.toString()))];
  const classCount = await Class.countDocuments({ _id: { $in: uniqueClassIds }, school: schoolId, isActive: true });
  if (classCount !== uniqueClassIds.length) {
    res.status(400).json({ success: false, message: 'One or more classes are not active classes in your school' });
    return null;
  }
  return uniqueClassIds;
};

const createSchoolUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim() ||
    typeof password !== 'string' || !['teacher', 'student'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Name, email, password, and a teacher or student role are required' });
  }
  if (password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });

  const payload = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
    role,
    school: req.user.school,
    language: req.body.language || 'en',
  };

  if (role === 'student') {
    if (req.body.class) {
      const classRecord = await getClassInSchool(req.body.class, req.user.school, res);
      if (!classRecord) return;
      payload.class = classRecord._id;
    }
    if (req.body.rollNumber) payload.rollNumber = String(req.body.rollNumber).trim();
  } else {
    if (req.body.classes !== undefined) {
      const classIds = await validateClassIds(req.body.classes, req.user.school, res);
      if (!classIds) return;
      payload.classes = classIds;
    }
    if (req.body.subjects !== undefined) {
      if (!Array.isArray(req.body.subjects) || req.body.subjects.some((id) => !mongoose.isValidObjectId(id))) {
        return res.status(400).json({ success: false, message: 'Subjects must be a list of valid subject IDs' });
      }
      if (await Subject.countDocuments({ _id: { $in: req.body.subjects } }) !== new Set(req.body.subjects.map(String)).size) {
        return res.status(400).json({ success: false, message: 'One or more subjects do not exist' });
      }
      payload.subjects = req.body.subjects;
    }
  }

  const user = await User.create(payload);
  if (user.role === 'teacher' && user.classes.length) {
    await syncTeacherClassAssignments({ teacherId: user._id, nextClassIds: user.classes });
  }
  res.status(201).json({ success: true, data: { _id: user._id, name: user.name, email: user.email, role: user.role, school: user.school, class: user.class } });
});

const updateSchoolUser = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.userId)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID' });
  }
  const user = await User.findOne({ _id: req.params.userId, school: req.user.school, role: { $in: ['teacher', 'student'] } });
  if (!user) return res.status(404).json({ success: false, message: 'Teacher or student not found in your school' });
  const previousClassIds = [...(user.classes || [])];

  for (const field of ['name', 'email', 'isActive', 'language']) {
    if (req.body[field] !== undefined) user[field] = field === 'email' ? String(req.body[field]).trim().toLowerCase() : req.body[field];
  }
  if (user.role === 'student') {
    if (req.body.class !== undefined) {
      if (req.body.class === '' || req.body.class === null) user.class = undefined;
      else {
        const classRecord = await getClassInSchool(req.body.class, req.user.school, res);
        if (!classRecord) return;
        user.class = classRecord._id;
      }
    }
    if (req.body.rollNumber !== undefined) user.rollNumber = String(req.body.rollNumber).trim();
  } else {
    if (req.body.classes !== undefined) {
      const classIds = await validateClassIds(req.body.classes, req.user.school, res);
      if (!classIds) return;
      user.classes = classIds;
    }
    if (req.body.subjects !== undefined) {
      if (!Array.isArray(req.body.subjects) || req.body.subjects.some((id) => !mongoose.isValidObjectId(id))) {
        return res.status(400).json({ success: false, message: 'Subjects must be a list of valid subject IDs' });
      }
      if (await Subject.countDocuments({ _id: { $in: req.body.subjects } }) !== new Set(req.body.subjects.map(String)).size) {
        return res.status(400).json({ success: false, message: 'One or more subjects do not exist' });
      }
      user.subjects = req.body.subjects;
    }
  }
  if (req.body.isActive !== undefined && typeof req.body.isActive !== 'boolean') {
    return res.status(400).json({ success: false, message: 'isActive must be a boolean' });
  }
  await user.save();
  if (user.role === 'teacher') {
    await syncTeacherClassAssignments({ teacherId: user._id, previousClassIds, nextClassIds: user.classes || [] });
  }
  res.json({ success: true, data: { _id: user._id, name: user.name, email: user.email, role: user.role, school: user.school, class: user.class, classes: user.classes, subjects: user.subjects, isActive: user.isActive } });
});

const createClass = asyncHandler(async (req, res) => {
  const { name, grade, section } = req.body;
  if (typeof name !== 'string' || !name.trim() || !Number.isInteger(Number(grade)) || Number(grade) < 6 || Number(grade) > 10) {
    return res.status(400).json({ success: false, message: 'Class name and a grade from 6 to 10 are required' });
  }
  let teacher;
  if (req.body.classTeacher) {
    teacher = await User.findOne({ _id: req.body.classTeacher, school: req.user.school, role: 'teacher', isActive: true });
    if (!teacher) return res.status(400).json({ success: false, message: 'Class teacher must be an active teacher in your school' });
  }
  const classRecord = await Class.create({
    name: name.trim(),
    grade: Number(grade),
    section: section?.trim() || 'A',
    school: req.user.school,
    academicYear: req.body.academicYear || '2026-27',
    classTeacher: teacher?._id,
  });
  if (teacher) await syncClassTeacherLink({ classId: classRecord._id, nextTeacherId: teacher._id });
  await classRecord.populate('classTeacher', 'name email');
  res.status(201).json({ success: true, data: classRecord });
});

const updateClass = asyncHandler(async (req, res) => {
  const classRecord = await getClassInSchool(req.params.classId, req.user.school, res);
  if (!classRecord) return;
  const previousTeacherId = classRecord.classTeacher?._id || classRecord.classTeacher;
  if (req.body.name !== undefined) {
    if (!String(req.body.name).trim()) return res.status(400).json({ success: false, message: 'Class name cannot be empty' });
    classRecord.name = String(req.body.name).trim();
  }
  if (req.body.grade !== undefined) {
    const grade = Number(req.body.grade);
    if (!Number.isInteger(grade) || grade < 6 || grade > 10) return res.status(400).json({ success: false, message: 'Grade must be between 6 and 10' });
    classRecord.grade = grade;
  }
  if (req.body.section !== undefined) classRecord.section = String(req.body.section).trim();
  if (req.body.classTeacher !== undefined) {
    if (req.body.classTeacher === '' || req.body.classTeacher === null) classRecord.classTeacher = undefined;
    else {
      const teacher = await User.findOne({ _id: req.body.classTeacher, school: req.user.school, role: 'teacher', isActive: true });
      if (!teacher) return res.status(400).json({ success: false, message: 'Class teacher must be an active teacher in your school' });
      classRecord.classTeacher = teacher._id;
    }
  }
  await classRecord.save();
  await syncClassTeacherLink({ classId: classRecord._id, previousTeacherId, nextTeacherId: classRecord.classTeacher });
  await classRecord.populate('classTeacher', 'name email');
  res.json({ success: true, data: classRecord });
});

const getInterventions = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 50);
  const [alerts, openDoubts, alertCount, doubtCount] = await Promise.all([
    Alert.find({ school: req.user.school, isDismissed: false, ...(req.query.unread === 'true' ? { isRead: false } : {}) })
      .sort({ createdAt: -1 }).limit(limit)
      .populate({ path: 'teacher', match: { school: req.user.school }, select: 'name email' })
      .populate({ path: 'student', match: { school: req.user.school }, select: 'name rollNumber' })
      .populate({ path: 'class', match: { school: req.user.school }, select: 'name grade section' })
      .populate('subject', 'name icon'),
    Doubt.find({ school: req.user.school, status: 'open' })
      .sort({ createdAt: -1 }).limit(limit)
      .populate({ path: 'student', match: { school: req.user.school }, select: 'name rollNumber' })
      .populate({ path: 'teacher', match: { school: req.user.school }, select: 'name email' })
      .populate({ path: 'class', match: { school: req.user.school }, select: 'name grade section' })
      .populate('subject', 'name icon').populate('concept', 'name'),
    Alert.countDocuments({ school: req.user.school, isDismissed: false }),
    Doubt.countDocuments({ school: req.user.school, status: 'open' }),
  ]);
  res.json({ success: true, data: { alerts, openDoubts, counts: { alerts: alertCount, openDoubts: doubtCount } } });
});

module.exports = {
  dashboard, getClasses, getClassPerformance, getStudents, getStudentDetail,
  getTeachers, getInterventions, createSchoolUser, updateSchoolUser, createClass, updateClass,
};
