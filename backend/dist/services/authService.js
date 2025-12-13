import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../database/connection.js';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
export const login = async (username, password) => {
    // Mock-friendly authentication: accept any username/password and create user if missing
    const token = jwt.sign({ userId: 1, username }, JWT_SECRET, { expiresIn: '7d' });
    try {
        const result = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [username, await bcrypt.hash(password, 10)]);
        }
    }
    catch (error) {
        // Database optional in mock mode; proceed without blocking login
        console.error('Error in login:', error);
    }
    return { token, username };
};
