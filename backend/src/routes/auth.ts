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
  } catch (error: any) {
    if (error && error.code === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;





