import React, { useState } from 'react';
import { FaThumbtack, FaLock, FaTrash, FaDownload, FaEdit } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import ContextMenu from '../ContextMenu/ContextMenu';
import { exportToMarkdown } from '../../utils/exportUtils';
import './NoteList.css';

const NoteList = ({
  notes,
  selectedNote,
  onSelectNote,
  onDeleteNote,
  onTogglePin,
  onDecrypt,
  selectedNoteIds = [],
  onToggleSelection,
  onDeleteSelected
}) => {
  const [contextMenu, setContextMenu] = useState(null);

  const handleContextMenu = (e, note) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      note,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const truncateContent = (content, maxLength = 50) => {
    if (!content) return 'No content';
    const text = content.replace(/<[^>]*>/g, ''); // Remove HTML tags
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      className="note-list"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {selectedNoteIds.length > 0 && (
        <motion.div
          className="batch-actions"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button onClick={onDeleteSelected} className="btn-batch-delete">
            <FaTrash /> Delete {selectedNoteIds.length} Selected
          </button>
        </motion.div>
      )}

      {notes.length === 0 ? (
        <motion.div
          className="empty-notes"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p>NO DATA FOUND. INITIALIZE NEW ENTRY.</p>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          {notes.map((note) => (
            <motion.div
              key={note.id}
              layout
              variants={itemVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`note-item ${selectedNote?.id === note.id ? 'selected' : ''} ${note.isPinned ? 'pinned' : ''}`}
              onClick={() => onSelectNote(note)}
              onContextMenu={(e) => handleContextMenu(e, note)}
              whileHover={{ scale: 1.02, x: 5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              <div className="note-select-checkbox">
                <input
                  type="checkbox"
                  checked={selectedNoteIds.includes(note.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleSelection(note.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="note-item-content-wrapper">
                <div className="note-item-header">
                  <h3 className="note-item-title">{note.title || 'Untitled Note'}</h3>
                  <div className="note-item-actions">
                    {note.isEncrypted && (
                      <button
                        className="note-item-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDecrypt(note);
                        }}
                        title="Decrypt"
                      >
                        <FaLock />
                      </button>
                    )}
                    <button
                      className="note-item-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(note.id);
                      }}
                      title={note.isPinned ? 'Unpin' : 'Pin'}
                    >
                      <FaThumbtack className={note.isPinned ? 'pinned-icon' : ''} />
                    </button>
                    <button
                      className="note-item-action delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Debugging: Removing confirm to test click registration
                        onDeleteNote(note.id);
                      }}
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                <p className="note-item-content">{truncateContent(note.content)}</p>
                <div className="note-item-footer">
                  <span className="note-item-date">{formatDate(note.updatedAt)}</span>
                  {note.tags && note.tags.length > 0 && (
                    <div className="note-item-tags">
                      {note.tags.slice(0, 2).map((tag, index) => (
                        <span key={index} className="note-item-tag">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleCloseContextMenu}
          options={[
            {
              label: contextMenu.note.isPinned ? 'Unpin Note' : 'Pin Note',
              icon: <FaThumbtack />,
              action: () => onTogglePin(contextMenu.note.id),
            },
            {
              label: 'Export to Markdown',
              icon: <FaDownload />,
              action: () => exportToMarkdown(contextMenu.note),
            },
            {
              label: 'Delete Note',
              icon: <FaTrash />,
              danger: true,
              action: () => {
                if (window.confirm('Are you sure you want to delete this note?')) {
                  onDeleteNote(contextMenu.note.id);
                }
              },
            },
          ]}
        />
      )}
    </motion.div>
  );
};

export default NoteList;

