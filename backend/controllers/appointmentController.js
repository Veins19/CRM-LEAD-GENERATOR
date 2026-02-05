import logger from '../utils/logger.js';
import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import emailService from '../services/emailService.js';
import smsService from '../services/smsService.js';
import doctorAssignmentService from '../services/doctorAssignmentService.js';
import { formatDateTime } from '../utils/timeSlotGenerator.js';

/**
 * Appointment Controller for MediFlow
 * Handles appointment scheduling, booking, and management
 */

/**
 * Create a new appointment (from chatbot or manual)
 * POST /api/appointments
 */
export const createAppointment = async (req, res) => {
  try {
    const {
      patient_id,
      department,
      chief_complaint,
      symptoms,
      preferred_date,
      preferred_time,
    } = req.body;

    // Validate required fields
    if (!patient_id || !department || !chief_complaint) {
      return res.status(400).json({
        success: false,
        message: 'patient_id, department, and chief_complaint are required',
      });
    }

    logger.info(`Creating appointment for patient: ${patient_id}`);

    // Get patient details
    const patient = await Patient.findById(patient_id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    // Assign doctor based on department and symptoms
    const doctorAssignment = await doctorAssignmentService.assignPatientToDoctor(
      {
        ...patient.toObject(),
        chief_complaint,
        symptoms: symptoms || [],
      },
      {
        department,
        shift: 'morning',
        isEmergency: false,
      }
    );

    if (!doctorAssignment.doctorId) {
      return res.status(500).json({
        success: false,
        message: 'No available doctors in the requested department',
      });
    }

    // Set appointment date/time (default to tomorrow 10 AM if not specified)
    let appointmentDate;
    if (preferred_date && preferred_time) {
      appointmentDate = new Date(`${preferred_date}T${preferred_time}:00`);
    } else {
      appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 1);
      appointmentDate.setHours(10, 0, 0, 0);
    }

    const appointmentEndTime = new Date(appointmentDate.getTime() + 30 * 60000); // 30 min

    // Create appointment
    const appointment = new Appointment({
      patient_id: patient._id,
      doctor_id: doctorAssignment.doctorId,
      department,
      appointment_type: 'consultation',
      scheduled_start_time: appointmentDate,
      scheduled_end_time: appointmentEndTime,
      status: 'scheduled',
      chief_complaint,
      symptoms: symptoms || [],
      notes: `Appointment created via ${req.body.source || 'API'}`,
      source: req.body.source || 'manual',
    });

    await appointment.save();
    logger.success(`✅ Appointment created: ${appointment._id}`);

    // Update patient
    patient.upcoming_appointments.push(appointment._id);
    await patient.save();

    // Increment doctor patient count
    await doctorAssignmentService.incrementDoctorPatientCount(doctorAssignment.doctorId);

    // Send confirmation emails and SMS
    try {
      await emailService.sendAllAppointmentEmails(
        appointment,
        patient,
        doctorAssignment.doctor
      );
      
      await smsService.sendAllAppointmentSms(
        appointment,
        patient,
        doctorAssignment.doctor
      );

      logger.success('✅ Confirmation emails and SMS sent');
    } catch (notificationError) {
      logger.error('Failed to send notifications:', notificationError.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: {
        appointment_id: appointment._id,
        patient_id: patient._id,
        doctor_id: doctorAssignment.doctorId,
        doctor_name: doctorAssignment.doctor.name,
        department,
        scheduled_time: appointmentDate,
        status: appointment.status,
      },
    });
  } catch (error) {
    logger.error('Error creating appointment:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to create appointment',
      error: error.message,
    });
  }
};

/**
 * Get appointment details by ID
 * GET /api/appointments/:appointmentId
 */
export const getAppointmentById = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId)
      .populate('patient_id', 'name email phone age gender')
      .populate('doctor_id', 'name email specialization department');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    logger.error('Error fetching appointment:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment',
      error: error.message,
    });
  }
};

/**
 * Get all appointments for a patient
 * GET /api/appointments/patient/:patientId
 */
export const getAppointmentsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    const appointments = await Appointment.find({ patient_id: patientId })
      .populate('doctor_id', 'name specialization department')
      .sort({ scheduled_start_time: -1 }); // Latest first

    return res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    logger.error('Error fetching patient appointments:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch patient appointments',
      error: error.message,
    });
  }
};

/**
 * Get all appointments (with filters)
 * GET /api/appointments?status=scheduled&department=Cardiology&page=1&limit=20
 */
export const getAllAppointments = async (req, res) => {
  try {
    const {
      status,
      department,
      doctor_id,
      date,
      page = 1,
      limit = 20,
    } = req.query;

    // Build filter query
    const filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;
    if (doctor_id) filter.doctor_id = doctor_id;
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      filter.scheduled_start_time = { $gte: startOfDay, $lte: endOfDay };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const appointments = await Appointment.find(filter)
      .populate('patient_id', 'name email phone')
      .populate('doctor_id', 'name specialization department')
      .sort({ scheduled_start_time: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalAppointments = await Appointment.countDocuments(filter);
    const totalPages = Math.ceil(totalAppointments / parseInt(limit));

    return res.status(200).json({
      success: true,
      count: appointments.length,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalAppointments,
        hasMore: parseInt(page) < totalPages,
      },
      data: appointments,
    });
  } catch (error) {
    logger.error('Error fetching appointments:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments',
      error: error.message,
    });
  }
};

/**
 * Cancel an appointment
 * PATCH /api/appointments/:appointmentId/cancel
 */
