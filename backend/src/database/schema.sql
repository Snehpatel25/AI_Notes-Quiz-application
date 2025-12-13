-- Database schema for PlayPower Quiz Application

-- Users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    grade_level VARCHAR(50) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    questions JSONB NOT NULL,
    difficulty_distribution JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quiz Submissions table
CREATE TABLE IF NOT EXISTS quiz_submissions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    answers JSONB NOT NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    percentage_score DECIMAL(5,2) NOT NULL,
    improvement_tips JSONB,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Performance table (for adaptive difficulty)
CREATE TABLE IF NOT EXISTS user_performance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    grade_level VARCHAR(50) NOT NULL,
    total_quizzes INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0,
    difficulty_level VARCHAR(20) DEFAULT 'medium',
    last_quiz_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, subject, grade_level)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_grade_level ON quizzes(grade_level);
CREATE INDEX IF NOT EXISTS idx_quizzes_subject ON quizzes(subject);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON quiz_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_quiz_id ON quiz_submissions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_submissions_completed_at ON quiz_submissions(completed_at);
CREATE INDEX IF NOT EXISTS idx_performance_user_id ON user_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_subject ON user_performance(subject);





