// frontend/src/pages/AddUserPage.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/api';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import {
  FiUser,
  FiMail,
  FiLock,
  FiShield,
  FiUserPlus,
  FiX,
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

function AddUserPage() {
  const [user, setUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'Executive',
    specialization: 'General',
    max_active_leads: 0,
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    // Password validation
    if (!user.password || user.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      await apiFetch('/users', {
        method: 'POST',
        body: {
          username: user.username,
          email: user.email,
          password: user.password,
          role: user.role,
          specialization: user.specialization || 'General',
          max_active_leads:
            user.max_active_leads === '' || user.max_active_leads == null
              ? 0
              : Number(user.max_active_leads),
        },
      });
      toast.success('User created successfully!');
      setTimeout(() => navigate('/users'), 1000);
    } catch (error) {
      console.error('❌ Error creating user:', error.message);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
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
            Add New User
          </h2>
          <p
            style={{
              color: 'var(--text-secondary)',
              marginTop: '0.5rem',
            }}
          >
            Create a new account for a team member and configure their specialization.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
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
              value={user.username}
              onChange={(e) => setUser({ ...user, username: e.target.value })}
              required
              icon={<FiUser />}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="john@example.com"
              value={user.email}
              onChange={(e) => setUser({ ...user, email: e.target.value })}
              required
              icon={<FiMail />}
            />
          </div>

          {/* Auth + Role */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem',
              marginTop: '1.5rem',
            }}
          >
            <Input
              label="Password"
              type="password"
              placeholder="Min 6 characters"
              value={user.password}
              onChange={(e) => setUser({ ...user, password: e.target.value })}
              required
              icon={<FiLock />}
            />
            <Input
              label="Role"
              type="select"
              value={user.role}
              onChange={(e) => setUser({ ...user, role: e.target.value })}
              options={[
                { value: 'Executive', label: 'Executive' },
                { value: 'Admin', label: 'Admin' },
              ]}
              icon={<FiShield />}
            />
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
              value={user.specialization}
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
              loading={loading}
              style={{ flex: 1 }}
              icon={<FiUserPlus />}
            >
              Create User
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default AddUserPage;
