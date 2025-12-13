import pool from '../database/connection.js';
import { generateQuiz, generateHint, generateImprovementTips, calculateDifficultyDistribution } from './aiService.js';

const USE_MOCK_DB = !process.env.DATABASE_URL || process.env.DB_MODE === 'mock';
let mockQuizId = 1;
let mockSubmissionId = 1;
const mockQuizzes: any[] = [];
const mockSubmissions: any[] = [];
const mockPerformance: Record<string, { total_quizzes: number; average_score: number; last_quiz_date?: string }> = {};
import { Question } from './aiService';

export interface QuizSubmission {
  quizId: number;
  userId: number;
  answers: number[];
  questions: Question[];
}

export const createQuiz = async (
  userId: number,
  subject: string,
  gradeLevel: string,
  topic: string,
  numQuestions: number = 10
) => {
  // Get user performance for adaptive difficulty
  let difficultyDistribution;
  if (USE_MOCK_DB) {
    const key = `${userId}:${subject}:${gradeLevel}`;
    const perf = mockPerformance[key];
    difficultyDistribution = perf
      ? calculateDifficultyDistribution(perf.average_score, perf.total_quizzes)
      : calculateDifficultyDistribution(0, 0);
  } else {
    const performanceResult = await pool.query(
      'SELECT * FROM user_performance WHERE user_id = $1 AND subject = $2 AND grade_level = $3',
      [userId, subject, gradeLevel]
    );
    if (performanceResult.rows.length > 0) {
      const performance = performanceResult.rows[0];
      difficultyDistribution = calculateDifficultyDistribution(
        parseFloat(performance.average_score),
        performance.total_quizzes
      );
    } else {
      difficultyDistribution = calculateDifficultyDistribution(0, 0);
    }
  }

  // Generate quiz using AI
  const quizData = await generateQuiz(subject, gradeLevel, topic, numQuestions, difficultyDistribution);

  // Save quiz to database
  if (USE_MOCK_DB) {
    const id = mockQuizId++;
    mockQuizzes.push({ id, user_id: userId, title: quizData.title, grade_level: gradeLevel, subject, questions: quizData.questions, difficulty_distribution: difficultyDistribution });
    return { id, title: quizData.title, subject: quizData.subject, gradeLevel: quizData.gradeLevel, questions: quizData.questions, difficultyDistribution };
  } else {
    const result = await pool.query(
      `INSERT INTO quizzes (user_id, title, grade_level, subject, questions, difficulty_distribution)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        quizData.title,
        gradeLevel,
        subject,
        JSON.stringify(quizData.questions),
        JSON.stringify(difficultyDistribution),
      ]
    );
    return {
      id: result.rows[0].id,
      title: quizData.title,
      subject: quizData.subject,
      gradeLevel: quizData.gradeLevel,
      questions: quizData.questions,
      difficultyDistribution,
    };
  }
};

export const submitQuiz = async (submission: QuizSubmission) => {
  // Get quiz questions
  let questions: Question[];
  if (USE_MOCK_DB) {
    const quiz = mockQuizzes.find((q) => q.id === submission.quizId);
    if (!quiz) throw new Error('Quiz not found');
    questions = quiz.questions;
  } else {
    const quizResult = await pool.query('SELECT questions FROM quizzes WHERE id = $1', [submission.quizId]);
    if (quizResult.rows.length === 0) {
      throw new Error('Quiz not found');
    }
    questions = quizResult.rows[0].questions;
  }

  // Calculate score
  let score = 0;
  const mistakes: Array<{ question: string; userAnswer: string; correctAnswer: string; explanation?: string }> = [];

  questions.forEach((question, index) => {
    if (submission.answers[index] === question.correctAnswer) {
      score++;
    } else {
      mistakes.push({
        question: question.question,
        userAnswer: question.options[submission.answers[index]] || 'No answer',
        correctAnswer: question.options[question.correctAnswer],
        explanation: question.explanation,
      });
    }
  });

  const totalQuestions = questions.length;
  const percentageScore = (score / totalQuestions) * 100;

  // Generate improvement tips
  let subjectForTips = 'General';
  if (USE_MOCK_DB) {
    const quiz = mockQuizzes.find((q) => q.id === submission.quizId);
    subjectForTips = quiz?.subject || 'General';
  } else {
    const sRes = await pool.query('SELECT subject FROM quizzes WHERE id = $1', [submission.quizId]);
    subjectForTips = sRes.rows[0]?.subject || 'General';
  }
  const improvementTips = mistakes.length > 0
    ? await generateImprovementTips(mistakes, subjectForTips)
    : [];

  // Save submission
  let submissionRow: any;
  if (USE_MOCK_DB) {
    const id = mockSubmissionId++;
    submissionRow = { id, quiz_id: submission.quizId, user_id: submission.userId, answers: submission.answers, score, total_questions: totalQuestions, percentage_score: percentageScore, improvement_tips: improvementTips };
    mockSubmissions.push(submissionRow);
  } else {
    const submissionResult = await pool.query(
      `INSERT INTO quiz_submissions (quiz_id, user_id, answers, score, total_questions, percentage_score, improvement_tips)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        submission.quizId,
        submission.userId,
        JSON.stringify(submission.answers),
        score,
        totalQuestions,
        percentageScore,
        JSON.stringify(improvementTips),
      ]
    );
    submissionRow = submissionResult.rows[0];
  }

  // Update user performance
  if (USE_MOCK_DB) {
    const quiz = mockQuizzes.find((q) => q.id === submission.quizId);
    const key = `${submission.userId}:${quiz.subject}:${quiz.grade_level}`;
    const prev = mockPerformance[key];
    const total_quizzes = (prev?.total_quizzes || 0) + 1;
    const total_score = (prev ? prev.average_score * prev.total_quizzes : 0) + score;
    const average_score = total_score / total_quizzes;
    mockPerformance[key] = { total_quizzes, average_score, last_quiz_date: new Date().toISOString() };
  } else {
    const quizResult2 = await pool.query('SELECT subject, grade_level FROM quizzes WHERE id = $1', [submission.quizId]);
    const { subject, grade_level } = quizResult2.rows[0];
    await pool.query(
      `INSERT INTO user_performance (user_id, subject, grade_level, total_quizzes, total_score, average_score, difficulty_level, last_quiz_date)
       VALUES ($1, $2, $3, 1, $4, $5, $6, NOW())
       ON CONFLICT (user_id, subject, grade_level)
       DO UPDATE SET
         total_quizzes = user_performance.total_quizzes + 1,
         total_score = user_performance.total_score + $4,
         average_score = (user_performance.total_score + $4) / (user_performance.total_quizzes + 1),
         last_quiz_date = NOW(),
         updated_at = NOW()`,
      [submission.userId, subject, grade_level, score, percentageScore, percentageScore >= 80 ? 'hard' : percentageScore >= 60 ? 'medium' : 'easy']
    );
  }

  return {
    id: submissionRow.id,
    score,
    totalQuestions,
    percentageScore: parseFloat(percentageScore.toFixed(2)),
    improvementTips,
    mistakes,
  };
};

