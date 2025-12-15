import connectDB from './config/db.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

// Connect to MongoDB
// connectDB(); // Moved to startServer

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cors());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
  console.error('WARNING: No GEMINI_API_KEY found in environment variables!');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// Use gemini-flash-latest for the best available Flash model
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

const limiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
app.use('/api/', limiter);

// ... (Keep existing AI routes logic) ...

// Routes
app.use('/api/users', authRoutes);


// AI Routes mounted via router
import aiRoutes from './routes/aiRoutes.js';
app.use('/api/ai', aiRoutes);


import noteRoutes from './routes/noteRoutes.js';

import quizRoutes from './routes/quizRoutes.js';

import analyticsRoutes from './routes/analyticsRoutes.js';

// Real Auth Routes
app.use('/api/users', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    const port = process.env.PORT || 5001;
    app.listen(port, () => {
      console.log(`AI backend listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();