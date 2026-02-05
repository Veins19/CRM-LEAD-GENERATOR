// frontend/src/pages/ProfilePage.js

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/api';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { FiUser, FiMail, FiShield, FiCalendar, FiEdit2, FiCheckCircle, FiXCircle } from 'react-icons/fi';

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoading(true);
    try {
      const data = await apiFetch('/users/self');
      setUser(data.user);
    } catch (error) {
      console.error('❌ Error fetching profile:', error.message);
      toast.error(error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }}></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>Profile not found</h2>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: '4rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 80px)' }}>
      <Card className="w-full" style={{ maxWidth: '600px', width: '100%', padding: '0' }}>
        
        {/* Profile Header / Banner area */}
        <div style={{ 
          backgroundColor: 'var(--bg-body)', 
          padding: '2rem', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          borderBottom: '1px solid var(--border)' 
        }}>
          <div style={{ 
            width: '100px', height: '100px', borderRadius: '50%', 
            backgroundColor: 'var(--primary)', color: '#fff', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: '3rem', fontWeight: '700', marginBottom: '1rem',
            boxShadow: 'var(--shadow-md)'
          }}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            {user.username}
          </h2>
          <span style={{ 
            marginTop: '0.5rem', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600',
            backgroundColor: user.role === 'Admin' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(37, 99, 235, 0.1)',
            color: user.role === 'Admin' ? 'var(--danger)' : 'var(--primary)',
            display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            <FiShield size={14} /> {user.role}
          </span>
        </div>

        {/* Details Body */}
        <div style={{ padding: '2rem' }}>
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            
            {/* Email */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-body)', borderRadius: '8px', color: 'var(--text-secondary)', marginRight: '1rem' }}>
                <FiMail size={20} />
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: '600' }}>Email Address</p>
                <p style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '500' }}>{user.email}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Status */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-body)', borderRadius: '8px', color: user.active ? 'var(--success)' : 'var(--text-muted)', marginRight: '1rem' }}>
                  {user.active ? <FiCheckCircle size={20} /> : <FiXCircle size={20} />}
                </div>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: '600' }}>Account Status</p>
                  <p style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '500' }}>{user.active ? 'Active' : 'Inactive'}</p>
                </div>
              </div>

              {/* Member Since */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-body)', borderRadius: '8px', color: 'var(--text-secondary)', marginRight: '1rem' }}>
                  <FiCalendar size={20} />
                </div>
                <div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: '600' }}>Member Since</p>
                  <p style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '500' }}>{new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="outline" onClick={() => navigate('/profile/edit')} icon={<FiEdit2 />}>
              Edit Profile
            </Button>
          </div>
        </div>

      </Card>
    </div>
  );
}

export default ProfilePage;
