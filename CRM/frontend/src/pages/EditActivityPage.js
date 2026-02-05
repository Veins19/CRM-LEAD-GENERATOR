// frontend/src/pages/EditActivityPage.js

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/api';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { FiActivity, FiUser, FiFileText, FiSave, FiX, FiLink, FiRefreshCw } from 'react-icons/fi';

function EditActivityPage() {
  const { id } = useParams();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchActivity();
  }, [id]);

  async function fetchActivity() {
    setLoading(true);
    try {
      const data = await apiFetch(`/activities/${id}`);
      const act = data.activity;
      setActivity({
        ...act,
        lead: act.lead?._id || act.lead || '',
        user: act.user?._id || act.user || '',
      });
    } catch (error) {
      console.error('❌ Error fetching activity:', error.message);
      toast.error(error.message || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    try {
      await apiFetch(`/activities/${id}`, {
        method: 'PUT',
        body: activity,
      });
      toast.success('Activity updated successfully!');
      setTimeout(() => navigate('/activities'), 1000);
    } catch (error) {
      console.error('❌ Error updating activity:', error.message);
      toast.error(error.message || 'Failed to update activity');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }}></div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '1rem' }}>Activity not found</h2>
        <Button onClick={() => navigate('/activities')} variant="primary">Back to Activities</Button>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: '4rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 80px)' }}>
      <Card className="w-full max-w-lg" style={{ maxWidth: '700px', width: '100%' }}>
        
        <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)', margin: 0 }}>Edit Activity</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Update the details of this event.</p>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <Input
              label="Activity Type"
              type="select"
              value={activity.type || ''}
              onChange={(e) => setActivity({ ...activity, type: e.target.value })}
              options={[
                { value: 'Call', label: 'Call' },
                { value: 'Meeting', label: 'Meeting' },
                { value: 'Email', label: 'Email' },
                { value: 'Note', label: 'Note' },
                { value: 'Status Change', label: 'Status Change' },
                { value: 'Create', label: 'Create' },
                { value: 'Edit', label: 'Edit' },
              ]}
              required
              icon={<FiActivity />}
            />
            <Input
              label="Lead ID"
              value={activity.lead || ''}
              onChange={(e) => setActivity({ ...activity, lead: e.target.value })}
              icon={<FiLink />}
            />
          </div>

          <Input
            label="Details"
            type="textarea"
            placeholder="Describe what happened..."
            value={activity.details || ''}
            onChange={(e) => setActivity({ ...activity, details: e.target.value })}
            required
            rows={4}
            icon={<FiFileText />}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
            <Input
              label="Status Before"
              value={activity.statusBefore || ''}
              onChange={(e) => setActivity({ ...activity, statusBefore: e.target.value })}
              icon={<FiRefreshCw />}
            />
            <Input
              label="Status After"
              value={activity.statusAfter || ''}
              onChange={(e) => setActivity({ ...activity, statusAfter: e.target.value })}
              icon={<FiRefreshCw />}
            />
          </div>

          {/* Hidden/Read-only User Field */}
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
              loading={saving}
              style={{ flex: 1 }}
              icon={<FiSave />}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default EditActivityPage;
