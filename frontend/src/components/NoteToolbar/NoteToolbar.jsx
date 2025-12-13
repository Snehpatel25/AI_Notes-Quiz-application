import React from 'react';
import { FaPlus, FaSearch } from 'react-icons/fa';
import { motion } from 'framer-motion';
import './NoteToolbar.css';

const NoteToolbar = ({ onCreateNote, onSearch, searchQuery }) => {
  return (
    <motion.div
      className="note-toolbar"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <button className="create-note-button" onClick={onCreateNote} title="Create New Note">
        <FaPlus />
        <span>New Note</span>
      </button>
      <div className="search-container">
        <FaSearch className="search-icon" />
        <input
          type="text"
          placeholder="SEARCH DATABASE..."
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          className="search-input"
        />
      </div>
    </motion.div>
  );
};

export default NoteToolbar;





