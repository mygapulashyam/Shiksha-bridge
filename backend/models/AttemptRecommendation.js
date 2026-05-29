const mongoose = require('mongoose');

/* ─── Attempt ────────────────────────────────── */
const attemptSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
    },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    answers: [
      {
        question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
        selectedOption: { type: String },
        enteredAnswer: { type: String },
        isCorrect: { type: Boolean },
        marksAwarded: { type: Number, default: 0 },
        timeTaken: { type: Number }, // seconds
        concept: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept' },
      },
    ],
    // Score
    totalMarks: { type: Number, default: 0 },
    marksObtained: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    // Per-concept scores
    conceptScores: [
      {
        concept: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept' },
        conceptName: { type: String },
        totalQuestions: { type: Number },
        correctAnswers: { type: Number },
        percentage: { type: Number },
        mastery: {
          type: String,
          enum: ['weak', 'developing', 'proficient', 'mastered'],
          default: 'weak',
        },
      },
    ],
    // State
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'abandoned'],
      default: 'in_progress',
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    timeTaken: { type: Number }, // seconds
    attemptNumber: { type: Number, default: 1 },
    // Recommendation generated from this attempt
    recommendationGenerated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compute percentage before save
attemptSchema.pre('save', function (next) {
  if (this.totalMarks > 0) {
    this.percentage = Math.round((this.marksObtained / this.totalMarks) * 100);
  }
  next();
});

/* ─── Recommendation ─────────────────────────── */
const recommendationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    attempt: { type: mongoose.Schema.Types.ObjectId, ref: 'Attempt' },
    concept: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept' },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    type: {
      type: String,
      enum: ['remedial_drill', 'concept_practice', 'next_concept', 'revision'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    // Rule-based reason
    rule: { type: String }, // e.g. "score_below_40"
    score: { type: Number }, // score that triggered this
    message: { type: String }, // Human-readable message
    messageHindi: { type: String },
    // Task details
    task: {
      title: { type: String },
      description: { type: String },
      resourceType: {
        type: String,
        enum: ['quiz', 'video', 'reading', 'practice_set'],
        default: 'quiz',
      },
      resourceId: { type: mongoose.Schema.Types.ObjectId },
      estimatedMinutes: { type: Number, default: 15 },
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'skipped'],
      default: 'pending',
    },
    completedAt: { type: Date },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
  },
  { timestamps: true }
);

/* ─── ProgressReport ─────────────────────────── */
const progressReportSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    period: { type: String }, // e.g. "2024-June"
    // Overall
    totalAttempts: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 },
    improvement: { type: Number, default: 0 }, // % improvement
    // Per-concept mastery
    conceptMastery: [
      {
        concept: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept' },
        conceptName: { type: String },
        attempts: { type: Number, default: 0 },
        bestScore: { type: Number, default: 0 },
        lastScore: { type: Number, default: 0 },
        mastery: {
          type: String,
          enum: ['not_started', 'weak', 'developing', 'proficient', 'mastered'],
          default: 'not_started',
        },
        masteryUpdatedAt: { type: Date },
      },
    ],
    weakConcepts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Concept' }],
    strongConcepts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Concept' }],
    streak: { type: Number, default: 0 },
    badges: [{ name: String, awardedAt: Date }],
    totalPoints: { type: Number, default: 0 },
    reportGeneratedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = {
  Attempt: mongoose.model('Attempt', attemptSchema),
  Recommendation: mongoose.model('Recommendation', recommendationSchema),
  ProgressReport: mongoose.model('ProgressReport', progressReportSchema),
};
