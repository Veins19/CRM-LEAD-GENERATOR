// frontend/src/pages/LeadsKanbanPage.js

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/api';
import { getUser } from '../api/auth';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import {
  FiColumns,
  FiRefreshCw,
  FiUsers,
  FiArrowLeft,
  FiClock,
  FiAlertTriangle,
} from 'react-icons/fi';

const STATUSES = ['New', 'Contacted', 'Qualified', 'Won', 'Lost'];

function LeadsKanbanPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  // drag & drop state
  const [draggedLead, setDraggedLead] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);

  const navigate = useNavigate();
  const currentUser = getUser();
  const isAdmin = currentUser?.role === 'Admin';

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    fetchLeads();
  }, []); // run once on mount

  async function fetchLeads() {
    setLoading(true);
    try {
      const data = await apiFetch(
        '/leads?page=1&limit=1000&archived=false&sortBy=createdAt&sortOrder=desc'
      );
      setLeads(data.leads || []);
    } catch (error) {
      console.error('❌ Error fetching leads for kanban:', error.message);
      toast.error('Failed to load leads for board view');
    } finally {
      setLoading(false);
    }
  }

  const grouped = useMemo(() => {
    const base = {};
    STATUSES.forEach((s) => {
      base[s] = [];
    });
    for (const lead of leads) {
      const key = STATUSES.includes(lead.status) ? lead.status : 'New';
      base[key].push(lead);
    }
    return base;
  }, [leads]);

  function canEditLead(lead) {
    if (isAdmin) return true;
    if (currentUser?.role === 'Executive') {
      return (
        lead.assignedTo &&
        (lead.assignedTo._id === currentUser.id || lead.assignedTo === currentUser.id)
      );
    }
    return false;
  }

  async function handleStatusChange(lead, newStatus) {
    if (!lead || newStatus === lead.status) return;
    if (!canEditLead(lead)) {
      toast.error('You are not allowed to edit this lead');
      return;
    }

    setUpdatingId(lead._id);
    const prevStatus = lead.status;

    // Optimistic UI update
    setLeads((prev) =>
      prev.map((l) => (l._id === lead._id ? { ...l, status: newStatus } : l))
    );

    try {
      await apiFetch(`/leads/${lead._id}`, {
        method: 'PUT',
        body: { status: newStatus },
      });
      toast.success(`Status updated to ${newStatus}`);
      await fetchLeads();
    } catch (error) {
      console.error('❌ Error updating status from Kanban:', error.message);
      toast.error(error.message || 'Failed to update status');
      // rollback
      setLeads((prev) =>
        prev.map((l) => (l._id === lead._id ? { ...l, status: prevStatus } : l))
      );
    } finally {
      setUpdatingId(null);
    }
  }

  // Drag handlers
  const handleDragStart = (lead) => {
    if (!canEditLead(lead)) return;
    setDraggedLead(lead);
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
    setDragOverStatus(null);
  };

  const handleDragOver = (e, status) => {
    // must preventDefault to allow dropping
    e.preventDefault();
    if (!draggedLead) return;
    if (!canEditLead(draggedLead)) return;
    setDragOverStatus(status);
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    if (!draggedLead) return;
    setDragOverStatus(null);
    if (status === draggedLead.status) {
      setDraggedLead(null);
      return;
    }
    handleStatusChange(draggedLead, status);
    setDraggedLead(null);
  };

  const statusColors = {
    New: {
      border: 'rgba(59,130,246,0.35)',
      badgeBg: 'rgba(37,99,235,0.18)',
      columnBg: 'linear-gradient(180deg, rgba(37,99,235,0.16), rgba(15,23,42,0.9))',
    },
    Contacted: {
      border: 'rgba(245,158,11,0.4)',
      badgeBg: 'rgba(245,158,11,0.22)',
      columnBg: 'linear-gradient(180deg, rgba(245,158,11,0.16), rgba(15,23,42,0.9))',
    },
    Qualified: {
      border: 'rgba(168,85,247,0.4)',
      badgeBg: 'rgba(168,85,247,0.22)',
      columnBg: 'linear-gradient(180deg, rgba(168,85,247,0.16), rgba(15,23,42,0.9))',
    },
    Won: {
      border: 'rgba(16,185,129,0.45)',
      badgeBg: 'rgba(16,185,129,0.26)',
      columnBg: 'linear-gradient(180deg, rgba(16,185,129,0.18), rgba(15,23,42,0.9))',
    },
    Lost: {
      border: 'rgba(239,68,68,0.45)',
      badgeBg: 'rgba(239,68,68,0.26)',
      columnBg: 'linear-gradient(180deg, rgba(239,68,68,0.18), rgba(15,23,42,0.9))',
    },
  };

  if (loading && leads.length === 0) {
    return (
      <div className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div
            className="animate-spin"
            style={{
              width: '44px',
              height: '44px',
              border: '4px solid var(--border)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
            }}
          ></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      {/* Header */}
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
          <button
            type="button"
            onClick={() => navigate('/leads')}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.85rem',
            }}
          >
            <FiArrowLeft /> Back to table
          </button>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            Leads Pipeline
          </h1>
          <p
            style={{
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.9rem',
            }}
          >
            <FiColumns /> Drag and drop cards between columns to update status.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '999px',
              background: 'rgba(148,163,253,0.18)',
              border: '1px solid rgba(129,140,248,0.55)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: 'var(--text-secondary)',
            }}
          >
            <FiUsers size={14} />
            <span>Total leads: {leads.length}</span>
          </div>
          <Button variant="outline" onClick={fetchLeads} icon={<FiRefreshCw />}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Hint about permissions */}
      <div
        style={{
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
        }}
      >
        <FiAlertTriangle size={14} />
        <span>
          {isAdmin
            ? 'You can drag any card to change its status.'
            : 'You can drag only cards assigned to you.'}
        </span>
      </div>

      {/* Kanban columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          gap: '1rem',
        }}
      >
        {STATUSES.map((status) => {
          const list = grouped[status] || [];
          const colors = statusColors[status] || {
            border: 'rgba(148,163,253,0.25)',
            badgeBg: 'rgba(148,163,253,0.14)',
            columnBg: 'linear-gradient(180deg, rgba(148,163,253,0.12), rgba(15,23,42,0.9))',
          };

          const isActiveDrop = dragOverStatus === status && draggedLead;

          return (
            <div key={status} style={{ minWidth: 0 }}>
              {/* Column header */}
              <div
                style={{
                  marginBottom: '0.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {status}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {list.length} lead{list.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Column body / drop zone */}
              <div
                onDragOver={(e) => handleDragOver(e, status)}
                onDrop={(e) => handleDrop(e, status)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  maxHeight: '70vh',
                  overflowY: 'auto',
                  padding: '0.75rem 0.5rem 0.75rem 0.75rem',
                  borderRadius: '18px',
                  background: colors.columnBg,
                  border: isActiveDrop
                    ? `1.5px dashed ${colors.border}`
                    : '1px solid rgba(15,23,42,0.9)',
                  boxShadow: isActiveDrop ? '0 0 0 1px rgba(129,140,248,0.9)' : 'none',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
                }}
              >
                {list.length === 0 ? (
                  <div
                    style={{
                      borderRadius: '12px',
                      border: '1px dashed rgba(148,163,253,0.4)',
                      padding: '0.9rem',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      textAlign: 'center',
                      background:
                        'linear-gradient(135deg, rgba(148,163,253,0.12), rgba(15,23,42,0.9))',
                    }}
                  >
                    Drop a card here to move it to <strong>{status}</strong>.
                  </div>
                ) : (
                  list.map((lead) => {
                    const editable = canEditLead(lead);
                    const isDragging = draggedLead && draggedLead._id === lead._id;

                    return (
                      <div
                        key={lead._id}
                        draggable={editable}
                        onDragStart={() => handleDragStart(lead)}
                        onDragEnd={handleDragEnd}
                        style={{
                          opacity: isDragging ? 0.4 : 1,
                          cursor: editable ? 'grab' : 'default',
                        }}
                      >
                        <Card
                          style={{
                            padding: '0.9rem 0.85rem',
                            borderRadius: '14px',
                            border: `1px solid ${colors.border}`,
                            boxShadow: 'var(--shadow-sm)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            background:
                              'radial-gradient(circle at 0 0, rgba(148,163,253,0.25), transparent 55%), rgba(15,23,42,0.95)',
                          }}
                        >
                          {/* Top: name + company */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: '0.5rem',
                              alignItems: 'flex-start',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: '0.95rem',
                                  fontWeight: 600,
                                  color: 'var(--text-primary)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  cursor: 'pointer',
                                }}
                                onClick={() => navigate(`/leads/${lead._id}/edit`)}
                                title={lead.name}
                              >
                                {lead.name}
                              </div>
                              <div
                                style={{
                                  fontSize: '0.8rem',
                                  color: 'var(--text-secondary)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {lead.company || 'No company'}
                              </div>
                            </div>
                          </div>

                          {/* Assignee + status pill (read-only label since drag handles change) */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '0.5rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <div
                                style={{
                                  width: '22px',
                                  height: '22px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--secondary)',
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.65rem',
                                }}
                              >
                                {lead.assignedTo
                                  ? (lead.assignedTo.username || lead.assignedTo.email || '?')
                                      .charAt(0)
                                      .toUpperCase()
                                  : '?'}
                              </div>
                              <span
                                style={{
                                  fontSize: '0.8rem',
                                  color: 'var(--text-secondary)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '120px',
                                }}
                              >
                                {lead.assignedTo
                                  ? lead.assignedTo.username || lead.assignedTo.email
                                  : 'Unassigned'}
                              </span>
                            </div>

                            <span
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.22rem 0.7rem',
                                borderRadius: '999px',
                                backgroundColor: colors.badgeBg,
                                border: `1px solid ${colors.border}`,
                                color: 'var(--text-primary)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                              }}
                            >
                              {lead.status}
                            </span>
                          </div>

                          {/* Bottom: meta */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '0.5rem',
                              marginTop: '0.25rem',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              <FiClock size={12} />
                              <span>
                                {new Date(lead.updatedAt || lead.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </Card>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LeadsKanbanPage;
