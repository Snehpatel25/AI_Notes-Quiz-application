import express from 'express';
const router = express.Router();
import { getQuizHistory, saveQuizResult } from '../controllers/quizController.js';
import { protect } from '../middleware/authMiddleware.js';

router.get('/history', protect, getQuizHistory);
router.post('/save', protect, saveQuizResult);

export default router;
