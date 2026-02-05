import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/appointment.css';

/**
 * MediFlow BookAppointmentPage
 * Allows patients to book an appointment slot from available options
 * 
 * API Endpoints:
 * - GET /api/appointments/:appointmentId - Get appointment details
 * - GET /api/patients/:patientId - Get patient info
 * - POST /api/appointments/book - Book a specific time slot
 * 
 * Features:
 * - Display available time slots
 * - Book appointment with selected slot
 * - Show confirmation with appointment details
 * - Google Meet link integration
 */
function BookAppointmentPage() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState(null);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [bookedSlot, setBookedSlot] = useState(null);

  /**
   * Fetch appointment details
   */
  useEffect(() => {
    console.log('🚀 Initializing appointment booking page...');
    fetchAppointment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  const fetchAppointment = async () => {
    try {
      console.log('📅 Fetching appointment:', appointmentId);
      setLoading(true);
      setError(null);

      // Fetch appointment by ID
      const res = await fetch(`/api/appointments/${appointmentId}`);
      if (!res.ok) {
        throw new Error('Appointment not found');
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch appointment');
      }

      console.log('✅ Appointment loaded:', data.data);
      setAppointment(data.data);

      // Fetch patient info
      if (data.data.patient_id) {
        console.log('👤 Fetching patient info...');
        const patientRes = await fetch(`/api/patients/${data.data.patient_id._id || data.data.patient_id}`);
        if (patientRes.ok) {
          const patientData = await patientRes.json();
          if (patientData.success) {
            console.log('✅ Patient info loaded:', patientData.data);
            setPatient(patientData.data);
          }
        }
      }
    } catch (err) {
      console.error('❌ Error fetching appointment:', err);
      setError(err.message || 'Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle slot booking
   */
  const handleBookSlot = async (slot) => {
    if (!patient) {
      console.error('❌ Patient information not found');
      alert('Patient information not found. Please contact support.');
      return;
    }

    try {
      console.log('📤 Booking slot:', slot);
      setBooking(true);
      setError(null);

      const res = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointment_id: appointmentId,
          slot_id: slot.slot_id,
          patient_email: patient.email,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to book appointment');
      }

      // Success!
      console.log('✅ Appointment booked successfully:', data.data);
      setSuccess(true);
      setBookedSlot(slot);
      setAppointment({ ...appointment, status: 'scheduled' });
    } catch (err) {
      console.error('❌ Error booking appointment:', err);
      setError(err.message || 'Failed to book appointment. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  /**
   * Format date/time for display
   */
  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    });
  };

  const getRelativeDay = (date) => {
    const target = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((target - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return target.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  // Loading state
  if (loading) {
    return (
      <div className="booking-page">
        <div className="booking-container">
          <div className="booking-loading">Loading appointment details...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !appointment) {
    return (
      <div className="booking-page">
        <div className="booking-container">
          <div className="booking-error">
            <h2>⚠️ Oops!</h2>
            <p>{error}</p>
            <p>Please check your booking link or contact us at support@mediflow.com</p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success && bookedSlot) {
    return (
      <div className="booking-page">
        <div className="booking-container">
          <div className="booking-success">
            <div className="success-icon">✅</div>
            <h1>Appointment Confirmed!</h1>
            <p className="success-lead">
              Thanks, <strong>{patient?.name}</strong>! Your medical consultation is booked.
            </p>

            <div className="booked-slot-card">
              <h3>📅 Your Appointment Details</h3>
              <div className="booked-slot-info">
                <p>
                  <strong>Date:</strong> {getRelativeDay(bookedSlot.start_time)}
                </p>
                <p>
                  <strong>Time:</strong> {formatTime(bookedSlot.start_time)} -{' '}
                  {formatTime(bookedSlot.end_time)} IST
                </p>
                <p>
                  <strong>Duration:</strong> 30 minutes
                </p>
                <p>
                  <strong>Department:</strong> {appointment.department || 'General Medicine'}
                </p>
              </div>

              {appointment.google_meet_link && (
                <div className="meet-link-section">
                  <p>
                    <strong>Video Consultation Link:</strong>
                  </p>
                  <a
                    href={appointment.google_meet_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="meet-link-button"
                  >
                    🔗 Join Consultation
                  </a>
                </div>
              )}
            </div>

            <div className="success-next-steps">
              <h3>What's Next?</h3>
              <ul>
                <li>✅ Check your email/SMS for appointment confirmation</li>
                <li>✅ You'll receive a reminder before the appointment</li>
                <li>✅ Prepare any medical reports or documents</li>
                <li>✅ List your symptoms and questions</li>
                <li>✅ Test your camera and microphone beforehand</li>
              </ul>
            </div>

            <p className="success-footer">Get well soon! 🏥</p>
          </div>
        </div>
      </div>
    );
  }

  // Already booked state
  if (appointment && appointment.status !== 'slots_generated') {
    return (
      <div className="booking-page">
        <div className="booking-container">
          <div className="booking-info">
            <h2>📅 Appointment Already Scheduled</h2>
            <p>This appointment has already been booked.</p>
            {appointment.scheduled_start_time && (
              <div className="scheduled-info">
                <p>
                  <strong>Scheduled Time:</strong>
                </p>
                <p>{formatDateTime(appointment.scheduled_start_time)}</p>
              </div>
            )}
            {appointment.google_meet_link && (
              <a
                href={appointment.google_meet_link}
                target="_blank"
                rel="noopener noreferrer"
                className="meet-link-button"
              >
                🔗 Join Consultation
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Booking page (available slots)
  return (
    <div className="booking-page">
      <div className="booking-container">
        <header className="booking-header">
          <h1>🏥 Book Your Medical Appointment</h1>
          <p className="booking-subtitle">
            Hi <strong>{patient?.name || 'there'}</strong>! Choose a time that works best for you.
          </p>
        </header>

        {error && (
          <div className="booking-error-banner">
            <p>⚠️ {error}</p>
          </div>
        )}

        <div className="booking-details">
          <div className="detail-item">
            <span className="detail-icon">⏱️</span>
            <span>30-minute consultation</span>
          </div>
          <div className="detail-item">
            <span className="detail-icon">📹</span>
            <span>Video consultation</span>
          </div>
          <div className="detail-item">
            <span className="detail-icon">🩺</span>
            <span>Expert medical care</span>
          </div>
        </div>

        <div className="slots-section">
          <h2>Available Time Slots</h2>
          <div className="slots-grid">
            {appointment?.time_slots?.map((slot, index) => (
              <div key={slot.slot_id} className="slot-card">
                <div className="slot-header">
                  <span className="slot-number">Slot {index + 1}</span>
                </div>
                <div className="slot-body">
                  <p className="slot-day">{getRelativeDay(slot.start_time)}</p>
                  <p className="slot-time">
                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                  </p>
                  <p className="slot-timezone">IST (Indian Standard Time)</p>
                </div>
                <button
                  className="slot-book-button"
                  onClick={() => handleBookSlot(slot)}
                  disabled={booking}
                >
                  {booking ? 'Booking...' : 'Book This Slot'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="booking-footer">
          <p>
            Can't find a suitable time? Reply to your confirmation email/SMS and we'll find an
            alternative.
          </p>
        </div>
      </div>
    </div>
  );
}

export default BookAppointmentPage;
