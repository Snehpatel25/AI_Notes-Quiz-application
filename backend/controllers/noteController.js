import asyncHandler from 'express-async-handler';
import Note from '../models/Note.js';

// @desc    Get user notes
// @route   GET /api/notes
// @access  Private
const getNotes = asyncHandler(async (req, res) => {
    const pageSize = 20;
    const page = Number(req.query.pageNumber) || 1;

    // Filter by user AND optional search keyword
    const keyword = req.query.keyword
        ? {
            user: req.user._id,
            title: {
                $regex: req.query.keyword,
                $options: 'i',
            },
        }
        : { user: req.user._id };

    const count = await Note.countDocuments(keyword);
    const notes = await Note.find(keyword)
        .sort({ createdAt: -1 }) // Newest first
        .limit(pageSize)
        .skip(pageSize * (page - 1));

    res.json({ notes, page, pages: Math.ceil(count / pageSize) });
});

// @desc    Create a note
// @route   POST /api/notes
// @access  Private
const createNote = asyncHandler(async (req, res) => {
    const { title, content, tags, folder, aiData } = req.body;

    if (!title) {
        res.status(400);
        throw new Error('Please add a title');
    }

    const note = await Note.create({
        user: req.user._id, // Assign to logged-in user
        title,
        content: content || '', // Allow empty content
        tags,
        folder,
        aiData,
    });

    res.status(201).json(note);
});

// @desc    Update a note
// @route   PUT /api/notes/:id
// @access  Private
const updateNote = asyncHandler(async (req, res) => {
    const note = await Note.findById(req.params.id);

    if (!note) {
        res.status(404);
        throw new Error('Note not found');
    }

    // Check for user ownership
    if (note.user.toString() !== req.user.id) {
        res.status(401);
        throw new Error('User not authorized');
    }

    const updatedNote = await Note.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
    );

    res.json(updatedNote);
});

// @desc    Delete a note
// @route   DELETE /api/notes/:id
// @access  Private
const deleteNote = asyncHandler(async (req, res) => {
    const note = await Note.findById(req.params.id);

    if (!note) {
        res.status(404);
        throw new Error('Note not found');
    }

    // Check for user ownership
    if (note.user.toString() !== req.user.id) {
        res.status(401);
        throw new Error('User not authorized');
    }

    await note.deleteOne();

    res.json({ id: req.params.id });
});

export { getNotes, createNote, updateNote, deleteNote };
