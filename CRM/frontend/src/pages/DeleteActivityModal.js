// CRM/frontend/src/components/DeleteActivityModal.js

import React, { useState } from 'react';
import { apiFetch } from '../api/api';

function DeleteActivityModal({ activityId, details, onDelete, onClose }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    async function handleDelete() {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await apiFetch(`/api/activities/${activityId}`, { method: 'DELETE' });
            setSuccess('Activity deleted successfully!');
            setTimeout(() => {
                onDelete();
                onClose();
            }, 1200);
        } catch (e) {
            setError(e.message || 'Could not delete activity');
        }
        setLoading(false);
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{ background: '#fff', padding: '2rem', borderRadius: 10, minWidth: '320px' }}>
                <h3>Confirm Delete</h3>
                <p>Are you sure you want to delete this activity?</p>
                <div style={{ marginBottom: '1rem', fontStyle: 'italic' }}>{details}</div>
                <button onClick={handleDelete} disabled={loading} style={{ marginRight: '1rem', padding: '0.5rem 1.5rem', background: '#b00', color: '#fff', border: 'none', borderRadius: '4px' }}>
                    {loading ? 'Deleting...' : 'Delete'}
                </button>
                <button onClick={onClose} style={{ padding: '0.5rem 1.5rem', background: '#eee', border: 'none', borderRadius: '4px' }}>Cancel</button>
                {error && <div style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}
                {success && <div style={{ color: 'green', marginTop: '1rem' }}>{success}</div>}
            </div>
        </div>
    );
}

export default DeleteActivityModal;
