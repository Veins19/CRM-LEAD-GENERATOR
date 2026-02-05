// CRM/frontend/src/components/ChangePasswordModal.js

import React, { useState } from 'react';
import { apiFetch } from '../api/api';
import Toast from './Toast';

function ChangePasswordModal({ onClose, onChanged }) {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    async function handleChange(e) {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            Toast.error('Passwords do not match');
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await apiFetch('/api/users/self/password', {
                method: 'PUT',
                body: { oldPassword, newPassword }
            });
            setSuccess('Password changed!');
            Toast.success('Password changed successfully!');
            setTimeout(() => {
                onChanged?.();
                onClose();
            }, 1000);
        } catch (e) {
            setError(e.message || 'Could not change password');
            Toast.error(e.message || 'Could not change password');
            console.error('❌ Change password error:', e);
        }
        setLoading(false);
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <form onSubmit={handleChange} style={{ background: '#fff', padding: '2rem', borderRadius: 10, minWidth: '340px' }}>
                <h3>Change Password</h3>
                <div style={{ marginBottom: '1rem' }}>
                    <label>Old Password:</label>
                    <input
                        type="password"
                        value={oldPassword}
                        onChange={e => setOldPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.5rem' }}
                    />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label>New Password:</label>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.5rem' }}
                    />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label>Confirm New Password:</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.5rem' }}
                    />
                </div>
                <button type="submit" disabled={loading} style={{ marginRight: '1rem', padding: '0.5rem 1.5rem', background: '#298cff', color: '#fff', border: 'none', borderRadius: '4px' }}>
                    {loading ? 'Saving...' : 'Change'}
                </button>
                <button onClick={onClose} type="button" style={{ padding: '0.5rem 1.5rem', background: '#eee', border: 'none', borderRadius: '4px' }}>Cancel</button>
                {error && <div style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}
                {success && <div style={{ color: 'green', marginTop: '1rem' }}>{success}</div>}
            </form>
        </div>
    );
}

export default ChangePasswordModal;
