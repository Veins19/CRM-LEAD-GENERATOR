// CRM/frontend/src/components/LogActivityModal.js

import React, { useState } from 'react';
import { apiFetch } from '../api/api';

function LogActivityModal({ defaultLeadId, defaultUserId, onLogged, onClose }) {
    const [activity, setActivity] = useState({
        type: '',
        details: '',
        lead: defaultLeadId || '',
        user: defaultUserId || '',
        statusBefore: '',
        statusAfter: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    async function handleLog() {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await apiFetch('/api/activities', {
                method: 'POST',
                body: activity,
            });
            setSuccess('Activity logged!');
            setTimeout(() => {
                onLogged?.();
                onClose?.();
            }, 1000);
        } catch (e) {
            setError(e.message || 'Could not log activity');
        }
        setLoading(false);
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{ background: '#fff', padding: '2rem', borderRadius: 10, minWidth: '340px' }}>
                <h3>Log Activity</h3>
                <div style={{ marginBottom: '1rem' }}>
                    <label>Type:</label>
                    <select
                        value={activity.type}
                        onChange={e => setActivity({ ...activity, type: e.target.value })}
                        required
                        style={{ width: '100%', padding: '0.5rem' }}
                    >
                        <option value="">Select Type</option>
                        <option value="Create">Create</option>
                        <option value="Edit">Edit</option>
                        <option value="Status Change">Status Change</option>
                        <option value="Archive">Archive</option>
                        <option value="Restore">Restore</option>
                        <option value="Delete">Delete</option>
                    </select>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label>Details:</label>
                    <textarea
                        value={activity.details}
                        onChange={e => setActivity({ ...activity, details: e.target.value })}
                        style={{ width: '100%', padding: '0.5rem' }}
                    />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label>Lead ID:</label>
                    <input
                        type="text"
                        value={activity.lead}
                        onChange={e => setActivity({ ...activity, lead: e.target.value })}
                        style={{ width: '100%', padding: '0.5rem' }}
                    />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label>User ID:</label>
                    <input
                        type="text"
                        value={activity.user}
                        onChange={e => setActivity({ ...activity, user: e.target.value })}
                        style={{ width: '100%', padding: '0.5rem' }}
                    />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label>Status Before:</label>
                    <input
                        type="text"
                        value={activity.statusBefore}
                        onChange={e => setActivity({ ...activity, statusBefore: e.target.value })}
                        style={{ width: '100%', padding: '0.5rem' }}
                    />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label>Status After:</label>
                    <input
                        type="text"
                        value={activity.statusAfter}
                        onChange={e => setActivity({ ...activity, statusAfter: e.target.value })}
                        style={{ width: '100%', padding: '0.5rem' }}
                    />
                </div>
                <button onClick={handleLog} disabled={loading} style={{ marginRight: '1rem', padding: '0.5rem 1.5rem', background: '#298cff', color: '#fff', border: 'none', borderRadius: '4px' }}>
                    {loading ? 'Logging...' : 'Log Activity'}
                </button>
                <button onClick={onClose} style={{ padding: '0.5rem 1.5rem', background: '#eee', border: 'none', borderRadius: '4px' }}>Cancel</button>
                {error && <div style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}
                {success && <div style={{ color: 'green', marginTop: '1rem' }}>{success}</div>}
            </div>
        </div>
    );
}

export default LogActivityModal;
