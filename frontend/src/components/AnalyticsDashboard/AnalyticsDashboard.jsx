import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import analyticsService from '../../services/analyticsService';
import './AnalyticsDashboard.css';

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
};

const AnalyticsDashboard = ({ token, onBack }) => {
  const [history, setHistory] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUnifiedData = async () => {
      setLoading(true);
      try {
        const data = await analyticsService.getAnalytics();
        // Backend returns { metrics, history, notesActivity }
        // We map notesActivity to 'notes' state for chart compatibility
        setNotes(data.notesActivity || []);
        setHistory(data.history || []);
        // We could also use data.metrics directly, but the existing code calculates it from notes/history.
        // For now, let's keep the existing calculation logic on frontend to ensure charts work, 
        // as we are passing the raw-ish data (notesActivity) which has tags and dates.
      } catch (error) {
        console.error("Failed to load analytics data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadUnifiedData();
  }, []);

  // --- METRICS CALCULATION ---

  const metrics = useMemo(() => {
    const totalNotes = notes.length;
    const totalQuizzes = history.length;

    // Calculate Weighted Average Score
    const totalQuestions = history.reduce((acc, curr) => acc + (curr.totalQuestions || 0), 0);
    const totalCorrect = history.reduce((acc, curr) => acc + (curr.score || 0), 0);
    const globalAccuracy = totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100).toFixed(1) : 0;

    // Calculate Study Streak
    const activityDates = new Set();
    notes.forEach(n => activityDates.add(dayjs(n.updatedAt || n.createdAt).format('YYYY-MM-DD')));
    history.forEach(q => activityDates.add(dayjs(q.completedAt).format('YYYY-MM-DD')));


    let streak = 0;
    let currentDate = dayjs();

    // Check if there is activity today or yesterday to start the streak
    const hasActivityToday = activityDates.has(currentDate.format('YYYY-MM-DD'));
    const hasActivityYesterday = activityDates.has(currentDate.subtract(1, 'day').format('YYYY-MM-DD'));

    if (hasActivityToday || hasActivityYesterday) {
      // If active today, start checking from today. If not, but active yesterday, start from yesterday.
      let checkDate = hasActivityToday ? currentDate : currentDate.subtract(1, 'day');

      while (activityDates.has(checkDate.format('YYYY-MM-DD'))) {
        streak++;
        checkDate = checkDate.subtract(1, 'day');
      }
    }

    // Active Subject
    const subjectCounts = {};
    notes.forEach(n => {
      (n.tags || []).forEach(t => {
        const s = String(t).toUpperCase();
        subjectCounts[s] = (subjectCounts[s] || 0) + 1;
      });
    });
    history.forEach(q => {
      const s = (q.subject || 'GENERAL').toUpperCase();
      subjectCounts[s] = (subjectCounts[s] || 0) + 1;
    });
    const activeSubject = Object.keys(subjectCounts).sort((a, b) => subjectCounts[b] - subjectCounts[a])[0] || 'N/A';

    return { totalNotes, totalQuizzes, globalAccuracy, streak, activeSubject };
  }, [notes, history]);

  // --- CHART OPTIONS ---



  const radarOption = useMemo(() => {
    // 1. Aggregate Note Volume per Subject (Input)
    const noteVolume = {};
    notes.forEach(n => {
      (n.tags || []).forEach(t => {
        const s = String(t).toUpperCase();
        noteVolume[s] = (noteVolume[s] || 0) + 1;
      });
    });

    // 2. Aggregate Quiz Score per Subject (Output)
    const quizPerformance = {};
    history.forEach(q => {
      const s = (q.subject || 'GENERAL').toUpperCase();
      if (!quizPerformance[s]) quizPerformance[s] = { total: 0, count: 0 };
      quizPerformance[s].total += (q.score / q.totalQuestions) * 100;
      quizPerformance[s].count++;
    });

    // 3. Merge Keys
    const allSubjects = Array.from(new Set([...Object.keys(noteVolume), ...Object.keys(quizPerformance)]));

    // Filter top 6 subjects by activity to keep chart clean
    const topSubjects = allSubjects
      .sort((a, b) => ((noteVolume[b] || 0) + (quizPerformance[b]?.count || 0)) - ((noteVolume[a] || 0) + (quizPerformance[a]?.count || 0)))
      .slice(0, 6);

    const indicator = topSubjects.map(s => ({ name: s, max: 100 }));

    // Normalize Note Volume to 0-100 scale for comparison
    const maxNotes = Math.max(...Object.values(noteVolume), 1);
    const noteData = topSubjects.map(s => ((noteVolume[s] || 0) / maxNotes) * 100);

    const quizData = topSubjects.map(s => {
      const p = quizPerformance[s];
      return p ? (p.total / p.count) : 0;
    });

    return {
      ...commonChartOptions,
      title: { text: 'SUBJECT MASTERY (INPUT VS OUTPUT)', textStyle: { color: '#d946ef', fontSize: 14, fontWeight: 700 } },
      radar: {
        indicator: indicator.length ? indicator : [{ name: 'NO DATA', max: 100 }],
        splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.05)'] } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
      },
      legend: { data: ['Study Effort (Notes)', 'Performance (Quiz)'], textStyle: { color: '#94a3b8' }, bottom: 0 },
      series: [{
        type: 'radar',
        data: [
          {
            value: noteData,
            name: 'Study Effort (Notes)',
            itemStyle: { color: '#06b6d4' },
            areaStyle: { color: 'rgba(6, 182, 212, 0.2)' }
          },
          {
            value: quizData,
            name: 'Performance (Quiz)',
            itemStyle: { color: '#d946ef' },
            areaStyle: { color: 'rgba(217, 70, 239, 0.2)' }
          }
        ]
      }]
    };
  }, [notes, history]);

  const heatmapOption = useMemo(() => {
    const activityMap = {};
    const startDate = dayjs().subtract(6, 'months').format('YYYY-MM-DD');
    const endDate = dayjs().format('YYYY-MM-DD');

    // Populate with 0s
    let curr = dayjs(startDate);
    while (curr.isBefore(dayjs().add(1, 'day'))) {
      activityMap[curr.format('YYYY-MM-DD')] = 0;
      curr = curr.add(1, 'day');
    }

    notes.forEach(n => {
      const d = dayjs(n.updatedAt || n.createdAt).format('YYYY-MM-DD');
      if (activityMap[d] !== undefined) activityMap[d] += 2; // Notes count more
    });
    history.forEach(q => {
      const d = dayjs(q.completedAt).format('YYYY-MM-DD');
      if (activityMap[d] !== undefined) activityMap[d] += 5; // Quizzes count significantly more
    });

    const data = Object.entries(activityMap).map(([date, value]) => [date, value]);

    return {
      ...commonChartOptions,
      title: { text: 'LEARNING INTENSITY', textStyle: { color: '#8b5cf6', fontSize: 14, fontWeight: 700 } },
      visualMap: {
        min: 0,
        max: 20,
        type: 'piecewise',
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: { color: ['#1e293b', '#0e7490', '#06b6d4', '#22d3ee', '#67e8f9'] },
        textStyle: { color: '#94a3b8' }
      },
      calendar: {
        top: 60,
        left: 30,
        right: 30,
        cellSize: ['auto', 13],
        range: [startDate, endDate],
        itemStyle: {
          color: '#0f172a',
          borderColor: '#1e293b',
          borderWidth: 1
        },
        yearLabel: { show: false },
        dayLabel: { color: '#94a3b8' },
        monthLabel: { color: '#94a3b8' },
        splitLine: { show: false }
      },
      series: [{
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: data
      }]
    };
  }, [notes, history]);

  const trendOption = useMemo(() => {
    const sortedHistory = [...history].sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
    const dates = sortedHistory.map(h => dayjs(h.completedAt).format('MMM D'));
    const scores = sortedHistory.map(h => ((h.score / h.totalQuestions) * 100).toFixed(1));

    return {
      ...commonChartOptions,
      title: { text: 'QUIZ PERFORMANCE TRAJECTORY', textStyle: { color: '#06b6d4', fontSize: 14, fontWeight: 700 } },
      grid: { top: 40, right: 20, bottom: 30, left: 40, containLabel: true },
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
        data: scores,
        type: 'line',
        smooth: true,
        lineStyle: { width: 3, shadowBlur: 10, shadowColor: 'rgba(6, 182, 212, 0.5)' },
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
        }
      }]
    };
  }, [history]);

  const knowledgeGrowthOption = useMemo(() => {
    // 1. Group notes by date
    const notesByDate = {};
    notes.forEach(n => {
      const date = dayjs(n.createdAt).format('YYYY-MM-DD');
      notesByDate[date] = (notesByDate[date] || 0) + 1;
    });

    // 2. Sort dates
    const sortedDates = Object.keys(notesByDate).sort((a, b) => new Date(a) - new Date(b));

    // 3. Calculate cumulative sum
    let runningTotal = 0;
    const cumulativeData = sortedDates.map(date => {
      runningTotal += notesByDate[date];
      return runningTotal;
    });

    // 4. Format dates for display
    const displayDates = sortedDates.map(d => dayjs(d).format('MMM D'));

    return {
      ...commonChartOptions,
      title: { text: 'KNOWLEDGE BASE GROWTH', textStyle: { color: '#10b981', fontSize: 14, fontWeight: 700 } },
      grid: { top: 40, right: 20, bottom: 30, left: 40, containLabel: true },
      xAxis: {
        type: 'category',
        data: displayDates,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLabel: { color: '#94a3b8' }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: { color: '#94a3b8' }
      },
      series: [{
        data: cumulativeData,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 3, shadowBlur: 10, shadowColor: 'rgba(16, 185, 129, 0.5)' },
        itemStyle: { color: '#10b981', borderColor: '#fff', borderWidth: 2 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.5)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0)' }
            ]
          }
        }
      }]
    };
  }, [notes]);

  const topicDistributionOption = useMemo(() => {
    const tagCounts = {};
    notes.forEach(n => {
      (n.tags || []).forEach(t => {
        const key = String(t).toUpperCase();
        if (key.trim()) {
          tagCounts[key] = (tagCounts[key] || 0) + 1;
        }
      });
    });

    let sortedTags = Object.entries(tagCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Group small tags into "OTHERS" if we have too many
    if (sortedTags.length > 6) {
      const topTags = sortedTags.slice(0, 6);
      const otherCount = sortedTags.slice(6).reduce((acc, curr) => acc + curr.value, 0);
      sortedTags = [...topTags, { name: 'OTHERS', value: otherCount }];
    }

    return {
      ...commonChartOptions,
      title: { text: 'TOPIC DISTRIBUTION', textStyle: { color: '#f59e0b', fontSize: 14, fontWeight: 700 } },
      tooltip: {
        ...commonChartOptions.tooltip,
        trigger: 'item'
      },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '55%'],
        itemStyle: {
          borderRadius: 5,
          borderColor: '#0f172a',
          borderWidth: 2
        },
        label: {
          show: true,
          color: '#94a3b8',
          formatter: '{b}: {c}'
        },
        labelLine: { show: true, lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        data: sortedTags
      }]
    };
  }, [notes]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="analytics-dashboard">
      <motion.div
        className="dashboard-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button onClick={onBack} className="back-btn">
          ← DASHBOARD
        </button>
        <h1 className="text-gradient">CONNECTED INTELLIGENCE</h1>
      </motion.div>

      <motion.div
        className="summary-cards"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="stat-card glass-panel" variants={itemVariants}>
          <div className="stat-icon">🔥</div>
          <div className="stat-info">
            <h3>{metrics.streak} DAYS</h3>
            <p>STUDY STREAK</p>
          </div>
        </motion.div>
        <motion.div className="stat-card glass-panel" variants={itemVariants}>
          <div className="stat-icon">🧠</div>
          <div className="stat-info">
            <h3>{metrics.totalNotes} / {metrics.totalQuizzes}</h3>
            <p>NOTES / QUIZZES</p>
          </div>
        </motion.div>
        <motion.div className="stat-card glass-panel" variants={itemVariants}>
          <div className="stat-icon">🎯</div>
          <div className="stat-info">
            <h3>{metrics.globalAccuracy}%</h3>
            <p>GLOBAL ACCURACY</p>
          </div>
        </motion.div>
        <motion.div className="stat-card glass-panel" variants={itemVariants}>
          <div className="stat-icon">⚡</div>
          <div className="stat-info">
            <h3>{metrics.activeSubject}</h3>
            <p>TOP SUBJECT</p>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        className="bento-grid"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="card glass-panel area-radar" variants={itemVariants}>
          <ReactECharts option={radarOption} style={{ height: '100%', minHeight: '300px' }} />
        </motion.div>

        <motion.div className="card glass-panel area-topics" variants={itemVariants}>
          <ReactECharts option={topicDistributionOption} style={{ height: '100%', minHeight: '300px' }} />
        </motion.div>

        <motion.div className="card glass-panel area-growth" variants={itemVariants}>
          <ReactECharts option={knowledgeGrowthOption} style={{ height: '100%', minHeight: '300px' }} />
        </motion.div>

        <motion.div className="card glass-panel area-trend" variants={itemVariants}>
          <ReactECharts option={trendOption} style={{ height: '100%', minHeight: '300px' }} />
        </motion.div>

        <motion.div className="card glass-panel area-heatmap" variants={itemVariants}>
          <ReactECharts option={heatmapOption} style={{ height: '100%', minHeight: '250px' }} />
        </motion.div>
      </motion.div>

      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>SYNCHRONIZING NEURAL DATA...</p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;