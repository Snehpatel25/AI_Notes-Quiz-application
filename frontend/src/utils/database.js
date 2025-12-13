import Dexie from 'dexie';

const db = new Dexie('PlayPowerNotes');

db.version(1).stores({
  notes: '++id, title, content, createdAt, updatedAt, isPinned, isEncrypted, tags, summary',
});

db.version(2).stores({
  notes: '++id, title, content, createdAt, updatedAt, isPinned, isEncrypted, tags, summary',
  quizHistory: '++id, topic, subject, score, totalQuestions, completedAt'
});

export default db;





