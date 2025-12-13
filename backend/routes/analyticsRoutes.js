import express from 'express';
const router = express.Router();
import { getAnalytics } from '../controllers/analyticsController.js';
import { protect } from '../middleware/authMiddleware.js';

router.get('/', protect, getAnalytics);

export default router;