export const getQuizHistory = async (
  userId: number,
  filters: {
    subject?: string;
    gradeLevel?: string;
    minScore?: number;
    maxScore?: number;
    fromDate?: string;
    toDate?: string;
  }
) => {
  if (USE_MOCK_DB) {
    let rows = mockSubmissions
      .filter((s) => s.user_id === userId)
      .map((s) => {
        const q = mockQuizzes.find((q) => q.id === s.quiz_id);
        return {
          ...s,
          title: q.title,
          subject: q.subject,
          grade_level: q.grade_level,
          questions: q.questions,
          completed_at: new Date().toISOString(),
        };
      });
    if (filters.subject) rows = rows.filter((r) => r.subject === filters.subject);
    if (filters.gradeLevel) rows = rows.filter((r) => r.grade_level === filters.gradeLevel);
    if (filters.minScore !== undefined) rows = rows.filter((r) => r.percentage_score >= filters.minScore!);
    if (filters.maxScore !== undefined) rows = rows.filter((r) => r.percentage_score <= filters.maxScore!);
    if (filters.fromDate) rows = rows.filter((r) => new Date(r.completed_at) >= new Date(filters.fromDate!));
    if (filters.toDate) rows = rows.filter((r) => new Date(r.completed_at) <= new Date(filters.toDate!));
    return rows.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
  } else {
    let query = `
      SELECT 
        qs.*,
        q.title,
        q.subject,
        q.grade_level,
        q.questions
      FROM quiz_submissions qs
      JOIN quizzes q ON qs.quiz_id = q.id
      WHERE qs.user_id = $1
    `;
    const params: any[] = [userId];
    let paramIndex = 2;
    if (filters.subject) { query += ` AND q.subject = $${paramIndex}`; params.push(filters.subject); paramIndex++; }
    if (filters.gradeLevel) { query += ` AND q.grade_level = $${paramIndex}`; params.push(filters.gradeLevel); paramIndex++; }
    if (filters.minScore !== undefined) { query += ` AND qs.percentage_score >= $${paramIndex}`; params.push(filters.minScore); paramIndex++; }
    if (filters.maxScore !== undefined) { query += ` AND qs.percentage_score <= $${paramIndex}`; params.push(filters.maxScore); paramIndex++; }
    if (filters.fromDate) { query += ` AND qs.completed_at >= $${paramIndex}`; params.push(filters.fromDate); paramIndex++; }
    if (filters.toDate) { query += ` AND qs.completed_at <= $${paramIndex}`; params.push(filters.toDate); paramIndex++; }
    query += ` ORDER BY qs.completed_at DESC`;
    const result = await pool.query(query, params);
    return result.rows;
  }
};

export const getQuizById = async (quizId: number) => {
  if (USE_MOCK_DB) {
    return mockQuizzes.find((q) => q.id === quizId);
  }
  const result = await pool.query('SELECT * FROM quizzes WHERE id = $1', [quizId]);
  return result.rows[0];
};

export const getHint = async (question: string, subject: string): Promise<string> => {
  return await generateHint(question, subject);
};





