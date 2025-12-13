import React, { useEffect, useRef } from 'react';
import './ContextMenu.css';

const ContextMenu = ({ x, y, options, onClose }) => {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            className="context-menu glass-panel"
            style={{ top: y, left: x }}
        >
            {options.map((option, index) => (
                <div
                    key={index}
                    className={`context-menu-item ${option.danger ? 'danger' : ''}`}
                    onClick={() => {
                        option.action();
                        onClose();
                    }}
                >
                    <span className="icon">{option.icon}</span>
                    {option.label}
                </div>
            ))}
        </div>
    );
};

export default ContextMenu;
