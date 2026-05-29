const { Recommendation } = require('../models/AttemptRecommendation');
const { Quiz } = require('../models/QuizQuestion');
const mongoose = require('mongoose');

/**
 * RULE-BASED RECOMMENDATION ENGINE
 *
 * Rules:
 *  - Score < 40%  → assign REMEDIAL DRILL (easier version, foundational)
 *  - Score 40–70% → assign CONCEPT PRACTICE (same level)
 *  - Score > 70%  → assign NEXT CONCEPT (advance)
 *
 * Generates per-concept recommendations from an attempt.
 */

const MASTERY_LEVELS = {
  WEAK: 'weak',
  DEVELOPING: 'developing',
  PROFICIENT: 'proficient',
  MASTERED: 'mastered',
};

const getMasteryLevel = (percentage) => {
  if (percentage < 40) return MASTERY_LEVELS.WEAK;
  if (percentage < 70) return MASTERY_LEVELS.DEVELOPING;
  if (percentage < 90) return MASTERY_LEVELS.PROFICIENT;
  return MASTERY_LEVELS.MASTERED;
};

const getRecommendationType = (percentage) => {
  if (percentage < 40) return 'remedial_drill';
  if (percentage <= 70) return 'concept_practice';
  return 'next_concept';
};

const getRule = (percentage) => {
  if (percentage < 40) return 'score_below_40';
  if (percentage <= 70) return 'score_40_to_70';
  return 'score_above_70';
};

const getRecommendationMessage = (percentage, conceptName) => {
  if (percentage < 40) {
    return {
      en: `You need more practice on "${conceptName}". Start with the basics – you can do it! 💪`,
      hi: `"${conceptName}" पर और अभ्यास करें। बुनियादी बातों से शुरू करें – आप कर सकते हैं! 💪`,
    };
  }
  if (percentage <= 70) {
    return {
      en: `Good effort on "${conceptName}"! Practice more to strengthen your understanding. 📚`,
      hi: `"${conceptName}" पर अच्छा प्रयास! समझ को मजबूत करने के लिए और अभ्यास करें। 📚`,
    };
  }
  return {
    en: `Great job on "${conceptName}"! You're ready for the next concept. 🌟`,
    hi: `"${conceptName}" पर शानदार काम! अगले विषय के लिए तैयार हैं। 🌟`,
  };
};

const getTaskTitle = (type, conceptName) => {
  const map = {
    remedial_drill: `Foundational Drill: ${conceptName}`,
    concept_practice: `Practice: ${conceptName}`,
    next_concept: `Advance to Next Topic`,
    revision: `Revision: ${conceptName}`,
  };
  return map[type] || `Practice: ${conceptName}`;
};

/**
 * Generate recommendations from a completed attempt
 * @param {Object} attempt - Populated attempt document
 * @param {Object} student - Student user document
 * @returns {Array} Saved recommendation documents
 */
const generateRecommendations = async (attempt, student) => {
  const recommendations = [];
  const isValidConceptId = (conceptId) => mongoose.Types.ObjectId.isValid(conceptId);

  for (const cs of attempt.conceptScores) {
    const { concept, conceptName, percentage } = cs;
    if (!isValidConceptId(concept)) continue;
    const type = getRecommendationType(percentage);
    const rule = getRule(percentage);
    const msgs = getRecommendationMessage(percentage, conceptName);
    const mastery = getMasteryLevel(percentage);

    // Find a suitable follow-up quiz if available
    let resourceId = null;
    try {
      const difficultyMap = {
        remedial_drill: 'foundational',
        concept_practice: 'basic',
        next_concept: 'intermediate',
      };
      const followUpQuiz = await Quiz.findOne({
        concepts: concept,
        type: type === 'next_concept' ? 'practice' : 'remedial',
        difficulty: difficultyMap[type],
        isPublished: true,
        isActive: true,
      })
        .select('_id')
        .lean();
      if (followUpQuiz) resourceId = followUpQuiz._id;
    } catch (_) {}

    const rec = new Recommendation({
      student: student._id,
      attempt: attempt._id,
      concept,
      subject: attempt.subject,
      school: attempt.school,
      type,
      priority: percentage < 40 ? 'high' : percentage <= 70 ? 'medium' : 'low',
      rule,
      score: percentage,
      message: msgs.en,
      messageHindi: msgs.hi,
      task: {
        title: getTaskTitle(type, conceptName),
        description: msgs.en,
        resourceType: 'quiz',
        resourceId,
        estimatedMinutes: type === 'remedial_drill' ? 10 : 15,
      },
      status: 'pending',
    });

    await rec.save();
    recommendations.push(rec);
  }

  // Also update attempt flag
  attempt.recommendationGenerated = true;
  await attempt.save();

  return recommendations;
};

/**
 * Update ProgressReport mastery for a student/concept
 */
const updateConceptMastery = (conceptMastery, concept, percentage) => {
  const existing = conceptMastery.find(
    (cm) => cm.concept.toString() === concept.toString()
  );
  const mastery = getMasteryLevel(percentage);

  if (existing) {
    existing.attempts += 1;
    existing.lastScore = percentage;
    if (percentage > existing.bestScore) existing.bestScore = percentage;
    existing.mastery = mastery;
    existing.masteryUpdatedAt = new Date();
  } else {
    conceptMastery.push({
      concept,
      attempts: 1,
      bestScore: percentage,
      lastScore: percentage,
      mastery,
      masteryUpdatedAt: new Date(),
    });
  }

  return conceptMastery;
};

/**
 * Award badges based on performance
 */
const checkAndAwardBadges = (student, attempt) => {
  const newBadges = [];

  // First quiz badge
  if (!student.badges.find((b) => b.name === 'First Steps')) {
    newBadges.push({ name: 'First Steps', icon: '🎯', awardedAt: new Date() });
  }

  // Perfect score
  if (attempt.percentage === 100) {
    if (!student.badges.find((b) => b.name === 'Perfect Score')) {
      newBadges.push({ name: 'Perfect Score', icon: '⭐', awardedAt: new Date() });
    }
  }

  // Streak badges
  if (student.streak >= 7 && !student.badges.find((b) => b.name === 'Week Warrior')) {
    newBadges.push({ name: 'Week Warrior', icon: '🔥', awardedAt: new Date() });
  }

  if (student.streak >= 30 && !student.badges.find((b) => b.name === 'Month Master')) {
    newBadges.push({ name: 'Month Master', icon: '🏆', awardedAt: new Date() });
  }

  return newBadges;
};

module.exports = {
  generateRecommendations,
  updateConceptMastery,
  checkAndAwardBadges,
  getMasteryLevel,
};