export const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { cancellation_reason } = req.body;

    const appointment = await Appointment.findById(appointmentId)
      .populate('patient_id')
      .populate('doctor_id');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    // Update status
    appointment.status = 'cancelled';
    appointment.cancellation_reason = cancellation_reason || 'Not specified';
    appointment.cancelled_at = new Date();
    await appointment.save();

    // Update patient
    const patient = appointment.patient_id;
    patient.upcoming_appointments = patient.upcoming_appointments.filter(
      (id) => id.toString() !== appointmentId
    );
    await patient.save();

    // Decrement doctor patient count
    await doctorAssignmentService.decrementDoctorPatientCount(appointment.doctor_id._id);

    logger.success(`✅ Appointment cancelled: ${appointmentId}`);

    // Send cancellation notifications
    try {
      await smsService.sendAppointmentCancellationSms(
        appointment,
        patient,
        cancellation_reason || 'by request'
      );
      logger.success('✅ Cancellation SMS sent');
    } catch (notificationError) {
      logger.error('Failed to send cancellation notification:', notificationError.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: appointment,
    });
  } catch (error) {
    logger.error('Error cancelling appointment:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel appointment',
      error: error.message,
    });
  }
};

/**
 * Reschedule an appointment
 * PATCH /api/appointments/:appointmentId/reschedule
 */
export const rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { new_date, new_time, reason } = req.body;

    if (!new_date || !new_time) {
      return res.status(400).json({
        success: false,
        message: 'new_date and new_time are required',
      });
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate('patient_id')
      .populate('doctor_id');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    const oldStartTime = appointment.scheduled_start_time;

    // Update appointment times
    const newStartTime = new Date(`${new_date}T${new_time}:00`);
    const newEndTime = new Date(newStartTime.getTime() + 30 * 60000); // 30 min

    appointment.scheduled_start_time = newStartTime;
    appointment.scheduled_end_time = newEndTime;
    appointment.rescheduled = true;
    appointment.reschedule_reason = reason || 'Patient request';
    appointment.notes = (appointment.notes || '') + `\n[Rescheduled] From ${formatDateTime(oldStartTime)} to ${formatDateTime(newStartTime)}. Reason: ${reason || 'Not specified'}`;
    
    await appointment.save();

    logger.success(`✅ Appointment rescheduled: ${appointmentId}`);

    // Send rescheduling notifications
    try {
      await smsService.sendAppointmentReschedulingSms(
        appointment,
        appointment.patient_id,
        appointment.doctor_id
      );
      logger.success('✅ Rescheduling SMS sent');
    } catch (notificationError) {
      logger.error('Failed to send rescheduling notification:', notificationError.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: appointment,
    });
  } catch (error) {
    logger.error('Error rescheduling appointment:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to reschedule appointment',
      error: error.message,
    });
  }
};

/**
 * Mark appointment as completed
 * PATCH /api/appointments/:appointmentId/complete
 */
export const completeAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { consultation_notes } = req.body;

    const appointment = await Appointment.findById(appointmentId)
      .populate('patient_id');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    appointment.status = 'completed';
    appointment.actual_end_time = new Date();
    if (consultation_notes) {
      appointment.notes = (appointment.notes || '') + `\n[Completed] ${consultation_notes}`;
    }
    await appointment.save();

    // Update patient
    const patient = appointment.patient_id;
    patient.upcoming_appointments = patient.upcoming_appointments.filter(
      (id) => id.toString() !== appointmentId
    );
    patient.last_visit_date = new Date();
    patient.total_visits += 1;
    await patient.save();

    // Decrement doctor patient count
    await doctorAssignmentService.decrementDoctorPatientCount(appointment.doctor_id);

    logger.success(`✅ Appointment marked as completed: ${appointmentId}`);

    return res.status(200).json({
      success: true,
      message: 'Appointment marked as completed',
      data: appointment,
    });
  } catch (error) {
    logger.error('Error completing appointment:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark appointment as completed',
      error: error.message,
    });
  }
};

/**
 * Mark appointment as no-show
 * PATCH /api/appointments/:appointmentId/no-show
 */
export const markAsNoShow = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId)
      .populate('patient_id');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    appointment.status = 'no_show';
    appointment.no_show_at = new Date();
    await appointment.save();

    // Update patient
    const patient = appointment.patient_id;
    patient.upcoming_appointments = patient.upcoming_appointments.filter(
      (id) => id.toString() !== appointmentId
    );
    await patient.save();

    // Decrement doctor patient count
    await doctorAssignmentService.decrementDoctorPatientCount(appointment.doctor_id);

    logger.success(`✅ Appointment marked as no-show: ${appointmentId}`);

    return res.status(200).json({
      success: true,
      message: 'Appointment marked as no-show',
      data: appointment,
    });
  } catch (error) {
    logger.error('Error marking appointment as no-show:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark appointment as no-show',
      error: error.message,
    });
  }
};

/**
 * Get appointment statistics
 * GET /api/appointments/stats
 */
export const getAppointmentStats = async (req, res) => {
  try {
    const stats = await Appointment.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          scheduled: {
            $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] },
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
          no_show: {
            $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] },
          },
        },
      },
    ]);

    const result = stats.length > 0 ? stats[0] : {
      total: 0,
      scheduled: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
    };

    // Department-wise stats
    const departmentStats = await Appointment.aggregate([
      { $match: { status: 'scheduled' } },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    result.byDepartment = departmentStats.map((d) => ({
      department: d._id,
      count: d.count,
    }));

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching appointment stats:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment stats',
      error: error.message,
    });
  }
};

export default {
  createAppointment,
  getAppointmentById,
  getAppointmentsByPatient,
  getAllAppointments,
  cancelAppointment,
  rescheduleAppointment,
  completeAppointment,
  markAsNoShow,
  getAppointmentStats,
};
