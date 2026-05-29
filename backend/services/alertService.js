const Alert = require('../models/Alert');
const User = require('../models/User');
const { Attempt } = require('../models/AttemptRecommendation');
const { Class } = require('../models/ClassSubjectConcept');
const mongoose = require('mongoose');

/**
 * ─── Feature 3: Teacher Intervention Alerts ──────────────────────────────────
 * Called after each quiz submission and by a scheduled check (or on-demand)
 */

/**
 * Check and generate alerts after a quiz attempt
 * @param {Object} attempt - populated attempt document
 * @param {Object} student - user document
 */
const checkAndGenerateAlerts = async (attempt, student) => {
  try {
    const teachers = await findTeachersForStudent(student);
    if (!teachers.length) return;

    for (const teacher of teachers) {
      await Promise.all([
        checkLowScore(attempt, student, teacher),
        checkRepeatedFailure(attempt, student, teacher),
      ]);
    }
  } catch (err) {
    console.error('Alert generation error:', err.message);
  }
};

/**
 * Check student inactivity and class average drops (call from cron/scheduled endpoint)
 */
const runScheduledAlertChecks = async (schoolId) => {
  try {
    await checkInactiveStudents(schoolId);
    await checkClassAverageDrops(schoolId);
  } catch (err) {
    console.error('Scheduled alert check error:', err.message);
  }
};

// ─── Alert Type: Low Score (<40%) ────────────────────────────────────────────
const checkLowScore = async (attempt, student, teacher) => {
  if (attempt.percentage >= 40) return;

  const dedupeKey = `low_score_${student._id}_${attempt._id}`;
  const exists = await Alert.findOne({ dedupeKey });
  if (exists) return;

  await Alert.create({
    teacher: teacher._id,
    student: student._id,
    school: student.school,
    class: student.class,
    subject: attempt.subject,
    type: 'low_score',
    priority: attempt.percentage < 25 ? 'high' : 'medium',
    title: `⚠️ ${student.name} scored ${attempt.percentage}% on "${attempt.quiz?.title || 'a quiz'}"`,
    message: `${student.name} scored below 40% (${attempt.percentage}%) on this quiz. ` +
      `Weak areas: ${attempt.conceptScores?.filter(c => c.percentage < 40).map(c => c.conceptName).slice(0, 2).join(', ') || 'multiple concepts'}. ` +
      `Consider a 1-on-1 check-in or assigning targeted remedial drills.`,
    data: {
      score: attempt.percentage,
      conceptName: attempt.conceptScores?.[0]?.conceptName,
    },
    dedupeKey,
  });
};

// ─── Alert Type: Repeated Failure (3+ times on same concept) ─────────────────
const checkRepeatedFailure = async (attempt, student, teacher) => {
  const isValidConceptId = (conceptId) => mongoose.Types.ObjectId.isValid(conceptId);

  for (const cs of (attempt.conceptScores || [])) {
    if (!isValidConceptId(cs.concept)) continue;
    if (cs.percentage >= 40) continue;

    // Count how many times this student scored < 40% on this concept
    const failCount = await Attempt.countDocuments({
      student: student._id,
      status: 'completed',
      'conceptScores.concept': cs.concept,
      'conceptScores.percentage': { $lt: 40 },
    });

    if (failCount < 3) continue;

    const dedupeKey = `repeated_failure_${student._id}_${cs.concept}_fail${failCount}`;
    const exists = await Alert.findOne({ dedupeKey });
    if (exists) continue;

    await Alert.create({
      teacher: teacher._id,
      student: student._id,
      school: student.school,
      class: student.class,
      subject: attempt.subject,
      type: 'repeated_failure',
      priority: 'high',
      title: `🔴 ${student.name} has failed "${cs.conceptName}" ${failCount} times`,
      message: `${student.name} has scored below 40% on the concept "${cs.conceptName}" ${failCount} times in a row. ` +
        `This persistent gap needs immediate intervention — consider a face-to-face session or alternative teaching approach.`,
      data: {
        score: cs.percentage,
        conceptName: cs.conceptName,
        conceptId: cs.concept,
        attemptCount: failCount,
      },
      dedupeKey,
    });
  }
};

