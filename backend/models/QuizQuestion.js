const mongoose = require('mongoose');

/* ─── Question ───────────────────────────────── */
const questionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    textHindi: { type: String, trim: true },
    type: {
      type: String,
      enum: ['mcq', 'truefalse', 'fillblank', 'match'],
      default: 'mcq',
    },
    options: [
      {
        label: { type: String }, // A, B, C, D
        text: { type: String, required: true },
        textHindi: { type: String },
        isCorrect: { type: Boolean, default: false },
      },
    ],
    correctAnswer: { type: String }, // For fillblank
    explanation: { type: String, trim: true },
    explanationHindi: { type: String, trim: true },
    concept: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Concept',
    },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    grade: { type: Number, min: 6, max: 10 },
    difficulty: {
      type: String,
      enum: ['foundational', 'basic', 'intermediate', 'advanced'],
      default: 'basic',
    },
    marks: { type: Number, default: 1 },
    imageUrl: { type: String },
    tags: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* ─── Quiz ───────────────────────────────────── */
const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    type: {
      type: String,
      enum: ['diagnostic', 'practice', 'remedial', 'assessment'],
      default: 'diagnostic',
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
    },
    grade: { type: Number, min: 6, max: 10 },
    chapter: { type: String, trim: true },
    concepts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Concept' }],
    questions: [
      {
        question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
        order: { type: Number },
        marks: { type: Number, default: 1 },
      },
    ],
    totalMarks: { type: Number, default: 0 },
    duration: { type: Number, default: 20 }, // minutes
    difficulty: {
      type: String,
      enum: ['foundational', 'basic', 'intermediate', 'advanced', 'mixed'],
      default: 'mixed',
    },
    // Assign to specific students or whole class
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    assignedClass: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    dueDate: { type: Date },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
    attemptCount: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Auto-compute totalMarks before save
quizSchema.pre('save', function (next) {
  if (this.questions && this.questions.length > 0) {
    this.totalMarks = this.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
  }
  next();
});

module.exports = {
  Quiz: mongoose.model('Quiz', quizSchema),
  Question: mongoose.model('Question', questionSchema),
};
