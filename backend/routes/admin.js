const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
  createSchool, getSchools, getSchool, updateSchool,
  getUsers, getUserById, updateUser, toggleUserStatus,
  createSubject, getSubjects,
  updateSubject,
  createConcept, getConcepts,
  getPlatformAnalytics, getSchoolAnalytics,
  createClass, getClasses,
} = require('../controllers/adminController');

router.use(protect, authorize('admin'));

// Schools
router.post('/schools', createSchool);
router.get('/schools', getSchools);
router.get('/schools/:id', getSchool);
router.put('/schools/:id', updateSchool);
router.get('/schools/:schoolId/analytics', getSchoolAnalytics);

// Users
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.patch('/users/:id/toggle-status', toggleUserStatus);

// Classes
router.post('/classes', createClass);
router.get('/classes', getClasses);

// Subjects
router.post('/subjects', createSubject);
router.put('/subjects/:id', updateSubject);
router.get('/subjects', getSubjects);

// Concepts
router.post('/concepts', createConcept);
router.get('/concepts', getConcepts);

// Analytics
router.get('/analytics', getPlatformAnalytics);

module.exports = router;
