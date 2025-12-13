import React, { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaRobot, FaTimes } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { chatWithNote } from '../../services/aiService';
import './AIChat.css';

const AIChat = ({ noteContent, onClose }) => {
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hello! I have analyzed this note. Ask me anything about it.' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await chatWithNote(noteContent, input);
            setMessages(prev => [...prev, { role: 'assistant', text: response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I encountered an error processing your request.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            className="ai-chat-panel glass-panel"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
        >
            <div className="ai-chat-header">
                <div className="ai-chat-title">
                    <FaRobot className="ai-icon" />
                    <span>AI ASSISTANT</span>
                </div>
                <button onClick={onClose} className="close-button">
                    <FaTimes />
                </button>
            </div>

            <div className="ai-chat-messages">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.role}`}>
                        <div className="message-content">{msg.text}</div>
                    </div>
                ))}
                {loading && (
                    <div className="message assistant">
                        <div className="typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="ai-chat-input-area">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about this note..."
                    className="ai-chat-input"
                />
                <button type="submit" className="send-button" disabled={loading || !input.trim()}>
                    <FaPaperPlane />
                </button>
            </form>
        </motion.div>
    );
};

export default AIChat;
