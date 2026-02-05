// frontend/src/pages/ActivitiesPage.js

import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/api';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import {
  FiActivity,
  FiPlusCircle,
  FiEdit3,
  FiTrash2,
  FiArchive,
  FiRotateCcw,
  FiUser,
  FiArrowRight,
  FiClock,
  FiFilter,
  FiRefreshCw,
} from 'react-icons/fi';

function ActivitiesPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [type, setType] = useState('');
  const [lead, setLead] = useState('');
  const [user, setUser] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(20); // rows per page

  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, [type, lead, user, page, limit]);

  async function fetchActivities() {
    setLoading(true);
    let url = `/activities?page=${page}&limit=${limit}`;
    if (type) url += `&type=${encodeURIComponent(type)}`;
    if (lead) url += `&lead=${encodeURIComponent(lead)}`;
    if (user) url += `&user=${encodeURIComponent(user)}`;

    try {
      const data = await apiFetch(url);
      setActivities(data.activities);

      const total = data.totalPages || 0;
      setTotalPages(total);

      // Clamp page so it never goes out of range
      if (total === 0 && page !== 1) {
        setPage(1);
      } else if (total > 0 && page > total) {
        setPage(total);
      }
    } catch (error) {
      console.error('❌ Error fetching activities:', error.message);
      toast.error('Failed to load activities');
    } finally {
      setLoading(false);
    }
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'Create': return <FiPlusCircle />;
      case 'Edit': return <FiEdit3 />;
      case 'Status Change': return <FiRefreshCw />;
      case 'Archive': return <FiArchive />;
      case 'Restore': return <FiRotateCcw />;
      case 'Delete': return <FiTrash2 />;
      case 'Assign': return <FiUser />;
      default: return <FiActivity />;
    }
  };

  // Helper to format color styles manually since Tailwind classes aren't available in inline styles
  const getStyleForType = (type) => {
    const base = {
      borderRadius: '50%',
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
    };
    switch (type) {
      case 'Create': return { ...base, color: '#16a34a', backgroundColor: '#dcfce7' };
      case 'Edit': return { ...base, color: '#2563eb', backgroundColor: '#dbeafe' };
      case 'Status Change': return { ...base, color: '#ea580c', backgroundColor: '#ffedd5' };
      case 'Archive': return { ...base, color: '#dc2626', backgroundColor: '#fee2e2' };
      case 'Restore': return { ...base, color: '#4f46e5', backgroundColor: '#e0e7ff' };
      case 'Delete': return { ...base, color: '#dc2626', backgroundColor: '#fee2e2' };
      case 'Assign': return { ...base, color: '#9333ea', backgroundColor: '#f3e8ff' };
      default: return { ...base, color: '#4b5563', backgroundColor: '#f3f4f6' };
    }
  };

  // Derived pagination state for safe display
  const isEmpty = !loading && activities.length === 0;
  const effectiveTotalPages = totalPages > 0 ? totalPages : 1;
  const displayPage = totalPages > 0 ? page : 1;

  // Handle change of rows per page
  const handleLimitChange = (e) => {
    const raw = parseInt(e.target.value, 10);
    if (Number.isNaN(raw)) {
      setLimit(1);
      setPage(1);
      return;
    }
    const clamped = Math.min(200, Math.max(1, raw)); // 1–200 rows
    setLimit(clamped);
    setPage(1);
  };

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: '2rem 0',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            Activity Log
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track all system events and changes.</p>
        </div>
        <Button variant="outline" icon={<FiFilter />} onClick={() => setShowFilters(!showFilters)}>
          Filters
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card style={{ marginBottom: '2rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}
          >
            <Input
              placeholder="Filter by Lead ID"
              value={lead}
              onChange={(e) => {
                setPage(1);
                setLead(e.target.value);
              }}
            />
            <Input
              placeholder="Filter by User ID"
              value={user}
              onChange={(e) => {
                setPage(1);
                setUser(e.target.value);
              }}
            />
            <Input
              type="select"
              value={type}
              onChange={(e) => {
                setPage(1);
                setType(e.target.value);
              }}
              options={[
                { value: 'Create', label: 'Create' },
                { value: 'Edit', label: 'Edit' },
                { value: 'Status Change', label: 'Status Change' },
                { value: 'Archive', label: 'Archive' },
                { value: 'Restore', label: 'Restore' },
                { value: 'Delete', label: 'Delete' },
                { value: 'Assign', label: 'Assign' },
              ]}
              placeholder="All Types"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button
              variant="ghost"
              onClick={() => {
                setLead('');
                setUser('');
                setType('');
                setPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </Card>
      )}

      {/* Timeline */}
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
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
        ) : isEmpty ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <FiActivity size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>No activities found.</p>
          </div>
        ) : (
          activities.map((activity, index) => (
            <div
              key={activity._id}
              style={{
                display: 'flex',
                gap: '1rem',
                paddingBottom: '2rem',
                position: 'relative',
              }}
            >
              {/* Connector Line */}
              {index !== activities.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '32px',
                    bottom: '0',
                    width: '2px',
                    backgroundColor: 'var(--border)',
                  }}
                ></div>
              )}

              {/* Icon */}
              <div style={{ flexShrink: 0, zIndex: 1 }}>
                <div style={getStyleForType(activity.type)}>{getActivityIcon(activity.type)}</div>
              </div>

              {/* Content */}
              <Card style={{ flex: 1, padding: '1rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '0.5rem',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        color: 'var(--text-secondary)',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {activity.type}
                    </span>
                    <h4
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        margin: '0.25rem 0',
                      }}
                    >
                      {activity.details}
                    </h4>
                  </div>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <FiClock /> {new Date(activity.createdAt).toLocaleString()}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '1.5rem',
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {activity.user && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--secondary)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                        }}
                      >
                        <FiUser />
                      </div>
                      <span>{activity.user.username || 'Unknown User'}</span>
                    </div>
                  )}

                  {activity.statusBefore && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        backgroundColor: 'var(--bg-body)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      <span>{activity.statusBefore}</span>
                      <FiArrowRight size={12} />
                      <span style={{ fontWeight: '600', color: 'var(--primary)' }}>
                        {activity.statusAfter}
                      </span>
                    </div>
                  )}
                </div>

                {activity.lead && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      fontSize: '0.85rem',
                      color: 'var(--primary)',
                    }}
                  >
                    Related Lead: <strong>{activity.lead.name || activity.lead}</strong>
                  </div>
                )}
              </Card>
            </div>
          ))
        )}
      </div>

      {/* Pagination + Rows-per-page */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1.5rem',
          marginTop: '2rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Rows per page
          </span>
          <input
            type="number"
            min={1}
            max={200}
            value={limit}
            onChange={handleLimitChange}
            style={{
              width: '70px',
              padding: '0.35rem 0.5rem',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1rem',
            alignItems: 'center',
          }}
        >
          <Button
            variant="outline"
            disabled={page <= 1 || totalPages === 0}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span style={{ display: 'flex', alignItems: 'center', fontWeight: '600' }}>
            Page {displayPage} of {effectiveTotalPages}
          </span>
          <Button
            variant="outline"
            disabled={totalPages === 0 || page >= totalPages}
            onClick={() => setPage((p) => (totalPages > 0 ? Math.min(totalPages, p + 1) : p))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ActivitiesPage;
