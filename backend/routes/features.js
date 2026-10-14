const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { verifyStudentAccess, verifyClassAccess } = require('../middleware/accessControl');
const {
  aiGenerateQuestions,
  validateQuiz,
  getAlerts, markAlertRead, dismissAlert, markAllAlertsRead, triggerScheduledAlerts,
  getStudentHeatmap, getClassHeatmap,
  getClassDoubts, answerDoubt,
  createResource, getResources, getResourceById, approveResource, rejectResource,
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
router.get('/heatmap/student/:studentId', protect, authorize('teacher', 'admin', 'student'), verifyStudentAccess, getStudentHeatmap);
router.get('/heatmap/class/:classId', protect, authorize('teacher', 'admin'), verifyClassAccess, getClassHeatmap);

// Doubts (teacher side)
router.get('/doubts/class/:classId', protect, authorize('teacher', 'admin'), verifyClassAccess, getClassDoubts);
router.patch('/doubts/:id/answer', protect, authorize('teacher', 'admin'), answerDoubt);

// Content Resource Library
router.post('/resources', protect, authorize('teacher', 'admin'), createResource);
router.get('/resources', protect, getResources);
router.get('/resources/:id', protect, getResourceById);
router.patch('/resources/:id/approve', protect, authorize('teacher', 'admin'), approveResource);
router.patch('/resources/:id/reject', protect, authorize('teacher', 'admin'), rejectResource);

// CSV Import – admin only
router.post('/import/:type', protect, authorize('admin'), importCSV);
router.get('/import/:type/template', protect, authorize('admin'), getCSVTemplateDownload);

// Improvement Tracking
router.get('/improvement/:studentId', protect, authorize('teacher', 'admin'), verifyStudentAccess, getImprovementTracking);

// District Rankings – admin only
router.get('/district-rankings', protect, authorize('admin'), getDistrictRankings);

// Parent report for specific student (teacher/admin)
router.get('/report/student/:studentId/pdf', protect, authorize('teacher', 'admin'), verifyStudentAccess, require('../controllers/studentController').downloadParentReport);

module.exports = router;
