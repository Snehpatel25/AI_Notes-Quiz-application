import express from 'express';
const router = express.Router();
import { authUser, registerUser } from '../controllers/authController.js';

router.post('/signup', registerUser);
router.post('/login', authUser);

export default router;
