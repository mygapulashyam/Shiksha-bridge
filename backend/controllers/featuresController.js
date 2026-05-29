const multer = require('multer');
const { asyncHandler } = require('../middleware/errorHandler');
const { generateQuizQuestions } = require('../services/aiService');
const { validateQuizForPublishing } = require('../services/quizValidatorService');
const { runScheduledAlertChecks } = require('../services/alertService');
const { importSchools, importUsers, importClasses, importSubjects, importConcepts, getCSVTemplate } = require('../services/csvImportService');
const Alert = require('../models/Alert');
const { Doubt, ContentResource } = require('../models/LearningPathDoubtContent');
const { Attempt } = require('../models/AttemptRecommendation');
const { Quiz, Question } = require('../models/QuizQuestion');
const { Class, Subject, Concept } = require('../models/ClassSubjectConcept');
const User = require('../models/User');
const { paginate } = require('../utils/pagination');

// Multer – in-memory CSV storage
const csvStorage = multer.memoryStorage();
const csvUpload = multer({
  storage: csvStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(csv|txt)$/i)) {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  },
}).single('file');

/* ════════════════════════════════════════════════════
   FEATURE 4: AI QUIZ GENERATOR
════════════════════════════════════════════════════ */
const aiGenerateQuestions = asyncHandler(async (req, res) => {
  const { grade, subject, chapter, difficulty, count, language, conceptId } = req.body;

  if (!grade || !subject || !chapter) {
    return res.status(400).json({ success: false, message: 'grade, subject, and chapter are required' });
  }

  // Get concept name and fallback conceptId if not selected
  let conceptName = chapter;
  let finalConceptId = conceptId;

  if (conceptId) {
    const concept = await Concept.findById(conceptId).select('name').lean();
    if (concept) conceptName = concept.name;
  } else {
    // Proactively find a fallback concept matching the subject and grade
    const fallbackConcept = await Concept.findOne({ subject, grade: parseInt(grade) }).select('_id name').lean();
    if (fallbackConcept) {
      finalConceptId = fallbackConcept._id;
      conceptName = fallbackConcept.name;
    }
  }

  // Get subject name
  const subjectDoc = await Subject.findById(subject).select('name').lean();

  const result = await generateQuizQuestions({
    grade: parseInt(grade),
    subject: subjectDoc?.name || subject,
    chapter,
    difficulty: difficulty || 'basic',
    count: Math.min(parseInt(count) || 5, 20),
    language: language || 'en',
    conceptId: finalConceptId || undefined,
    conceptName,
  });

  if (result.error && !result.questions.length) {
    return res.status(503).json({ success: false, message: result.error });
  }

  res.json({
    success: true,
    message: `${result.questions.length} questions generated`,
    data: result.questions,
    generatedBy: result.generatedBy,
  });
});

/* ════════════════════════════════════════════════════
   FEATURE 17: QUIZ VALIDATION
════════════════════════════════════════════════════ */
const validateQuiz = asyncHandler(async (req, res) => {
  const result = await validateQuizForPublishing(req.params.id);
  res.json({ success: true, data: result });
});

/* ════════════════════════════════════════════════════
   FEATURE 3: TEACHER ALERTS
════════════════════════════════════════════════════ */
const getAlerts = asyncHandler(async (req, res) => {
  const filter = { teacher: req.user._id, isDismissed: false };
  if (req.query.type) filter.type = req.query.type;
  if (req.query.unread === 'true') filter.isRead = false;

  const result = await paginate(
    Alert,
    filter,
    {
      populate: [
        { path: 'student', select: 'name email' },
        { path: 'class', select: 'name grade section' },
        { path: 'subject', select: 'name icon' },
      ],
      sort: { createdAt: -1 },
    },
    req
  );

  const unreadCount = await Alert.countDocuments({ teacher: req.user._id, isRead: false, isDismissed: false });
  res.json({ success: true, unreadCount, ...result });
});

