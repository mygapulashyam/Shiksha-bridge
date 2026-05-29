const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
  getAvailableQuizzes, getQuizForAttempt,
  startAttempt, submitAttempt,
  getDashboard, getMyAttempts, getAttemptDetail,
  getMyRecommendations, updateRecommendationStatus,
  getLearningPaths, advanceLearningPath,
  getProgressReport,
  submitDoubt, getMyDoubts,
  getStudentSubjects,
  downloadParentReport,
} = require('../controllers/studentController');
const { getImprovementTracking } = require('../controllers/featuresController');

router.use(protect, authorize('student', 'teacher', 'admin'));

router.get('/dashboard', authorize('student'), getDashboard);
router.get('/quizzes', getAvailableQuizzes);
router.get('/quizzes/:id', getQuizForAttempt);
router.post('/attempts/start', startAttempt);
router.post('/attempts/submit', submitAttempt);
router.get('/attempts', getMyAttempts);
router.get('/attempts/:id', getAttemptDetail);
router.get('/recommendations', getMyRecommendations);
router.patch('/recommendations/:id/status', updateRecommendationStatus);
router.get('/learning-paths', getLearningPaths);
router.patch('/learning-paths/:id/advance', advanceLearningPath);
router.get('/progress', getProgressReport);
router.post('/doubts', submitDoubt);
router.get('/doubts', getMyDoubts);
router.get('/subjects', getStudentSubjects);
router.get('/report/pdf', authorize('student'), downloadParentReport);
router.get('/improvement', getImprovementTracking);

module.exports = router;
