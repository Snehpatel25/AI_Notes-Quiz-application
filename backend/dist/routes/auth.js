import express from 'express';
import { login } from '../services/authService.js';
const router = express.Router();
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        const result = await login(username, password);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
export default router;
