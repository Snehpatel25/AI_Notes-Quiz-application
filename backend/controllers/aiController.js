import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
    console.error('WARNING: No GEMINI_API_KEY found in environment variables!');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// Use verified working model
const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

// Helper to strip markdown fences
const stripFences = (text) => (text || '').replace(/```json\n?|```/g, '').trim();

// Helper to parse JSON safely
const parseJsonSafe = (text, fallback) => {
    try {
        const t = stripFences(text);
        // Find the first '[' or '{' to ensure we capture the JSON part
        const jsonStart = t.search(/[\{\[]/);
        const jsonEnd = t.lastIndexOf(/[\}\]]/) + 1;
        if (jsonStart === -1 || jsonEnd === 0) return JSON.parse(t);
        const jsonStr = t.substring(jsonStart, jsonEnd);
        return JSON.parse(jsonStr);
    } catch (e) {
        console.warn('JSON Parse Error:', e.message);
        return fallback;
    }
};

// Helper for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const callGemini = async (systemPrompt, userPrompt, { temperature = 0.2, maxTokens = 1000, jsonMode = true } = {}) => {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            const config = {
                temperature,
                maxOutputTokens: maxTokens,
            };
            if (jsonMode) config.responseMimeType = "application/json";

            const result = await model.generateContent({
                contents: [
                    { role: 'model', parts: [{ text: systemPrompt }] },
                    { role: 'user', parts: [{ text: userPrompt }] }
                ],
                generationConfig: config
            });

            const response = await result.response;
            return response.text() || '';
        } catch (err) {
            attempt++;

            // Extract wait time if available, otherwise default exponential
            let waitTime = attempt * 2000;
            if (err.message && err.message.match(/retry in (\d+(\.\d+)?)s/)) {
                const seconds = parseFloat(err.message.match(/retry in (\d+(\.\d+)?)s/)[1]);
                waitTime = (seconds + 1) * 1000; // Wait slightly longer than requested
            }

            if ((err.status === 429 || err.message.includes('429') || err.status === 503) && attempt < maxRetries) {
                console.warn(`Gemini Rate Limit. Retrying in ${waitTime / 1000}s...`);
                await delay(waitTime);
                continue;
            }

            // If it's the last attempt, return a fallback instead of throwing to avoid 500s
            if (attempt === maxRetries) {
                console.error("Gemini Quota Exceeded after retries.");
                throw new Error("QUOTA_EXCEEDED");
            }
            throw err;
        }
    }
};

// Mock Data
const MOCK_DATA = {
    glossary: [
        { term: 'Rate Limit Hit', definition: 'The AI service is currently busy. Please try again in 1-2 minutes.' }
    ],
    summary: '⚠️ AI Service is currently experiencing high traffic (Rate Limit Reached). Please wait a moment and try again.',
    tags: [],
    grammar: [],
    actions: [],
    sentiment: 'Neutral',
    chat: 'I cannot respond right now due to high traffic.'
};

export const generateGlossary = async (req, res) => {
    try {
        const { content } = req.body || {};
        if (!content || !content.trim()) return res.json([]);

        const systemPrompt = `You are a helper that extracts specific glossary terms from text.
    Task: Identify key technical terms, concepts, or entities in the text.
    Output: A JSON array of objects, each having "term" (<string>) and "definition" (<string>).
    Constraint: Definitions must be brief (under 15 words) and contextual to the text.
    Limit: Max 8 terms.`;

        const userPrompt = `Extract glossary terms from this text:\n\n${content}`;

        const text = await callGemini(systemPrompt, userPrompt, { temperature: 0.1, maxTokens: 800 });
        const parsed = parseJsonSafe(text, []);

        // Validation
        const normalized = Array.isArray(parsed)
            ? parsed.filter(x => x && x.term && x.definition && typeof x.term === 'string')
            : [];

        res.json(normalized);
    } catch (err) {
        if (err.message === 'QUOTA_EXCEEDED') {
            return res.json(MOCK_DATA.glossary);
        }
        console.error('Glossary generation failed:', err.message);
        res.json(MOCK_DATA.glossary);
    }
};

