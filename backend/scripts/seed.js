require('dotenv').config();

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed demo data in production.');
  process.exit(1);
}

const connectDB = require('../config/db');
const User = require('../models/User');
const School = require('../models/School');
const { Class, Subject, Concept } = require('../models/ClassSubjectConcept');
const { Quiz, Question } = require('../models/QuizQuestion');
const { Attempt, Recommendation } = require('../models/AttemptRecommendation');
const Alert = require('../models/Alert');
const { LearningPath, Doubt, ContentResource } = require('../models/LearningPathDoubtContent');

const upsert = (Model, filter, fields) =>
  Model.findOneAndUpdate(filter, { $set: fields }, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
    runValidators: true,
  });

const getOrCreateUser = async (email, fields) => {
  const existing = await User.findOne({ email });
  return existing || User.create({ ...fields, email });
};

async function seed() {
  await connectDB();

  const school = await upsert(School, { udiseCode: '99999999999' }, {
    name: 'ShikshaBridge Demo School',
    district: 'Pune',
    state: 'Maharashtra',
    block: 'Haveli',
    type: 'government',
    medium: 'bilingual',
    board: 'state',
    address: 'Demo address - Pune, Maharashtra',
    principalName: 'Anita Deshmukh',
    isActive: true,
  });

  const classroom = await upsert(Class, { school: school._id, name: 'Class 7 - A' }, {
    grade: 7,
    section: 'A',
    school: school._id,
    academicYear: '2026-27',
    studentCount: 2,
    isActive: true,
  });

  const [maths, science] = await Promise.all([
    upsert(Subject, { name: 'Mathematics', grade: 7 }, {
      name: 'Mathematics',
      code: 'MATH-7',
      grade: 7,
      description: 'Number sense, fractions, and decimals.',
      language: 'en',
      icon: '📐',
      color: '#4F46E5',
      isActive: true,
    }),
    upsert(Subject, { name: 'Science', grade: 7 }, {
      name: 'Science',
      code: 'SCI-7',
      grade: 7,
      description: 'Foundational concepts in life and physical science.',
      language: 'en',
      icon: '🔬',
      color: '#059669',
      isActive: true,
    }),
  ]);

  const [fractions, decimals, photosynthesis] = await Promise.all([
    upsert(Concept, { subject: maths._id, grade: 7, name: 'Equivalent Fractions' }, {
      name: 'Equivalent Fractions',
      nameHindi: 'समतुल्य भिन्न',
      subject: maths._id,
      grade: 7,
      chapter: 'Fractions',
      chapterNumber: 2,
      difficulty: 'basic',
      description: 'Recognise and generate fractions with the same value.',
      tags: ['fractions', 'number-sense'],
      order: 1,
      isActive: true,
    }),
    upsert(Concept, { subject: maths._id, grade: 7, name: 'Adding Decimals' }, {
      name: 'Adding Decimals',
      subject: maths._id,
      grade: 7,
      chapter: 'Decimals',
      chapterNumber: 3,
      difficulty: 'intermediate',
      description: 'Add decimal numbers by aligning place values.',
      tags: ['decimals', 'place-value'],
      order: 1,
      isActive: true,
    }),
    upsert(Concept, { subject: science._id, grade: 7, name: 'Photosynthesis' }, {
      name: 'Photosynthesis',
      nameHindi: 'प्रकाश संश्लेषण',
      subject: science._id,
      grade: 7,
      chapter: 'Nutrition in Plants',
      chapterNumber: 1,
      difficulty: 'basic',
      description: 'Understand how green plants make food using light.',
      tags: ['plants', 'life-science'],
      order: 1,
      isActive: true,
    }),
  ]);

  await getOrCreateUser('admin@shiksha.edu', {
    name: 'Platform Admin',
    password: 'Admin@123',
    role: 'admin',
    isActive: true,
  });
  const principal = await getOrCreateUser('headteacher@shiksha.edu', {
    name: 'Anita Deshmukh',
    password: 'Principal@123',
    role: 'principal',
    school: school._id,
    isActive: true,
  });
  if (principal.role !== 'principal' || principal.school?.toString() !== school._id.toString()) {
    throw new Error('headteacher@shiksha.edu must be a principal account for the demo school');
  }
  if (principal.isActive) await School.findByIdAndUpdate(school._id, { principalName: principal.name });
  const teacher = await getOrCreateUser('priya.sharma@shiksha.edu', {
    name: 'Priya Sharma',
    password: 'Teacher@123',
    role: 'teacher',
    school: school._id,
    subjects: [maths._id, science._id],
    classes: [classroom._id],
    language: 'en',
    isActive: true,
  });
  const arjun = await getOrCreateUser('arjun.patil@shiksha.edu', {
    name: 'Arjun Patil',
    password: 'Student@123',
    role: 'student',
    school: school._id,
    class: classroom._id,
    rollNumber: '7A-01',
    language: 'en',
    guardianName: 'Sunita Patil',
    guardianEmail: 'sunita.patil@example.test',
    streak: 3,
    totalPoints: 120,
    xp: 120,
    isActive: true,
  });
  const meera = await getOrCreateUser('meera.kulkarni@shiksha.edu', {
    name: 'Meera Kulkarni',
    password: 'Student@123',
    role: 'student',
    school: school._id,
    class: classroom._id,
    rollNumber: '7A-02',
    language: 'hi',
    guardianName: 'Rajesh Kulkarni',
    guardianEmail: 'rajesh.kulkarni@example.test',
    streak: 6,
    totalPoints: 340,
    xp: 340,
    isActive: true,
  });

  await Class.findByIdAndUpdate(classroom._id, { classTeacher: teacher._id });

  const questions = await Promise.all([
    upsert(Question, { createdBy: teacher._id, text: 'Which fraction is equivalent to 1/2?' }, {
      text: 'Which fraction is equivalent to 1/2?',
      textHindi: '1/2 के बराबर कौन सा भिन्न है?',
      type: 'mcq',
      options: [
        { label: 'A', text: '2/3', isCorrect: false },
        { label: 'B', text: '3/6', isCorrect: true },
        { label: 'C', text: '2/5', isCorrect: false },
        { label: 'D', text: '4/6', isCorrect: false },
      ],
      explanation: 'Multiply the numerator and denominator of 1/2 by 3.',
      concept: fractions._id,
      subject: maths._id,
      grade: 7,
      difficulty: 'basic',
      marks: 1,
      createdBy: teacher._id,
      isActive: true,
    }),
    upsert(Question, { createdBy: teacher._id, text: 'What is 0.4 + 0.35?' }, {
      text: 'What is 0.4 + 0.35?',
      type: 'mcq',
      options: [
        { label: 'A', text: '0.39', isCorrect: false },
        { label: 'B', text: '0.75', isCorrect: true },
        { label: 'C', text: '0.435', isCorrect: false },
        { label: 'D', text: '4.35', isCorrect: false },
      ],
      explanation: 'Align the decimal places: 0.40 + 0.35 = 0.75.',
      concept: decimals._id,
      subject: maths._id,
      grade: 7,
      difficulty: 'basic',
      marks: 1,
      createdBy: teacher._id,
      isActive: true,
    }),
    upsert(Question, { createdBy: teacher._id, text: 'Which gas do plants take in during photosynthesis?' }, {
      text: 'Which gas do plants take in during photosynthesis?',
      type: 'mcq',
      options: [
        { label: 'A', text: 'Oxygen', isCorrect: false },
        { label: 'B', text: 'Nitrogen', isCorrect: false },
        { label: 'C', text: 'Carbon dioxide', isCorrect: true },
        { label: 'D', text: 'Hydrogen', isCorrect: false },
      ],
      explanation: 'Plants use carbon dioxide, water, and light to make food.',
      concept: photosynthesis._id,
      subject: science._id,
      grade: 7,
      difficulty: 'basic',
      marks: 1,
      createdBy: teacher._id,
      isActive: true,
    }),
  ]);

  const quiz = await upsert(Quiz, { createdBy: teacher._id, title: 'Class 7 - Quick Concept Check' }, {
    title: 'Class 7 - Quick Concept Check',
    description: 'A short demo quiz covering fractions and decimals.',
    type: 'diagnostic',
    subject: maths._id,
    class: classroom._id,
    grade: 7,
    chapter: 'Fractions and Decimals',
    concepts: [fractions._id, decimals._id],
    questions: questions.slice(0, 2).map((question, index) => ({
      question: question._id,
      order: index + 1,
      marks: 1,
    })),
    totalMarks: 2,
    duration: 10,
    difficulty: 'basic',
    assignedClass: classroom._id,
    isPublished: true,
    publishedAt: new Date(),
    createdBy: teacher._id,
    school: school._id,
    isActive: true,
  });

  await Promise.all([
    upsert(Attempt, { student: arjun._id, quiz: quiz._id, attemptNumber: 1 }, {
      student: arjun._id,
      quiz: quiz._id,
      school: school._id,
      class: classroom._id,
      subject: maths._id,
      answers: [
        { question: questions[0]._id, questionText: questions[0].text, questionType: 'mcq', selectedOption: 'A', isCorrect: false, marksAwarded: 0, concept: fractions._id },
        { question: questions[1]._id, questionText: questions[1].text, questionType: 'mcq', selectedOption: 'B', isCorrect: true, marksAwarded: 1, concept: decimals._id },
      ],
      totalMarks: 2,
      marksObtained: 1,
      percentage: 50,
      conceptScores: [
        { concept: fractions._id, conceptName: fractions.name, totalQuestions: 1, correctAnswers: 0, percentage: 0, mastery: 'weak' },
        { concept: decimals._id, conceptName: decimals.name, totalQuestions: 1, correctAnswers: 1, percentage: 100, mastery: 'mastered' },
      ],
      status: 'completed',
      startedAt: new Date(Date.now() - 10 * 60 * 1000),
      completedAt: new Date(),
      timeTaken: 420,
      attemptNumber: 1,
      recommendationGenerated: true,
    }),
    upsert(Attempt, { student: meera._id, quiz: quiz._id, attemptNumber: 1 }, {
      student: meera._id,
      quiz: quiz._id,
      school: school._id,
      class: classroom._id,
      subject: maths._id,
      answers: [
        { question: questions[0]._id, questionText: questions[0].text, questionType: 'mcq', selectedOption: 'B', isCorrect: true, marksAwarded: 1, concept: fractions._id },
        { question: questions[1]._id, questionText: questions[1].text, questionType: 'mcq', selectedOption: 'B', isCorrect: true, marksAwarded: 1, concept: decimals._id },
      ],
      totalMarks: 2,
      marksObtained: 2,
      percentage: 100,
      conceptScores: [
        { concept: fractions._id, conceptName: fractions.name, totalQuestions: 1, correctAnswers: 1, percentage: 100, mastery: 'mastered' },
        { concept: decimals._id, conceptName: decimals.name, totalQuestions: 1, correctAnswers: 1, percentage: 100, mastery: 'mastered' },
      ],
      status: 'completed',
      startedAt: new Date(Date.now() - 8 * 60 * 1000),
      completedAt: new Date(),
      timeTaken: 300,
      attemptNumber: 1,
      recommendationGenerated: true,
    }),
  ]);

  const resource = await upsert(ContentResource, { title: 'Fractions: visual revision', concept: fractions._id }, {
    title: 'Fractions: visual revision',
    titleHindi: 'भिन्न: चित्रों से दोहराएँ',
    type: 'note',
    concept: fractions._id,
    subject: maths._id,
    grade: 7,
    difficulty: 'basic',
    language: 'bilingual',
    content: '# Equivalent fractions\n\nMultiply or divide the numerator and denominator by the same non-zero number. For example, 1/2 = 3/6.',
    contentHindi: '# समतुल्य भिन्न\n\nअंश और हर को एक ही संख्या से गुणा या भाग करने पर समतुल्य भिन्न मिलता है। उदाहरण: 1/2 = 3/6।',
    duration: 5,
    tags: ['fractions', 'revision'],
    createdBy: teacher._id,
    school: school._id,
    isApproved: true,
    isActive: true,
  });

  await Promise.all([
    upsert(Recommendation, { student: arjun._id, concept: fractions._id, rule: 'score_below_40' }, {
      student: arjun._id,
      concept: fractions._id,
      subject: maths._id,
      type: 'remedial_drill',
      priority: 'high',
      rule: 'score_below_40',
      score: 0,
      message: 'Review equivalent fractions, then try a short practice set.',
      messageHindi: 'समतुल्य भिन्नों को दोहराएँ और फिर अभ्यास करें।',
      task: {
        title: 'Review equivalent fractions',
        description: 'Read the revision note and practise identifying equivalent fractions.',
        resourceType: 'reading',
        resourceId: resource._id,
        estimatedMinutes: 10,
      },
      status: 'pending',
      school: school._id,
    }),
    upsert(LearningPath, { student: arjun._id, concept: fractions._id }, {
      student: arjun._id,
      concept: fractions._id,
      subject: maths._id,
      title: 'Build confidence with fractions',
      generatedBy: 'rule',
      steps: [
        { stepNumber: 1, type: 'revise_concept', title: 'Review equivalent fractions', description: 'Use the visual revision note.', resourceId: resource._id, resourceType: 'note', estimatedMinutes: 5, status: 'available', xpReward: 20 },
        { stepNumber: 2, type: 'practice_worksheet', title: 'Practise fractions', description: 'Complete a short practice activity.', estimatedMinutes: 10, status: 'locked', xpReward: 30 },
      ],
      currentStep: 0,
      status: 'active',
      completionPercentage: 0,
      aiSummary: 'A rule-based path created from the demo quiz result.',
    }),
    upsert(Doubt, { student: arjun._id, text: 'How can I tell whether two fractions are equivalent?' }, {
      student: arjun._id,
      teacher: teacher._id,
      subject: maths._id,
      concept: fractions._id,
      school: school._id,
      class: classroom._id,
      text: 'How can I tell whether two fractions are equivalent?',
      textHindi: 'मैं कैसे पहचानूँ कि दो भिन्न समतुल्य हैं?',
      type: 'concept',
      status: 'answered',
      answer: 'Multiply or divide the numerator and denominator by the same non-zero number.',
      answeredBy: teacher._id,
      answeredAt: new Date(),
      isPublic: true,
    }),
    upsert(Alert, { dedupeKey: 'demo-low-score-arjun-fractions' }, {
      teacher: teacher._id,
      student: arjun._id,
      school: school._id,
      class: classroom._id,
      subject: maths._id,
      type: 'low_score',
      priority: 'medium',
      title: 'Fractions may need review',
      message: 'Arjun could use extra practice with equivalent fractions.',
      data: { score: 0, conceptName: fractions.name, conceptId: fractions._id, attemptCount: 1 },
      isRead: false,
      isDismissed: false,
      dedupeKey: 'demo-low-score-arjun-fractions',
    }),
  ]);

  console.log('Demo data is ready.');
  console.log(`School: ${school.name}; class: ${classroom.name}`);
  console.log('Logins: admin@shiksha.edu / Admin@123, headteacher@shiksha.edu / Principal@123');
  console.log('         priya.sharma@shiksha.edu / Teacher@123');
  console.log('         arjun.patil@shiksha.edu / Student@123, meera.kulkarni@shiksha.edu / Student@123');
  console.log('Existing accounts with these emails keep their current passwords.');
}

seed()
  .catch((error) => {
    console.error('Failed to seed demo data:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = require('mongoose');
    await mongoose.disconnect();
  });
