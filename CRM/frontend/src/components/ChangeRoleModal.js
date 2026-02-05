// CRM/frontend/src/components/ChangeRoleModal.js

import React, { useState } from 'react';
import { apiFetch } from '../api/api';
import Toast from './Toast';

function ChangeRoleModal({ userId, currentRole, username, onRoleChanged, onClose }) {
    const [role, setRole] = useState(currentRole || 'Executive');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    async function handleRoleChange(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await apiFetch(`/api/users/${userId}/role`, {
                method: 'PUT',
                body: { role }
            });
            setSuccess('Role changed!');
            Toast.success('Role successfully changed');
            setTimeout(() => {
                onRoleChanged?.(role); // Pass new role for UI update if needed
                onClose();
            }, 1000);
        } catch (e) {
            setError(e.message || 'Failed to change role');
            Toast.error(e.message || 'Failed to change role');
            console.error('❌ Role change error:', e);
        }
        setLoading(false);
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <form onSubmit={handleRoleChange} style={{ background: '#fff', padding: '2rem', borderRadius: 10, minWidth: '340px' }}>
                <h3>Change User Role</h3>
                <div style={{ marginBottom: '1rem' }}>
                    <strong>{username}</strong>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: '0.5rem' }}>
                        <option value="Admin">Admin</option>
                        <option value="Executive">Executive</option>
                    </select>
                </div>
                <button type="submit" disabled={loading} style={{ marginRight: '1rem', padding: '0.5rem 1.2rem', background: '#298cff', color: '#fff', border: 'none', borderRadius: '4px' }}>
                    {loading ? 'Saving...' : 'Save'}
                </button>
                <button onClick={onClose} type="button" style={{ padding: '0.5rem 1.2rem', background: '#eee', border: 'none', borderRadius: '4px' }}>Cancel</button>
                {error && <div style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}
                {success && <div style={{ color: 'green', marginTop: '1rem' }}>{success}</div>}
            </form>
        </div>
    );
}

export default ChangeRoleModal;
