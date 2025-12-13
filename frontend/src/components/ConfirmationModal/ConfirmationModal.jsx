import React from 'react';
import { motion } from 'framer-motion';
import './ConfirmationModal.css';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="modal glass-panel confirmation-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
            >
                <h2 className="text-gradient">{title || 'CONFIRM ACTION'}</h2>
                <p>{message || 'Are you sure you want to proceed?'}</p>
                <div className="modal-actions">
                    <button className="btn-cyber danger" onClick={onConfirm}>
                        CONFIRM DELETE
                    </button>
                    <button className="btn-cyber secondary" onClick={onClose}>
                        CANCEL
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default ConfirmationModal;
