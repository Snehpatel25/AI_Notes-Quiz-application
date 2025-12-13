import asyncHandler from 'express-async-handler';
import Note from '../models/Note.js';
import QuizResult from '../models/QuizResult.js';

// @desc    Get analytics dashboard data
// @route   GET /api/analytics
// @access  Private
const getAnalytics = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Parallel execution for performance
    const [
        totalNotes,
        totalQuizzes,
        quizHistory,
        notesTags
    ] = await Promise.all([
        Note.countDocuments({ user: userId }),
        QuizResult.countDocuments({ user: userId }),
        QuizResult.find({ user: userId }).sort({ createdAt: -1 }).limit(50),
        Note.find({ user: userId }).select('tags createdAt updatedAt') // Fetch only necessary fields
    ]);

    // --- Calculate Metrics on Server Side ---

    // 1. Accuracy
    const totalQuestions = quizHistory.reduce((acc, curr) => acc + (curr.totalQuestions || 0), 0);
    const totalCorrect = quizHistory.reduce((acc, curr) => acc + (curr.score || 0), 0);
    const globalAccuracy = totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100).toFixed(1) : 0;

    // 2. Active Subject
    const subjectCounts = {};
    notesTags.forEach(n => {
        (n.tags || []).forEach(t => {
            const s = String(t).toUpperCase();
            subjectCounts[s] = (subjectCounts[s] || 0) + 1;
        });
    });
    quizHistory.forEach(q => {
        const s = (q.subject || 'GENERAL').toUpperCase();
        subjectCounts[s] = (subjectCounts[s] || 0) + 1;
    });
    const activeSubject = Object.keys(subjectCounts).sort((a, b) => subjectCounts[b] - subjectCounts[a])[0] || 'N/A';

    // 3. Streak (Simplified for now, can be optimized with aggregation pipeline later)
    const activityDates = new Set();
    notesTags.forEach(n => activityDates.add(n.createdAt.toISOString().split('T')[0]));
    quizHistory.forEach(q => activityDates.add(q.createdAt.toISOString().split('T')[0]));
    // ... (Streak logic is complex to do purely in DB without aggregation, keeping it simple here or moving logic if needed)
    // For now, let's return the dates and let frontend calc streak, or do it here.
    // Let's do a simple count of unique active days for now as "Study Days"
    const studyDays = activityDates.size;

    res.json({
        metrics: {
            totalNotes,
            totalQuizzes,
            globalAccuracy,
            activeSubject,
            studyDays
        },
        history: quizHistory,
        // We send simplified note data for charts (tags/dates only) to save bandwidth
        notesActivity: notesTags
    });
});

export { getAnalytics };
