const Alert = require('../models/Alert');
const User = require('../models/User');
const { Attempt } = require('../models/AttemptRecommendation');
const { Class } = require('../models/ClassSubjectConcept');
const mongoose = require('mongoose');
const { isValidConceptId } = require('../utils/validators');

const { Quiz } = require('../models/QuizQuestion');

/**
 * ─── Feature 3: Teacher Intervention Alerts ──────────────────────────────────
 * Called after each quiz submission and by a scheduled check (or on-demand)
 */

/**
 * Check and generate alerts after a quiz attempt
 * @param {Object} attempt - attempt document
 * @param {Object} student - user document
 */
const checkAndGenerateAlerts = async (attempt, student) => {
  try {
    const teachers = await findTeachersForStudent(student);
    if (!teachers.length) return;

    // Ensure quiz is populated with title
    let quizTitle = attempt.quiz?.title;
    if (!quizTitle && attempt.quiz) {
      const qDoc = await Quiz.findById(attempt.quiz).select('title').lean();
      quizTitle = qDoc?.title;
    }

    for (const teacher of teachers) {
      await Promise.all([
        checkLowScore(attempt, student, teacher, quizTitle),
        checkRepeatedFailure(attempt, student, teacher),
        checkMasteryAchieved(attempt, student, teacher),
        checkStreakBroken(student, teacher),
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
    // If schoolId is not provided, run across all active schools
    if (!schoolId) {
      const School = require('../models/School');
      const schools = await School.find({ isActive: true }).select('_id').lean();
      for (const s of schools) {
        await checkInactiveStudents(s._id);
        await checkClassAverageDrops(s._id);
      }
    } else {
      await checkInactiveStudents(schoolId);
      await checkClassAverageDrops(schoolId);
    }
  } catch (err) {
    console.error('Scheduled alert check error:', err.message);
  }
};

// ─── Alert Type: Low Score (<40%) ────────────────────────────────────────────
const checkLowScore = async (attempt, student, teacher, quizTitle) => {
  if (attempt.percentage >= 40) return;

  const titleText = quizTitle || 'a quiz';
  const dedupeKey = `low_score_${student._id}_${attempt._id}_${teacher._id}`;
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
    title: `⚠️ ${student.name} scored ${attempt.percentage}% on "${titleText}"`,
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

// ─── Alert Type: Repeated Failure (3+ times in a row on same concept) ────────
const checkRepeatedFailure = async (attempt, student, teacher) => {
  for (const cs of (attempt.conceptScores || [])) {
    if (!isValidConceptId(cs.concept)) continue;
    if (cs.percentage >= 40) continue;

    // Check last 3 completed attempts that tested this concept
    const recentAttempts = await Attempt.find({
      student: student._id,
      status: 'completed',
      conceptScores: { $elemMatch: { concept: cs.concept } },
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    if (recentAttempts.length < 3) continue;

    // Verify all 3 in a row scored < 40% on this concept
    const allThreeFailed = recentAttempts.every(att => {
      const match = (att.conceptScores || []).find(c => c.concept?.toString() === cs.concept.toString());
      return match && match.percentage < 40;
    });

    if (!allThreeFailed) continue;

    const dedupeKey = `repeated_failure_${student._id}_${cs.concept}_att${attempt._id}_${teacher._id}`;
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
      title: `🔴 ${student.name} has failed "${cs.conceptName}" 3 times in a row`,
      message: `${student.name} has scored below 40% on the concept "${cs.conceptName}" 3 times in a row. ` +
        `This persistent gap needs immediate intervention — consider a face-to-face session or alternative teaching approach.`,
      data: {
        score: cs.percentage,
        conceptName: cs.conceptName,
        conceptId: cs.concept,
        attemptCount: 3,
      },
      dedupeKey,
    });
  }
};

// ─── Alert Type: Mastery Achieved (Positive notification) ────────────────────
const checkMasteryAchieved = async (attempt, student, teacher) => {
  for (const cs of (attempt.conceptScores || [])) {
    if (!isValidConceptId(cs.concept)) continue;
    if (cs.percentage < 90) continue;

    const dedupeKey = `mastery_${student._id}_${cs.concept}_${teacher._id}`;
    const exists = await Alert.findOne({ dedupeKey });
    if (exists) continue;

    await Alert.create({
      teacher: teacher._id,
      student: student._id,
      school: student.school,
      class: student.class,
      subject: attempt.subject,
      type: 'mastery_achieved',
      priority: 'low',
      title: `🌟 ${student.name} mastered "${cs.conceptName}"!`,
      message: `${student.name} scored ${cs.percentage}% and demonstrated mastery in "${cs.conceptName}". Consider challenging them with advanced enrichment material.`,
      data: {
        score: cs.percentage,
        conceptName: cs.conceptName,
        conceptId: cs.concept,
      },
      dedupeKey,
    });
  }
};

// ─── Alert Type: Streak Broken ───────────────────────────────────────────────
const checkStreakBroken = async (student, teacher) => {
  // If student had a high streak (>= 7 days) and reset to 1
  if (student.streak === 1 && student.previousStreak && student.previousStreak >= 7) {
    const dedupeKey = `streak_broken_${student._id}_${Date.now().toString().slice(0, 6)}_${teacher._id}`;
    const exists = await Alert.findOne({ dedupeKey });
    if (exists) return;

    await Alert.create({
      teacher: teacher._id,
      student: student._id,
      school: student.school,
      class: student.class,
      type: 'streak_broken',
      priority: 'medium',
      title: `⚡ ${student.name}'s ${student.previousStreak}-day learning streak was broken`,
      message: `${student.name} missed a day after maintaining an active ${student.previousStreak}-day daily learning streak. A word of encouragement could help them bounce back!`,
      data: {},
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

    const teachers = await User.find({
      role: 'teacher',
      $or: [
        { classes: cls._id },
        { _id: cls.classTeacher },
      ],
    }).lean();
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

// ─── Helper: Find teachers for a student (specifically assigned teachers) ────
const findTeachersForStudent = async (student) => {
  if (!student.class) return [];
  // Find teachers specifically assigned to this student's class
  const teachers = await User.find({
    role: 'teacher',
    school: student.school,
    isActive: true,
    classes: student.class,
  }).lean();

  if (teachers.length > 0) return teachers;

  // Fallback to class teacher if defined on Class model
  const cls = await Class.findById(student.class).select('classTeacher').lean();
  if (cls?.classTeacher) {
    const classTeacher = await User.findById(cls.classTeacher).lean();
    if (classTeacher) return [classTeacher];
  }

  return [];
};

module.exports = { checkAndGenerateAlerts, runScheduledAlertChecks };
