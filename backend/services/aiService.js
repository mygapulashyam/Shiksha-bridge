const OpenAI = require('openai');

// NVIDIA NIM uses the OpenAI-compatible API
const client = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY || 'missing-key',
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct';

/**
 * ─── Feature 1: AI Learning Gap Analyzer ─────────────────────────────────────
 * After every quiz, generate a human-friendly summary of weak areas + action plan
 */
const analyzeLearningGaps = async (attemptData) => {
  const { studentName, quizTitle, percentage, conceptScores, subject, grade } = attemptData;

  const weakConcepts = conceptScores.filter(c => c.percentage < 70);
  const strongConcepts = conceptScores.filter(c => c.percentage >= 70);

  if (!process.env.NVIDIA_API_KEY) {
    return generateRuleBasedAnalysis(attemptData);
  }

  try {
    const prompt = `You are ShikshaBridge, an AI educational assistant for Indian school students (Classes 6–10).

Student: ${studentName}
Subject: ${subject} (Grade/Class ${grade})
Quiz: "${quizTitle}"
Overall Score: ${percentage}%

Concept Performance:
${conceptScores.map(c => `- ${c.conceptName}: ${c.percentage}% (${c.mastery})`).join('\n')}

Write a SHORT, encouraging learning gap analysis (3–4 sentences max) for the teacher dashboard:
1. Identify the 1–2 biggest weak areas with specific concept names
2. Explain WHY this might be happening (foundational gap, confusion between similar concepts, etc.)
3. Recommend exactly 3 concrete next steps (e.g. specific drill types)

Be warm, specific, and actionable. Mention Hindi if relevant for Indian students.
Write in plain English. No markdown headers. No bullet points in the output — just flowing sentences.`;

    const completion = await client.chat.completions.create({
      model: NVIDIA_MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    return {
      summary: completion.choices[0].message.content.trim(),
      generatedBy: 'ai',
      weakConceptCount: weakConcepts.length,
      strongConceptCount: strongConcepts.length,
    };
  } catch (err) {
    console.error('NVIDIA AI analyzer error, falling back to rule-based:', err.message);
    return generateRuleBasedAnalysis(attemptData);
  }
};

const generateRuleBasedAnalysis = (attemptData) => {
  const { studentName, percentage, conceptScores, subject } = attemptData;
  const weak = conceptScores.filter(c => c.percentage < 40);
  const developing = conceptScores.filter(c => c.percentage >= 40 && c.percentage < 70);
  const strong = conceptScores.filter(c => c.percentage >= 70);

  let summary = '';
  if (percentage < 40) {
    const names = weak.map(c => c.conceptName).slice(0, 2).join(' and ');
    summary = `${studentName} is struggling with foundational concepts in ${subject}, particularly ${names || 'core topics'}. ` +
      `The low scores suggest gaps in basic understanding that need immediate attention. ` +
      `Recommend starting with 3 foundational drills on ${weak[0]?.conceptName || 'the weakest concept'}, followed by guided practice with visual examples, then a short re-diagnostic quiz.`;
  } else if (percentage < 70) {
    const names = developing.map(c => c.conceptName).slice(0, 2).join(' and ');
    summary = `${studentName} shows partial understanding in ${subject}, with developing grasp of ${names || 'several concepts'}. ` +
      `The student understands basics but makes errors in application. ` +
      `Recommend concept-level practice exercises for ${names || 'weak areas'}, reviewing worked examples, then attempting the diagnostic again to measure improvement.`;
  } else {
    const strongNames = strong.map(c => c.conceptName).slice(0, 2).join(' and ');
    summary = `${studentName} demonstrates strong understanding of ${subject}, excelling in ${strongNames || 'most concepts'}. ` +
      `The student is ready for more challenging material. ` +
      `Recommend unlocking the next concept in the learning path, attempting an advanced-level quiz, and optionally helping classmates who are struggling.`;
  }

  return {
    summary,
    generatedBy: 'rule',
    weakConceptCount: weak.length,
    strongConceptCount: strong.length,
  };
};

/**
 * ─── Feature 4: AI Quiz Generator ────────────────────────────────────────────
 * Generate quiz questions from class/subject/chapter/difficulty/language spec
 */
const generateQuizQuestions = async (spec) => {
  const { grade, subject, chapter, difficulty, count = 5, language = 'en', conceptId, conceptName } = spec;

  if (!process.env.NVIDIA_API_KEY) {
    return { error: 'NVIDIA_API_KEY not configured', questions: [] };
  }

  const langInstruction = language === 'hi'
    ? 'Write questions in Hindi (Devanagari script). Put English translation in brackets.'
    : language === 'gu'
    ? 'Write questions in Gujarati. Put English translation in brackets.'
    : language === 'te'
    ? 'Write questions in Telugu. Put English translation in brackets.'
    : 'Write questions in English.';

  const difficultyGuide = {
    foundational: 'very basic recall and identification questions suitable for students who are just learning the concept',
    basic: 'straightforward application questions requiring direct use of the concept',
    intermediate: 'multi-step problems requiring analysis and understanding',
    advanced: 'complex, real-world application and higher-order thinking questions',
  };

  const prompt = `You are an expert Indian school curriculum teacher creating quiz questions for ShikshaBridge.

Spec:
- Class/Grade: ${grade}
- Subject: ${subject}
- Chapter/Topic: ${chapter}
- Concept: ${conceptName || chapter}
- Difficulty: ${difficulty} (${difficultyGuide[difficulty] || difficultyGuide.basic})
- Number of questions: ${count}
- Language: ${langInstruction}

Generate exactly ${count} multiple-choice questions (MCQ) following this EXACT JSON format. Respond ONLY with valid JSON, no other text:

{
  "questions": [
    {
      "text": "Question text here",
      "textHindi": "Hindi translation if language is hi, else empty string",
      "type": "mcq",
      "difficulty": "${difficulty}",
      "marks": 1,
      "options": [
        {"label": "A", "text": "Option A text", "isCorrect": false},
        {"label": "B", "text": "Option B text", "isCorrect": true},
        {"label": "C", "text": "Option C text", "isCorrect": false},
        {"label": "D", "text": "Option D text", "isCorrect": false}
      ],
      "explanation": "Brief explanation of why the correct answer is correct",
      "explanationHindi": "Hindi explanation if language is hi, else empty string",
      "tags": ["relevant", "tags"]
    }
  ]
}

Rules:
- Exactly ONE option must have "isCorrect": true per question
- Questions must match the Indian NCERT curriculum for Class ${grade}
- Make distractors (wrong options) plausible but clearly wrong
- Explanations should be educational and brief (1–2 sentences)
- For maths: include numerical calculations
- For English: focus on grammar, comprehension, or vocabulary as appropriate
- Vary question types within MCQ format (direct recall, fill-blank style, scenario-based)`;

  try {
    const completion = await client.chat.completions.create({
      model: NVIDIA_MODEL,
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    });

    const raw = completion.choices[0].message.content.trim();
    const jsonStr = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    // Validate and clean each generated question
    const validQuestions = [];
    for (const q of (parsed.questions || [])) {
      if (!q.text?.trim()) continue;
      if (!Array.isArray(q.options) || q.options.length < 2) continue;

      // Filter out options with empty text
      const cleanOptions = q.options.filter(o => o.text && o.text.trim().length > 0);
      if (cleanOptions.length < 2) continue;

      const correctCount = cleanOptions.filter(o => o.isCorrect === true).length;
      if (correctCount !== 1) {
        // If none is marked correct, default first option to correct; if multiple, keep only the first
        let foundFirst = false;
        cleanOptions.forEach(o => {
          if (correctCount === 0 && !foundFirst) {
            o.isCorrect = true;
            foundFirst = true;
          } else if (o.isCorrect && !foundFirst) {
            foundFirst = true;
          } else {
            o.isCorrect = false;
          }
        });
      }

      validQuestions.push({
        ...q,
        options: cleanOptions,
        concept: (conceptId === '' || conceptId === null) ? undefined : conceptId,
        grade,
      });
    }

    return { questions: validQuestions, generatedBy: 'ai', model: NVIDIA_MODEL };
  } catch (err) {
    console.error('NVIDIA AI quiz generator error:', err.message);
    return { error: err.message, questions: [] };
  }
};

/**
 * ─── Feature 6: Parent Report AI Summary ────────────────────────────────────
 * Generate teacher suggestion text for parent PDF report
 */
const generateParentReportSummary = async (reportData) => {
  const { studentName, avgScore, weakConcepts, strongConcepts, totalAttempts, improvement, subject } = reportData;

  if (!process.env.NVIDIA_API_KEY) {
    return generateRuleBasedParentSummary(reportData);
  }

  try {
    const prompt = `Write a brief, encouraging parent/guardian report summary for an Indian school student.

Student: ${studentName}
Subject: ${subject}
Average Score: ${avgScore}%
Total Quizzes Completed: ${totalAttempts}
Score Improvement: ${improvement > 0 ? '+' : ''}${improvement}%
Strong Areas: ${strongConcepts?.slice(0, 3).join(', ') || 'Building foundation'}
Needs Practice: ${weakConcepts?.slice(0, 3).join(', ') || 'Consistent effort needed'}

Write 2 short paragraphs (3 sentences each) for parents:
Paragraph 1: Current performance summary — warm, honest, specific
Paragraph 2: What parents can do at home to support learning — practical, actionable

Write in simple English that Indian parents can easily understand. No jargon. Be encouraging.`;

    const completion = await client.chat.completions.create({
      model: NVIDIA_MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    return { summary: completion.choices[0].message.content.trim(), generatedBy: 'ai' };
  } catch (err) {
    console.error('NVIDIA AI parent report error, falling back:', err.message);
    return generateRuleBasedParentSummary(reportData);
  }
};

const generateRuleBasedParentSummary = ({ studentName, avgScore, weakConcepts, improvement }) => {
  const trend = improvement > 5 ? 'showing great improvement' : improvement > 0 ? 'making steady progress' : 'working to improve';
  const summary = `${studentName} is ${trend} in their studies, with an average score of ${avgScore}%. ` +
    `${weakConcepts?.length > 0 ? `Areas like ${weakConcepts.slice(0, 2).join(' and ')} need extra attention at home.` : 'They are performing well across most topics.'} ` +
    `Regular practice of 15–20 minutes daily will help reinforce what is being learned in class.\n\n` +
    `You can support your child by asking them to explain what they learned each day, encouraging them to re-attempt any quiz they scored below 70% on, ` +
    `and making sure they complete their assigned practice tasks on ShikshaBridge. ` +
    `Consistent effort and encouragement at home goes a long way!`;
  return { summary, generatedBy: 'rule' };
};

module.exports = {
  analyzeLearningGaps,
  generateQuizQuestions,
  generateParentReportSummary,
};
