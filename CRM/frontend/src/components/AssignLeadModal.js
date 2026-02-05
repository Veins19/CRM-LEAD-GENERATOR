// CRM/frontend/src/components/AssignLeadModal.js

import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/api';
import Toast from './Toast';

function AssignLeadModal({ leadId, currentAssignee, onAssigned, onClose }) {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        async function fetchUsers() {
            setLoading(true);
            setError('');
            try {
                const data = await apiFetch('/api/users');
                setUsers(data.users || []);
            } catch (e) {
                setError(e.message || 'Failed to load users');
                Toast.error(e.message || 'Failed to load users');
                console.error('❌ Fetch users error:', e);
            }
            setLoading(false);
        }
        fetchUsers();
    }, []);

    async function handleAssign() {
        if (!selectedUser) {
            setError('Select a user');
            Toast.error('Select a user');
            return;
        }
        setAssigning(true);
        setError('');
        setSuccess('');
        try {
            await apiFetch(`/api/leads/${leadId}/assign`, {
                method: 'PUT',
                body: { assignedTo: selectedUser }
            });
            setSuccess('Lead assigned!');
            Toast.success('Lead assigned!');
            setTimeout(() => {
                onAssigned();
                onClose();
            }, 1000);
        } catch (e) {
            setError(e.message || 'Failed to assign lead');
            Toast.error(e.message || 'Failed to assign lead');
            console.error('❌ Assign lead error:', e);
        }
        setAssigning(false);
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{ background: '#fff', padding: '2rem', borderRadius: 10, minWidth: '340px' }}>
                <h3>Assign Lead</h3>
                <div style={{ marginBottom: '1rem' }}>
                    <strong>Current:</strong> {currentAssignee ? currentAssignee.username : '—'}
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <select
                        value={selectedUser}
                        onChange={e => setSelectedUser(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem' }}
                    >
                        <option value="">Select User</option>
                        {users.map(u => (
                            <option key={u._id} value={u._id}>{u.username} ({u.role})</option>
                        ))}
                    </select>
                </div>
                <button onClick={handleAssign} disabled={assigning || loading} style={{ marginRight: '1rem', padding: '0.5rem 1.5rem', background: '#298cff', color: '#fff', border: 'none', borderRadius: '4px' }}>
                    {assigning ? 'Assigning...' : 'Assign'}
                </button>
                <button onClick={onClose} style={{ padding: '0.5rem 1.5rem', background: '#eee', border: 'none', borderRadius: '4px' }}>Cancel</button>
                {error && <div style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}
                {success && <div style={{ color: 'green', marginTop: '1rem' }}>{success}</div>}
            </div>
        </div>
    );
}

export default AssignLeadModal;
