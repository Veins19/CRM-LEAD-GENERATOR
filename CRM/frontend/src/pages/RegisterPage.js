// frontend/src/pages/RegisterPage.js

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { FiUser, FiMail, FiLock, FiShield, FiUserPlus } from 'react-icons/fi';

function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Executive');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    // Basic validation
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const res = await register(username, email, password, role);
      if (res.success) {
        toast.success('Registration successful! Redirecting...');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        toast.error(res.message || 'Registration failed');
      }
    } catch (error) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-body)',
        padding: '1rem',
      }}
    >
      <Card className="w-full max-w-md" style={{ maxWidth: '500px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '0.5rem' }}>
            CRMBuddy.
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Create a new account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            label="Username"
            type="text"
            placeholder="johndoe"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            icon={<FiUser />}
          />

          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            icon={<FiMail />}
          />

          <Input
            label="Password"
            type="password"
            placeholder="•••••••• (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            icon={<FiLock />}
          />

          <Input
            label="Role"
            type="select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={[
              { value: 'Executive', label: 'Executive (Standard Access)' },
              { value: 'Admin', label: 'Admin (Full Access)' },
            ]}
            icon={<FiShield />}
          />

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            style={{ width: '100%', marginTop: '1rem' }}
            icon={<FiUserPlus />}
          >
            Create Account
          </Button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Already have an account?{' '}
            <Link
              to="/login"
              style={{
                color: 'var(--primary)',
                fontWeight: '600',
                marginLeft: '0.25rem',
              }}
            >
              Log in here
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}

export default RegisterPage;
