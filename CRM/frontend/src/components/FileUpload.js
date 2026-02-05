// CRM/frontend/src/components/FileUpload.js

import React, { useState } from 'react';
import { apiFetch } from '../api/api';
import Toast from './Toast';

function FileUpload({ targetId, type = 'lead', onUploaded }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const MAX_SIZE_MB = 10; // Example max file size limit (10MB)

    function handleFileChange(e) {
        const f = e.target.files[0];
        if (!f) {
            setFile(null);
            setError('No file selected');
            return;
        }
        // Validate size
        if (f.size > MAX_SIZE_MB * 1024 * 1024) {
            setFile(null);
            setError(`Max file size is ${MAX_SIZE_MB}MB`);
            Toast.error(`Max file size is ${MAX_SIZE_MB}MB`);
            return;
        }
        // Optionally validate type, e.g., CSV, PDF, etc
        // if (!['application/pdf', 'text/csv'].includes(f.type)) { ... }
        setFile(f);
        setError('');
    }

    async function handleUpload(e) {
        e.preventDefault();
        if (!file) {
            setError('Select a file first');
            Toast.error('Select a file first');
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const formData = new FormData();
            formData.append('file', file);
            await apiFetch(`/api/${type}s/${targetId}/upload`, {
                method: 'POST',
                body: formData,
                useFormData: true // Custom hint for API wrapper: bypass JSON
            });
            setSuccess('File uploaded!');
            Toast.success('File uploaded!');
            setFile(null);
            onUploaded?.();
        } catch (e) {
            setError(e.message || 'Upload failed');
            Toast.error(e.message || 'Upload failed');
            console.error('❌ File upload error:', e);
        }
        setLoading(false);
    }

    return (
        <form onSubmit={handleUpload} style={{ marginTop: '1rem' }}>
            <input
                type="file"
                onChange={handleFileChange}
                style={{ marginBottom: '0.7rem' }}
            />
            <button type="submit" disabled={loading || !file} style={{ marginRight: '1rem', padding: '0.4rem 1rem' }}>
                {loading ? 'Uploading...' : 'Upload'}
            </button>
            {success && <span style={{ color: 'green', marginLeft: '1rem' }}>{success}</span>}
            {error && <span style={{ color: 'red', marginLeft: '1rem' }}>{error}</span>}
        </form>
    );
}

export default FileUpload;
