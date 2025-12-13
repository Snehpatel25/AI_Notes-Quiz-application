import mongoose from 'mongoose';

const noteSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
            index: true, // Critical for performance: Fetching user's notes
        },
        title: {
            type: String,
            required: true,
            index: 'text', // Enable text search on title
        },
        content: {
            type: String,
            default: '', // Allow empty content for new notes
        },
        tags: {
            type: [String],
            index: true, // Enable filtering by tags
        },
        isFavorite: {
            type: Boolean,
            default: false,
        },
        folder: {
            type: String,
            default: 'General',
        },
        aiData: {
            summary: String,
            sentiment: String,
            keywords: [String],
        },
    },
    {
        timestamps: true, // Automatically manage createdAt and updatedAt
    }
);

// Compound index for sorting by date within a user's notes
noteSchema.index({ user: 1, createdAt: -1 });

const Note = mongoose.model('Note', noteSchema);

export default Note;
