// CRM/frontend/src/components/BulkLeadActionsModal.js

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/api';
import Toast from './Toast';

function BulkLeadActionsModal({ selectedIds, onDone, onClose }) {
    const [action, setAction] = useState('');
    const [users, setUsers] = useState([]);
    const [assignUser, setAssignUser] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        async function fetchUsers() {
            if (action === 'assign') {
                try {
                    const data = await apiFetch('/api/users');
                    setUsers(data.users || []);
                } catch (e) {
                    setUsers([]);
                    Toast.error(e.message || 'Failed to load users');
                    setError(e.message || 'Failed to load users');
                    console.error('❌ Bulk assign load users error:', e);
                }
            }
        }
        fetchUsers();
    }, [action]);

    async function handleBulkAction() {
        setProcessing(true);
        setError('');
        setSuccess('');
        try {
            if (action === 'assign') {
                if (!assignUser) {
                    setError('Select a user to assign');
                    Toast.error('Select a user to assign');
                    setProcessing(false);
                    return;
                }
                await apiFetch('/api/leads/bulk-assign', {
                    method: 'PUT',
                    body: { leadIds: selectedIds, assignedTo: assignUser },
                });
                setSuccess('Leads assigned!');
                Toast.success('Leads assigned!');
            } else if (action === 'archive') {
                await apiFetch('/api/leads/bulk-archive', {
                    method: 'PUT',
                    body: { leadIds: selectedIds },
                });
                setSuccess('Leads archived!');
                Toast.success('Leads archived!');
            } else if (action === 'delete') {
                await apiFetch('/api/leads/bulk-delete', {
                    method: 'DELETE',
                    body: { leadIds: selectedIds },
                });
                setSuccess('Leads deleted!');
                Toast.success('Leads deleted!');
            } else {
                setError('Select an action');
                Toast.error('Select an action');
                setProcessing(false);
                return;
            }
            setTimeout(() => {
                onDone();
                onClose();
            }, 1000);
        } catch (e) {
            setError(e.message || 'Bulk action failed');
            Toast.error(e.message || 'Bulk action failed');
            console.error('❌ Bulk lead action error:', e);
        }
        setProcessing(false);
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{ background: '#fff', padding: '2rem', borderRadius: 10, minWidth: '360px' }}>
                <h3>Bulk Lead Actions</h3>
                <div style={{ marginBottom: '1rem' }}>
                    <strong>Selected Leads:</strong> {selectedIds.length}
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <select value={action} onChange={e => setAction(e.target.value)} style={{ width: '100%', padding: '0.5rem' }}>
                        <option value="">Select Action</option>
                        <option value="assign">Assign to User</option>
                        <option value="archive">Archive</option>
                        <option value="delete">Delete</option>
                    </select>
                </div>
                {action === 'assign' && (
                    <div style={{ marginBottom: '1rem' }}>
                        <select value={assignUser} onChange={e => setAssignUser(e.target.value)} style={{ width: '100%', padding: '0.5rem' }}>
                            <option value="">Select User</option>
                            {users.map(u => (
                                <option key={u._id} value={u._id}>{u.username} ({u.role})</option>
                            ))}
                        </select>
                    </div>
                )}
                <button onClick={handleBulkAction} disabled={processing || selectedIds.length === 0} style={{ marginRight: '1rem', padding: '0.5rem 1.5rem', background: '#298cff', color: '#fff', border: 'none', borderRadius: '4px' }}>
                    {processing ? 'Processing...' : 'Execute'}
                </button>
                <button onClick={onClose} style={{ padding: '0.5rem 1.5rem', background: '#eee', border: 'none', borderRadius: '4px' }}>Cancel</button>
                {error && <div style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}
                {success && <div style={{ color: 'green', marginTop: '1rem' }}>{success}</div>}
            </div>
        </div>
    );
}

export default BulkLeadActionsModal;
