import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../database/connection.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const login = async (username: string, password: string) => {
  // Validate against DB if available. If user exists, verify password. If not, create user.
  try {
    const result = await pool.query(
      'SELECT id, password_hash FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      const hash = await bcrypt.hash(password, 10);
      const insert = await pool.query(
        'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
        [username, hash]
      );
      const userId = insert.rows[0].id;
      const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' });
      return { token, username };
    } else {
      const user = result.rows[0];
      if (user.password_hash) {
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) {
          // Invalid credentials
          const err: any = new Error('Invalid credentials');
          err.code = 'INVALID_CREDENTIALS';
          throw err;
        }
      }
      const token = jwt.sign({ userId: user.id || 1, username }, JWT_SECRET, { expiresIn: '7d' });
      return { token, username };
    }
  } catch (error: any) {
    // If DB is unreachable, fall back to mock token generation (preserve prior behavior)
    console.error('Error in login (DB may be unavailable):', error.message || error);
    if (error.code === 'INVALID_CREDENTIALS') throw error;
    const token = jwt.sign({ userId: 1, username }, JWT_SECRET, { expiresIn: '7d' });
    return { token, username };
  }
};





