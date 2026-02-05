/**
 * Cleaning Service for MediFlow
 * Maintains data quality and integrity in patient database
 * 
 * Features:
 * - Validates patient contact information (email, phone)
 * - Detects duplicate patient records
 * - Cleans invalid/incomplete patient data
 * - HIPAA-compliant data quality checks
 */

import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import validationService from './validationService.js';
import logger from '../utils/logger.js';

/**
 * Check if a patient record should be cleaned (has invalid data)
 * @param {Object} patient - Patient document from DB
 * @returns {Object} - { shouldClean: boolean, reasons: string[] }
 */
function analyzePatientForCleaning(patient) {
  try {
    const reasons = [];
    let shouldClean = false;

    // Validate email
    if (patient.email) {
      const emailValidation = validationService.validateEmail(patient.email);
      if (!emailValidation.valid) {
        reasons.push(`Invalid email: ${emailValidation.error}`);
        shouldClean = true;
      }
    } else {
      // Email is required for communication
      reasons.push('Missing email address');
      shouldClean = true;
    }

    // Validate phone
    if (patient.phone) {
      const phoneValidation = validationService.validatePhone(patient.phone);
      if (!phoneValidation.valid) {
        reasons.push(`Invalid phone: ${phoneValidation.error}`);
        shouldClean = true;
      }
    } else {
      // Phone is required for emergencies
      reasons.push('Missing phone number');
      shouldClean = true;
    }

    // Validate name
    const nameValidation = validationService.validateName(patient.name);
    if (!nameValidation.valid) {
      reasons.push(`Invalid name: ${nameValidation.error}`);
      shouldClean = true;
    }

    // Validate age (must be reasonable)
    if (patient.age !== undefined && patient.age !== null) {
      if (patient.age < 0 || patient.age > 150) {
        reasons.push('Invalid age (must be between 0 and 150)');
        shouldClean = true;
      }
    }

    // Validate gender (if provided)
    if (patient.gender && !['Male', 'Female', 'Other'].includes(patient.gender)) {
      reasons.push('Invalid gender value');
      shouldClean = true;
    }

    return { shouldClean, reasons };

  } catch (error) {
    logger.error('❌ Error analyzing patient for cleaning:', error.message);
    return { shouldClean: false, reasons: ['Analysis failed'] };
  }
}

/**
 * Clean a single patient record from database
 * Only cleans if patient has no appointments
 * @param {string} patientId - Patient ID to clean
 * @returns {Object} - { success: boolean, message: string }
 */
async function cleanPatientById(patientId) {
  try {
    const patient = await Patient.findById(patientId);

    if (!patient) {
      return { success: false, message: 'Patient not found' };
    }

    const analysis = analyzePatientForCleaning(patient);

    if (!analysis.shouldClean) {
      return { success: false, message: 'Patient data is valid, no cleaning needed' };
    }

    // Check if patient has any appointments
    const appointmentCount = await Appointment.countDocuments({ patient_id: patientId });

    if (appointmentCount > 0) {
      return {
        success: false,
        message: `Cannot delete patient with ${appointmentCount} appointment(s). Consider manual review instead.`,
        appointmentCount
      };
    }

    // Delete the patient (soft delete preferred in production)
    await Patient.findByIdAndDelete(patientId);

    logger.warn(`🗑️ Cleaned invalid patient: ${patient.email} | Reasons: ${analysis.reasons.join(', ')}`);

    return {
      success: true,
      message: 'Patient record cleaned successfully',
      reasons: analysis.reasons,
      cleanedPatient: {
        id: patient._id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone
      }
    };

  } catch (error) {
    logger.error('❌ Error cleaning patient by ID:', error.message);
    return { success: false, message: 'Failed to clean patient', error: error.message };
  }
}

/**
 * Clean all invalid patient records from database
 * @param {Object} options - { dryRun: boolean, limit: number }
 * @returns {Object} - { cleaned: number, skipped: number, details: array }
 */
