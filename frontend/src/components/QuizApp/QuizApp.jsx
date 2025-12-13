import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateQuiz, getQuizHint } from '../../services/aiService';
import quizService from '../../services/quizService';
import './QuizApp.css';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';

const QuizApp = ({ token, onBack }) => {
  // View State: 'setup' | 'quiz' | 'result' | 'history'
  const [view, setView] = useState('setup');

  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [hints, setHints] = useState({});
  const [showHint, setShowHint] = useState(null);

  const [quizForm, setQuizForm] = useState({
    subject: 'Mathematics',
    customSubject: '',
    gradeLevel: '5',
    topic: '',
    numQuestions: 5,
  });

  const commonChartOptions = {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: 'Inter, sans-serif' },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: '#06b6d4',
      textStyle: { color: '#fff' },
      padding: 12,
      borderRadius: 8,
      backdropFilter: 'blur(4px)'
    },
    grid: { top: 40, right: 20, bottom: 30, left: 40, containLabel: true }
  };

  const historyTrendOption = useMemo(() => {
    if (view !== 'history') return {}; // Optimization
    const sorted = [...history].sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
    const dates = sorted.map((h) => dayjs(h.completedAt).format('MMM D'));
    const scores = sorted.map((h) => parseFloat(h.score / h.totalQuestions * 100).toFixed(1));
    return {
      ...commonChartOptions,
      title: { text: 'SCORES OVER TIME', textStyle: { color: '#06b6d4', fontSize: 14, fontWeight: 700 } },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLabel: { color: '#94a3b8' }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: { color: '#94a3b8' }
      },
      series: [{
        type: 'line',
        smooth: true,
        data: scores,
        itemStyle: { color: '#06b6d4' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(6, 182, 212, 0.5)' },
              { offset: 1, color: 'rgba(6, 182, 212, 0)' }
            ]
          }
        },
        lineStyle: { width: 3, shadowBlur: 10, shadowColor: 'rgba(6, 182, 212, 0.5)' }
      }],
    };
  }, [history, view]);

  const subjectBreakdownOption = useMemo(() => {
    if (view !== 'history') return {};
    const bySubject = {};
    history.forEach((h) => {
      const s = h.subject || 'General';
      if (!bySubject[s]) bySubject[s] = 0;
      bySubject[s] += 1;
    });
    const subjects = Object.keys(bySubject);
    const values = subjects.map((s) => bySubject[s]);
    return {
      ...commonChartOptions,
      title: { text: 'HISTORY BY SUBJECT', textStyle: { color: '#d946ef', fontSize: 14, fontWeight: 700 } },
      xAxis: {
        type: 'category',
        data: subjects,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLabel: { color: '#94a3b8' }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: { color: '#94a3b8' }
      },
      series: [{
        type: 'bar',
        data: values,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#d946ef' },
              { offset: 1, color: '#8b5cf6' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        }
      }],
    };
  }, [history, view]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const allHistory = await quizService.getQuizHistory();
      setHistory(allHistory);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!quizForm.topic) {
      alert('Please enter a topic');
      return;
    }

    const finalSubject = quizForm.subject === 'Other' ? quizForm.customSubject : quizForm.subject;
    if (!finalSubject) {
      alert('Please enter a subject');
      return;
    }

    setLoading(true);
    try {
      const data = await generateQuiz({ ...quizForm, subject: finalSubject });
      setQuiz(data);
      setAnswers(new Array(data.questions.length).fill(null));
      setCurrentQuestion(0);
      setResult(null);
      setHints({});
      setView('quiz'); // Switch to quiz view
    } catch (error) {
      console.error('Error generating quiz:', error);
      alert('Error generating quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = async () => {
    if (!quiz || answers.some((a) => a === null)) {
      if (!window.confirm('You have unanswered questions. Submit anyway?')) {
        return;
      }
    }
    setLoading(true);
    try {
      let score = 0;
      quiz.questions.forEach((q, idx) => {
        if (answers[idx] === q.correctAnswer) {
          score++;
        }
      });

      const resultData = {
        score,
        totalQuestions: quiz.questions.length,
        percentage_score: ((score / quiz.questions.length) * 100).toFixed(1),
        improvement_tips: ['Review incorrect answers', 'Practice more on this topic']
      };

      setResult(resultData);

      // Save to DB
      await quizService.saveQuizResult({
        topic: quizForm.topic,
        subject: quizForm.subject === 'Other' ? quizForm.customSubject : quizForm.subject,
        score: score,
        totalQuestions: quiz.questions.length,
        correctAnswers: score, // Added missing field required by backend model
        difficulty: quizForm.gradeLevel, // Map gradeLevel to difficulty or add field
        timeSpent: 0 // Placeholder, can add timer later
      });

      loadHistory();
      setView('result'); // Switch to result view
    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('Error submitting quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getHint = async (question) => {
    if (hints[question]) {
      setShowHint(hints[question]);
      return;
    }
    setLoading(true);
    try {
      const hint = await getQuizHint(question, quiz?.subject || 'General');
      setHints({ ...hints, [question]: hint });
      setShowHint(hint);
    } catch (error) {
      console.error('Error getting hint:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionIndex, answerIndex) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = answerIndex;
    setAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const retryQuiz = () => {
    setQuiz(null);
    setAnswers([]);
    setCurrentQuestion(0);
    setResult(null);
    setHints({});
    setShowHint(null);
    setView('setup'); // Return to setup
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  const questionVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  };

  return (
    <div className="quiz-app">
      <AnimatePresence mode="wait">
        {view === 'setup' && (
          <motion.div
            key="setup"
            className="quiz-generator"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-gradient">INITIALIZE QUIZ MODULE</h2>
            <button
              onClick={onBack}
              className="back-button btn-cyber secondary"
              style={{ marginBottom: '1rem', width: 'auto', display: 'inline-flex' }}
            >
              ← DASHBOARD
            </button>
            <div className="quiz-form">
              <div className="form-group">
                <label>SUBJECT_</label>
                <select
                  value={quizForm.subject}
                  onChange={(e) => setQuizForm({ ...quizForm, subject: e.target.value })}
                >
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
                  <option value="English">English</option>
                  <option value="History">History</option>
                  <option value="Geography">Geography</option>
                  <option value="Technology">Technology</option>
                  <option value="Other">Other (Custom)</option>
                </select>
              </div>

              {quizForm.subject === 'Other' && (
                <div className="form-group">
                  <label>CUSTOM SUBJECT_</label>
                  <input
                    type="text"
                    value={quizForm.customSubject}
                    onChange={(e) => setQuizForm({ ...quizForm, customSubject: e.target.value })}
                    placeholder="e.g., ASTROPHYSICS, CULINARY ARTS..."
                  />
                </div>
              )}

              <div className="form-group">
                <label>GRADE LEVEL_</label>
                <select
                  value={quizForm.gradeLevel}
                  onChange={(e) => setQuizForm({ ...quizForm, gradeLevel: e.target.value })}
                >
                  <option value="Elementary">Elementary</option>
                  <option value="Middle School">Middle School</option>
                  <option value="High School">High School</option>
                  <option value="College">College</option>
                  <option value="Professional">Professional</option>
                </select>
              </div>
              <div className="form-group">
                <label>TOPIC_</label>
                <input
                  type="text"
                  value={quizForm.topic}
                  onChange={(e) => setQuizForm({ ...quizForm, topic: e.target.value })}
                  placeholder="e.g., QUANTUM PHYSICS, ALGEBRA..."
                />
              </div>
              <div className="form-group">
                <label>QUESTION COUNT_</label>
                <input
                  type="number"
                  value={quizForm.numQuestions}
                  onChange={(e) => setQuizForm({ ...quizForm, numQuestions: parseInt(e.target.value) })}
                  min="3"
                  max="10"
                />
              </div>
              <button onClick={handleGenerateQuiz} disabled={loading} className="generate-button btn-cyber">
                {loading ? 'GENERATING...' : 'GENERATE QUIZ'}
              </button>
              <button onClick={() => setView('history')} className="history-button btn-cyber secondary">
                ACCESS ARCHIVES
              </button>
            </div>
          </motion.div>
        )}

        {view === 'history' && (
          <motion.div
            key="history"
            className="quiz-history"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <div className="history-header">
              <h2 className="text-gradient">ARCHIVES</h2>
              <button onClick={() => setView(result ? 'result' : 'setup')} className="back-button btn-cyber secondary">
                RETURN
              </button>
            </div>
            <div className="history-charts">
              {history.length > 0 && (
                <>
                  <div className="chart-card">
                    <ReactECharts option={historyTrendOption} style={{ height: 260 }} />
                  </div>
                  <div className="chart-card">
                    <ReactECharts option={subjectBreakdownOption} style={{ height: 260 }} />
                  </div>
                </>
              )}
            </div>
            <div className="history-list">
              {history.length === 0 ? (
                <p>NO DATA FOUND.</p>
              ) : (
                history.map((item, index) => (
                  <motion.div
                    key={item.id}
                    className="history-item"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="history-item-header">
                      <h3>{item.topic}</h3>
                      <span className="history-score">{((item.score / item.totalQuestions) * 100).toFixed(0)}%</span>
                    </div>
                    <p className="history-details">
                      {item.subject} | {item.score}/{item.totalQuestions} |{' '}
                      {new Date(item.completedAt).toLocaleDateString()}
                    </p>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {view === 'result' && result && (
          <motion.div
            key="result"
            className="quiz-result"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-gradient">ASSESSMENT COMPLETE</h2>
            <div className="result-score">
              <h3>{result.percentage_score}%</h3>
              <p>
                SCORE: {result.score} / {result.totalQuestions}
              </p>
            </div>
            <div className="result-charts">
              <div className="chart-card">
                <ReactECharts
                  style={{ height: 260 }}
                  option={{
                    ...commonChartOptions,
                    title: { text: 'ACCURACY RATIO', textStyle: { color: '#8b5cf6', fontSize: 14, fontWeight: 700 } },
                    series: [
                      {
                        type: 'pie',
                        radius: ['40%', '70%'],
                        itemStyle: {
                          borderRadius: 5,
                          borderColor: '#020617',
                          borderWidth: 2
                        },
                        label: { color: '#fff' },
                        data: [
                          { value: result.score, name: 'Correct', itemStyle: { color: '#06b6d4' } },
                          { value: result.totalQuestions - result.score, name: 'Incorrect', itemStyle: { color: '#ef4444' } },
                        ],
                      },
                    ],
                  }}
                />
              </div>
            </div>
            <div className="result-actions">
              <button onClick={retryQuiz} className="retry-button btn-cyber">
                NEW ASSESSMENT
              </button>
              <button onClick={() => setView('history')} className="history-button btn-cyber secondary">
                VIEW ARCHIVES
              </button>
            </div>
          </motion.div>
        )}

        {view === 'quiz' && quiz && (
          <motion.div
            key="quiz"
            className="quiz-container"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <div className="quiz-header">
              <h2>{quiz.title}</h2>
              <div className="quiz-progress">
                QUESTION {currentQuestion + 1} / {quiz.questions.length}
              </div>
            </div>

            {quiz.isMock && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                marginBottom: '1.5rem',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                ⚠ AI SERVICE UNAVAILABLE - USING OFFLINE MOCK DATA
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion}
                className="quiz-question"
                variants={questionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
              >
                <div className="question-header">
                  <h3>{quiz.questions[currentQuestion].question}</h3>
                  <button onClick={() => getHint(quiz.questions[currentQuestion].question)} className="hint-button" disabled={loading}>
                    💡 HINT
                  </button>
                </div>
                {showHint && showHint === hints[quiz.questions[currentQuestion].question] && (
                  <motion.div
                    className="hint-popup"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <p>{showHint}</p>
                    <button onClick={() => setShowHint(null)}>CLOSE</button>
                  </motion.div>
                )}
                <div className="question-options">
                  {quiz.questions[currentQuestion].options.map((option, index) => (
                    <label key={index} className={`option-label ${answers[currentQuestion] === index ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name={`question-${currentQuestion}`}
                        value={index}
                        checked={answers[currentQuestion] === index}
                        onChange={() => handleAnswerChange(currentQuestion, index)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="quiz-navigation">
              <button onClick={prevQuestion} disabled={currentQuestion === 0} className="nav-button btn-cyber secondary">
                PREVIOUS
              </button>
              <div className="question-dots">
                {quiz.questions.map((_, index) => (
                  <button
                    key={index}
                    className={`question-dot ${index === currentQuestion ? 'active' : ''} ${answers[index] !== null ? 'answered' : ''}`}
                    onClick={() => setCurrentQuestion(index)}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              {currentQuestion === quiz.questions.length - 1 ? (
                <button onClick={submitQuiz} disabled={loading} className="submit-button btn-cyber">
                  {loading ? 'SUBMITTING...' : 'COMPLETE ASSESSMENT'}
                </button>
              ) : (
                <button onClick={nextQuestion} className="nav-button btn-cyber secondary">
                  NEXT
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuizApp;