// ─── Alert Type: Inactivity (7+ days) ────────────────────────────────────────
const checkInactiveStudents = async (schoolId) => {
  const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const inactiveStudents = await User.find({
    role: 'student',
    school: schoolId,
    isActive: true,
    $or: [
      { lastActivityDate: { $lt: cutoff } },
      { lastActivityDate: null },
    ],
  }).lean();

  for (const student of inactiveStudents) {
    const teachers = await findTeachersForStudent(student);
    const daysInactive = student.lastActivityDate
      ? Math.floor((Date.now() - new Date(student.lastActivityDate)) / 86400000)
      : 14;

    // Only alert once per 7-day window
    const weekKey = `inactive_${student._id}_week${Math.floor(Date.now() / (7 * 24 * 3600 * 1000))}`;
    const exists = await Alert.findOne({ dedupeKey: weekKey });
    if (exists) continue;

    for (const teacher of teachers) {
      await Alert.create({
        teacher: teacher._id,
        student: student._id,
        school: schoolId,
        class: student.class,
        type: 'inactive',
        priority: daysInactive >= 14 ? 'high' : 'medium',
        title: `💤 ${student.name} inactive for ${daysInactive} days`,
        message: `${student.name} has not attempted any quiz or activity for the past ${daysInactive} days. ` +
          `A quick check-in or reminder may help re-engage them with their learning goals.`,
        data: { daysInactive },
        dedupeKey: weekKey,
      });
    }
  }
};

// ─── Alert Type: Class Average Drop ─────────────────────────────────────────
const checkClassAverageDrops = async (schoolId) => {
  const classes = await Class.find({ school: schoolId, isActive: true }).lean();

  for (const cls of classes) {
    const students = await User.find({ class: cls._id, role: 'student' }).select('_id').lean();
    const studentIds = students.map(s => s._id);
    if (!studentIds.length) continue;

    // Current week vs last week average
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 3600 * 1000);

    const [currWeek, lastWeek] = await Promise.all([
      Attempt.aggregate([
        { $match: { student: { $in: studentIds }, status: 'completed', createdAt: { $gte: oneWeekAgo } } },
        { $group: { _id: null, avg: { $avg: '$percentage' } } },
      ]),
      Attempt.aggregate([
        { $match: { student: { $in: studentIds }, status: 'completed', createdAt: { $gte: twoWeeksAgo, $lt: oneWeekAgo } } },
        { $group: { _id: null, avg: { $avg: '$percentage' } } },
      ]),
    ]);

    const curr = currWeek[0]?.avg;
    const prev = lastWeek[0]?.avg;
    if (!curr || !prev) continue;

    const drop = Math.round(prev - curr);
    if (drop < 10) continue; // Only alert on significant drops (≥10%)

    const weekKey = `class_avg_drop_${cls._id}_week${Math.floor(Date.now() / (7 * 24 * 3600 * 1000))}`;
    const exists = await Alert.findOne({ dedupeKey: weekKey });
    if (exists) continue;

    const teachers = await User.find({ classes: cls._id, role: 'teacher' }).lean();
    for (const teacher of teachers) {
      await Alert.create({
        teacher: teacher._id,
        school: schoolId,
        class: cls._id,
        type: 'class_avg_drop',
        priority: drop >= 20 ? 'high' : 'medium',
        title: `📉 Class ${cls.name} average dropped by ${drop}%`,
        message: `The average score for ${cls.name} dropped from ${Math.round(prev)}% last week to ${Math.round(curr)}% this week — a decline of ${drop}%. ` +
          `Consider reviewing the most recent quiz topics with the whole class.`,
        data: { previousAvg: Math.round(prev), newAvg: Math.round(curr) },
        dedupeKey: weekKey,
      });
    }
  }
};

// ─── Helper: Find teachers for a student ─────────────────────────────────────
const findTeachersForStudent = async (student) => {
  if (!student.class && !student.school) return [];
  return await User.find({
    role: 'teacher',
    school: student.school,
    isActive: true,
    $or: [
      { classes: student.class },
      { school: student.school },
    ],
  }).lean();
};

module.exports = { checkAndGenerateAlerts, runScheduledAlertChecks };
