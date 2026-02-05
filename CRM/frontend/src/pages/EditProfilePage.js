// frontend/src/pages/EditProfilePage.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/api';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { FiUser, FiMail, FiShield, FiLock, FiSave, FiArrowLeft, FiKey } from 'react-icons/fi';

function EditProfilePage() {
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    role: '',
  });
  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
  });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoading(true);
    try {
      const data = await apiFetch('/users/self');
      setProfile(data.user);
    } catch (error) {
      console.error('❌ Error fetching profile:', error.message);
      toast.error(error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileUpdate(e) {
    e.preventDefault();
    setSavingProfile(true);

    try {
      await apiFetch('/users/self', {
        method: 'PUT',
        body: { username: profile.username, email: profile.email },
      });
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('❌ Error updating profile:', error.message);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    setSavingPassword(true);

    if (passwords.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      setSavingPassword(false);
      return;
    }

    try {
      await apiFetch('/password/change', {
        method: 'POST',
        body: passwords,
      });
      toast.success('Password changed successfully');
      setPasswords({ oldPassword: '', newPassword: '' });
    } catch (error) {
      console.error('❌ Error changing password:', error.message);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }}></div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: '4rem', maxWidth: '800px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2rem 0' }}>
        <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Account Settings</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Manage your profile information and security.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/profile')} icon={<FiArrowLeft />}>
          Back to Profile
        </Button>
      </div>

      <div style={{ display: 'grid', gap: '2rem' }}>
        
        {/* Basic Info Card */}
        <Card>
          <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FiUser /> Basic Information
            </h3>
          </div>
          
          <form onSubmit={handleProfileUpdate}>
            <div style={{ display: 'grid', gap: '1rem' }}>
                <Input
                label="Username"
                type="text"
                value={profile.username}
                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                required
                icon={<FiUser />}
                />

                <Input
                label="Email Address"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                required
                icon={<FiMail />}
                />

                <div>
                    <Input
                    label="Role"
                    type="text"
                    value={profile.role}
                    disabled
                    icon={<FiShield />}
                    style={{ backgroundColor: 'var(--bg-body)', cursor: 'not-allowed', opacity: 0.8 }}
                    />
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '-0.5rem' }}>Role cannot be changed.</p>
                </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="primary"
                loading={savingProfile}
                icon={<FiSave />}
              >
                Update Profile
              </Button>
            </div>
          </form>
        </Card>

        {/* Security Card */}
        <Card>
          <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FiKey /> Security
            </h3>
          </div>

          <form onSubmit={handlePasswordChange}>
            <div style={{ display: 'grid', gap: '1rem' }}>
                <Input
                label="Current Password"
                type="password"
                placeholder="Enter current password"
                value={passwords.oldPassword}
                onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })}
                required
                icon={<FiLock />}
                />

                <Input
                label="New Password"
                type="password"
                placeholder="Enter new password (min 6 chars)"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                required
                icon={<FiLock />}
                />
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="secondary"
                loading={savingPassword}
                icon={<FiSave />}
              >
                Change Password
              </Button>
            </div>
          </form>
        </Card>

      </div>
    </div>
  );
}

export default EditProfilePage;
