import React, { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../../config/api';
import './Login.css';

import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Login = ({ onLogin, onBack, onSwitchToSignup }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/users/login', {
        username,
        password,
      });

      onLogin(response.data.token, response.data.username);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="cyber-grid-bg"></div>

      <motion.div
        className="login-box glass-panel"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="login-title text-gradient">CYBER<span className="neon-text">NOTES</span></h1>
          <p className="login-subtitle">SECURE NEURAL INTERFACE</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="login-form">
          <motion.div
            className="form-group"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <label htmlFor="username">OPERATOR ID</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="ENTER ID..."
              autoComplete="off"
            />
          </motion.div>

          <motion.div
            className="form-group"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{ position: 'relative' }}
          >
            <label htmlFor="password">ACCESS CODE</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="ENTER CODE..."
                style={{ width: '100%', paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '1.2rem',
                  opacity: 0.7
                }}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </motion.div>

          {error && (
            <motion.div
              className="error-message"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              ⚠ {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            className="btn-cyber login-button"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {loading ? 'INITIALIZING...' : 'INITIATE LINK'}
          </motion.button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <motion.button
            className="back-link"
            onClick={onSwitchToSignup}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-accent)',
              cursor: 'pointer',
              fontFamily: 'Fira Code, monospace',
              fontSize: '0.8rem'
            }}
          >
            [ NEW OPERATOR? REGISTER ]
          </motion.button>

          <motion.button
            className="back-link"
            onClick={onBack}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontFamily: 'Fira Code, monospace',
              fontSize: '0.8rem'
            }}
          >
            [ ← RETURN TO GATEWAY ]
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;

