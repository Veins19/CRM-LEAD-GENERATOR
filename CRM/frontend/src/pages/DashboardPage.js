// frontend/src/pages/DashboardPage.js

import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/api';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import { getUser } from '../api/auth';
import { 
  FiUsers, FiArchive, FiTrendingUp, FiActivity, 
  FiArrowUp, FiArrowDown, FiClock 
} from 'react-icons/fi';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

function DashboardPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const data = await apiFetch('/dashboard');
        setAnalytics(data.analytics);
      } catch (error) {
        console.error('❌ Error fetching analytics:', error.message);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }}></div>
      </div>
    );
  }

  if (!analytics) return null;

  // Transform Funnel Data for Chart
  const funnelData = Object.entries(analytics.funnelCounts || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      
      {/* Header */}
      <div style={{ margin: '2rem 0' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Hello, {user.username} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Here's what's happening with your leads today.</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        <Card hover>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Total Leads</p>
              <h3 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0.5rem 0' }}>
                {analytics.totalLeads}
              </h3>
              <span style={{ color: 'var(--success)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FiArrowUp /> +12% <span style={{ color: 'var(--text-muted)' }}>vs last month</span>
              </span>
            </div>
            <div style={{ padding: '12px', backgroundColor: 'rgba(37, 99, 235, 0.1)', borderRadius: '12px', color: 'var(--primary)' }}>
              <FiUsers size={24} />
            </div>
          </div>
        </Card>

        <Card hover>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Conversion Time</p>
              <h3 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0.5rem 0' }}>
                {analytics.avgTimeToConverted} <span style={{fontSize: '1rem', fontWeight: '500', color: 'var(--text-muted)'}}>days</span>
              </h3>
              <span style={{ color: 'var(--success)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FiArrowDown /> -2 days <span style={{ color: 'var(--text-muted)' }}>faster</span>
              </span>
            </div>
            <div style={{ padding: '12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', color: 'var(--success)' }}>
              <FiClock size={24} />
            </div>
          </div>
        </Card>

        <Card hover>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Archived Leads</p>
              <h3 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0.5rem 0' }}>
                {analytics.archivedLeads}
              </h3>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Total inactive
              </span>
            </div>
            <div style={{ padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', color: 'var(--danger)' }}>
              <FiArchive size={24} />
            </div>
          </div>
        </Card>

        <Card hover>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Win Rate</p>
              <h3 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0.5rem 0' }}>
                {analytics.funnelCounts['Won'] ? ((analytics.funnelCounts['Won'] / analytics.totalLeads) * 100).toFixed(1) : 0}%
              </h3>
              <span style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FiTrendingUp /> Good pace
              </span>
            </div>
            <div style={{ padding: '12px', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', color: 'var(--warning)' }}>
              <FiActivity size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        
        {/* Funnel Chart */}
        <Card>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1.5rem' }}>Sales Funnel Overview</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={funnelData}>
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border)' }}
                  cursor={{fill: 'transparent'}}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Activity Feed */}
        <Card>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1.5rem' }}>Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {analytics.activityTypes && analytics.activityTypes.length > 0 ? (
              analytics.activityTypes.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span style={{ fontWeight: '500', fontSize: '0.95rem' }}>{item._id}</span>
                  </div>
                  <span style={{ fontWeight: '700', fontSize: '1rem' }}>{item.count}</span>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No recent activities</p>
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}

export default DashboardPage;
