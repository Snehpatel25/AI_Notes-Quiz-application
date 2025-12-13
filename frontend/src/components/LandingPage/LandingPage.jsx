import React from 'react';
import { motion } from 'framer-motion';
import './LandingPage.css';

const LandingPage = ({ onEnter }) => {
    return (
        <div className="landing-container">
            <div className="cyber-grid-bg"></div>

            <motion.div
                className="landing-content"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                <motion.div
                    className="hero-section"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.8 }}
                >
                    <h1 className="hero-title text-gradient">
                        CYBER<span className="neon-text">NOTES</span>
                    </h1>
                    <p className="hero-subtitle">
                        NEXT-GEN NEURAL INTERFACE FOR THOUGHT ORGANIZATION
                    </p>

                    <motion.button
                        className="btn-enter"
                        onClick={onEnter}
                        whileHover={{ scale: 1.05, boxShadow: "0 0 30px var(--primary-glow)" }}
                        whileTap={{ scale: 0.95 }}
                    >
                        ENTER SYSTEM_
                    </motion.button>
                </motion.div>

                <div className="features-grid">
                    {[
                        { title: 'AI ANALYSIS', icon: '🧠', desc: 'Real-time sentiment & entity extraction' },
                        { title: 'SECURE VAULT', icon: '🔒', desc: 'Military-grade AES encryption' },
                        { title: 'NEURAL SYNC', icon: '⚡', desc: 'Instant cloud synchronization' }
                    ].map((feature, index) => (
                        <motion.div
                            key={index}
                            className="feature-card glass-panel"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + (index * 0.1) }}
                        >
                            <div className="feature-icon">{feature.icon}</div>
                            <h3>{feature.title}</h3>
                            <p>{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

export default LandingPage;
