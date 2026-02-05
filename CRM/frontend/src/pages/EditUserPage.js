// frontend/src/pages/EditUserPage.js

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/api';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import {
  FiUser,
  FiMail,
  FiShield,
  FiSave,
  FiX,
  FiCheckCircle,
} from 'react-icons/fi';

const SPECIALIZATION_OPTIONS = [
  { value: 'General', label: 'General (All Services)' },
  { value: 'Website Optimization', label: 'Website Optimization' },
  { value: 'SEO Engineering', label: 'SEO Engineering' },
  { value: 'Digital Marketing', label: 'Digital Marketing' },
  { value: 'AI Automation', label: 'AI Automation' },
  { value: 'Custom Website Development', label: 'Custom Website Development' },
  { value: 'Conversion Optimization', label: 'Conversion Optimization' },
  { value: 'Analytics Implementation', label: 'Analytics Implementation' },
  { value: 'Content Strategy', label: 'Content Strategy' },
];

function EditUserPage() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
    // eslint-disable-next-line  
  }, [id]);

  async function fetchUser() {
    setLoading(true);
    try {
      const data = await apiFetch(`/users/${id}`);
      // Ensure specialization and capacity have safe defaults
      setUser({
        ...data.user,
        specialization: data.user.specialization || 'General',
        max_active_leads:
          typeof data.user.max_active_leads === 'number'
            ? data.user.max_active_leads
            : 0,
        current_active_leads:
          typeof data.user.current_active_leads === 'number'
            ? data.user.current_active_leads
            : 0,
      });
    } catch (error) {
      console.error('❌ Error fetching user:', error.message);
      toast.error(error.message || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    try {
      await apiFetch(`/users/${id}`, {
        method: 'PUT',
        body: {
          username: user.username,
          email: user.email,
          role: user.role,
          active: user.active,
          specialization: user.specialization || 'General',
          max_active_leads:
            user.max_active_leads === '' || user.max_active_leads == null
              ? 0
              : Number(user.max_active_leads),
        },
      });
      toast.success('User updated successfully!');
      navigate('/users');
    } catch (error) {
      console.error('❌ Error updating user:', error.message);
      toast.error(error.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          paddingTop: '4rem',
        }}
      >
        <div
          className="animate-spin"
          style={{
            width: '40px',
            height: '40px',
            border: '4px solid var(--border)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
          }}
        ></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: 'var(--text-primary)',
            marginBottom: '1rem',
          }}
        >
          User not found
        </h2>
        <Button onClick={() => navigate('/users')} variant="primary">
          Back to Users
        </Button>
      </div>
    );
  }

  return (
    <div
      className="container"
      style={{
        paddingBottom: '4rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 80px)',
      }}
    >
      <Card className="w-full max-w-lg" style={{ maxWidth: '600px', width: '100%' }}>
        <div
          style={{
            marginBottom: '2rem',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '1rem',
          }}
        >
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: 'var(--primary)',
              margin: 0,
            }}
          >
            Edit User
          </h2>
          <p
            style={{
              color: 'var(--text-secondary)',
              marginTop: '0.5rem',
            }}
          >
            Update account details, specialization, and permissions.
          </p>
        </div>

        <form onSubmit={handleSave}>
          {/* Basic info */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem',
            }}
          >
            <Input
              label="Username"
              placeholder="johndoe"
              value={user.username || ''}
              onChange={(e) => setUser({ ...user, username: e.target.value })}
              required
              icon={<FiUser />}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="john@example.com"
              value={user.email || ''}
              onChange={(e) => setUser({ ...user, email: e.target.value })}
              required
              icon={<FiMail />}
            />
          </div>

          {/* Role + Status */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem',
              marginTop: '1.5rem',
            }}
          >
            <Input
              label="Role"
              type="select"
              value={user.role || 'Executive'}
              onChange={(e) => setUser({ ...user, role: e.target.value })}
              options={[
                { value: 'Executive', label: 'Executive' },
                { value: 'Admin', label: 'Admin' },
              ]}
              icon={<FiShield />}
            />

            {/* Custom Checkbox Styling for Active */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  fontSize: '0.95rem',
                  color: 'var(--text-secondary)',
                }}
              >
                Account Status
              </label>
              <div
                onClick={() => setUser({ ...user, active: !user.active })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: `1px solid ${
                    user.active ? 'var(--success)' : 'var(--border)'
                  }`,
                  backgroundColor: user.active
                    ? 'rgba(16, 185, 129, 0.05)'
                    : 'var(--bg-input)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    border: `2px solid ${
                      user.active ? 'var(--success)' : 'var(--text-muted)'
                    }`,
                    backgroundColor: user.active
                      ? 'var(--success)'
                      : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '14px',
                  }}
                >
                  {user.active && <FiCheckCircle />}
                </div>
                <span
                  style={{
                    fontWeight: '500',
                    color: user.active
                      ? 'var(--success)'
                      : 'var(--text-muted)',
                  }}
                >
                  {user.active ? 'Active User' : 'Inactive User'}
                </span>
              </div>
            </div>
          </div>

          {/* Specialization + Capacity */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 0.6fr',
              gap: '1.5rem',
              marginTop: '1.5rem',
            }}
          >
            <Input
              label="Specialization"
              type="select"
              value={user.specialization || 'General'}
              onChange={(e) =>
                setUser({ ...user, specialization: e.target.value })
              }
              options={SPECIALIZATION_OPTIONS}
            />

            <Input
              label="Max Active Leads (0 = unlimited)"
              type="number"
              min={0}
              value={
                user.max_active_leads === 0 || user.max_active_leads == null
                  ? 0
                  : user.max_active_leads
              }
              onChange={(e) =>
                setUser({
                  ...user,
                  max_active_leads:
                    e.target.value === '' ? '' : Number(e.target.value),
                })
              }
            />
          </div>

          {/* Optional: show current load for context */}
          <div
            style={{
              marginTop: '0.75rem',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
            }}
          >
            Current active leads assigned:{' '}
            <strong>{user.current_active_leads ?? 0}</strong>
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              marginTop: '2rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border)',
            }}
          >
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/users')}
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

export default EditUserPage;
