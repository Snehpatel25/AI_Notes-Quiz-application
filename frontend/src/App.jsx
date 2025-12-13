import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';
import NotesApp from './components/NotesApp/NotesApp';
import QuizApp from './components/QuizApp/QuizApp';
import AnalyticsDashboard from './components/AnalyticsDashboard/AnalyticsDashboard';
import Login from './components/Auth/Login';
import LandingPage from './components/LandingPage/LandingPage';

import Signup from './components/Auth/Signup';

function App() {
  // Enforce "Not Logged In" state on initial load (User Request)
  const [token, setToken] = useState(null);
  const [currentView, setCurrentView] = useState('landing');
  const [username, setUsername] = useState(null);

  useEffect(() => {
    if (token && (currentView === 'login' || currentView === 'signup')) {
      handleViewChange('notes');
    }
  }, [token, currentView]);

  // ... (Keep existing useEffect for popstate)

  const handleViewChange = (view) => {
    setCurrentView(view);
    localStorage.setItem('currentView', view);
    window.history.pushState({ view }, '', `/${view === 'landing' ? '' : view}`);
  };

  const handleLogin = (newToken, newUsername) => {
    setToken(newToken);
    setUsername(newUsername);
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', newUsername);
    handleViewChange('notes');
  };

  const handleLogout = () => {
    setToken(null);
    setUsername(null);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('currentView');
    handleViewChange('landing');
  };

  return (
    <div className="app">
      {token && (
        <nav className="app-nav glass-panel">
          <div className="nav-brand">
            <h1 className="text-gradient">CYBER<span className="neon-text">NOTES</span></h1>
          </div>
          <div className="nav-links">
            {['notes', 'quiz', 'analytics'].map((view) => (
              <button
                key={view}
                className={`nav-link ${currentView === view ? 'active' : ''}`}
                onClick={() => handleViewChange(view)}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
            <button className="nav-link logout" onClick={handleLogout}>
              LOGOUT_
            </button>
          </div>
        </nav>
      )}

      <main className="app-main">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            style={{ width: '100%', height: '100%' }}
          >
            {currentView === 'landing' && (
              <LandingPage onEnter={() => handleViewChange('login')} />
            )}
            {currentView === 'login' && (
              <Login
                onLogin={handleLogin}
                onBack={() => handleViewChange('landing')}
                onSwitchToSignup={() => handleViewChange('signup')}
              />
            )}
            {currentView === 'signup' && (
              <Signup
                onLogin={handleLogin}
                onSwitchToLogin={() => handleViewChange('login')}
              />
            )}
            {currentView === 'notes' && token && <NotesApp token={token} />}
            {currentView === 'quiz' && token && (
              <QuizApp
                token={token}
                onBack={() => handleViewChange('notes')}
              />
            )}
            {currentView === 'analytics' && token && (
              <AnalyticsDashboard
                token={token}
                onBack={() => handleViewChange('notes')}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;


