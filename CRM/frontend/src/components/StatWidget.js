// CRM/frontend/src/components/StatWidget.js

import React from 'react';

// Usage: <StatWidget label="Total Leads" value={123} icon="👥" color="#43a6f7" />
function StatWidget({ label, value, icon = '', color = '#209cee', sub = '' }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            background: color + '20',
            borderRadius: 12,
            padding: '1.2rem 1.5rem',
            margin: '0.5rem 0',
        }}>
            <div style={{
                fontSize: '2.2rem',
                marginRight: '1.1rem',
            }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color }}>{label}</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#222' }}>{value}</div>
                {sub && <div style={{ fontSize: '0.95rem', color: '#555', marginTop: '0.25rem' }}>{sub}</div>}
            </div>
        </div>
    );
}

export default StatWidget;
