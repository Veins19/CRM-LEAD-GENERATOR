// frontend/src/pages/LeadsPage.js

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/api';
import { getUser } from '../api/auth';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import {
  FiSearch,
  FiFilter,
  FiPlus,
  FiUpload,
  FiDownload,
  FiEdit2,
  FiEye,
  FiTrash2,
  FiUserCheck,
} from 'react-icons/fi';

function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterTags, setFilterTags] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination
  const [limit, setLimit] = useState(10); // rows per page
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const [selectedLead, setSelectedLead] = useState(null);
  const [users, setUsers] = useState([]);
  const [assignUserId, setAssignUserId] = useState('');

  const [exporting, setExporting] = useState(false);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const user = getUser();

  useEffect(() => {
    if (user.role === 'Admin') {
      apiFetch('/users?limit=100')
        .then((data) => setUsers(data.users))
        .catch(console.error);
    }
    // eslint-disable-next-line 
  }, [user.role]);

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line 
  }, [
    search,
    status,
    filterAssignee,
    filterTags,
    startDate,
    endDate,
    sortBy,
    sortOrder,
    limit,
    page,
  ]);

  async function fetchLeads() {
    setLoading(true);
    let url = `/leads?page=${page}&limit=${limit}&archived=false`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    if (filterAssignee)
      url += `&assignedTo=${encodeURIComponent(filterAssignee)}`;
    if (filterTags) url += `&tags=${encodeURIComponent(filterTags)}`;
    if (startDate) url += `&startDate=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&endDate=${encodeURIComponent(endDate)}`;
    if (sortBy) url += `&sortBy=${encodeURIComponent(sortBy)}`;
    if (sortOrder) url += `&sortOrder=${encodeURIComponent(sortOrder)}`;

    try {
      const data = await apiFetch(url);
      setLeads(data.leads);
      const total = data.totalPages || 0;
      setTotalPages(total);

      // Clamp page within valid range
      if (total === 0 && page !== 1) {
        setPage(1);
      } else if (total > 0 && page > total) {
        setPage(total);
      }
    } catch (error) {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(leadId) {
    if (!window.confirm('Are you sure you want to archive this lead?')) return;
    try {
      await apiFetch(`/leads/${leadId}`, { method: 'DELETE' });
      toast.success('Lead archived');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to archive lead');
    }
  }

  const handleImportClick = () => fileInputRef.current.click();

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiFetch('/leads/import', {
        method: 'POST',
        body: formData,
        useFormData: true,
      });
      toast.success(res.message || 'Import completed');
      fetchLeads();
    } catch (error) {
      toast.error('Import failed');
    }
    event.target.value = '';
  };

  const handleExport = async (format) => {
    try {
      setExporting(true);
      const token = localStorage.getItem('jwt');
      const baseUrl =
        process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await fetch(
        `${baseUrl}/leads/export?format=${encodeURIComponent(format)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'json' ? 'leads_export.json' : 'leads_export.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
      setShowExportModal(false);
    }
  };

  const handleAssignSubmit = async () => {
    try {
      await apiFetch(`/leads/${selectedLead._id}/assign`, {
        method: 'PATCH',
        body: { userId: assignUserId },
      });
      toast.success('Lead assigned successfully');
      setShowAssignModal(false);
      fetchLeads();
    } catch (error) {
      toast.error(error.message);
    }
  };

  // rows-per-page change
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

  const isEmpty = !loading && leads.length === 0;
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
        <h1
          style={{
            fontSize: '1.8rem',
            fontWeight: '800',
            color: 'var(--text-primary)',
          }}
        >
          Leads
        </h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept=".csv,.json"
          />
          <Button variant="outline" icon={<FiUpload />} onClick={handleImportClick}>
            Import
          </Button>
          <Button
            variant="outline"
            icon={<FiDownload />}
            onClick={() => setShowExportModal(true)}
          >
            Export
          </Button>
          <Button
            variant="primary"
            icon={<FiPlus />}
            onClick={() => navigate('/leads/add')}
          >
            Add Lead
          </Button>
          <Button variant="outline" onClick={() => navigate('/leads/board')}>
            Board View
          </Button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          alignItems: 'start',
          flexDirection: 'column-reverse',
          md: 'row',
        }}
      >
        {/* Main Content */}
        <div style={{ flex: 1, width: '100%' }}>
          {/* Search Bar */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <FiSearch
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Search leads..."
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <Button
              variant="secondary"
              icon={<FiFilter />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
          </div>

          {/* Filter Panel (Collapsible) */}
          {showFilters && (
            <Card style={{ marginBottom: '1.5rem', padding: '1rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                }}
              >
                <Input
                  label="Status"
                  type="select"
                  value={status}
                  onChange={(e) => {
                    setPage(1);
                    setStatus(e.target.value);
                  }}
                  options={[
                    { value: 'New', label: 'New' },
                    { value: 'Contacted', label: 'Contacted' },
                    { value: 'Qualified', label: 'Qualified' },
                    { value: 'Won', label: 'Won' },
                    { value: 'Lost', label: 'Lost' },
                  ]}
                />
                {user.role === 'Admin' && (
                  <Input
                    label="Assignee"
                    type="select"
                    value={filterAssignee}
                    onChange={(e) => {
                      setPage(1);
                      setFilterAssignee(e.target.value);
                    }}
                    options={[
                      { value: 'unassigned', label: 'Unassigned' },
                      ...users.map((u) => ({ value: u._id, label: u.username })),
                    ]}
                  />
                )}
                <Input
                  label="Tags"
                  placeholder="Filter by tag"
                  value={filterTags}
                  onChange={(e) => {
                    setPage(1);
                    setFilterTags(e.target.value);
                  }}
                />
                <Input
                  label="Created After"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setPage(1);
                    setStartDate(e.target.value);
                  }}
                />
                <Input
                  label="Sort By"
                  type="select"
                  value={sortBy}
                  onChange={(e) => {
                    setPage(1);
                    setSortBy(e.target.value);
                  }}
                  options={[
                    { value: 'createdAt', label: 'Date Created' },
                    { value: 'name', label: 'Name' },
                    { value: 'company', label: 'Company' },
                  ]}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: '1rem',
                }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatus('');
                    setSearch('');
                    setFilterAssignee('');
                    setFilterTags('');
                    setStartDate('');
                    setEndDate('');
                    setPage(1);
                  }}
                >
                  Clear All
                </Button>
              </div>
            </Card>
          )}

          {/* Leads Table */}
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
                    {['Name', 'Contact', 'Company', 'Status', 'Assignee', 'Actions'].map(
                      (h) => (
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
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan="6"
                        style={{ padding: '2rem', textAlign: 'center' }}
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : isEmpty ? (
                    <tr>
                      <td
                        colSpan="6"
                        style={{
                          padding: '3rem',
                          textAlign: 'center',
                          color: 'var(--text-muted)',
                        }}
                      >
                        No leads found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    leads.map((lead) => (
                      <tr
                        key={lead._id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          transition: 'background 0.2s',
                        }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td style={{ padding: '1rem' }}>
                          <div
                            style={{
                              fontWeight: '600',
                              color: 'var(--primary)',
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              setSelectedLead(lead);
                              setShowDetailsModal(true);
                            }}
                          >
                            {lead.name}
                          </div>
                          <div
                            style={{
                              fontSize: '0.8rem',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {lead.email}
                          </div>
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>
                          {lead.contact}
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>
                          {lead.company || '—'}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span
                            style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              backgroundColor:
                                lead.status === 'Won'
                                  ? 'rgba(16, 185, 129, 0.1)'
                                  : lead.status === 'Lost'
                                  ? 'rgba(239, 68, 68, 0.1)'
                                  : 'rgba(37, 99, 235, 0.1)',
                              color:
                                lead.status === 'Won'
                                  ? 'var(--success)'
                                  : lead.status === 'Lost'
                                  ? 'var(--danger)'
                                  : 'var(--primary)',
                            }}
                          >
                            {lead.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {lead.assignedTo ? (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                              }}
                            >
                              <div
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--secondary)',
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.7rem',
                                }}
                              >
                                {lead.assignedTo.username
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                              <span style={{ fontSize: '0.9rem' }}>
                                {lead.assignedTo.username}
                              </span>
                            </div>
                          ) : (
                            <span
                              style={{
                                color: 'var(--text-muted)',
                                fontStyle: 'italic',
                                fontSize: '0.9rem',
                              }}
                            >
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              style={{ padding: '6px' }}
                              onClick={() => navigate(`/leads/${lead._id}/edit`)}
                              title="Edit"
                            >
                              <FiEdit2 />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              style={{ padding: '6px' }}
                              onClick={() => {
                                setSelectedLead(lead);
                                setShowDetailsModal(true);
                              }}
                              title="View"
                            >
                              <FiEye />
                            </Button>
                            {user?.role === 'Admin' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  style={{
                                    padding: '6px',
                                    color: 'var(--warning)',
                                  }}
                                  onClick={() => {
                                    setSelectedLead(lead);
                                    setShowAssignModal(true);
                                  }}
                                  title="Assign"
                                >
                                  <FiUserCheck />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  style={{
                                    padding: '6px',
                                    color: 'var(--danger)',
                                  }}
                                  onClick={() => handleDelete(lead._id)}
                                  title="Archive"
                                >
                                  <FiTrash2 />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
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
      </div>

      {/* Assign Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Lead"
      >
        <p style={{ marginBottom: '1rem' }}>
          Assign <strong>{selectedLead?.name}</strong> to an executive:
        </p>
        <Input
          type="select"
          label="Executive"
          value={assignUserId}
          onChange={(e) => setAssignUserId(e.target.value)}
          options={users.map((u) => ({ value: u._id, label: u.username }))}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1rem',
            marginTop: '1rem',
          }}
        >
          <Button variant="ghost" onClick={() => setShowAssignModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAssignSubmit}>
            Assign
          </Button>
        </div>
      </Modal>

      {/* Details Modal (POPUP LEAD DETAIL) */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Lead Details"
        size="lg"
      >
        {selectedLead && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '2rem',
              }}
            >
              {/* Contact Info */}
              <div>
                <h4
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    marginBottom: '0.5rem',
                  }}
                >
                  Contact Info
                </h4>
                <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                  {selectedLead.name}
                </p>
                <p
                  style={{
                    color: 'var(--text-secondary)',
                    marginBottom: '0.25rem',
                  }}
                >
                  {selectedLead.email}
                </p>
                <p style={{ color: 'var(--text-secondary)' }}>
                  {selectedLead.contact}
                </p>
                <p style={{ marginTop: '1rem' }}>
                  <strong>Company:</strong> {selectedLead.company || 'N/A'}
                </p>
                <p
                  style={{
                    marginTop: '0.75rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <strong>Created:</strong>{' '}
                  {selectedLead.createdAt
                    ? new Date(selectedLead.createdAt).toLocaleString()
                    : 'N/A'}
                  <br />
                  <strong>Last Updated:</strong>{' '}
                  {selectedLead.updatedAt
                    ? new Date(selectedLead.updatedAt).toLocaleString()
                    : 'N/A'}
                </p>
              </div>

              {/* Status, Tags, Assignment */}
              <div>
                <h4
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    marginBottom: '0.5rem',
                  }}
                >
                  Status & Tags
                </h4>
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    backgroundColor:
                      selectedLead.status === 'Won'
                        ? 'var(--success)'
                        : selectedLead.status === 'Lost'
                        ? 'var(--danger)'
                        : 'var(--primary)',
                    color: '#fff',
                    display: 'inline-block',
                    marginBottom: '0.75rem',
                  }}
                >
                  {selectedLead.status}
                </span>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                  }}
                >
                  {selectedLead.tags &&
                    selectedLead.tags.map((tag, i) => (
                      <span
                        key={i}
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          border: '1px solid var(--border)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  {(!selectedLead.tags || selectedLead.tags.length === 0) && (
                    <span
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        fontStyle: 'italic',
                      }}
                    >
                      No tags
                    </span>
                  )}
                </div>

                {/* Assignment & Ownership */}
                <h4
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    marginBottom: '0.5rem',
                  }}
                >
                  Assignment & Ownership
                </h4>
                {selectedLead.assignedTo ? (
                  <div
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-input)',
                    }}
                  >
                    <p style={{ margin: 0, marginBottom: '0.25rem' }}>
                      <strong>Executive:</strong>{' '}
                      {selectedLead.assignedTo.username}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        marginBottom: '0.25rem',
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <strong>Specialization:</strong>{' '}
                      {selectedLead.assignedTo.specialization || 'General'}
                    </p>
                    {typeof selectedLead.assignedTo.current_active_leads ===
                      'number' && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.85rem',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <strong>Current Load:</strong>{' '}
                        {selectedLead.assignedTo.current_active_leads}
                        {typeof selectedLead.assignedTo.max_active_leads ===
                          'number' &&
                        selectedLead.assignedTo.max_active_leads > 0
                          ? ` / ${selectedLead.assignedTo.max_active_leads}`
                          : ' (unlimited)'}
                      </p>
                    )}
                  </div>
                ) : (
                  <p
                    style={{
                      fontSize: '0.9rem',
                      color: 'var(--text-muted)',
                      fontStyle: 'italic',
                    }}
                  >
                    This lead is currently unassigned.
                  </p>
                )}
              </div>

              {/* Notes */}
              <div style={{ gridColumn: '1 / -1' }}>
                <h4
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    marginBottom: '0.5rem',
                  }}
                >
                  Notes
                </h4>
                <div
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    minHeight: '100px',
                  }}
                >
                  {selectedLead.notes || 'No notes available.'}
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '2rem',
              }}
            >
              <Button
                variant="outline"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* Export format modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => (!exporting ? setShowExportModal(false) : null)}
        title="Export Leads"
      >
        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          Choose the format you want to export your leads in.
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '0.5rem',
          }}
        >
          <Button
            variant="ghost"
            disabled={exporting}
            onClick={() => setShowExportModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            disabled={exporting}
            onClick={() => handleExport('json')}
          >
            {exporting ? 'Exporting...' : 'Export JSON'}
          </Button>
          <Button
            variant="primary"
            disabled={exporting}
            onClick={() => handleExport('csv')}
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default LeadsPage;
