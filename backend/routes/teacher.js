const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
  createQuiz, getMyQuizzes, getQuiz, updateQuiz, publishQuiz, deleteQuiz,
  createQuestion, bulkCreateQuestions, getQuestions, updateQuestion, deleteQuestion,
  getClassPerformance, getWeakConcepts, getStudentDetail,
  getMyStudents, getMyClasses,
  getSubjects, getConcepts,
} = require('../controllers/teacherController');

router.use(protect, authorize('teacher', 'admin'));

// Quizzes
router.post('/quizzes', [
  body('title').notEmpty().trim(),
  body('subject').notEmpty(),
  body('type').isIn(['diagnostic', 'practice', 'remedial', 'assessment']),
], createQuiz);
router.get('/quizzes', getMyQuizzes);
router.get('/quizzes/:id', getQuiz);
router.put('/quizzes/:id', updateQuiz);
router.patch('/quizzes/:id/publish', publishQuiz);
router.delete('/quizzes/:id', deleteQuiz);

// Questions
router.post('/questions', createQuestion);
router.post('/questions/bulk', bulkCreateQuestions);
router.get('/questions', getQuestions);
router.put('/questions/:id', updateQuestion);
router.delete('/questions/:id', deleteQuestion);

// Analytics
router.get('/classes/:classId/performance', getClassPerformance);
router.get('/classes/:classId/weak-concepts', getWeakConcepts);
router.get('/students/:studentId/detail', getStudentDetail);

// Students & Classes
router.get('/students', getMyStudents);
router.get('/classes', getMyClasses);
router.get('/subjects', getSubjects);
router.get('/concepts', getConcepts);

module.exports = router;