async function cleanAllInvalidPatients(options = {}) {
  const { dryRun = false, limit = null } = options;

  try {
    logger.info(`🧹 Starting patient data cleaning process... (Dry Run: ${dryRun})`);

    // Get all patients
    let patientsQuery = Patient.find({});
    if (limit) {
      patientsQuery = patientsQuery.limit(limit);
    }

    const patients = await patientsQuery;

    const results = {
      total: patients.length,
      cleaned: 0,
      skipped: 0,
      hasAppointments: 0,
      details: []
    };

    for (const patient of patients) {
      const analysis = analyzePatientForCleaning(patient);

      if (analysis.shouldClean) {
        // Check if patient has appointments
        const appointmentCount = await Appointment.countDocuments({ patient_id: patient._id });

        if (appointmentCount > 0) {
          results.hasAppointments++;
          results.details.push({
            id: patient._id.toString(),
            name: patient.name,
            email: patient.email,
            reasons: analysis.reasons,
            action: 'skipped_has_appointments',
            appointmentCount
          });
          continue;
        }

        const patientInfo = {
          id: patient._id.toString(),
          name: patient.name,
          email: patient.email,
          phone: patient.phone,
          reasons: analysis.reasons,
          action: dryRun ? 'would_delete' : 'deleted'
        };

        if (!dryRun) {
          await Patient.findByIdAndDelete(patient._id);
          logger.warn(`🗑️ Deleted invalid patient: ${patient.email}`);
        }

        results.cleaned++;
        results.details.push(patientInfo);
      } else {
        results.skipped++;
      }
    }

    const summary = dryRun 
      ? `✅ Dry run complete: ${results.cleaned} patients would be cleaned, ${results.skipped} valid, ${results.hasAppointments} have appointments`
      : `✅ Cleaning complete: ${results.cleaned} patients deleted, ${results.skipped} valid, ${results.hasAppointments} skipped (have appointments)`;

    logger.success(summary);

    return {
      success: true,
      ...results,
      summary
    };

  } catch (error) {
    logger.error('❌ Error during bulk patient cleaning:', error.message);
    return {
      success: false,
      message: 'Bulk cleaning failed',
      error: error.message
    };
  }
}

/**
 * Detect duplicate patient records
 * @returns {Object} - Duplicate detection results
 */
async function detectDuplicatePatients() {
  try {
    logger.info('🔍 Detecting duplicate patient records...');

    const patients = await Patient.find({}).select('name email phone');

    const duplicates = {
      byEmail: [],
      byPhone: [],
      byNameAndAge: []
    };

    // Group by email
    const emailMap = {};
    patients.forEach(patient => {
      if (patient.email) {
        const email = patient.email.toLowerCase();
        if (!emailMap[email]) {
          emailMap[email] = [];
        }
        emailMap[email].push(patient);
      }
    });

    // Find duplicate emails
    Object.entries(emailMap).forEach(([email, patientList]) => {
      if (patientList.length > 1) {
        duplicates.byEmail.push({
          email,
          count: patientList.length,
          patients: patientList.map(p => ({
            id: p._id.toString(),
            name: p.name,
            email: p.email,
            phone: p.phone
          }))
        });
      }
    });

    // Group by phone
    const phoneMap = {};
    patients.forEach(patient => {
      if (patient.phone) {
        const phone = patient.phone.replace(/\D/g, ''); // Remove non-digits
        if (!phoneMap[phone]) {
          phoneMap[phone] = [];
        }
        phoneMap[phone].push(patient);
      }
    });

    // Find duplicate phones
    Object.entries(phoneMap).forEach(([phone, patientList]) => {
      if (patientList.length > 1) {
        duplicates.byPhone.push({
          phone,
          count: patientList.length,
          patients: patientList.map(p => ({
            id: p._id.toString(),
            name: p.name,
            email: p.email,
            phone: p.phone
          }))
        });
      }
    });

    const totalDuplicates = duplicates.byEmail.length + duplicates.byPhone.length;

    logger.info(`📊 Duplicate detection complete: ${duplicates.byEmail.length} email duplicates, ${duplicates.byPhone.length} phone duplicates`);

    return {
      success: true,
      totalDuplicates,
      duplicates,
      summary: `Found ${totalDuplicates} potential duplicate groups`
    };

  } catch (error) {
    logger.error('❌ Error detecting duplicate patients:', error.message);
    return {
      success: false,
      message: 'Duplicate detection failed',
      error: error.message
    };
  }
}

/**
 * Validate patient before appointment creation
 * @param {Object} patientData - Patient data to validate
 * @returns {Object} - { valid: boolean, errors: object|null, cleanedData: object }
 */
