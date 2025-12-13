import React from 'react';
import { FaTimes } from 'react-icons/fa';
import { motion } from 'framer-motion';
import './GlossaryPopup.css';

const GlossaryPopup = ({ term, definition, onClose }) => {
  return (
    <motion.div
      className="glossary-popup-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="glossary-popup"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <button className="glossary-popup-close" onClick={onClose}>
          <FaTimes />
        </button>
        <h3 className="glossary-popup-term">{term}</h3>
        <p className="glossary-popup-definition">{definition}</p>
      </motion.div>
    </motion.div>
  );
};

export default GlossaryPopup;