const markAlertRead = asyncHandler(async (req, res) => {
  const alert = await Alert.findOneAndUpdate(
    { _id: req.params.id, teacher: req.user._id },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
  res.json({ success: true, data: alert });
});

const dismissAlert = asyncHandler(async (req, res) => {
  await Alert.findOneAndUpdate(
    { _id: req.params.id, teacher: req.user._id },
    { isDismissed: true, isRead: true }
  );
  res.json({ success: true, message: 'Alert dismissed' });
});

const markAllAlertsRead = asyncHandler(async (req, res) => {
  await Alert.updateMany({ teacher: req.user._id, isRead: false }, { isRead: true, readAt: new Date() });
  res.json({ success: true, message: 'All alerts marked as read' });
});

const triggerScheduledAlerts = asyncHandler(async (req, res) => {
  // Admin-only endpoint to manually trigger alert checks
  await runScheduledAlertChecks(req.user.school);
  res.json({ success: true, message: 'Alert checks triggered' });
});

/* ════════════════════════════════════════════════════
   FEATURE 5: WEAKNESS HEATMAP
════════════════════════════════════════════════════ */
const getStudentHeatmap = asyncHandler(async (req, res) => {
  const studentId = req.params.studentId;
  const subjectFilter = req.query.subject ? { subject: req.query.subject } : {};

  const attempts = await Attempt.find({ student: studentId, status: 'completed', ...subjectFilter })
    .sort({ createdAt: -1 })
    .lean();

  // Aggregate latest score per concept
  const conceptLatest = {};
  for (const attempt of attempts) {
    for (const cs of attempt.conceptScores || []) {
      const key = cs.concept?.toString();
      if (!key) continue;
      if (!conceptLatest[key] || attempt.createdAt > conceptLatest[key].date) {
        conceptLatest[key] = {
          conceptId: key,
          conceptName: cs.conceptName,
          percentage: cs.percentage,
          mastery: cs.mastery,
          attempts: 0,
          date: attempt.createdAt,
        };
      }
      conceptLatest[key].attempts += 1;
    }
  }

  // Attach subject info
  const heatmapData = Object.values(conceptLatest);
  const conceptIds = heatmapData.map(d => d.conceptId);
  const concepts = await Concept.find({ _id: { $in: conceptIds } })
    .populate('subject', 'name icon color')
    .lean();

  const conceptMap = {};
  concepts.forEach(c => { conceptMap[c._id.toString()] = c; });

  const enriched = heatmapData.map(d => ({
    ...d,
    subject: conceptMap[d.conceptId]?.subject,
    chapter: conceptMap[d.conceptId]?.chapter,
    chapterNumber: conceptMap[d.conceptId]?.chapterNumber,
    difficulty: conceptMap[d.conceptId]?.difficulty,
    color: d.percentage < 40 ? '#D63B3B' : d.percentage < 70 ? '#F5B820' : '#1B7A4E',
  })).sort((a, b) => (a.chapterNumber || 0) - (b.chapterNumber || 0));

  res.json({ success: true, data: enriched });
});

const getClassHeatmap = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const students = await User.find({ class: classId, role: 'student', isActive: true }).select('_id name').lean();
  const studentIds = students.map(s => s._id);

  const conceptAggregation = await Attempt.aggregate([
    { $match: { student: { $in: studentIds }, status: 'completed' } },
    { $unwind: '$conceptScores' },
    {
      $group: {
        _id: '$conceptScores.concept',
        conceptName: { $first: '$conceptScores.conceptName' },
        avgScore: { $avg: '$conceptScores.percentage' },
        weakCount: { $sum: { $cond: [{ $lt: ['$conceptScores.percentage', 40] }, 1, 0] } },
        developingCount: { $sum: { $cond: [{ $and: [{ $gte: ['$conceptScores.percentage', 40] }, { $lt: ['$conceptScores.percentage', 70] }] }, 1, 0] } },
        masteredCount: { $sum: { $cond: [{ $gte: ['$conceptScores.percentage', 70] }, 1, 0] } },
        totalResponses: { $sum: 1 },
      },
    },
    { $sort: { avgScore: 1 } },
  ]);

  // Enrich with concept details
  const conceptIds = conceptAggregation.map(c => c._id).filter(Boolean);
  const concepts = await Concept.find({ _id: { $in: conceptIds } }).populate('subject', 'name icon color').lean();
  const conceptMap = {};
  concepts.forEach(c => { conceptMap[c._id.toString()] = c; });

  const heatmap = conceptAggregation.map(c => ({
    conceptId: c._id,
    conceptName: c.conceptName,
    avgScore: Math.round(c.avgScore),
    weakCount: c.weakCount,
    developingCount: c.developingCount,
    masteredCount: c.masteredCount,
    totalStudents: studentIds.length,
    color: c.avgScore < 40 ? '#D63B3B' : c.avgScore < 70 ? '#F5B820' : '#1B7A4E',
    subject: conceptMap[c._id?.toString()]?.subject,
    chapter: conceptMap[c._id?.toString()]?.chapter,
  }));

  res.json({ success: true, data: heatmap, totalStudents: studentIds.length });
});

