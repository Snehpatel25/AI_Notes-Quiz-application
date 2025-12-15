import app from '../server.js';
import connectDB from '../config/db.js';

// Vercel Serverless Function Helper
export default async function handler(req, res) {
    // Ensure DB is connected strictly for this invocation (cached if possible)
    await connectDB();

    // Forward request to Express app
    return app(req, res);
}
