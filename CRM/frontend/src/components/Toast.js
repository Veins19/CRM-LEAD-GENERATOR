// CRM/frontend/src/components/Toast.js

import React, { useEffect } from 'react';

// Usage: <Toast type="success|error|info|warning" message="..." onClose={...} />
function Toast({ type, message, onClose, duration = 3000 }) {
    useEffect(() => {
        if (!message) return;
        const timeout = setTimeout(() => {
            onClose?.();
        }, duration);
        return () => clearTimeout(timeout);
    }, [message, duration, onClose]);

    if (!message) return null;

    let bgColor = '#444';
    if (type === 'success') bgColor = '#3bb273';
    else if (type === 'error') bgColor = '#e54747';
    else if (type === 'info') bgColor = '#209cee';
    else if (type === 'warning') bgColor = '#fca903';

    return (
        <div style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            background: bgColor,
            color: '#fff',
            padding: '1rem 2rem',
            borderRadius: 8,
            zIndex: 2000,
            boxShadow: '0 4px 20px 0 rgba(0,0,0,0.12)',
            minWidth: '200px',
            fontSize: '1rem',
        }}>
            <span>{message}</span>
            <button
                onClick={onClose}
                style={{
                    marginLeft: '1rem',
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '1.2rem'
                }}
                aria-label="Close"
            >
                ×
            </button>
        </div>
    );
}

export default Toast;
