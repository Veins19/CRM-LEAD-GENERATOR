import logger from '../utils/logger.js';
import Patient from '../models/Patient.js';
import Consultation from '../models/Consultation.js';
import Appointment from '../models/Appointment.js';

/**
 * Patient Controller for MediFlow
 * Handles REST API endpoints for patient management
 * HIPAA-compliant patient data handling
 */

/**
 * Get all patients with pagination and filtering
 * GET /api/patients?page=1&limit=10&riskClassification=Emergency&status=active
 */
const getAllPatients = async (req, res) => {
  try {
    logger.info('Fetching all patients');

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filters
    const filters = {};
    if (req.query.riskClassification) {
      filters.risk_classification = req.query.riskClassification;
    }
    if (req.query.status) {
      filters.status = req.query.status;
    }
    if (req.query.department) {
      filters.primary_department = req.query.department;
    }

    // Sorting
    const sortBy = req.query.sortBy || 'registration_date';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };

    // Query
    const patients = await Patient.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-__v -medical_records') // Exclude version field and detailed medical records
      .lean();

    const totalPatients = await Patient.countDocuments(filters);
    const totalPages = Math.ceil(totalPatients / limit);

    logger.success(`Fetched ${patients.length} patients (Page ${page}/${totalPages})`);

    res.status(200).json({
      success: true,
      data: patients,
      pagination: {
        currentPage: page,
        totalPages,
        totalPatients,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    logger.error('Error fetching patients:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patients',
      error: error.message,
    });
  }
};

/**
 * Get single patient by ID
 * GET /api/patients/:id
 */
const getPatientById = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Fetching patient: ${id}`);

    const patient = await Patient.findById(id)
      .populate('upcoming_appointments', 'scheduled_start_time department doctor_id status')
      .populate('consultation_history', 'consultation_date chief_complaint diagnosis')
      .select('-__v');

    if (!patient) {
      logger.warn(`Patient not found: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    logger.success(`Patient fetched: ${id}`);

    res.status(200).json({
      success: true,
      data: patient,
    });
  } catch (error) {
    logger.error('Error fetching patient:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient',
      error: error.message,
    });
  }
};

/**
 * Update patient status
 * PATCH /api/patients/:id/status
 */
const updatePatientStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    logger.info(`Updating patient status: ${id} → ${status}`);

    // Validate status
    const validStatuses = ['active', 'inactive', 'discharged', 'deceased'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
        validStatuses,
      });
    }

    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    const previousStatus = patient.status;

    patient.status = status;
    if (notes) {
      patient.notes = (patient.notes || '') + `\n[${new Date().toLocaleDateString()}] Status changed from ${previousStatus} to ${status}. Notes: ${notes}`;
    }
    await patient.save();

    logger.success(`Patient status updated: ${id} → ${status}`);

    res.status(200).json({
      success: true,
      message: 'Patient status updated',
      data: patient,
    });
  } catch (error) {
    logger.error('Error updating patient status:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update patient status',
      error: error.message,
    });
  }
};

/**
 * Get patient statistics
 * GET /api/patients/stats
 */
const getPatientStats = async (req, res) => {
  try {
    logger.info('Calculating patient statistics');

    // Total patients
    const totalPatients = await Patient.countDocuments();

    // Patients by risk classification
    const emergencyPatients = await Patient.countDocuments({ risk_classification: 'Emergency' });
    const mediumRiskPatients = await Patient.countDocuments({ risk_classification: 'Medium' });
    const lowRiskPatients = await Patient.countDocuments({ risk_classification: 'Low' });

    // Patients by status
    const activePatients = await Patient.countDocuments({ status: 'active' });
    const inactivePatients = await Patient.countDocuments({ status: 'inactive' });
    const dischargedPatients = await Patient.countDocuments({ status: 'discharged' });

    // Patients by gender
    const malePatients = await Patient.countDocuments({ gender: 'Male' });
    const femalePatients = await Patient.countDocuments({ gender: 'Female' });
    const otherGenderPatients = await Patient.countDocuments({ gender: 'Other' });

    // Age distribution
    const ageAggregation = await Patient.aggregate([
      {
        $group: {
          _id: null,
          avgAge: { $avg: '$age' },
          maxAge: { $max: '$age' },
          minAge: { $min: '$age' },
        },
      },
    ]);

    const avgAge = ageAggregation[0]?.avgAge?.toFixed(1) || 0;
    const maxAge = ageAggregation[0]?.maxAge || 0;
    const minAge = ageAggregation[0]?.minAge || 0;

    // Top departments
    const departmentsAggregation = await Patient.aggregate([
      { $match: { primary_department: { $ne: null } } },
      {
        $group: {
          _id: '$primary_department',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Top chronic conditions
    const conditionsAggregation = await Patient.aggregate([
      { $unwind: '$chronic_conditions' },
      {
        $group: {
          _id: '$chronic_conditions',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // Recent patients (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentPatients = await Patient.countDocuments({
      registration_date: { $gte: sevenDaysAgo },
    });

    // Total visits
    const visitsAggregation = await Patient.aggregate([
      {
        $group: {
          _id: null,
          totalVisits: { $sum: '$total_visits' },
          avgVisits: { $avg: '$total_visits' },
        },
      },
    ]);

    const stats = {
      total: totalPatients,
      riskClassification: {
        emergency: emergencyPatients,
        medium: mediumRiskPatients,
        low: lowRiskPatients,
      },
      status: {
        active: activePatients,
        inactive: inactivePatients,
        discharged: dischargedPatients,
      },
      gender: {
        male: malePatients,
        female: femalePatients,
        other: otherGenderPatients,
      },
      age: {
        average: avgAge,
        max: maxAge,
        min: minAge,
      },
      topDepartments: departmentsAggregation.map((d) => ({
        department: d._id,
        count: d.count,
      })),
      topChronicConditions: conditionsAggregation.map((c) => ({
        condition: c._id,
        count: c.count,
      })),
      recentPatients: {
        last7Days: recentPatients,
      },
      visits: {
        total: visitsAggregation[0]?.totalVisits || 0,
        average: visitsAggregation[0]?.avgVisits?.toFixed(1) || 0,
      },
    };

    logger.success('Patient statistics calculated');
    logger.object('Stats', stats);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error calculating stats:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate statistics',
      error: error.message,
    });
  }
};

/**
 * Search patients
 * GET /api/patients/search?q=john@example.com
 */
const searchPatients = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    logger.info(`Searching patients: "${q}"`);

    // Search by name, email, phone
    const patients = await Patient.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
      ],
    })
      .sort({ registration_date: -1 })
      .limit(20)
      .select('-__v -medical_records')
      .lean();

    logger.success(`Found ${patients.length} patients matching "${q}"`);

    res.status(200).json({
      success: true,
      data: patients,
      count: patients.length,
    });
  } catch (error) {
    logger.error('Error searching patients:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to search patients',
      error: error.message,
    });
  }
};

