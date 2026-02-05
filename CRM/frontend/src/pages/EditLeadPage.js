// frontend/src/pages/EditLeadPage.js

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/api';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { FiUser, FiMail, FiPhone, FiBriefcase, FiTag, FiFileText, FiSave, FiX } from 'react-icons/fi';

function EditLeadPage() {
  const { id } = useParams();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLead();
  }, [id]);

  async function fetchLead() {
    setLoading(true);
    try {
      const data = await apiFetch(`/leads/${id}`);
      const leadData = {
          ...data.lead,
          tags: data.lead.tags ? data.lead.tags.join(', ') : ''
      };
      setLead(leadData);
    } catch (error) {
      console.error('❌ Error fetching lead:', error.message);
      toast.error(error.message || 'Failed to load lead');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const tagsArray = typeof lead.tags === 'string' ? lead.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : lead.tags;

      await apiFetch(`/leads/${id}`, {
        method: 'PUT',
        body: { ...lead, tags: tagsArray },
      });
      toast.success('Lead updated successfully!');
      navigate('/leads');
    } catch (error) {
      console.error('❌ Error updating lead:', error.message);
      toast.error(error.message || 'Failed to update lead');
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

  if (!lead) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '1rem' }}>Lead not found</h2>
        <Button onClick={() => navigate('/leads')} variant="primary">Back to Leads</Button>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: '4rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 80px)' }}>
      <Card className="w-full max-w-lg" style={{ maxWidth: '700px', width: '100%' }}>
        <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)', margin: 0 }}>Edit Lead</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Update client details and status.</p>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <Input
              label="Name"
              placeholder="John Doe"
              value={lead.name || ''}
              onChange={(e) => setLead({ ...lead, name: e.target.value })}
              required
              icon={<FiUser />}
            />
            <Input
              label="Email"
              type="email"
              placeholder="john@example.com"
              value={lead.email || ''}
              onChange={(e) => setLead({ ...lead, email: e.target.value })}
              required
              icon={<FiMail />}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <Input
              label="Contact"
              placeholder="+1 234 567 8900"
              value={lead.contact || ''}
              onChange={(e) => setLead({ ...lead, contact: e.target.value })}
              required
              icon={<FiPhone />}
            />
            <Input
              label="Company"
              placeholder="Acme Inc."
              value={lead.company || ''}
              onChange={(e) => setLead({ ...lead, company: e.target.value })}
              icon={<FiBriefcase />}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <Input
              label="Status"
              type="select"
              value={lead.status || 'New'}
              onChange={(e) => setLead({ ...lead, status: e.target.value })}
              options={[
                { value: 'New', label: 'New' },
                { value: 'Contacted', label: 'Contacted' },
                { value: 'Qualified', label: 'Qualified' },
                { value: 'Won', label: 'Won' },
                { value: 'Lost', label: 'Lost' },
              ]}
            />
            <div>
                <Input
                label="Tags"
                placeholder="tech, urgent, referral"
                value={lead.tags || ''}
                onChange={(e) => setLead({ ...lead, tags: e.target.value })}
                icon={<FiTag />}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-0.5rem', marginLeft: '0.5rem' }}>Comma separated</p>
            </div>
          </div>

          <Input
            label="Notes"
            type="textarea"
            placeholder="Any specific requirements or details..."
            value={lead.notes || ''}
            onChange={(e) => setLead({ ...lead, notes: e.target.value })}
            rows={4}
            icon={<FiFileText />}
          />

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/leads')}
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

export default EditLeadPage;
