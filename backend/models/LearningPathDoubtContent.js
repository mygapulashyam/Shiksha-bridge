const mongoose = require('mongoose');

/* ─── Learning Path ──────────────────────── */
const learningPathSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    concept: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept' },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    title: { type: String },
    generatedBy: { type: String, enum: ['ai', 'rule'], default: 'rule' },
    steps: [
      {
        stepNumber: { type: Number, required: true },
        type: {
          type: String,
          enum: ['revise_concept', 'watch_explanation', 'attempt_remedial', 'retry_diagnostic', 'unlock_next', 'practice_worksheet'],
          required: true,
        },
        title: { type: String, required: true },
        description: { type: String },
        resourceId: { type: mongoose.Schema.Types.ObjectId },
        resourceType: { type: String, enum: ['quiz', 'video', 'note', 'worksheet'] },
        estimatedMinutes: { type: Number, default: 10 },
        status: { type: String, enum: ['locked', 'available', 'in_progress', 'completed'], default: 'available' },
        completedAt: { type: Date },
        xpReward: { type: Number, default: 20 },
        xpAwarded: { type: Boolean, default: false },
      },
    ],
    currentStep: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'completed', 'paused'], default: 'active' },
    completionPercentage: { type: Number, default: 0 },
    aiSummary: { type: String }, // AI-generated path rationale
    completedAt: { type: Date },
  },
  { timestamps: true }
);

/* ─── Doubt ──────────────────────────────── */
const doubtSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    concept: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept' },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    text: { type: String, required: true, maxlength: 1000 },
    textHindi: { type: String, maxlength: 1000 },
    type: { type: String, enum: ['concept', 'question', 'topic', 'general'], default: 'question' },
    status: { type: String, enum: ['open', 'answered', 'closed'], default: 'open' },
    answer: { type: String },
    answerHindi: { type: String },
    answeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    answeredAt: { type: Date },
    upvotes: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: true }, // Can be seen by classmates
  },
  { timestamps: true }
);

/* ─── ContentResource ────────────────────── */
const contentResourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    titleHindi: { type: String, trim: true },
    titleGujarati: { type: String, trim: true },
    titleTelugu: { type: String, trim: true },
    type: {
      type: String,
      enum: ['note', 'video', 'worksheet', 'example', 'step_solution', 'practice_set'],
      required: true,
    },
    concept: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept' },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    grade: { type: Number, min: 6, max: 10 },
    difficulty: { type: String, enum: ['foundational', 'basic', 'intermediate', 'advanced'], default: 'basic' },
    language: { type: String, enum: ['en', 'hi', 'gu', 'te', 'bilingual'], default: 'en' },
    content: { type: String }, // Markdown text for notes/solutions
    contentHindi: { type: String },
    contentGujarati: { type: String },
    contentTelugu: { type: String },
    videoUrl: { type: String },
    fileUrl: { type: String },
    thumbnailUrl: { type: String },
    duration: { type: Number }, // minutes for video/reading
    tags: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School' }, // null = platform-wide
    viewCount: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

learningPathSchema.index({ student: 1, status: 1 });
learningPathSchema.index({ student: 1, concept: 1 });

doubtSchema.index({ class: 1, status: 1, createdAt: -1 });
doubtSchema.index({ student: 1, createdAt: -1 });
doubtSchema.index({ school: 1 });
doubtSchema.index({ school: 1, status: 1, createdAt: -1 });

contentResourceSchema.index({ concept: 1, isActive: 1, isApproved: 1 });
contentResourceSchema.index({ school: 1, isActive: 1, isApproved: 1 });

module.exports = {
  LearningPath: mongoose.model('LearningPath', learningPathSchema),
  Doubt: mongoose.model('Doubt', doubtSchema),
  ContentResource: mongoose.model('ContentResource', contentResourceSchema),
};
