// frontend/src/pages/UsersPage.js

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/api';
import { getUser } from '../api/auth';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import {
  FiSearch,
  FiUserPlus,
  FiEdit2,
  FiTrash2,
  FiShield,
  FiCheckCircle,
  FiXCircle,
  FiX,
} from 'react-icons/fi';

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10); // rows per page

  const navigate = useNavigate();
  const currentUser = getUser();

  useEffect(() => {
    // Role check: Only Admin can access
    if (currentUser?.role !== 'Admin') {
      toast.error('Access denied. Admin only.');
      setTimeout(() => navigate('/dashboard'), 2000);
      return;
    }
    fetchUsers();
    // eslint-disable-next-line  
  }, [search, page, limit]);

  async function fetchUsers() {
    setLoading(true);
    let url = `/users?page=${page}&limit=${limit}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    try {
      const data = await apiFetch(url);
      setUsers(data.users);

      const total = data.totalPages || 0;
      setTotalPages(total);

      // Clamp page within valid range
      if (total === 0 && page !== 1) {
        setPage(1);
      } else if (total > 0 && page > total) {
        setPage(total);
      }
    } catch (error) {
      console.error('❌ Error fetching users:', error.message);
      toast.error(error.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(userId) {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await apiFetch(`/users/${userId}`, { method: 'DELETE' });
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error(error.message || 'Failed to delete user');
    }
  }

  // Handle change of rows per page
  const handleLimitChange = (e) => {
    const raw = parseInt(e.target.value, 10);
    if (Number.isNaN(raw)) {
      setLimit(1);
      setPage(1);
      return;
    }
    const clamped = Math.min(200, Math.max(1, raw)); // 1–200
    setLimit(clamped);
    setPage(1);
  };

  if (loading && users.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>
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

  const isEmpty = !loading && users.length === 0;
  const effectiveTotalPages = totalPages > 0 ? totalPages : 1;
  const displayPage = totalPages > 0 ? page : 1;

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      {/* Header Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          margin: '2rem 0',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.8rem',
              fontWeight: '800',
              color: 'var(--text-primary)',
            }}
          >
            User Management
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Manage system access, roles, and specializations.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<FiUserPlus />}
          onClick={() => navigate('/users/add')}
        >
          Add User
        </Button>
      </div>

      {/* Search Bar – pill/glass style */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            maxWidth: '420px',
            width: '100%',
            borderRadius: '999px',
            padding: '0.35rem 0.9rem',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid rgba(148, 163, 253, 0.6)',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <FiSearch
            size={18}
            style={{ color: 'var(--text-muted)', flexShrink: 0 }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search users by name or email..."
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              flex: 1,
              fontSize: '0.95rem',
              color: 'var(--text-primary)',
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setSearch('');
              }}
              title="Clear search"
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <FiX size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead
              style={{
                backgroundColor: 'var(--bg-body)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <tr>
                {[
                  'Username',
                  'Email',
                  'Role',
                  'Status',
                  'Specialization',
                  'Load',
                  'Created At',
                  'Actions',
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '1rem',
                      textAlign: 'left',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: 'var(--text-secondary)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isEmpty ? (
                <tr>
                  <td
                    colSpan="8"
                    style={{
                      padding: '3rem',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                    }}
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const specialization = user.specialization || 'General';
                  const current =
                    typeof user.current_active_leads === 'number'
                      ? user.current_active_leads
                      : 0;
                  const max =
                    typeof user.max_active_leads === 'number'
                      ? user.max_active_leads
                      : 0;
                  const loadLabel =
                    max && max > 0 ? `${current}/${max}` : `${current} active`;
                  const loadIsOverCapacity = max > 0 && current > max;
                  const loadColor =
                    max === 0
                      ? 'var(--text-secondary)'
                      : loadIsOverCapacity
                      ? 'var(--danger)'
                      : current >= max
                      ? 'var(--warning)'
                      : 'var(--success)';

                  return (
                    <tr
                      key={user._id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.2s',
                      }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td
                        style={{
                          padding: '1rem',
                          fontWeight: '500',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {user.username}
                      </td>
                      <td
                        style={{ padding: '1rem', color: 'var(--text-secondary)' }}
                      >
                        {user.email}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor:
                              user.role === 'Admin'
                                ? 'rgba(239, 68, 68, 0.1)'
                                : 'rgba(37, 99, 235, 0.1)',
                            color:
                              user.role === 'Admin'
                                ? 'var(--danger)'
                                : 'var(--primary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          <FiShield size={12} /> {user.role}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: user.active
                              ? 'rgba(16, 185, 129, 0.1)'
                              : 'rgba(100, 116, 139, 0.1)',
                            color: user.active
                              ? 'var(--success)'
                              : 'var(--text-muted)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                          }}
                        >
                          {user.active ? (
                            <FiCheckCircle size={12} />
                          ) : (
                            <FiXCircle size={12} />
                          )}{' '}
                          {user.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            backgroundColor: 'rgba(148, 163, 253, 0.18)',
                            border: '1px solid rgba(129, 140, 248, 0.45)',
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                          }}
                          title={specialization}
                        >
                          {specialization.length > 26
                            ? specialization.slice(0, 23) + '...'
                            : specialization}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            backgroundColor: 'rgba(15, 23, 42, 0.8)',
                            color: loadColor,
                            border: '1px solid rgba(148, 163, 253, 0.35)',
                            whiteSpace: 'nowrap',
                          }}
                          title={
                            max > 0
                              ? `Current: ${current}, Max: ${max}`
                              : `Current: ${current}, Max: unlimited`
                          }
                        >
                          Load: {loadLabel}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '1rem',
                          color: 'var(--text-secondary)',
                          fontSize: '0.9rem',
                        }}
                      >
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            style={{ padding: '6px' }}
                            onClick={() => navigate(`/users/${user._id}/edit`)}
                            title="Edit"
                          >
                            <FiEdit2 />
                          </Button>
                          {user._id !== currentUser?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              style={{
                                padding: '6px',
                                color: 'var(--danger)',
                              }}
                              onClick={() => handleDelete(user._id)}
                              title="Delete"
                            >
                              <FiTrash2 />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination + Rows-per-page */}
        <div
          style={{
            padding: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--border)',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}
            >
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
              gap: '0.75rem',
              alignItems: 'center',
              marginLeft: 'auto',
            }}
          >
            <span
              style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}
            >
              Page {displayPage} of {effectiveTotalPages}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || totalPages === 0}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={totalPages === 0 || page >= totalPages}
                onClick={() =>
                  setPage((p) =>
                    totalPages > 0 ? Math.min(totalPages, p + 1) : p
                  )
                }
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default UsersPage;