function validateBeforeAppointment(patientData) {
  try {
    const validation = validationService.validatePatientData({
      name: patientData.name,
      email: patientData.email,
      phone: patientData.phone,
      age: patientData.age,
      gender: patientData.gender
    });

    if (!validation.valid) {
      logger.warn(`⚠️ Patient validation failed before appointment: ${patientData.email}`, validation.errors);
    } else {
      logger.info(`✅ Patient validated for appointment: ${validation.cleanedData.email}`);
    }

    return validation;

  } catch (error) {
    logger.error('❌ Error validating patient before appointment:', error.message);
    return {
      valid: false,
      errors: { general: 'Validation failed' },
      cleanedData: null
    };
  }
}

/**
 * Get statistics about data quality
 * @returns {Object} - Statistics object
 */
async function getDataQualityStats() {
  try {
    const totalPatients = await Patient.countDocuments();
    const patients = await Patient.find({}).select('name email phone age gender');

    let validPatients = 0;
    let invalidPatients = 0;
    const issueBreakdown = {
      invalidEmail: 0,
      invalidPhone: 0,
      invalidName: 0,
      missingEmail: 0,
      missingPhone: 0,
      invalidAge: 0,
      invalidGender: 0
    };

    for (const patient of patients) {
      const analysis = analyzePatientForCleaning(patient);
      
      if (analysis.shouldClean) {
        invalidPatients++;
        
        // Count specific issues
        analysis.reasons.forEach(reason => {
          if (reason.includes('Invalid email')) issueBreakdown.invalidEmail++;
          if (reason.includes('Invalid phone')) issueBreakdown.invalidPhone++;
          if (reason.includes('Invalid name')) issueBreakdown.invalidName++;
          if (reason.includes('Missing email')) issueBreakdown.missingEmail++;
          if (reason.includes('Missing phone')) issueBreakdown.missingPhone++;
          if (reason.includes('Invalid age')) issueBreakdown.invalidAge++;
          if (reason.includes('Invalid gender')) issueBreakdown.invalidGender++;
        });
      } else {
        validPatients++;
      }
    }

    const dataQualityScore = totalPatients > 0 
      ? Math.round((validPatients / totalPatients) * 100) 
      : 100;

    const stats = {
      totalPatients,
      validPatients,
      invalidPatients,
      dataQualityScore,
      issueBreakdown,
      recommendation: invalidPatients > 0 
        ? `Review ${invalidPatients} invalid patient records for data correction`
        : 'Patient database is clean!'
    };

    logger.info('📊 Patient Data Quality Stats:', stats);

    return stats;

  } catch (error) {
    logger.error('❌ Error getting data quality stats:', error.message);
    return null;
  }
}

/**
 * Schedule automatic cleaning (can be called by cron job)
 * Cleans invalid patient records weekly
 * @returns {Object} - Cleaning results
 */
async function scheduledCleaning() {
  try {
    logger.section('⏰ SCHEDULED PATIENT DATA CLEANING');

    // Clean invalid patients (dry run first for safety)
    const dryRunResults = await cleanAllInvalidPatients({ dryRun: true });
    logger.info(`📋 Dry run: ${dryRunResults.cleaned} patients would be cleaned`);

    // Only clean if less than 10 patients would be deleted (safety check)
    let cleaningResults;
    if (dryRunResults.cleaned <= 10) {
      cleaningResults = await cleanAllInvalidPatients({ dryRun: false });
    } else {
      cleaningResults = dryRunResults;
      logger.warn(`⚠️ Skipping actual cleaning - too many patients (${dryRunResults.cleaned}) flagged for deletion. Manual review required.`);
    }

    // Detect duplicates
    const duplicateResults = await detectDuplicatePatients();

    // Get updated stats
    const stats = await getDataQualityStats();

    logger.separator();

    return {
      success: true,
      cleaningResults,
      duplicateResults,
      dataQualityStats: stats,
      timestamp: new Date()
    };

  } catch (error) {
    logger.error('❌ Scheduled cleaning failed:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date()
    };
  }
}

module.exports = {
  analyzePatientForCleaning,
  cleanPatientById,
  cleanAllInvalidPatients,
  detectDuplicatePatients,
  validateBeforeAppointment,
  getDataQualityStats,
  scheduledCleaning
};
