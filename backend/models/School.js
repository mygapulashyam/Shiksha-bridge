const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'School name is required'],
      trim: true,
      maxlength: [200, 'School name cannot exceed 200 characters'],
    },
    udiseCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      comment: 'Unified District Information System for Education code',
    },
    district: { type: String, trim: true, required: true },
    state: { type: String, trim: true, required: true },
    block: { type: String, trim: true },
    type: {
      type: String,
      enum: ['government', 'aided', 'private', 'kv', 'navodaya'],
      default: 'government',
    },
    medium: {
      type: String,
      enum: ['english', 'hindi', 'bilingual', 'regional'],
      default: 'hindi',
    },
    board: {
      type: String,
      enum: ['cbse', 'icse', 'state', 'nios'],
      default: 'state',
    },
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    principalName: { type: String, trim: true },
    totalStudents: { type: Number, default: 0 },
    totalTeachers: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    // Stats updated by cron or aggregation
    stats: {
      avgScore: { type: Number, default: 0 },
      quizAttempts: { type: Number, default: 0 },
      activeStudents: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('School', schoolSchema);
