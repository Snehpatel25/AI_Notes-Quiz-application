import asyncHandler from 'express-async-handler';
import QuizResult from '../models/QuizResult.js';

// @desc    Get user quiz history
// @route   GET /api/quizzes/history
// @access  Private
const getQuizHistory = asyncHandler(async (req, res) => {
  const history = await QuizResult.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50); // Limit to last 50 results for performance

  res.json(history);
});

// @desc    Save quiz result
// @route   POST /api/quizzes/save
// @access  Private
const saveQuizResult = asyncHandler(async (req, res) => {
  const {
    topic,
    subject,
    score,
    totalQuestions,
    correctAnswers,
    difficulty,
    timeSpent,
  } = req.body;

  const result = await QuizResult.create({
    user: req.user._id,
    topic,
    subject,
    score,
    totalQuestions,
    correctAnswers,
    difficulty,
    timeSpent,
  });

  res.status(201).json(result);
});

export { getQuizHistory, saveQuizResult };
