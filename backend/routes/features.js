const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
  aiGenerateQuestions,
  validateQuiz,
  getAlerts, markAlertRead, dismissAlert, markAllAlertsRead, triggerScheduledAlerts,
  getStudentHeatmap, getClassHeatmap,
  getClassDoubts, answerDoubt,
  createResource, getResources, approveResource,
  importCSV, getCSVTemplateDownload,
  getImprovementTracking,
  getDistrictRankings,
} = require('../controllers/featuresController');

// AI Quiz Generator – teacher/admin only
router.post('/ai/generate-questions', protect, authorize('teacher', 'admin'), aiGenerateQuestions);

// Quiz Validation
router.get('/quizzes/:id/validate', protect, authorize('teacher', 'admin'), validateQuiz);

// Teacher Alerts
router.get('/alerts', protect, authorize('teacher', 'admin'), getAlerts);
router.patch('/alerts/:id/read', protect, authorize('teacher', 'admin'), markAlertRead);
router.patch('/alerts/:id/dismiss', protect, authorize('teacher', 'admin'), dismissAlert);
router.patch('/alerts/read-all', protect, authorize('teacher', 'admin'), markAllAlertsRead);
router.post('/alerts/run-checks', protect, authorize('admin'), triggerScheduledAlerts);

// Heatmaps
router.get('/heatmap/student/:studentId', protect, authorize('teacher', 'admin', 'student'), getStudentHeatmap);
router.get('/heatmap/class/:classId', protect, authorize('teacher', 'admin'), getClassHeatmap);

// Doubts (teacher side)
router.get('/doubts/class/:classId', protect, authorize('teacher', 'admin'), getClassDoubts);
router.patch('/doubts/:id/answer', protect, authorize('teacher', 'admin'), answerDoubt);

// Content Resource Library
router.post('/resources', protect, authorize('teacher', 'admin'), createResource);
router.get('/resources', protect, getResources);
router.patch('/resources/:id/approve', protect, authorize('admin'), approveResource);

// CSV Import – admin only
router.post('/import/:type', protect, authorize('admin'), importCSV);
router.get('/import/:type/template', protect, authorize('admin'), getCSVTemplateDownload);

// Improvement Tracking
router.get('/improvement/:studentId', protect, authorize('teacher', 'admin'), getImprovementTracking);

// District Rankings – admin only
router.get('/district-rankings', protect, authorize('admin'), getDistrictRankings);

// Parent report for specific student (teacher/admin)
router.get('/report/student/:studentId/pdf', protect, authorize('teacher', 'admin'), require('../controllers/studentController').downloadParentReport);

module.exports = router;