/* ════════════════════════════════════════════════════
   FEATURE 14: DOUBT BOX (Teacher side)
════════════════════════════════════════════════════ */
const getClassDoubts = asyncHandler(async (req, res) => {
  const { classId } = req.params;
  const filter = { class: classId };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.concept) filter.concept = req.query.concept;
  const result = await paginate(
    Doubt, filter,
    { populate: [{ path: 'student', select: 'name rollNumber' }, { path: 'concept', select: 'name' }, { path: 'subject', select: 'name icon' }], sort: { createdAt: -1 } },
    req
  );
  res.json({ success: true, ...result });
});

const answerDoubt = asyncHandler(async (req, res) => {
  const { answer, answerHindi } = req.body;
  if (!answer?.trim()) return res.status(400).json({ success: false, message: 'Answer is required' });
  const doubt = await Doubt.findByIdAndUpdate(
    req.params.id,
    { answer: answer.trim(), answerHindi, status: 'answered', answeredBy: req.user._id, answeredAt: new Date() },
    { new: true }
  );
  if (!doubt) return res.status(404).json({ success: false, message: 'Doubt not found' });
  res.json({ success: true, data: doubt });
});

/* ════════════════════════════════════════════════════
   FEATURE 10: CONTENT RESOURCE LIBRARY
════════════════════════════════════════════════════ */
const createResource = asyncHandler(async (req, res) => {
  const resourceData = { ...req.body, createdBy: req.user._id, school: req.user.school };
  if (resourceData.concept === '') delete resourceData.concept;

  const resource = await ContentResource.create(resourceData);
  res.status(201).json({ success: true, data: resource });
});

const getResources = asyncHandler(async (req, res) => {
  const filter = { isActive: true };
  if (req.query.concept) filter.concept = req.query.concept;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.language) filter.language = req.query.language;
  const result = await paginate(ContentResource, filter, { populate: { path: 'concept', select: 'name chapter' } }, req);
  res.json({ success: true, ...result });
});

const approveResource = asyncHandler(async (req, res) => {
  const resource = await ContentResource.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
  res.json({ success: true, data: resource });
});

/* ════════════════════════════════════════════════════
   FEATURE 12: CSV IMPORT
════════════════════════════════════════════════════ */
const importCSV = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const validTypes = ['schools', 'teachers', 'students', 'classes', 'subjects', 'concepts'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ success: false, message: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
  }

  await new Promise((resolve, reject) => csvUpload(req, res, err => err ? reject(err) : resolve()));
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  let result;
  try {
    switch (type) {
      case 'schools':   result = await importSchools(req.file.buffer); break;
      case 'teachers':  result = await importUsers(req.file.buffer, 'teacher', req.user.school); break;
      case 'students':  result = await importUsers(req.file.buffer, 'student', req.user.school); break;
      case 'classes':   result = await importClasses(req.file.buffer, req.user.school); break;
      case 'subjects':  result = await importSubjects(req.file.buffer); break;
      case 'concepts':  result = await importConcepts(req.file.buffer); break;
    }
    res.json({ success: true, message: `Import complete`, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: `Import failed: ${err.message}` });
  }
});

