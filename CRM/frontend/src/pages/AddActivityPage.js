// frontend/src/pages/AddActivityPage.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/api';
import { getUser } from '../api/auth';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { FiActivity, FiUser, FiFileText, FiSave, FiX, FiLink, FiRefreshCw } from 'react-icons/fi';

function AddActivityPage() {
  const currentUser = getUser();
  const [activity, setActivity] = useState({
    type: 'Note',
    details: '',
    lead: '',
    user: currentUser ? currentUser.id : '',
    statusBefore: '',
    statusAfter: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      await apiFetch('/activities', {
        method: 'POST',
        body: activity,
      });
      toast.success('Activity logged successfully!');
      setTimeout(() => navigate('/activities'), 1000);
    } catch (error) {
      console.error('❌ Error creating activity:', error.message);
      toast.error(error.message || 'Failed to create activity');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ paddingBottom: '4rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 80px)' }}>
      <Card className="w-full max-w-lg" style={{ maxWidth: '700px', width: '100%' }}>
        
        <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)', margin: 0 }}>Log Activity</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Record a new interaction or event.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <Input
              label="Activity Type"
              type="select"
              value={activity.type}
              onChange={(e) => setActivity({ ...activity, type: e.target.value })}
              options={[
                { value: 'Call', label: 'Call' },
                { value: 'Meeting', label: 'Meeting' },
                { value: 'Email', label: 'Email' },
                { value: 'Note', label: 'Note' },
                { value: 'Status Change', label: 'Status Change' },
              ]}
              required
              icon={<FiActivity />}
            />
            <Input
              label="Lead ID"
              placeholder="Related Lead ID"
              value={activity.lead}
              onChange={(e) => setActivity({ ...activity, lead: e.target.value })}
              required
              icon={<FiLink />}
            />
          </div>

          <Input
            label="Details"
            type="textarea"
            placeholder="Describe what happened..."
            value={activity.details}
            onChange={(e) => setActivity({ ...activity, details: e.target.value })}
            required
            rows={4}
            icon={<FiFileText />}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
            <Input
              label="Status Before (Optional)"
              placeholder="e.g. New"
              value={activity.statusBefore}
              onChange={(e) => setActivity({ ...activity, statusBefore: e.target.value })}
              icon={<FiRefreshCw />}
            />
            <Input
              label="Status After (Optional)"
              placeholder="e.g. Contacted"
              value={activity.statusAfter}
              onChange={(e) => setActivity({ ...activity, statusAfter: e.target.value })}
              icon={<FiRefreshCw />}
            />
          </div>

          {/* Hidden/Read-only User Field (optional visibility) */}
          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--bg-body)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <FiUser /> Logged by User ID: <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{activity.user}</span>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/activities')}
              style={{ flex: 1 }}
              icon={<FiX />}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              style={{ flex: 1 }}
              icon={<FiSave />}
            >
              Save Activity
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default AddActivityPage;