/**
 * Delete patient (GDPR/HIPAA compliance - soft delete recommended)
 * DELETE /api/patients/:id
 */
const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Deleting patient: ${id}`);

    // Soft delete - mark as inactive instead of hard delete
    const patient = await Patient.findById(id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    patient.status = 'inactive';
    patient.notes = (patient.notes || '') + `\n[${new Date().toLocaleDateString()}] Patient record marked as inactive (soft delete)`;
    await patient.save();

    logger.success(`Patient soft-deleted (marked inactive): ${id}`);

    res.status(200).json({
      success: true,
      message: 'Patient record marked as inactive',
    });
  } catch (error) {
    logger.error('Error deleting patient:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete patient',
      error: error.message,
    });
  }
};

/**
 * Get patient consultation history
 * GET /api/patients/:id/consultations
 */
const getPatientConsultations = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Fetching consultation history for patient: ${id}`);

    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    const consultations = await Consultation.find({
      patient_id: id,
    })
      .sort({ createdAt: -1 })
      .select('-__v')
      .lean();

    logger.success(`Consultation history fetched for patient: ${id} (${consultations.length} consultations)`);

    res.status(200).json({
      success: true,
      data: {
        consultations,
        patientInfo: {
          name: patient.name,
          email: patient.email,
          totalVisits: patient.total_visits,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching consultations:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consultations',
      error: error.message,
    });
  }
};

/**
 * Get patient appointment history
 * GET /api/patients/:id/appointments
 */
const getPatientAppointments = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Fetching appointment history for patient: ${id}`);

    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    const appointments = await Appointment.find({
      patient_id: id,
    })
      .sort({ scheduled_start_time: -1 })
      .populate('doctor_id', 'name specialization')
      .select('-__v')
      .lean();

    logger.success(`Appointment history fetched for patient: ${id} (${appointments.length} appointments)`);

    res.status(200).json({
      success: true,
      data: {
        appointments,
        patientInfo: {
          name: patient.name,
          email: patient.email,
          upcomingAppointments: patient.upcoming_appointments.length,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching appointments:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments',
      error: error.message,
    });
  }
};

/**
 * Get patient medical history (chronic conditions, allergies, medications)
 * GET /api/patients/:id/medical-history
 */
const getPatientMedicalHistory = async (req, res) => {
  try {
    const { id } = req.params;
    logger.info(`Fetching medical history for patient: ${id}`);

    const patient = await Patient.findById(id).select(
      'name email chronic_conditions allergies current_medications family_medical_history blood_group'
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    logger.success(`Medical history fetched for patient: ${id}`);

    res.status(200).json({
      success: true,
      data: {
        patientInfo: {
          name: patient.name,
          email: patient.email,
          bloodGroup: patient.blood_group,
        },
        medicalHistory: {
          chronicConditions: patient.chronic_conditions || [],
          allergies: patient.allergies || [],
          currentMedications: patient.current_medications || [],
          familyHistory: patient.family_medical_history,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching medical history:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medical history',
      error: error.message,
    });
  }
};

export default {
  getAllPatients,
  getPatientById,
  updatePatientStatus,
  getPatientStats,
  searchPatients,
  deletePatient,
  getPatientConsultations,
  getPatientAppointments,
  getPatientMedicalHistory,
};
