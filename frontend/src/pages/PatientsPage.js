import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/doctor.css';

/**
 * MediFlow PatientsPage
 * Full patients table with filters, search, pagination
 * 
 * API Endpoints:
 * - GET /api/patients?page=X&limit=Y - Get paginated patients list
 * - GET /api/patients/search?q=QUERY - Search patients
 * 
 * Features:
 * - Patients table with triage info
 * - Filter by triage level, status
 * - Search by name, email, phone
 * - Pagination
 * - Click to view patient details
 */
function PatientsPage() {
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);

  // Filters
  const [filters, setFilters] = useState({
    triage_level: '',
    status: '',
    search: '',
  });

  /**
   * Fetch patients from API
   */
  const fetchPatients = async () => {
    try {
      console.log('👥 Fetching patients - Page:', currentPage, 'Filters:', filters);
      setLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      if (filters.triage_level) {
        params.append('triage_level', filters.triage_level);
      }
      if (filters.status) {
        params.append('status', filters.status);
      }

      const res = await fetch(`/api/patients?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch patients (${res.status})`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch patients');
      }

      console.log('✅ Patients loaded:', data.data?.length || 0);
      setPatients(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalPatients(data.pagination?.totalPatients || 0);
    } catch (err) {
      console.error('❌ Error fetching patients:', err);
      setError(err.message || 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Search patients
   */
  const searchPatients = async () => {
    if (!filters.search || filters.search.trim().length === 0) {
      console.log('🔍 Empty search - fetching all patients');
      fetchPatients();
      return;
    }

    try {
      console.log('🔍 Searching patients:', filters.search);
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/patients/search?q=${encodeURIComponent(filters.search)}`);
      if (!res.ok) {
        throw new Error(`Search failed (${res.status})`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Search failed');
      }

      console.log('✅ Search results:', data.data?.length || 0);
      setPatients(data.data || []);
      setTotalPages(1);
      setTotalPatients(data.count || 0);
    } catch (err) {
      console.error('❌ Error searching patients:', err);
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle filter change
   */
  const handleFilterChange = (key, value) => {
    console.log('🔧 Filter changed:', key, '=', value);
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  /**
   * Reset filters
   */
  const resetFilters = () => {
    console.log('🔄 Resetting filters');
    setFilters({
      triage_level: '',
      status: '',
      search: '',
    });
    setCurrentPage(1);
  };

  /**
   * Initial load & refetch when filters/page change
   */
  useEffect(() => {
    console.log('🚀 Initializing patients page');
    if (filters.search) {
      searchPatients();
    } else {
      fetchPatients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filters.triage_level, filters.status]);

  /**
   * Helpers
   */
  const formatDate = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getUrgencyClass = (score) => {
    if (score >= 80) return 'score-badge hot';
    if (score >= 50) return 'score-badge warm';
    if (score > 0) return 'score-badge cold';
    return 'score-badge none';
  };

  const getTriageClass = (level) => {
    if (level === 'emergency') return 'behavior-badge high';
    if (level === 'urgent') return 'behavior-badge medium';
    if (level === 'routine') return 'behavior-badge low';
    return 'behavior-badge none';
  };

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div>
          <h1 className="admin-title">All Patients</h1>
          <p className="admin-subtitle">
            {totalPatients} patient{totalPatients !== 1 ? 's' : ''} total
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            className="admin-refresh-btn"
            onClick={() => {
              console.log('🔙 Navigating to dashboard');
              navigate('/doctor');
            }}
          >
            ← Dashboard
          </button>
          <button
            type="button"
            className="admin-refresh-btn"
            onClick={() => {
              console.log('🔄 Refreshing patients list');
              if (filters.search) {
                searchPatients();
              } else {
                fetchPatients();
              }
            }}
          >
            Refresh
          </button>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="admin-error">
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Filters & Search</h2>
        </div>

        <div className="filters-grid">
          {/* Search */}
          <div className="filter-group">
            <label htmlFor="search">Search by name, email, or phone</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="search"
                type="text"
                className="filter-input"
                placeholder="e.g. Priya Sharma"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    console.log('⌨️ Enter pressed - searching');
                    searchPatients();
                  }
                }}
              />
              <button
                type="button"
                className="filter-btn"
                onClick={searchPatients}
              >
                Search
              </button>
            </div>
          </div>

          {/* Triage Level */}
          <div className="filter-group">
            <label htmlFor="triage_level">Triage Level</label>
            <select
              id="triage_level"
              className="filter-select"
              value={filters.triage_level}
              onChange={(e) => handleFilterChange('triage_level', e.target.value)}
            >
              <option value="">All</option>
              <option value="emergency">Emergency</option>
              <option value="urgent">Urgent</option>
              <option value="routine">Routine</option>
            </select>
          </div>

          {/* Status */}
          <div className="filter-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              className="filter-select"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All</option>
              <option value="new">New</option>
              <option value="consulted">Consulted</option>
              <option value="treated">Treated</option>
              <option value="follow_up">Follow-up</option>
              <option value="discharged">Discharged</option>
            </select>
          </div>

          {/* Reset */}
          <div className="filter-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              type="button"
              className="filter-btn-secondary"
              onClick={resetFilters}
            >
              Reset Filters
            </button>
          </div>
        </div>
      </section>

      {/* Patients table */}
      <section className="admin-section">
        {loading && (
          <div className="admin-loading">Loading patients...</div>
        )}

        {!loading && patients.length === 0 && (
          <p className="admin-empty">No patients found matching your filters.</p>
        )}

        {!loading && patients.length > 0 && (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name & Age</th>
                    <th>Contact</th>
                    <th>Urgency</th>
                    <th>Triage</th>
                    <th>Symptoms</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr
                      key={patient._id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        console.log('👤 Navigating to patient:', patient._id);
                        navigate(`/doctor/patients/${patient._id}`);
                      }}
                    >
                      <td>
                        <div className="lead-name">{patient.name}</div>
                        <div className="lead-company">
                          {patient.age ? `${patient.age} years` : '—'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                          {patient.email}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                          {patient.phone || '—'}
                        </div>
                      </td>
                      <td>
                        <span className={getUrgencyClass(patient.urgency_score)}>
                          {patient.urgency_score} ({patient.triage_level})
                        </span>
                      </td>
                      <td>
                        <span className={getTriageClass(patient.triage_level)}>
                          {patient.triage_level || '—'}
                        </span>
                      </td>
                      <td>
                        <div className="lead-services">
                          {Array.isArray(patient.symptoms) && patient.symptoms.length > 0
                            ? patient.symptoms.join(', ')
                            : '—'}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge status-${patient.status}`}>
                          {patient.status}
                        </span>
                      </td>
                      <td>
                        <div className="lead-date">
                          {formatDate(patient.createdAt)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  type="button"
                  className="pagination-btn"
                  disabled={currentPage === 1}
                  onClick={() => {
                    console.log('⬅️ Previous page');
                    setCurrentPage((p) => p - 1);
                  }}
                >
                  ← Previous
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="pagination-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => {
                    console.log('➡️ Next page');
                    setCurrentPage((p) => p + 1);
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default PatientsPage;
