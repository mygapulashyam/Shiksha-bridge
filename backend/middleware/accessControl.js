const User = require('../models/User');
const { Class } = require('../models/ClassSubjectConcept');
const { teacherHasClassAccess } = require('../services/classAssignmentSyncService');

const verifyStudentAccess = async (req, res, next) => {
  try {
    const studentId = req.params.studentId || req.query.studentId || req.body.studentId;
    if (!studentId) {
      return next();
    }

    if (req.user.role === 'student') {
      if (studentId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied: You can only access your own data.' });
      }
      return next();
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    // Check school matches
    if (student.school?.toString() !== req.user.school?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: Student is not in your school.' });
    }

    if (req.user.role === 'teacher') {
      if (student.class) {
        const classRecord = await Class.findById(student.class).select('classTeacher');
        if (!classRecord || !teacherHasClassAccess(req.user, student.class.toString(), classRecord.classTeacher)) {
          return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this student\'s class.' });
        }
      } else {
        // If student is not in any class, check if they are in the same school
        if (student.school?.toString() !== req.user.school?.toString()) {
          return res.status(403).json({ success: false, message: 'Access denied: You do not have access to this student.' });
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

const verifyClassAccess = async (req, res, next) => {
  try {
    const classId = req.params.classId || req.query.classId || req.body.classId;
    if (!classId) {
      return next();
    }

    const classRecord = await Class.findById(classId).select('classTeacher school');
    if (!classRecord) {
      return res.status(404).json({ success: false, message: 'Class not found.' });
    }

    // Check school matches
    if (classRecord.school?.toString() !== req.user.school?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: Class is not in your school.' });
    }

    if (req.user.role === 'teacher') {
      if (!teacherHasClassAccess(req.user, classId, classRecord.classTeacher)) {
        return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this class.' });
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyStudentAccess,
  verifyClassAccess,
};
