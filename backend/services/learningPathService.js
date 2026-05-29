const { LearningPath } = require('../models/LearningPathDoubtContent');
const { Concept } = require('../models/ClassSubjectConcept');
const { Quiz } = require('../models/QuizQuestion');
const { ContentResource } = require('../models/LearningPathDoubtContent');
const mongoose = require('mongoose');

/**
 * ─── Feature 2: Personalized Learning Path Generator ────────────────────────
 * Builds a 5-step learning path per weak concept after quiz
 *
 * Step 1: Revise concept (notes/short explanation)
 * Step 2: Watch short explanation (video/resource)
 * Step 3: Attempt remedial quiz
 * Step 4: Retry diagnostic
 * Step 5: Unlock next concept
 */

const buildLearningPath = async (student, attempt) => {
  const paths = [];
  const isValidConceptId = (conceptId) => mongoose.Types.ObjectId.isValid(conceptId);

  for (const cs of attempt.conceptScores) {
    if (!isValidConceptId(cs.concept)) continue;
    if (cs.percentage >= 70) continue; // Only build paths for weak/developing

    const existing = await LearningPath.findOne({
      student: student._id,
      concept: cs.concept,
      status: 'active',
    });
    if (existing) continue; // Don't overwrite active path

    const concept = await Concept.findById(cs.concept)
      .populate('subject', 'name')
      .lean();

    if (!concept) continue;

    // Find resources
    const [note, video, remedialQuiz, diagnosticQuiz] = await Promise.all([
      ContentResource.findOne({ concept: cs.concept, type: { $in: ['note', 'step_solution'] }, isActive: true }).lean(),
      ContentResource.findOne({ concept: cs.concept, type: 'video', isActive: true }).lean(),
      Quiz.findOne({ concepts: cs.concept, type: 'remedial', isPublished: true, isActive: true }).lean(),
      Quiz.findOne({ concepts: cs.concept, type: 'diagnostic', isPublished: true, isActive: true }).lean(),
    ]);

    const nextConcept = concept.nextConcept
      ? await Concept.findById(concept.nextConcept).select('name').lean()
      : null;

    const isRemedial = cs.percentage < 40;
    const xpBase = isRemedial ? 10 : 20;

    const steps = [
      {
        stepNumber: 1,
        type: 'revise_concept',
        title: `📖 Read: ${concept.name}`,
        description: concept.description || `Review the key ideas in "${concept.name}" before practising.`,
        resourceId: note?._id || null,
        resourceType: note ? (note.type === 'video' ? 'video' : 'note') : null,
        estimatedMinutes: 5,
        status: 'available',
        xpReward: xpBase,
      },
      {
        stepNumber: 2,
        type: 'watch_explanation',
        title: video ? `🎬 Watch: ${video.title}` : `🎬 Explanation: ${concept.name}`,
        description: `Watch or read a short explanation to understand "${concept.name}" clearly.`,
        resourceId: video?._id || null,
        resourceType: 'video',
        estimatedMinutes: 7,
        status: 'locked',
        xpReward: xpBase,
      },
      {
        stepNumber: 3,
        type: 'attempt_remedial',
        title: remedialQuiz ? `🔧 Remedial Quiz: ${remedialQuiz.title}` : `🔧 Practice Drills: ${concept.name}`,
        description: isRemedial
          ? `Work through easier foundational drills to build confidence in "${concept.name}".`
          : `Practice concept-level questions to strengthen your understanding.`,
        resourceId: remedialQuiz?._id || null,
        resourceType: 'quiz',
        estimatedMinutes: 10,
        status: 'locked',
        xpReward: xpBase + 10,
      },
      {
        stepNumber: 4,
        type: 'retry_diagnostic',
        title: diagnosticQuiz ? `📊 Retry: ${diagnosticQuiz.title}` : `📊 Re-take Diagnostic`,
        description: `Attempt the diagnostic quiz again to measure your improvement in "${concept.name}".`,
        resourceId: diagnosticQuiz?._id || null,
        resourceType: 'quiz',
        estimatedMinutes: 15,
        status: 'locked',
        xpReward: xpBase + 20,
      },
      {
        stepNumber: 5,
        type: 'unlock_next',
        title: nextConcept ? `🚀 Unlock: ${nextConcept.name}` : `🌟 Concept Mastered!`,
        description: nextConcept
          ? `You've mastered "${concept.name}"! Move on to "${nextConcept.name}".`
          : `Congratulations! You have fully mastered this concept. Keep going!`,
        resourceId: nextConcept?._id || null,
        resourceType: null,
        estimatedMinutes: 0,
        status: 'locked',
        xpReward: 50,
      },
    ];

    const path = await LearningPath.create({
      student: student._id,
      concept: cs.concept,
      subject: attempt.subject,
      title: `Learning Path: ${concept.name}`,
      generatedBy: 'rule',
      steps,
      currentStep: 0,
      status: 'active',
      completionPercentage: 0,
    });

    paths.push(path);
  }

  return paths;
};

/**
 * Advance a learning path step
 */
const advancePathStep = async (pathId, studentId) => {
  const path = await LearningPath.findOne({ _id: pathId, student: studentId });
  if (!path || path.status === 'completed') return path;

  const current = path.steps[path.currentStep];
  if (current) {
    current.status = 'completed';
    current.completedAt = new Date();
  }

  const nextIdx = path.currentStep + 1;
  if (nextIdx < path.steps.length) {
    path.steps[nextIdx].status = 'available';
    path.currentStep = nextIdx;
  } else {
    path.status = 'completed';
    path.completedAt = new Date();
  }

  path.completionPercentage = Math.round(
    (path.steps.filter(s => s.status === 'completed').length / path.steps.length) * 100
  );

  await path.save();
  return path;
};

/**
 * Get active paths for a student
 */
const getStudentPaths = async (studentId) => {
  return await LearningPath.find({ student: studentId, status: { $in: ['active', 'paused'] } })
    .populate('concept', 'name chapter subject')
    .populate('subject', 'name icon color')
    .sort({ createdAt: -1 });
};

module.exports = { buildLearningPath, advancePathStep, getStudentPaths };
