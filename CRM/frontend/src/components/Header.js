// frontend/src/components/Header.js

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getUser, logout } from '../api/auth';
import { apiFetch } from '../api/api';
import { useTheme } from '../context/ThemeContext';
import { 
  FiSun, FiMoon, FiBell, FiLogOut, FiUser, 
  FiPieChart, FiLayers, FiActivity, FiUsers, FiGrid 
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const { theme, toggleTheme } = useTheme();
  
  // State
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const data = await apiFetch('/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiFetch('/notifications/mark-all-read', { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  if (location.pathname === '/login' || location.pathname === '/register' || !user) {
    return null;
  }

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard', icon: <FiGrid /> },
    { path: '/analytics', label: 'Analytics', icon: <FiPieChart /> },
    { path: '/leads', label: 'Leads', icon: <FiLayers /> },
    { path: '/activities', label: 'Activities', icon: <FiActivity /> },
    ...(user.role === 'Admin' ? [{ path: '/users', label: 'Users', icon: <FiUsers /> }] : [])
  ];

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      padding: '0 2rem',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      boxShadow: 'var(--shadow-sm)',
      transition: 'background-color 0.3s ease, border-color 0.3s ease',
    }}>
      <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
          <Link to="/dashboard" style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--primary)', letterSpacing: '-0.5px' }}>
            CRMBuddy.
          </Link>

          {/* Desktop Nav */}
          <nav style={{ display: 'flex', gap: '0.5rem' }}>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  color: isActive(link.path) ? 'var(--primary)' : 'var(--text-secondary)',
                  backgroundColor: isActive(link.path) ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', fontSize: '1.25rem', padding: '8px',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title="Toggle Theme"
          >
            {theme === 'light' ? <FiMoon /> : <FiSun />}
          </button>

          {/* Notifications */}
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text-secondary)', fontSize: '1.25rem', padding: '8px',
                position: 'relative', display: 'flex'
              }}
            >
              <FiBell />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '4px', right: '4px',
                  height: '8px', width: '8px', borderRadius: '50%',
                  backgroundColor: 'var(--danger)', border: '2px solid var(--bg-surface)'
                }} />
              )}
            </button>

            <AnimatePresence>
              {showNotifDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  style={{
                    position: 'absolute', top: '120%', right: 0, width: '320px',
                    backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
                    borderRadius: '12px', boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
                    zIndex: 1000
                  }}
                >
                  <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <span onClick={markAllAsRead} style={{ fontSize: '0.8rem', color: 'var(--primary)', cursor: 'pointer' }}>Mark all read</span>
                    )}
                  </div>
                  <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n._id} 
                          onClick={() => markAsRead(n._id)}
                          style={{
                            padding: '1rem', borderBottom: '1px solid var(--border)',
                            backgroundColor: n.isRead ? 'transparent' : 'rgba(37, 99, 235, 0.05)',
                            cursor: 'pointer', transition: 'background 0.2s'
                          }}
                        >
                          <p style={{ fontSize: '0.9rem', marginBottom: '0.25rem', color: n.isRead ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{n.message}</p>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile */}
          <div style={{ position: 'relative' }} ref={profileRef}>
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.75rem'
              }}
            >
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                backgroundColor: 'var(--primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '600', fontSize: '0.9rem'
              }}>
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div style={{ textAlign: 'left', display: 'none', md: 'block' }}>
                <p style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', lineHeight: 1 }}>{user.username}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{user.role}</p>
              </div>
            </button>

            <AnimatePresence>
              {showProfileDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  style={{
                    position: 'absolute', top: '120%', right: 0, width: '200px',
                    backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
                    borderRadius: '12px', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', padding: '0.5rem',
                    zIndex: 1000
                  }}
                >
                  <Link to="/profile" style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem', borderRadius: '8px', color: 'var(--text-primary)',
                    textDecoration: 'none', fontSize: '0.9rem', transition: 'background 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-body)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <FiUser /> Profile
                  </Link>
                  <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '0.5rem 0' }} />
                  <button onClick={handleLogout} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem', borderRadius: '8px', color: 'var(--danger)',
                    background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.9rem',
                    textAlign: 'left'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <FiLogOut /> Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </header>
  );
}

export default Header;
