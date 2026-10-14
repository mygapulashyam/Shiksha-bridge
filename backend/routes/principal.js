const express = require('express');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
  dashboard,
  getClasses,
  getClassPerformance,
  getStudents,
  getStudentDetail,
  getTeachers,
  getInterventions,
  createSchoolUser,
  updateSchoolUser,
  createClass,
  updateClass,
} = require('../controllers/principalController');

const router = express.Router();

router.use(protect, authorize('principal'));
router.get('/dashboard', dashboard);
router.get('/classes', getClasses);
router.post('/classes', createClass);
router.get('/classes/:classId/performance', getClassPerformance);
router.patch('/classes/:classId', updateClass);
router.get('/students', getStudents);
router.get('/students/:studentId', getStudentDetail);
router.get('/teachers', getTeachers);
router.get('/interventions', getInterventions);
router.post('/users', createSchoolUser);
router.patch('/users/:userId', updateSchoolUser);

module.exports = router;