const getCSVTemplateDownload = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const template = getCSVTemplate(type);
  if (!template) return res.status(400).json({ success: false, message: 'Invalid type' });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="shiksha_${type}_template.csv"`);
  res.send(template);
});

/* ════════════════════════════════════════════════════
   FEATURE 15: RETRY & IMPROVEMENT TRACKING
════════════════════════════════════════════════════ */
const getImprovementTracking = asyncHandler(async (req, res) => {
  const studentId = req.params.studentId || req.user._id;
  const { quizId } = req.query;

  if (quizId) {
    // All attempts for one quiz (retry tracking)
    const attempts = await Attempt.find({ student: studentId, quiz: quizId, status: 'completed' })
      .sort({ createdAt: 1 })
      .select('percentage marksObtained totalMarks timeTaken createdAt attemptNumber');
    const first = attempts[0];
    const latest = attempts[attempts.length - 1];
    const improvement = first && latest ? latest.percentage - first.percentage : 0;
    return res.json({
      success: true,
      data: {
        attempts,
        firstScore: first?.percentage || null,
        latestScore: latest?.percentage || null,
        improvement,
        timeImprovement: first && latest ? first.timeTaken - latest.timeTaken : 0,
        totalRetries: attempts.length,
      },
    });
  }

  // Overall improvement trend
  const attempts = await Attempt.find({ student: studentId, status: 'completed' })
    .sort({ createdAt: 1 })
    .limit(30)
    .select('percentage createdAt subject')
    .populate('subject', 'name');

  res.json({ success: true, data: attempts });
});

/* ════════════════════════════════════════════════════
   FEATURE 11: DISTRICT RANKING DASHBOARD
════════════════════════════════════════════════════ */
const getDistrictRankings = asyncHandler(async (req, res) => {
  const { state, district } = req.query;
  const School = require('../models/School');

  const schoolFilter = {};
  if (state) schoolFilter.state = new RegExp(state, 'i');
  if (district) schoolFilter.district = new RegExp(district, 'i');

  const schools = await School.find(schoolFilter).select('_id name district state type').lean();
  const schoolIds = schools.map(s => s._id);

  const schoolStats = await Attempt.aggregate([
    { $match: { school: { $in: schoolIds }, status: 'completed' } },
    {
      $group: {
        _id: '$school',
        avgScore: { $avg: '$percentage' },
        attempts: { $sum: 1 },
        uniqueStudents: { $addToSet: '$student' },
      },
    },
    { $sort: { avgScore: -1 } },
  ]);

  const schoolMap = {};
  schools.forEach(s => { schoolMap[s._id.toString()] = s; });

  const ranked = schoolStats.map((s, i) => ({
    rank: i + 1,
    school: schoolMap[s._id.toString()],
    avgScore: Math.round(s.avgScore),
    attempts: s.attempts,
    activeStudents: s.uniqueStudents.length,
  }));

  // Weakest subjects across district
  const weakSubjects = await Attempt.aggregate([
    { $match: { school: { $in: schoolIds }, status: 'completed' } },
    { $group: { _id: '$subject', avgScore: { $avg: '$percentage' }, attempts: { $sum: 1 } } },
    { $sort: { avgScore: 1 } },
    { $limit: 5 },
    { $lookup: { from: 'subjects', localField: '_id', foreignField: '_id', as: 'subject' } },
    { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
    { $project: { subjectName: '$subject.name', subjectIcon: '$subject.icon', avgScore: { $round: ['$avgScore', 1] }, attempts: 1 } },
  ]);

  res.json({ success: true, data: { ranked, weakSubjects, totalSchools: schools.length } });
});

module.exports = {
  aiGenerateQuestions,
  validateQuiz,
  getAlerts, markAlertRead, dismissAlert, markAllAlertsRead, triggerScheduledAlerts,
  getStudentHeatmap, getClassHeatmap,
  getClassDoubts, answerDoubt,
  createResource, getResources, approveResource,
  importCSV, getCSVTemplateDownload,
  getImprovementTracking,
  getDistrictRankings,
};
