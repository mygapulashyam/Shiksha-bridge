const mongoose = require('mongoose');
const User = require('../models/User');
const { Class } = require('../models/ClassSubjectConcept');

const toIdString = (value) => {
  if (!value) return null;
  if (typeof value === 'object') {
    return value._id ? value._id.toString() : null;
  }
  return value.toString();
};

const uniqueIds = (ids = []) => [...new Set(ids.map(toIdString).filter(Boolean))];

const syncClassTeacherLink = async ({ classId, previousTeacherId, nextTeacherId }) => {
  const classIdString = toIdString(classId);
  const previousId = toIdString(previousTeacherId);
  const nextId = toIdString(nextTeacherId);

  if (!classIdString) return;

  if (previousId && previousId !== nextId) {
    await User.updateOne(
      { _id: previousId },
      { $pull: { classes: new mongoose.Types.ObjectId(classIdString) } }
    );
  }

  if (nextId) {
    await User.updateOne(
      { _id: nextId },
      { $addToSet: { classes: new mongoose.Types.ObjectId(classIdString) } }
    );
  }
};

const syncTeacherClassAssignments = async ({ teacherId, previousClassIds = [], nextClassIds = [] }) => {
  const teacherIdString = toIdString(teacherId);
  if (!teacherIdString) return;

  const previous = uniqueIds(previousClassIds);
  const next = uniqueIds(nextClassIds);

  const removed = previous.filter((classId) => !next.includes(classId));
  const added = next.filter((classId) => !previous.includes(classId));

  if (removed.length > 0) {
    await Class.updateMany(
      { _id: { $in: removed }, classTeacher: new mongoose.Types.ObjectId(teacherIdString) },
      { $unset: { classTeacher: 1 } }
    );
  }

  if (added.length > 0) {
    await Class.updateMany(
      { _id: { $in: added } },
      { $set: { classTeacher: new mongoose.Types.ObjectId(teacherIdString) } }
    );
  }
};

const teacherHasClassAccess = (teacher, classId, classTeacherId = null) => {
  const classIdString = toIdString(classId);
  const classTeacherString = toIdString(classTeacherId);
  if (!teacher || !classIdString) return false;

  const assignedIds = uniqueIds(teacher.classes || []);
  return assignedIds.includes(classIdString) || classTeacherString === toIdString(teacher._id);
};

module.exports = {
  syncClassTeacherLink,
  syncTeacherClassAssignments,
  teacherHasClassAccess,
};