import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/doctor.css';

/**
 * MediFlow DoctorDashboard Page
 * Shows high-level patient stats, appointment stats + recent patients table
 * 
 * API Endpoints:
 * - GET /api/patients/stats - Patient statistics
 * - GET /api/appointments/stats - Appointment statistics
 * - GET /api/patients?page=1&limit=5 - Recent patients
 * 
 * Features:
 * - Patient metrics (total, triage levels, avg urgency)
 * - Appointment metrics (total, scheduled, completed, conversion)
 * - Top departments
 * - Recent patients table
 */
function DoctorDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [appointmentStats, setAppointmentStats] = useState(null);
  const [recentPatients, setRecentPatients] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch stats from /api/patients/stats
   */
  const fetchStats = async () => {
    try {
      console.log('📊 Fetching patient stats...');
      setLoadingStats(true);
      setError(null);

      const res = await fetch('/api/patients/stats');
      if (!res.ok) {
        throw new Error(`Failed to fetch stats (${res.status})`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch stats');
      }

      console.log('✅ Patient stats loaded:', data.data);
      setStats(data.data);
    } catch (err) {
      console.error('❌ Error fetching stats:', err);
      setError(err.message || 'Failed to load dashboard stats');
    } finally {
      setLoadingStats(false);
    }
  };

  /**
   * Fetch appointment stats from /api/appointments/stats
   */
  const fetchAppointmentStats = async () => {
    try {
      console.log('📅 Fetching appointment stats...');
      setLoadingAppointments(true);

      const res = await fetch('/api/appointments/stats');
      if (!res.ok) {
        // If endpoint doesn't exist yet, silently fail
        if (res.status === 404) {
          console.warn('⚠️ Appointment stats endpoint not found - feature may not be active');
          setAppointmentStats(null);
          return;
        }
        throw new Error(`Failed to fetch appointment stats (${res.status})`);
      }

      const data = await res.json();
      if (data.success) {
        console.log('✅ Appointment stats loaded:', data.data);
        setAppointmentStats(data.data);
      }
    } catch (err) {
      console.error('❌ Error fetching appointment stats:', err);
      // Don't set error - appointment feature is optional
      setAppointmentStats(null);
    } finally {
      setLoadingAppointments(false);
    }
  };

  /**
   * Fetch recent patients from /api/patients?page=1&limit=5
   */
  const fetchRecentPatients = async () => {
    try {
      console.log('👥 Fetching recent patients...');
      setLoadingPatients(true);
      setError(null);

      const res = await fetch('/api/patients?page=1&limit=5&sortBy=createdAt&sortOrder=desc');
      if (!res.ok) {
        throw new Error(`Failed to fetch patients (${res.status})`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch patients');
      }

      console.log('✅ Recent patients loaded:', data.data?.length || 0);
      setRecentPatients(data.data || []);
    } catch (err) {
      console.error('❌ Error fetching patients:', err);
      setError(err.message || 'Failed to load recent patients');
    } finally {
      setLoadingPatients(false);
    }
  };

  /**
   * Initial load
   */
  useEffect(() => {
    console.log('🚀 Initializing Doctor Dashboard...');
    fetchStats();
    fetchAppointmentStats();
    fetchRecentPatients();
  }, []);

  /**
   * Helper: format date
   */
  const formatDate = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString();
  };

  /**
   * Helper: urgency badge class
   */
  const getUrgencyClass = (urgency) => {
    if (urgency >= 80) return 'urgency-badge emergency';
    if (urgency >= 50) return 'urgency-badge urgent';
    if (urgency > 0) return 'urgency-badge routine';
    return 'urgency-badge none';
  };

  /**
   * Helper: triage level badge
   */
  const getTriageClass = (level) => {
    if (level === 'emergency') return 'triage-badge emergency';
    if (level === 'urgent') return 'triage-badge urgent';
    if (level === 'routine') return 'triage-badge routine';
    return 'triage-badge none';
  };

  /**
   * Helper: appointment status badge class
   */
  const getAppointmentStatusClass = (status) => {
    switch (status) {
      case 'scheduled':
        return 'appointment-badge scheduled';
      case 'completed':
        return 'appointment-badge completed';
      case 'slots_generated':
        return 'appointment-badge pending';
      case 'no_show':
        return 'appointment-badge no-show';
      case 'cancelled':
        return 'appointment-badge cancelled';
      case 'not_initiated':
      default:
        return 'appointment-badge none';
    }
  };

  /**
   * Helper: appointment status display text
   */
  const getAppointmentStatusText = (status) => {
    switch (status) {
      case 'slots_generated':
        return 'Pending';
      case 'scheduled':
        return 'Scheduled';
      case 'completed':
        return 'Completed';
      case 'no_show':
        return 'No Show';
      case 'cancelled':
        return 'Cancelled';
      case 'not_initiated':
      default:
        return '—';
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div>
          <h1 className="admin-title">MediFlow Doctor Dashboard</h1>
          <p className="admin-subtitle">
            Overview of patients, triage levels, appointments, and consultation performance.
          </p>
        </div>
        <button
          type="button"
          className="admin-refresh-btn"
          onClick={() => {
            console.log('🔄 Refreshing dashboard...');
            fetchStats();
            fetchAppointmentStats();
            fetchRecentPatients();
          }}
        >
          Refresh
        </button>
      </header>

      {/* Error banner */}
      {error && (
        <div className="admin-error">
          <span>{error}</span>
        </div>
      )}

      {/* Patient KPI cards */}
      <section className="admin-kpis">
        <h3 style={{ gridColumn: '1 / -1', marginBottom: '10px', color: '#667eea' }}>
          Patient Metrics
        </h3>

        {loadingStats && (
          <div className="admin-loading">Loading stats...</div>
        )}

        {!loadingStats && stats && (
          <>
            <div className="kpi-card">
              <h3>Total Patients</h3>
              <p className="kpi-value">{stats.total}</p>
              <p className="kpi-label">All-time consultations</p>
            </div>

            <div className="kpi-card">
              <h3>Emergency / Urgent / Routine</h3>
              <p className="kpi-value">
                {stats.classification.emergency} / {stats.classification.urgent} / {stats.classification.routine}
              </p>
              <p className="kpi-label">By triage level</p>
            </div>

            <div className="kpi-card">
              <h3>Avg Urgency Score</h3>
              <p className="kpi-value">{stats.scoring.average}</p>
              <p className="kpi-label">
                Min {stats.scoring.min} • Max {stats.scoring.max}
              </p>
            </div>

            <div className="kpi-card">
              <h3>Notifications (Sent / Failed)</h3>
              <p className="kpi-value">
                {stats.notifications.sent} / {stats.notifications.failed}
              </p>
              <p className="kpi-label">Automated messages</p>
            </div>
          </>
        )}
      </section>

      {/* Appointment KPI cards */}
      {!loadingAppointments && appointmentStats && (
        <section className="admin-kpis" style={{ marginTop: '20px' }}>
          <h3 style={{ gridColumn: '1 / -1', marginBottom: '10px', color: '#764ba2' }}>
            Appointment Metrics
          </h3>

          <div className="kpi-card">
            <h3>Appointments Generated</h3>
            <p className="kpi-value">{appointmentStats.total_generated}</p>
            <p className="kpi-label">Time slots sent</p>
          </div>

          <div className="kpi-card">
            <h3>Appointments Scheduled</h3>
            <p className="kpi-value">{appointmentStats.scheduled}</p>
            <p className="kpi-label">Booked by patients</p>
          </div>

          <div className="kpi-card">
            <h3>Appointments Completed</h3>
            <p className="kpi-value">{appointmentStats.completed}</p>
            <p className="kpi-label">Successfully held</p>
          </div>

          <div className="kpi-card">
            <h3>Booking Rate</h3>
            <p className="kpi-value">
              {appointmentStats.total_generated > 0
                ? Math.round((appointmentStats.scheduled / appointmentStats.total_generated) * 100)
                : 0}
              %
            </p>
            <p className="kpi-label">Generated → Scheduled</p>
          </div>
        </section>
      )}

      {/* Top departments */}
      <section className="admin-section">
        <div className="admin-section-header">
          <h2>Top Departments</h2>
          <p>Most consulted medical departments.</p>
        </div>
        <div className="admin-top-services">
          {stats && stats.topDepartments && stats.topDepartments.length > 0 ? (
            stats.topDepartments.map((d) => (
              <div key={d.department} className="service-chip">
                <span className="service-name">{d.department}</span>
                <span className="service-count">{d.count}</span>
              </div>
            ))
          ) : (
            <p className="admin-empty">No department data yet.</p>
          )}
        </div>
      </section>

      {/* Recent patients table */}
      <section className="admin-section">
        <div
          className="admin-section-header"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div>
            <h2>Recent Patients</h2>
            <p>Latest patients captured via chatbot and triage system.</p>
          </div>
          <button
            type="button"
            className="admin-refresh-btn"
            onClick={() => {
              console.log('📍 Navigating to all patients...');
              navigate('/doctor/patients');
            }}
          >
            View All Patients →
          </button>
        </div>

        {loadingPatients && <div className="admin-loading">Loading recent patients...</div>}

        {!loadingPatients && recentPatients.length === 0 && <p className="admin-empty">No patients found yet.</p>}

        {!loadingPatients && recentPatients.length > 0 && (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name & Age</th>
                  <th>Urgency</th>
                  <th>Triage</th>
                  <th>Symptoms</th>
                  <th>Appointment</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recentPatients.map((patient) => (
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
                      <div className="lead-company">{patient.age ? `${patient.age} years` : '—'}</div>
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
                      <span className={getAppointmentStatusClass(patient.appointment_status)}>
                        {getAppointmentStatusText(patient.appointment_status)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${patient.status}`}>{patient.status}</span>
                    </td>
                    <td>
                      <div className="lead-date">{formatDate(patient.createdAt)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default DoctorDashboard;
