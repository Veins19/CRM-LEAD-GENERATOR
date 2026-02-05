import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/doctor.css';

/**
 * MediFlow PatientDetailPage
 * Shows full patient details, conversation, triage data, notification log, and appointment info
 * 
 * API Endpoints:
 * - GET /api/patients/:id - Get patient details
 * - GET /api/appointments/patient/:id - Get patient appointment
 * - PATCH /api/appointments/:id/cancel - Cancel appointment
 * - PATCH /api/appointments/:id/complete - Mark appointment complete
 * - PATCH /api/appointments/:id/no-show - Mark appointment no-show
 * 
 * Features:
 * - Patient contact and medical info
 * - Triage scoring and urgency
 * - Consultation transcript
 * - Behavioral tracking data
 * - Notification log (email/SMS)
 * - Appointment management
 */
function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAppointment, setLoadingAppointment] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  /**
   * Fetch patient details
   */
  const fetchPatient = async () => {
    try {
      console.log('👤 Fetching patient details:', id);
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/patients/${id}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch patient (${res.status})`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch patient');
      }

      console.log('✅ Patient loaded:', data.data);
      setPatient(data.data);
    } catch (err) {
      console.error('❌ Error fetching patient:', err);
      setError(err.message || 'Failed to load patient details');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch appointment details
   */
  const fetchAppointment = async () => {
    try {
      console.log('📅 Fetching appointment for patient:', id);
      setLoadingAppointment(true);

      const res = await fetch(`/api/appointments/patient/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          // No appointment found - this is OK
          console.log('ℹ️ No appointment found for patient');
          setAppointment(null);
          return;
        }
        throw new Error(`Failed to fetch appointment (${res.status})`);
      }

      const data = await res.json();
      if (data.success) {
        console.log('✅ Appointment loaded:', data.data);
        setAppointment(data.data);
      }
    } catch (err) {
      console.error('❌ Error fetching appointment:', err);
      setAppointment(null);
    } finally {
      setLoadingAppointment(false);
    }
  };

  useEffect(() => {
    console.log('🚀 Initializing patient detail page');
    fetchPatient();
    fetchAppointment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /**
   * Helpers
   */
  const formatDate = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString();
  };

  const formatTimeSlot = (slot) => {
    const start = new Date(slot.start_time);
    const end = new Date(slot.end_time);
    return `${start.toLocaleString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })} - ${end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
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

  const getAppointmentStatusClass = (status) => {
    switch (status) {
      case 'scheduled':
      case 'reminder_sent':
        return 'meeting-badge scheduled';
      case 'completed':
        return 'meeting-badge completed';
      case 'slots_generated':
        return 'meeting-badge pending';
      case 'no_show':
        return 'meeting-badge no-show';
      case 'cancelled':
      case 'expired':
        return 'meeting-badge cancelled';
      default:
        return 'meeting-badge none';
    }
  };

  const getAppointmentStatusText = (status) => {
    switch (status) {
      case 'slots_generated':
        return 'Pending Booking';
      case 'scheduled':
        return 'Scheduled';
      case 'reminder_sent':
        return 'Reminder Sent';
      case 'completed':
        return 'Completed';
      case 'no_show':
        return 'No Show';
      case 'cancelled':
        return 'Cancelled';
      case 'expired':
        return 'Expired';
      default:
        return 'Not Initiated';
    }
  };

  /**
   * Admin actions for appointments
   */
  const handleCancelAppointment = async () => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;

    try {
      console.log('🚫 Cancelling appointment:', appointment._id);
      const res = await fetch(`/api/appointments/${appointment._id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by doctor' }),
      });

      if (!res.ok) throw new Error('Failed to cancel appointment');

      console.log('✅ Appointment cancelled');
      alert('Appointment cancelled successfully');
      fetchAppointment();
      fetchPatient();
    } catch (err) {
      console.error('❌ Error cancelling appointment:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const handleCompleteAppointment = async () => {
    try {
      console.log('✅ Marking appointment as completed:', appointment._id);
      const res = await fetch(`/api/appointments/${appointment._id}/complete`, {
        method: 'PATCH',
      });

      if (!res.ok) throw new Error('Failed to mark appointment as completed');

      console.log('✅ Appointment completed');
      alert('Appointment marked as completed');
      fetchAppointment();
      fetchPatient();
    } catch (err) {
      console.error('❌ Error completing appointment:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const handleMarkNoShow = async () => {
    try {
      console.log('⚠️ Marking appointment as no-show:', appointment._id);
      const res = await fetch(`/api/appointments/${appointment._id}/no-show`, {
        method: 'PATCH',
      });

      if (!res.ok) throw new Error('Failed to mark as no-show');

      console.log('✅ Appointment marked as no-show');
      alert('Appointment marked as no-show');
      fetchAppointment();
      fetchPatient();
    } catch (err) {
      console.error('❌ Error marking no-show:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const handleTestReminders = async () => {
    if (!window.confirm('This will reschedule the appointment to 2 minutes from NOW to trigger reminders. Proceed?')) return;

    try {
      console.log('⚡ Testing reminders for appointment:', appointment._id);
      const res = await fetch(`/api/appointments/${appointment._id}/test-reminders`, {
        method: 'PATCH',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to trigger test');

      console.log('✅ Test reminders triggered');
      alert('✅ Test Triggered! Check your email/SMS in 1-2 minutes.');
      fetchAppointment();
    } catch (err) {
      console.error('❌ Error testing reminders:', err);
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="admin-loading">Loading patient details...</div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="admin-dashboard">
        <div className="admin-error">{error || 'Patient not found'}</div>
        <button
          type="button"
          className="admin-refresh-btn"
          onClick={() => navigate('/doctor/patients')}
          style={{ marginTop: '20px' }}
        >
          ← Back to Patients
        </button>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div>
          <h1 className="admin-title">{patient.name}</h1>
          <p className="admin-subtitle">{patient.email}</p>
        </div>
        <button
          type="button"
          className="admin-refresh-btn"
          onClick={() => {
            console.log('🔙 Navigating back to patients list');
            navigate('/doctor/patients');
          }}
        >
          ← Back to Patients
        </button>
      </header>

      {/* Patient Info Card */}
      <section className="admin-section">
        <div className="lead-detail-grid">
          {/* Column 1: Basic Info */}
          <div className="detail-card">
            <h3 className="detail-card-title">Patient Information</h3>
            <div className="detail-row">
              <span className="detail-label">Name</span>
              <span className="detail-value">{patient.name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Email</span>
              <span className="detail-value">{patient.email}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Phone</span>
              <span className="detail-value">{patient.phone || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Age</span>
              <span className="detail-value">{patient.age ? `${patient.age} years` : '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Gender</span>
              <span className="detail-value" style={{ textTransform: 'capitalize' }}>
                {patient.gender || '—'}
              </span>
            </div>
          </div>

          {/* Column 2: Medical Data */}
          <div className="detail-card">
            <h3 className="detail-card-title">Medical Information</h3>
            <div className="detail-row">
              <span className="detail-label">Symptoms</span>
              <span className="detail-value">
                {Array.isArray(patient.symptoms) && patient.symptoms.length > 0
                  ? patient.symptoms.join(', ')
                  : '—'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Department</span>
              <span className="detail-value">{patient.department || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Medical History</span>
              <span className="detail-value">{patient.medical_history || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Allergies</span>
              <span className="detail-value">{patient.allergies || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Current Medications</span>
              <span className="detail-value">{patient.current_medications || '—'}</span>
            </div>
          </div>

          {/* Column 3: Triage */}
          <div className="detail-card">
            <h3 className="detail-card-title">Triage Assessment</h3>
            <div className="detail-row">
              <span className="detail-label">Urgency Score</span>
              <span className={getUrgencyClass(patient.urgency_score)}>
                {patient.urgency_score}/100 ({patient.triage_level})
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Triage Level</span>
              <span className={getTriageClass(patient.triage_level)}>
                {patient.triage_level || '—'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Recommended Action</span>
              <span className="detail-value" style={{ textTransform: 'capitalize' }}>
                {patient.recommended_action || '—'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span className={`status-badge status-${patient.status}`}>{patient.status}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Source</span>
              <span className="detail-value" style={{ textTransform: 'capitalize' }}>
                {patient.source || '—'}
              </span>
            </div>
          </div>

          {/* Column 4: Appointment Info */}
          <div className="detail-card">
            <h3 className="detail-card-title">Appointment Information</h3>
            {loadingAppointment ? (
              <div className="detail-value">Loading...</div>
            ) : appointment ? (
              <>
                <div className="detail-row">
                  <span className="detail-label">Status</span>
                  <span className={getAppointmentStatusClass(appointment.status)}>
                    {getAppointmentStatusText(appointment.status)}
                  </span>
                </div>
                {appointment.scheduled_start_time && (
                  <div className="detail-row">
                    <span className="detail-label">Scheduled Time</span>
                    <span className="detail-value">{formatDate(appointment.scheduled_start_time)}</span>
                  </div>
                )}
                {appointment.google_meet_link && (
                  <div className="detail-row">
                    <span className="detail-label">Video Link</span>
                    <a
                      href={appointment.google_meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="detail-link"
                    >
                      Join Consultation
                    </a>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Reminders Sent</span>
                  <span className="detail-value">
                    {appointment.booking_reminders?.sent_count || 0}/3
                  </span>
                </div>
              </>
            ) : (
              <div className="detail-value" style={{ color: '#6c757d' }}>
                No appointment scheduled
              </div>
            )}
          </div>
        </div>

        {/* Triage Reasoning */}
        {patient.triage_reasoning && (
          <div className="detail-reasoning">
            <h4>Triage Reasoning</h4>
            <p>{patient.triage_reasoning}</p>
          </div>
        )}

        {/* Chief Complaints */}
        {Array.isArray(patient.chief_complaints) && patient.chief_complaints.length > 0 && (
          <div className="detail-pain-points">
            <h4>Chief Complaints</h4>
            <ul>
              {patient.chief_complaints.map((complaint, idx) => (
                <li key={idx}>{complaint}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Tabs */}
      <section className="admin-section">
        <div className="tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => {
              console.log('📋 Tab changed: overview');
              setActiveTab('overview');
            }}
          >
            Overview
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'conversation' ? 'active' : ''}`}
            onClick={() => {
              console.log('📋 Tab changed: conversation');
              setActiveTab('conversation');
            }}
          >
            Consultation
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'behavior' ? 'active' : ''}`}
            onClick={() => {
              console.log('📋 Tab changed: behavior');
              setActiveTab('behavior');
            }}
          >
            Activity Data
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => {
              console.log('📋 Tab changed: notifications');
              setActiveTab('notifications');
            }}
          >
            Notification Log
          </button>
          {appointment && (
            <button
              type="button"
              className={`tab-btn ${activeTab === 'appointment' ? 'active' : ''}`}
              onClick={() => {
                console.log('📋 Tab changed: appointment');
                setActiveTab('appointment');
              }}
            >
              Appointment
            </button>
          )}
        </div>

        <div className="tab-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="tab-panel">
              <h3>Engagement Metrics</h3>
              <div className="metrics-grid">
                <div className="metric-item">
                  <span className="metric-label">Messages Sent</span>
                  <span className="metric-value">{patient.engagement_metrics?.message_count || 0}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Avg Response Time</span>
                  <span className="metric-value">
                    {patient.engagement_metrics?.avg_response_time || 0}s
                  </span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Consultation Duration</span>
                  <span className="metric-value">
                    {Math.round((patient.engagement_metrics?.conversation_duration || 0) / 60)}m
                  </span>
                </div>
              </div>

              <h3 style={{ marginTop: '24px' }}>Timestamps</h3>
              <div className="detail-row">
                <span className="detail-label">Created</span>
                <span className="detail-value">{formatDate(patient.createdAt)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Last Updated</span>
                <span className="detail-value">{formatDate(patient.updatedAt)}</span>
              </div>
              {patient.triaged_at && (
                <div className="detail-row">
                  <span className="detail-label">Triaged At</span>
                  <span className="detail-value">{formatDate(patient.triaged_at)}</span>
                </div>
              )}
            </div>
          )}

          {/* Conversation Tab */}
          {activeTab === 'conversation' && (
            <div className="tab-panel">
              {patient.conversation_id && patient.conversation_id.messages ? (
                <div className="conversation-transcript">
                  {patient.conversation_id.messages.map((msg, idx) => (
                    <div key={idx} className={`transcript-message ${msg.role}`}>
                      <div className="message-role">
                        {msg.role === 'user' ? '👤 Patient' : '🤖 MediFlow'}
                      </div>
                      <div className="message-content">{msg.content}</div>
                      <div className="message-timestamp">{formatDate(msg.timestamp)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="admin-empty">No consultation transcript available.</p>
              )}
            </div>
          )}

          {/* Behavior Tab */}
          {activeTab === 'behavior' && (
            <div className="tab-panel">
              <div className="metrics-grid">
                <div className="metric-item">
                  <span className="metric-label">Pages Visited</span>
                  <span className="metric-value">{patient.behavioral_data?.pages_visited || 0}</span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Time on Site</span>
                  <span className="metric-value">
                    {Math.round((patient.behavioral_data?.time_on_site || 0) / 60)}m
                  </span>
                </div>
                <div className="metric-item">
                  <span className="metric-label">Scroll Depth Avg</span>
                  <span className="metric-value">{patient.behavioral_data?.scroll_depth_avg || 0}%</span>
                </div>
              </div>

              {Array.isArray(patient.behavioral_data?.departments_viewed) &&
                patient.behavioral_data.departments_viewed.length > 0 && (
                  <div style={{ marginTop: '24px' }}>
                    <h4>Departments Viewed</h4>
                    <div className="admin-top-services">
                      {patient.behavioral_data.departments_viewed.map((dept, idx) => (
                        <div key={idx} className="service-chip">
                          <span className="service-name">{dept}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="tab-panel">
              <div className="detail-row">
                <span className="detail-label">Notification Sent</span>
                <span className="detail-value">{patient.notification_sent ? 'Yes' : 'No'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Notification Status</span>
                <span className={`status-badge status-${patient.notification_status}`}>
                  {patient.notification_status || 'pending'}
                </span>
              </div>
              {patient.notification_sent_at && (
                <div className="detail-row">
                  <span className="detail-label">Sent At</span>
                  <span className="detail-value">{formatDate(patient.notification_sent_at)}</span>
                </div>
              )}
              {patient.notification_type && (
                <div className="detail-row">
                  <span className="detail-label">Notification Type</span>
                  <span className="detail-value" style={{ textTransform: 'uppercase' }}>
                    {patient.notification_type}
                  </span>
                </div>
              )}
              {patient.notification_error && (
                <div className="detail-row">
                  <span className="detail-label">Error</span>
                  <span className="detail-value" style={{ color: '#ef4444' }}>
                    {patient.notification_error}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Appointment Tab */}
          {activeTab === 'appointment' && appointment && (
            <div className="tab-panel">
              <h3>Appointment Details</h3>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className={getAppointmentStatusClass(appointment.status)}>
                  {getAppointmentStatusText(appointment.status)}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Duration</span>
                <span className="detail-value">{appointment.appointment_duration || 30} minutes</span>
              </div>
              {appointment.slots_generated_at && (
                <div className="detail-row">
                  <span className="detail-label">Slots Generated</span>
                  <span className="detail-value">{formatDate(appointment.slots_generated_at)}</span>
                </div>
              )}
              {appointment.booked_at && (
                <div className="detail-row">
                  <span className="detail-label">Booked At</span>
                  <span className="detail-value">{formatDate(appointment.booked_at)}</span>
                </div>
              )}

              {appointment.status === 'slots_generated' && appointment.time_slots && (
                <>
                  <h4 style={{ marginTop: '24px' }}>Available Time Slots</h4>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {appointment.time_slots.map((slot, idx) => (
                      <li
                        key={slot.slot_id}
                        style={{
                          padding: '12px',
                          background: '#f8f9fa',
                          borderRadius: '8px',
                          marginBottom: '8px',
                        }}
                      >
                        <strong>Slot {idx + 1}:</strong> {formatTimeSlot(slot)}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {appointment.scheduled_start_time && (
                <>
                  <h4 style={{ marginTop: '24px' }}>Scheduled Appointment</h4>
                  <div className="detail-row">
                    <span className="detail-label">Start Time</span>
                    <span className="detail-value">{formatDate(appointment.scheduled_start_time)}</span>
                  </div>
                  {appointment.google_meet_link && (
                    <div className="detail-row">
                      <span className="detail-label">Video Consultation</span>
                      <a
                        href={appointment.google_meet_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="detail-link"
                      >
                        Join Consultation →
                      </a>
                    </div>
                  )}
                </>
              )}

              <h4 style={{ marginTop: '24px' }}>Reminders</h4>
              <div className="detail-row">
                <span className="detail-label">Booking Reminders</span>
                <span className="detail-value">
                  {appointment.booking_reminders?.sent_count || 0} / {appointment.booking_reminders?.max_reminders || 3}
                </span>
              </div>
              {appointment.pre_appointment_reminder?.sent && (
                <div className="detail-row">
                  <span className="detail-label">Pre-Appointment Reminder</span>
                  <span className="detail-value">
                    Sent at {formatDate(appointment.pre_appointment_reminder.sent_at)}
                  </span>
                </div>
              )}
              {appointment.late_join_reminder?.sent && (
                <div className="detail-row">
                  <span className="detail-label">Late-Join Reminder</span>
                  <span className="detail-value">
                    Sent at {formatDate(appointment.late_join_reminder.sent_at)} ({appointment.late_join_reminder.minutes_late} min late)
                  </span>
                </div>
              )}

              {/* Doctor Actions */}
              {appointment.status === 'scheduled' && (
                <div style={{ marginTop: '24px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="admin-refresh-btn"
                    onClick={handleCompleteAppointment}
                    style={{ background: '#28a745', border: 'none', color: 'white' }}
                  >
                    Mark as Completed
                  </button>
                  <button
                    type="button"
                    className="admin-refresh-btn"
                    onClick={handleMarkNoShow}
                    style={{ background: '#ffc107', border: 'none', color: 'black' }}
                  >
                    Mark as No-Show
                  </button>
                  <button
                    type="button"
                    className="admin-refresh-btn"
                    onClick={handleCancelAppointment}
                    style={{ background: '#dc3545', border: 'none', color: 'white' }}
                  >
                    Cancel Appointment
                  </button>
                  
                  {/* Test Button */}
                  <button
                    type="button"
                    className="admin-refresh-btn"
                    onClick={handleTestReminders}
                    style={{ background: '#6610f2', border: 'none', color: 'white', marginLeft: 'auto' }}
                  >
                    ⚡ Test Reminders (2 min)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default PatientDetailPage;
