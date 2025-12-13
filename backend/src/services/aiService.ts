import groq from '../config/groq.js';

export interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
}

export interface QuizData {
  title: string;
  subject: string;
  gradeLevel: string;
  questions: Question[];
}

// Generate quiz using AI
export const generateQuiz = async (
  subject: string,
  gradeLevel: string,
  topic: string,
  numQuestions: number = 10,
  difficultyDistribution?: { easy: number; medium: number; hard: number }
): Promise<QuizData> => {
  const prompt = `Generate a ${numQuestions}-question quiz on ${topic} for ${gradeLevel} grade level in the subject of ${subject}.

Requirements:
1. Each question should have 4 multiple-choice options
2. Indicate the correct answer (0-indexed)
3. Mark difficulty as easy, medium, or hard
4. Provide a brief explanation for each question
5. Questions should be appropriate for ${gradeLevel} grade level

${difficultyDistribution ? `Difficulty distribution: ${difficultyDistribution.easy} easy, ${difficultyDistribution.medium} medium, ${difficultyDistribution.hard} hard questions.` : 'Mix of easy, medium, and hard questions.'}

Return the response as a JSON object with this structure:
{
  "title": "Quiz title",
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "difficulty": "easy",
      "explanation": "Brief explanation"
    }
  ]
}`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a quiz generator. Always return valid JSON only, no markdown formatting.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'mixtral-8x7b-32768',
      temperature: 0.7,
      max_tokens: 4096,
    });

    const content = completion.choices[0]?.message?.content || '{}';
    const quizData = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));

    return {
      title: quizData.title || `${subject} Quiz - ${topic}`,
      subject,
      gradeLevel,
      questions: quizData.questions || [],
    };
  } catch (error) {
    console.error('Error generating quiz:', error);
    const count = numQuestions || 10;
    const questions: Question[] = Array.from({ length: count }).map((_, i) => ({
      question: `Sample question ${i + 1} on ${topic}`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 0,
      difficulty: (['easy', 'medium', 'hard'] as const)[i % 3],
      explanation: 'This is a mock explanation.',
    }));
    return {
      title: `${subject} Quiz - ${topic}`,
      subject,
      gradeLevel,
      questions,
    };
  }
};

// Generate hint for a question
export const generateHint = async (question: string, subject: string): Promise<string> => {
  const prompt = `Given this question: "${question}" in the subject of ${subject}, provide a helpful hint that guides the student without giving away the answer. Keep it concise (1-2 sentences).`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful tutor. Provide hints that guide students to think about the problem without revealing the answer.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'mixtral-8x7b-32768',
      temperature: 0.7,
      max_tokens: 200,
    });

    return completion.choices[0]?.message?.content || 'Think carefully about the concepts involved.';
  } catch (error) {
    console.error('Error generating hint:', error);
    return 'Think carefully about the concepts involved.';
  }
};

// Generate improvement tips based on mistakes
export const generateImprovementTips = async (
  mistakes: Array<{ question: string; userAnswer: string; correctAnswer: string; explanation?: string }>,
  subject: string
): Promise<string[]> => {
  const mistakesText = mistakes
    .map((m, i) => `${i + 1}. Question: ${m.question}\n   Your answer: ${m.userAnswer}\n   Correct answer: ${m.correctAnswer}${m.explanation ? `\n   Explanation: ${m.explanation}` : ''}`)
    .join('\n\n');

  const prompt = `Based on these mistakes in ${subject}, provide 2 specific and actionable improvement tips. Focus on learning strategies and concepts that need reinforcement.

Mistakes:
${mistakesText}

Provide exactly 2 tips, each on a new line, without numbering.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an educational advisor. Provide specific, actionable improvement tips based on student mistakes.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'mixtral-8x7b-32768',
      temperature: 0.7,
      max_tokens: 500,
    });

    const tips = completion.choices[0]?.message?.content || '';
    return tips.split('\n').filter((tip: string) => tip.trim().length > 0).slice(0, 2);
  } catch (error) {
    console.error('Error generating improvement tips:', error);
    return [
      'Review the concepts you got wrong and practice similar problems.',
      'Take time to understand why the correct answer is correct, not just memorize it.',
    ];
  }
};

// Calculate adaptive difficulty distribution
export const calculateDifficultyDistribution = (
  averageScore: number,
  totalQuizzes: number
): { easy: number; medium: number; hard: number } => {
  const totalQuestions = 10;

  if (totalQuizzes === 0) {
    // First quiz: balanced distribution
    return { easy: 3, medium: 4, hard: 3 };
  }

  if (averageScore >= 80) {
    // High performer: more hard questions
    return { easy: 1, medium: 3, hard: 6 };
  } else if (averageScore >= 60) {
    // Medium performer: balanced
    return { easy: 2, medium: 5, hard: 3 };
  } else {
    // Low performer: more easy questions
    return { easy: 5, medium: 4, hard: 1 };
  }
};





