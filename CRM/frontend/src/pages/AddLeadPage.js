// frontend/src/pages/AddLeadPage.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/api';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { FiUser, FiMail, FiPhone, FiBriefcase, FiTag, FiFileText, FiSave, FiX } from 'react-icons/fi';

function AddLeadPage() {
  const [lead, setLead] = useState({
    name: '',
    email: '',
    contact: '',
    company: '',
    status: 'New',
    notes: '',
    tags: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert comma-separated string to array
      const tagsArray = lead.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
      
      await apiFetch('/leads', {
        method: 'POST',
        body: { ...lead, tags: tagsArray },
      });
      toast.success('Lead created successfully!');
      navigate('/leads');
    } catch (error) {
      console.error('❌ Error creating lead:', error.message);
      toast.error(error.message || 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ paddingBottom: '4rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 80px)' }}>
      <Card className="w-full max-w-lg" style={{ maxWidth: '700px', width: '100%' }}>
        <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)', margin: 0 }}>Add New Lead</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Enter the details of the potential client.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <Input
              label="Name"
              placeholder="John Doe"
              value={lead.name}
              onChange={(e) => setLead({ ...lead, name: e.target.value })}
              required
              icon={<FiUser />}
            />
            <Input
              label="Email"
              type="email"
              placeholder="john@example.com"
              value={lead.email}
              onChange={(e) => setLead({ ...lead, email: e.target.value })}
              required
              icon={<FiMail />}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <Input
              label="Contact"
              placeholder="+1 234 567 8900"
              value={lead.contact}
              onChange={(e) => setLead({ ...lead, contact: e.target.value })}
              required
              icon={<FiPhone />}
            />
            <Input
              label="Company"
              placeholder="Acme Inc."
              value={lead.company}
              onChange={(e) => setLead({ ...lead, company: e.target.value })}
              icon={<FiBriefcase />}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <Input
              label="Status"
              type="select"
              value={lead.status}
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
                value={lead.tags}
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
            value={lead.notes}
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
              loading={loading}
              style={{ flex: 1 }}
              icon={<FiSave />}
            >
              Save Lead
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default AddLeadPage;
