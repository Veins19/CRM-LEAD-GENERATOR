// frontend/src/pages/AnalyticsPage.js

import React, { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from 'recharts';
import { apiFetch } from '../api/api';
import Card from '../components/ui/Card';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';


// Chart Color Palette
const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#818cf8'];


function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await apiFetch('/dashboard');
        setData(res.analytics);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }}></div>
      </div>
    );
  }

  if (!data) return null;

  // Transform Data
  const funnelData = Object.entries(data.funnelCounts || {}).map(([name, value]) => ({ name, value }));
  const activityData = (data.activityTypes || []).map(item => ({ name: item._id, count: item.count }));
  const monthlyData = (data.monthlyInflow || []).map(item => ({ name: `${item._id.year}-${item._id.month}`, Leads: item.count }));

  // Dynamic Chart Styles for Dark/Light Mode
  const chartTextStyle = {
    fontSize: '12px',
    fill: theme === 'dark' ? '#94a3b8' : '#64748b'
  };
  
  const tooltipStyle = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    boxShadow: 'var(--shadow-md)'
  };

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      
      <div style={{ margin: '2rem 0' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Analytics & Reports
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Deep dive into your sales performance and lead trends.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '1.5rem' }}>
        
        {/* 1. Lead Status Distribution */}
        <Card>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Lead Status Distribution</h3>
          <div style={{ height: '350px', width: '100%' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={funnelData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text-primary)' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} formatter={(value) => <span style={{ color: 'var(--text-secondary)' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 2. Activity Breakdown */}
        <Card>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Activity Breakdown</h3>
          <div style={{ height: '350px', width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={activityData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" />
                <XAxis type="number" stroke="var(--text-secondary)" tick={chartTextStyle} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" tick={chartTextStyle} axisLine={false} tickLine={false} width={100} />
                <Tooltip contentStyle={tooltipStyle} cursor={{fill: 'transparent'}} />
                <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 3. Monthly Lead Inflow */}
        <Card style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Monthly Lead Inflow</h3>
          <div style={{ height: '400px', width: '100%' }}>
            <ResponsiveContainer>
              <LineChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={chartTextStyle} axisLine={false} tickLine={false} dy={10} />
                <YAxis stroke="var(--text-secondary)" tick={chartTextStyle} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} formatter={(value) => <span style={{ color: 'var(--text-secondary)' }}>{value}</span>} />
                <Line type="monotone" dataKey="Leads" stroke="var(--primary)" strokeWidth={3} activeDot={{ r: 6, fill: 'var(--primary)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

      </div>
    </div>
  );
}

export default AnalyticsPage;
