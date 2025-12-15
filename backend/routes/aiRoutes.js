import express from 'express';
import {
    generateGlossary,
    generateSummary,
    generateTags,
    checkGrammar,
    extractActions,
    analyzeSentiment,
    chatWithNote,
    generateQuiz,
    getQuizHint
} from '../controllers/aiController.js';

const router = express.Router();

router.post('/glossary', generateGlossary);
router.post('/summary', generateSummary);
router.post('/tags', generateTags);
router.post('/grammar', checkGrammar);
router.post('/actions', extractActions);
router.post('/sentiment', analyzeSentiment);
router.post('/chat', chatWithNote);
router.post('/quiz/generate', generateQuiz);
router.post('/quiz/hint', getQuizHint);

export default router;
