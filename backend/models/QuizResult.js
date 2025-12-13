import mongoose from 'mongoose';

const quizResultSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
            index: true,
        },
        topic: {
            type: String,
            required: true,
        },
        subject: {
            type: String,
            required: true,
        },
        score: {
            type: Number,
            required: true,
        },
        totalQuestions: {
            type: Number,
            required: true,
        },
        correctAnswers: {
            type: Number,
            required: true,
        },
        difficulty: {
            type: String,
            default: 'General',
        },
        timeSpent: {
            type: Number, // in seconds
            default: 0,
        },
        date: {
            type: Date,
            default: Date.now,
            index: true, // For analytics ranges
        },
    },
    {
        timestamps: true,
    }
);

// Index for analytics: Querying performance by subject for a user
quizResultSchema.index({ user: 1, subject: 1 });

const QuizResult = mongoose.model('QuizResult', quizResultSchema);

export default QuizResult;
