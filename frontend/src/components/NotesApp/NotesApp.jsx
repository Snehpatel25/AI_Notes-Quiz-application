import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import noteService from '../../services/noteService';
import { encryptNote, decryptNote } from '../../utils/encryption';
import { getGlossaryTerms, generateSummary, generateTags, checkGrammar, extractActionItems, analyzeSentiment } from '../../services/aiService';
import RichTextEditor from '../RichTextEditor/RichTextEditor';
import NoteList from '../NoteList/NoteList';
import NoteToolbar from '../NoteToolbar/NoteToolbar';
import GlossaryPopup from '../GlossaryPopup/GlossaryPopup';
import AIChat from '../AIChat/AIChat';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import './NotesApp.css';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';

import { debounce } from '../../utils/timeUtils';
import { exportToMarkdown } from '../../utils/exportUtils';

const NotesApp = ({ token }) => {
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [glossaryTerms, setGlossaryTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [grammarErrors, setGrammarErrors] = useState([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [encrypting, setEncrypting] = useState(false);
  const [decryptedNotes, setDecryptedNotes] = useState({});

  // New AI State
  const [showChat, setShowChat] = useState(false);
  const [actionItems, setActionItems] = useState([]);
  const [sentiment, setSentiment] = useState(null);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);

  // Debounced update function
  const debouncedUpdate = React.useMemo(
    () => debounce(async (id, updates) => {
      try {
        await noteService.updateNote(id, updates);
      } catch (error) {
        console.error('Error auto-saving:', error);
      }
    }, 1000),
    []
  );

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (selectedNote) {
          console.log('Manual save triggered');
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createNote();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        if (selectedNote && !selectedNote.isEncrypted) {
          exportToMarkdown(selectedNote);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNote]);

  useEffect(() => {
    const content = selectedNote?.isEncrypted
      ? decryptedNotes[selectedNote.id]
      : selectedNote?.content;

    // Reset AI state when note changes
    if (selectedNote?.id) {
      setActionItems(selectedNote.actionItems || []);
      setSentiment(selectedNote.sentiment || null);
    }

    if (!selectedNote) return;
    if (!content) return;
    if (selectedNote.isEncrypted) return;
    let timer = setTimeout(() => {
      loadGlossaryTerms();
      checkGrammarErrors();
    }, 800);
    return () => {
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNote, decryptedNotes]);

  const loadNotes = async () => {
    try {
      const data = await noteService.getNotes(1, searchQuery); // Fetch page 1 for now
      // Backend returns { notes, page, pages }
      // We might need to handle pagination state later, for now just load the first batch
      // Map MongoDB _id to frontend id
      const mappedNotes = data.notes.map(n => ({ ...n, id: n._id }));
      setNotes(mappedNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const loadGlossaryTerms = async () => {
    const content = selectedNote?.isEncrypted
      ? decryptedNotes[selectedNote.id]
      : selectedNote?.content;
    if (!content) return;
    setLoading(true);
    try {
      const textContent = content.replace(/<[^>]*>/g, '');
      const terms = await getGlossaryTerms(textContent);
      setGlossaryTerms(terms);
    } catch (error) {
      console.error('Error loading glossary terms:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkGrammarErrors = async () => {
    const content = selectedNote?.isEncrypted
      ? decryptedNotes[selectedNote.id]
      : selectedNote?.content;
    if (!content) return;
    try {
      const textContent = content.replace(/<[^>]*>/g, '');
      const errors = await checkGrammar(textContent);
      setGrammarErrors(errors);
    } catch (error) {
      console.error('Error checking grammar:', error);
    }
  };

  const createNote = async () => {
    try {
      const newNoteData = {
        title: 'New Note',
        content: '',
        tags: [],
        folder: 'General',
        aiData: {}
      };
      const createdNote = await noteService.createNote(newNoteData);
      // Transform _id to id for frontend compatibility if needed, or just use _id
      const note = { ...createdNote, id: createdNote._id };
      setNotes([note, ...notes]);
      setSelectedNote(note);
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const updateNote = async (updates) => {
    if (!selectedNote) return;
    try {
      // Optimistic update
      const updatedNote = {
        ...selectedNote,
        ...updates,
        updatedAt: new Date(),
      };
      setSelectedNote(updatedNote);
      setNotes(notes.map(n => (n.id === selectedNote.id || n._id === selectedNote.id) ? updatedNote : n));

      await noteService.updateNote(selectedNote.id || selectedNote._id, updates);
    } catch (error) {
      console.error('Error updating note:', error);
      // Revert on error would be ideal here
    }
  };

  const deleteNote = (id) => {
    setNoteToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!noteToDelete) return;
    try {
      await noteService.deleteNote(noteToDelete);
      if (selectedNote?.id === noteToDelete || selectedNote?._id === noteToDelete) {
        setSelectedNote(null);
      }
      // Remove from state directly instead of reloading all
      setNotes(notes.filter(n => n.id !== noteToDelete && n._id !== noteToDelete));
      setShowDeleteModal(false);
      setNoteToDelete(null);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const togglePin = async (id) => {
    try {
      const note = notes.find((n) => n.id === id || n._id === id);
      if (note) {
        const newPinState = !note.isPinned;
        // Optimistic update
        const updatedNote = { ...note, isPinned: newPinState };
        setNotes(notes.map(n => (n.id === id || n._id === id) ? updatedNote : n));
        if (selectedNote?.id === id || selectedNote?._id === id) {
          setSelectedNote(updatedNote);
        }

        await noteService.updateNote(id, { isPinned: newPinState });
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const handleContentChange = (content) => {
    if (!selectedNote) return;
    const updatedNote = { ...selectedNote, content, updatedAt: new Date() };
    setSelectedNote(updatedNote);
    setNotes(notes.map(n => n.id === selectedNote.id ? updatedNote : n));
    debouncedUpdate(selectedNote.id, { content });
  };

  const handleTitleChange = (title) => {
    updateNote({ title });
  };

  const handleEncrypt = async () => {
    if (!password) {
      alert('Please enter a password');
      return;
    }
    setEncrypting(true);
    try {
      const encryptedContent = encryptNote(selectedNote.content, password);
      await updateNote({
        content: encryptedContent,
        isEncrypted: true,
      });
      setShowPasswordModal(false);
      setPassword('');
    } catch (error) {
      alert('Error encrypting note');
    } finally {
      setEncrypting(false);
    }
  };

  const handleDecrypt = async () => {
    if (!password || !selectedNote) {
      alert('Please enter a password');
      return;
    }
    try {
      const decryptedContent = decryptNote(selectedNote.content, password);
      setDecryptedNotes({ ...decryptedNotes, [selectedNote.id]: decryptedContent });
      setSelectedNote({ ...selectedNote, decryptedContent, decryptionPassword: password });
      setShowPasswordModal(false);
      setPassword('');
    } catch (error) {
      alert('Invalid password');
      setPassword('');
    }
  };

  const generateAIFeatures = async () => {
    const content = selectedNote?.isEncrypted
      ? decryptedNotes[selectedNote.id]
      : selectedNote?.content;
    if (!content || (selectedNote?.isEncrypted && !decryptedNotes[selectedNote.id])) return;

    setLoading(true);
    try {
      // Remove HTML tags for cleaner processing
      const textContent = content.replace(/<[^>]*>/g, '');

      const [summary, tags, actions, sent] = await Promise.all([
        generateSummary(textContent),
        generateTags(textContent),
        extractActionItems(textContent),
        analyzeSentiment(textContent)
      ]);

      await updateNote({
        summary,
        tags,
        actionItems: actions,
        sentiment: sent
      });

      setActionItems(actions);
      setSentiment(sent);

    } catch (error) {
      console.error('Error generating AI features:', error);
      alert('AI Service Error: Could not generate features. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredNotes = notes.filter((note) => {
    const query = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(query) ||
      (note.content && note.content.toLowerCase().includes(query)) ||
      (note.tags && note.tags.some((tag) => tag.toLowerCase().includes(query)))
    );
  });

  const tagChartOption = React.useMemo(() => {
    const tagCounts = {};
    notes.forEach((n) => (Array.isArray(n.tags) ? n.tags : []).forEach((t) => {
      const key = String(t).toLowerCase();
      tagCounts[key] = (tagCounts[key] || 0) + 1;
    }));
    const tags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]).slice(0, 12);
    const counts = tags.map((t) => tagCounts[t]);
    return {
      backgroundColor: 'transparent',
      title: { text: 'TAGS DISTRIBUTION', textStyle: { color: '#94a3b8', fontSize: 12 } },
      tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#06b6d4', textStyle: { color: '#fff' } },
      xAxis: { type: 'category', data: tags, axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
      series: [{ type: 'bar', data: counts, itemStyle: { color: '#06b6d4' } }],
    };
  }, [notes]);

  const notesActivityOption = React.useMemo(() => {
    const byDay = {};
    notes.forEach((n) => {
      const day = dayjs(n.updatedAt || n.createdAt).format('YYYY-MM-DD');
      byDay[day] = (byDay[day] || 0) + 1;
    });
    const days = Object.keys(byDay).sort((a, b) => new Date(a) - new Date(b));
    const counts = days.map((d) => byDay[d]);
    return {
      backgroundColor: 'transparent',
      title: { text: 'ACTIVITY', textStyle: { color: '#94a3b8', fontSize: 12 } },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#d946ef', textStyle: { color: '#fff' } },
      xAxis: { type: 'category', data: days, axisLabel: { color: '#94a3b8' } },
      yAxis: { type: 'value', min: 0, axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
      series: [{ type: 'line', smooth: true, areaStyle: { opacity: 0.2, color: '#d946ef' }, itemStyle: { color: '#d946ef' }, data: counts }],
    };
  }, [notes]);

  const [selectedNoteIds, setSelectedNoteIds] = useState([]);

  const toggleNoteSelection = (id) => {
    setSelectedNoteIds(prev =>
      prev.includes(id) ? prev.filter(noteId => noteId !== id) : [...prev, id]
    );
  };

  const deleteSelectedNotes = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedNoteIds.length} notes?`)) {
      try {
        await Promise.all(selectedNoteIds.map(id => noteService.deleteNote(id)));

        if (selectedNoteIds.includes(selectedNote?.id) || selectedNoteIds.includes(selectedNote?._id)) {
          setSelectedNote(null);
        }
        setNotes(notes.filter(n => !selectedNoteIds.includes(n.id) && !selectedNoteIds.includes(n._id)));
        setSelectedNoteIds([]);
      } catch (error) {
        console.error('Error deleting notes:', error);
      }
    }
  };

  return (
    <div className={`notes-app ${selectedNote ? 'mobile-show-editor' : 'mobile-show-list'}`}>
      <motion.div
        className="notes-sidebar glass-panel"
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <NoteToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCreateNote={createNote}
        />
        <NoteList
          notes={filteredNotes}
          selectedNote={selectedNote}
          onSelectNote={setSelectedNote}
          onDeleteNote={deleteNote}
          onTogglePin={togglePin}
          onDecrypt={(note) => {
            setSelectedNote(note);
            setShowPasswordModal(true);
          }}
          selectedNoteIds={selectedNoteIds}
          onToggleSelection={toggleNoteSelection}
          onDeleteSelected={deleteSelectedNotes}
        />
      </motion.div>

      <motion.div
        className="notes-editor glass-panel"
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <AnimatePresence mode="wait">
          {selectedNote ? (
            <motion.div
              key={selectedNote.id}
              className="note-scroll-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            >
              {selectedNote.isEncrypted && !decryptedNotes[selectedNote.id] ? (
                <div className="encrypted-note-view">
                  <div className="encrypted-message">
                    <button
                      className="mobile-back-button btn-cyber"
                      onClick={() => setSelectedNote(null)}
                      style={{ marginBottom: '1rem', width: '100%' }}
                    >
                      ← BACK TO LIST
                    </button>
                    <h2 className="text-gradient">ENCRYPTED DATA</h2>
                    <p>SECURE ACCESS REQUIRED</p>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="ENTER PASSCODE..."
                      className="password-input"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleDecrypt();
                        }
                      }}
                    />
                    <button onClick={handleDecrypt} className="btn-cyber decrypt-button">
                      DECRYPT_
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="editor-header">
                    <button
                      className="mobile-back-button action-button"
                      onClick={() => setSelectedNote(null)}
                      title="Back to List"
                    >
                      ←
                    </button>
                    <input
                      type="text"
                      value={selectedNote.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      className="note-title-input"
                      placeholder="NOTE TITLE..."
                    />
                    <div className="editor-actions">
                      <button
                        onClick={() => togglePin(selectedNote.id)}
                        className={`action-button ${selectedNote.isPinned ? 'active' : ''}`}
                        title={selectedNote.isPinned ? 'Unpin' : 'Pin'}
                      >
                        📌
                      </button>
                      <button
                        onClick={generateAIFeatures}
                        className="action-button ai-button"
                        disabled={loading || selectedNote.isEncrypted}
                        title="Generate AI Summary, Tags, Actions & Sentiment"
                      >
                        {loading ? '⏳' : '🤖 AI'}
                      </button>
                      <button
                        onClick={() => setShowChat(!showChat)}
                        className={`action-button ${showChat ? 'active' : ''}`}
                        title="Chat with Note"
                      >
                        💬
                      </button>
                      {!selectedNote.isEncrypted ? (
                        <button
                          onClick={() => setShowPasswordModal(true)}
                          className="action-button"
                          title="Encrypt Note"
                        >
                          🔒
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            const newDecryptedNotes = { ...decryptedNotes };
                            delete newDecryptedNotes[selectedNote.id];
                            setDecryptedNotes(newDecryptedNotes);
                            setSelectedNote({ ...selectedNote, decryptedContent: null, decryptionPassword: null });
                          }}
                          className="action-button"
                          title="Lock Note"
                        >
                          🔐
                        </button>
                      )}
                      <button
                        onClick={() => deleteNote(selectedNote.id)}
                        className="action-button delete-button"
                        title="Delete Note"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="editor-content-wrapper">
                    <RichTextEditor
                      value={selectedNote.isEncrypted ? decryptedNotes[selectedNote.id] || '' : selectedNote.content || ''}
                      onChange={(content) => {
                        if (selectedNote.isEncrypted && decryptedNotes[selectedNote.id]) {
                          setDecryptedNotes({ ...decryptedNotes, [selectedNote.id]: content });
                          const encryptionPassword = selectedNote.decryptionPassword || password;
                          if (encryptionPassword) {
                            const encryptedContent = encryptNote(content, encryptionPassword);
                            updateNote({ content: encryptedContent });
                          }
                        } else {
                          handleContentChange(content);
                        }
                      }}
                      placeholder="INITIALIZE DATA ENTRY..."
                      onGrammarErrors={setGrammarErrors}
                      glossaryTerms={glossaryTerms}
                      grammarErrors={grammarErrors}
                      onGlossaryTermClick={(termObj) => setSelectedTerm(termObj)}
                    />
                    {glossaryTerms.length > 0 && (
                      <motion.div
                        className="glossary-terms-list"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <h4>DETECTED ENTITIES:</h4>
                        <div className="glossary-terms">
                          {glossaryTerms.map((term, index) => (
                            <span
                              key={index}
                              className="glossary-term-badge"
                              onClick={() => setSelectedTerm(term)}
                              title={term.definition}
                            >
                              {term.term}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* AI INSIGHTS GRID */}
                  {(selectedNote.summary || (actionItems && actionItems.length > 0) || sentiment || (selectedNote.tags && selectedNote.tags.length > 0)) && (
                    <div className="ai-insights-grid">
                      {selectedNote.summary && (
                        <motion.div
                          className="note-summary glass-panel"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <h3>AI SUMMARY</h3>
                          <p>{selectedNote.summary}</p>
                        </motion.div>
                      )}

                      <div className="insights-columns">
                        <div className="left-column">
                          {actionItems && actionItems.length > 0 && (
                            <motion.div
                              className="note-actions glass-panel"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              <h3>ACTION ITEMS</h3>
                              <ul>
                                {actionItems.map((item, idx) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            </motion.div>
                          )}
                        </div>

                        <div className="right-column">
                          {sentiment && (
                            <motion.div
                              className="note-sentiment glass-panel"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              <h3>SENTIMENT</h3>
                              <div className={`sentiment-badge ${sentiment.toLowerCase()}`}>
                                {sentiment}
                              </div>
                            </motion.div>
                          )}

                          {selectedNote.tags && selectedNote.tags.length > 0 && (
                            <motion.div
                              className="note-tags-card glass-panel"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              <h3>TAGS</h3>
                              <div className="tags-container">
                                {selectedNote.tags.map((tag, index) => (
                                  <span key={index} className="tag">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="notes-analytics">
                    <div className="chart-card glass-panel">
                      <ReactECharts option={tagChartOption} style={{ height: 200 }} />
                    </div>
                    <div className="chart-card glass-panel">
                      <ReactECharts option={notesActivityOption} style={{ height: 200 }} />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              className="no-note-selected"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h2 className="text-gradient">SELECT DATA NODE</h2>
              <p>OR INITIALIZE NEW ENTRY</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal glass-panel"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h2 className="text-gradient">{selectedNote?.isEncrypted ? 'DECRYPT NODE' : 'ENCRYPT NODE'}</h2>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ENTER PASSCODE..."
                className="password-input"
              />
              <div className="modal-actions">
                <button className="btn-cyber" onClick={selectedNote?.isEncrypted ? handleDecrypt : handleEncrypt} disabled={encrypting}>
                  {selectedNote?.isEncrypted ? 'UNLOCK' : 'LOCK'}
                </button>
                <button className="btn-cyber secondary" onClick={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                }}>
                  ABORT
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTerm && (
          <GlossaryPopup
            term={selectedTerm.term}
            definition={selectedTerm.definition}
            onClose={() => setSelectedTerm(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChat && selectedNote && (
          <AIChat
            noteContent={selectedNote.isEncrypted ? decryptedNotes[selectedNote.id] : selectedNote.content}
            onClose={() => setShowChat(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDeleteModal && (
          <ConfirmationModal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setNoteToDelete(null);
            }}
            onConfirm={confirmDelete}
            title="DELETE NOTE"
            message="Are you sure you want to delete this note? This action cannot be undone."
          />
        )}
      </AnimatePresence>

      {/* Mobile Floating Action Button */}
      <button
        className="mobile-fab"
        onClick={createNote}
        aria-label="Create New Note"
      >
        +
      </button>
    </div>
  );
};

export default NotesApp;
