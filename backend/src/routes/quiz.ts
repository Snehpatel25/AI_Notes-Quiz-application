import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import {
  createQuiz,
  submitQuiz,
  getQuizHistory,
  getQuizById,
  getHint,
} from '../services/quizService.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Generate new quiz
router.post('/generate', async (req: AuthRequest, res) => {
  try {
    const { subject, gradeLevel, topic, numQuestions } = req.body;

    if (!subject || !gradeLevel || !topic) {
      return res.status(400).json({ error: 'Subject, gradeLevel, and topic are required' });
    }

    const quiz = await createQuiz(
      req.userId!,
      subject,
      gradeLevel,
      topic,
      numQuestions || 10
    );

    res.json(quiz);
  } catch (error: any) {
    console.error('Error generating quiz:', error);
    res.status(500).json({ error: error.message || 'Failed to generate quiz' });
  }
});

// Submit quiz answers
router.post('/submit', async (req: AuthRequest, res) => {
  try {
    const { quizId, answers } = req.body;

    if (!quizId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'Quiz ID and answers array are required' });
    }

    const quiz = await getQuizById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    const result = await submitQuiz({
      quizId,
      userId: req.userId!,
      answers,
      questions: quiz.questions,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ error: error.message || 'Failed to submit quiz' });
  }
});

// Get quiz history with filters
router.get('/history', async (req: AuthRequest, res) => {
  try {
    const filters = {
      subject: req.query.subject as string,
      gradeLevel: req.query.gradeLevel as string,
      minScore: req.query.minScore ? parseInt(req.query.minScore as string) : undefined,
      maxScore: req.query.maxScore ? parseInt(req.query.maxScore as string) : undefined,
      fromDate: req.query.fromDate as string,
      toDate: req.query.toDate as string,
    };

    const history = await getQuizHistory(req.userId!, filters);
    res.json(history);
  } catch (error: any) {
    console.error('Error fetching quiz history:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch quiz history' });
  }
});

// Get specific quiz
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const quiz = await getQuizById(parseInt(req.params.id));
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    res.json(quiz);
  } catch (error: any) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch quiz' });
  }
});

// Get hint for a question
router.post('/hint', async (req: AuthRequest, res) => {
  try {
    const { question, subject } = req.body;

    if (!question || !subject) {
      return res.status(400).json({ error: 'Question and subject are required' });
    }

    const hint = await getHint(question, subject);
    res.json({ hint });
  } catch (error: any) {
    console.error('Error generating hint:', error);
    res.status(500).json({ error: error.message || 'Failed to generate hint' });
  }
});

export default router;





