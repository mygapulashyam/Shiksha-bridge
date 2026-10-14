const mongoose = require('mongoose');

/* ─── Class ─────────────────────────────────── */
const classSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Class 7 - A"
    grade: {
      type: Number,
      required: true,
      min: 6,
      max: 10,
    },
    section: { type: String, trim: true, default: 'A' },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
    },
    classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    academicYear: { type: String, default: '2024-25' },
    studentCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
classSchema.index({ school: 1, isActive: 1, grade: 1, section: 1 });

/* ─── Subject ────────────────────────────────── */
const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    grade: { type: Number, min: 6, max: 10 },
    description: { type: String, trim: true },
    language: {
      type: String,
      enum: ['en', 'hi', 'bilingual'],
      default: 'en',
    },
    icon: { type: String, default: '📚' },
    color: { type: String, default: '#4F46E5' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* ─── Concept ────────────────────────────────── */
const conceptSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameHindi: { type: String, trim: true },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    grade: { type: Number, min: 6, max: 10, required: true },
    chapter: { type: String, trim: true },
    chapterNumber: { type: Number },
    difficulty: {
      type: String,
      enum: ['foundational', 'basic', 'intermediate', 'advanced'],
      default: 'basic',
    },
    // Prerequisite concepts (for learning path)
    prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Concept' }],
    // Next concept in learning path
    nextConcept: { type: mongoose.Schema.Types.ObjectId, ref: 'Concept' },
    description: { type: String, trim: true },
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }, // Sort order within chapter
  },
  { timestamps: true }
);

module.exports = {
  Class: mongoose.model('Class', classSchema),
  Subject: mongoose.model('Subject', subjectSchema),
  Concept: mongoose.model('Concept', conceptSchema),
};
