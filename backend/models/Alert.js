const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    type: {
      type: String,
      enum: [
        'low_score',          // scored < 40%
        'repeated_failure',   // failed same concept 3+ times
        'inactive',           // no activity for 7+ days
        'class_avg_drop',     // class average dropped
        'mastery_achieved',   // student mastered a concept (positive)
        'streak_broken',      // streak broken after 7+ days
      ],
      required: true,
    },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    title: { type: String, required: true },
    message: { type: String, required: true },
    // Context data
    data: {
      score: Number,
      conceptName: String,
      conceptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept' },
      attemptCount: Number,
      daysInactive: Number,
      previousAvg: Number,
      newAvg: Number,
    },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    isDismissed: { type: Boolean, default: false },
    // Prevent duplicate alerts for same condition
    dedupeKey: { type: String, index: true },
  },
  { timestamps: true }
);

// TTL – auto-delete alerts older than 60 days
alertSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 3600 });
alertSchema.index({ teacher: 1, isRead: 1, createdAt: -1 });
alertSchema.index({ school: 1, isDismissed: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