export const generateSummary = async (req, res) => {
    try {
        const { content } = req.body || {};
        if (!content || !content.trim()) return res.json({ summary: '' });

        // Use callGemini with jsonMode: false for summary
        const text = await callGemini(
            `Summarize this text in 2 sentences. Return plain text.`,
            content,
            { temperature: 0.2, maxTokens: 400, jsonMode: false }
        );

        res.json({ summary: text ? text.trim() : '' });
    } catch (err) {
        if (err.message === 'QUOTA_EXCEEDED') {
            return res.json({ summary: MOCK_DATA.summary });
        }
        console.error('Summary generation failed:', err.message);
        res.json({ summary: MOCK_DATA.summary });
    }
};

export const generateTags = async (req, res) => {
    try {
        const { content } = req.body || {};
        if (!content || !content.trim()) return res.json([]);

        const systemPrompt = `Generate 5 relevant tags for the text. JSON Array of strings only.`;
        const userPrompt = `Context:\n${content}`;

        const text = await callGemini(systemPrompt, userPrompt, { temperature: 0.2, maxTokens: 200 });
        const parsed = parseJsonSafe(text, []);
        res.json(Array.isArray(parsed) ? parsed : []);
    } catch (err) {
        res.json(MOCK_DATA.tags);
    }
};

export const checkGrammar = async (req, res) => {
    try {
        const { content } = req.body || {};
        if (!content || !content.trim()) return res.json([]);

        const systemPrompt = `Identify significant grammar/spelling errors. Return JSON array of objects { "text": "wrong text", "suggestion": "correction" }. Return empty array if valid.`;
        const userPrompt = `Text to check:\n${content}`;

        const text = await callGemini(systemPrompt, userPrompt, { temperature: 0.1 });
        const parsed = parseJsonSafe(text, []);
        res.json(Array.isArray(parsed) ? parsed : []);
    } catch (err) {
        res.json(MOCK_DATA.grammar);
    }
};

export const extractActions = async (req, res) => {
    try {
        const { content } = req.body || {};
        if (!content || !content.trim()) return res.json([]);

        const systemPrompt = `Extract actionable tasks from the text. Return JSON array of strings.`;
        const userPrompt = `Text:\n${content}`;

        const text = await callGemini(systemPrompt, userPrompt, { temperature: 0.1 });
        const parsed = parseJsonSafe(text, []);
        res.json(Array.isArray(parsed) ? parsed : []);
    } catch (err) {
        res.json(MOCK_DATA.actions);
    }
};

export const analyzeSentiment = async (req, res) => {
    try {
        const { content } = req.body || {};

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: `Analyze sentiment of this text. Return ONLY one word: Positive, Negative, or Neutral.\n\n${content}` }] }]
        });
        const text = result.response.text();
        res.json({ sentiment: text ? text.trim() : 'Neutral' });
    } catch (err) {
        res.json({ sentiment: 'Neutral' });
    }
};

export const chatWithNote = async (req, res) => {
    try {
        const { content, query } = req.body || {};
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: `Context: ${content}\n\nUser Question: ${query}\n\nAnswer:` }] }]
        });
        res.json({ response: result.response.text() });
    } catch (err) {
        res.json({ response: "AI unavailable." });
    }
};

export const generateQuiz = async (req, res) => {
    try {
        const { topic, subject, numQuestions, gradeLevel } = req.body;
        const prompt = `Create a ${numQuestions || 5}-question multiple choice quiz on ${topic} (${subject}, ${gradeLevel}). 
        Output JSON object: { "title": "...", "questions": [ { "question": "...", "options": ["A","B","C","D"], "correctAnswer": 0, "hint": "..." } ] }`;

        const text = await callGemini(prompt, "", { temperature: 0.7 });
        const parsed = parseJsonSafe(text, null);
        if (!parsed) throw new Error("Failed to parse quiz");
        res.json(parsed);
    } catch (err) {
        // Fallback or error
        res.json({ title: "Error", questions: [] });
    }
};

export const getQuizHint = async (req, res) => {
    try {
        const { question } = req.body;
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: `Give a hint for this question without revealing the answer: "${question}"` }] }]
        });
        res.json({ hint: result.response.text().trim() });
    } catch (err) {
        res.json({ hint: "No hint available" });
    }
};
