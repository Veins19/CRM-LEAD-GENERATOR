import logger from './logger.js';

/**
 * Validation Utilities for MediFlow
 * Provides validation functions for patient data
 * HIPAA-compliant input validation and sanitization
 */

/**
 * Validate email address format
 */
const validateEmail = (email) => {
  try {
    if (!email || typeof email !== 'string') {
      return { isValid: false, message: 'Email is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email.trim().toLowerCase());

    if (!isValid) {
      return { isValid: false, message: 'Invalid email format' };
    }

    return { isValid: true, message: 'Valid email' };
  } catch (error) {
    logger.error('Error validating email:', error.message);
    return { isValid: false, message: 'Validation error' };
  }
};

/**
 * Validate phone number (Indian format: 10 digits)
 */
const validatePhone = (phone) => {
  try {
    if (!phone || typeof phone !== 'string') {
      return { isValid: false, message: 'Phone number is required' };
    }

    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');

    // Indian phone numbers are 10 digits
    if (digitsOnly.length !== 10) {
      return { isValid: false, message: 'Phone number must be 10 digits' };
    }

    // Check if starts with valid Indian mobile prefix (6, 7, 8, 9)
    if (!['6', '7', '8', '9'].includes(digitsOnly[0])) {
      return { isValid: false, message: 'Invalid Indian mobile number' };
    }

    return { isValid: true, message: 'Valid phone number' };
  } catch (error) {
    logger.error('Error validating phone:', error.message);
    return { isValid: false, message: 'Validation error' };
  }
};

/**
 * Validate name (not empty, reasonable length)
 */
const validateName = (name) => {
  try {
    if (!name || typeof name !== 'string') {
      return { isValid: false, message: 'Name is required' };
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      return { isValid: false, message: 'Name must be at least 2 characters' };
    }

    if (trimmedName.length > 100) {
      return { isValid: false, message: 'Name must be less than 100 characters' };
    }

    // Check if name contains only letters, spaces, hyphens, and apostrophes
    const nameRegex = /^[a-zA-Z\s\-'\.]+$/;
    if (!nameRegex.test(trimmedName)) {
      return { isValid: false, message: 'Name contains invalid characters' };
    }

    return { isValid: true, message: 'Valid name' };
  } catch (error) {
    logger.error('Error validating name:', error.message);
    return { isValid: false, message: 'Validation error' };
  }
};

/**
 * Validate age (0-150 years)
 */
const validateAge = (age) => {
  try {
    if (age === undefined || age === null) {
      return { isValid: true, message: 'Age is optional' };
    }

    const ageNum = parseInt(age, 10);

    if (isNaN(ageNum)) {
      return { isValid: false, message: 'Age must be a number' };
    }

    if (ageNum < 0 || ageNum > 150) {
      return { isValid: false, message: 'Age must be between 0 and 150' };
    }

    return { isValid: true, message: 'Valid age' };
  } catch (error) {
    logger.error('Error validating age:', error.message);
    return { isValid: false, message: 'Validation error' };
  }
};

/**
 * Validate gender
 */
const validateGender = (gender) => {
  try {
    if (!gender) {
      return { isValid: true, message: 'Gender is optional' };
    }

    const validGenders = ['Male', 'Female', 'Other'];

    if (!validGenders.includes(gender)) {
      return { isValid: false, message: 'Gender must be Male, Female, or Other' };
    }

    return { isValid: true, message: 'Valid gender' };
  } catch (error) {
    logger.error('Error validating gender:', error.message);
    return { isValid: false, message: 'Validation error' };
  }
};

/**
 * Validate department
 */
const validateDepartment = (department) => {
  try {
    if (!department) {
      return { isValid: true, message: 'Department is optional' };
    }

    const validDepartments = [
      'General Medicine',
      'Cardiology',
      'Neurology',
      'Orthopedics',
      'Pediatrics',
      'Gynecology',
      'Dermatology',
      'Ophthalmology',
      'ENT',
      'Dentistry',
      'Psychiatry',
      'Emergency',
      'Other'
    ];

    if (!validDepartments.includes(department)) {
      return { isValid: false, message: 'Invalid department' };
    }

    return { isValid: true, message: 'Valid department' };
  } catch (error) {
    logger.error('Error validating department:', error.message);
    return { isValid: false, message: 'Validation error' };
  }
};

/**
 * Validate symptoms (chief complaint)
 */
const validateSymptoms = (symptoms) => {
  try {
    if (!symptoms || typeof symptoms !== 'string') {
      return { isValid: true, message: 'Symptoms are optional' };
    }

    const trimmedSymptoms = symptoms.trim();

    if (trimmedSymptoms.length === 0) {
      return { isValid: true, message: 'Symptoms are optional' };
    }

    if (trimmedSymptoms.length > 500) {
      return { isValid: false, message: 'Symptoms description must be less than 500 characters' };
    }

    return { isValid: true, message: 'Valid symptoms' };
  } catch (error) {
    logger.error('Error validating symptoms:', error.message);
    return { isValid: false, message: 'Validation error' };
  }
};

/**
 * Validate urgency level
 */
const validateUrgency = (urgency) => {
  try {
    if (!urgency) {
      return { isValid: true, message: 'Urgency is optional' };
    }

    const validUrgencies = ['Low', 'Medium', 'High', 'Critical', 'Emergency'];

    if (!validUrgencies.includes(urgency)) {
      return { isValid: false, message: 'Invalid urgency level' };
    }

    return { isValid: true, message: 'Valid urgency level' };
  } catch (error) {
    logger.error('Error validating urgency:', error.message);
    return { isValid: false, message: 'Validation error' };
  }
};

/**
 * Validate appointment status
 */
const validateAppointmentStatus = (status) => {
  try {
    if (!status) {
      return { isValid: true, message: 'Status is optional' };
    }

    const validStatuses = [
      'scheduled',
      'confirmed',
      'in-progress',
      'completed',
      'cancelled',
      'no-show',
      'rescheduled'
    ];

    if (!validStatuses.includes(status)) {
      return { isValid: false, message: 'Invalid appointment status' };
    }

    return { isValid: true, message: 'Valid appointment status' };
  } catch (error) {
    logger.error('Error validating appointment status:', error.message);
    return { isValid: false, message: 'Validation error' };
  }
};

/**
 * Validate date (must be a valid Date object or ISO string)
 */
const validateDate = (date) => {
  try {
    if (!date) {
      return { isValid: false, message: 'Date is required' };
    }

    const dateObj = new Date(date);

    if (isNaN(dateObj.getTime())) {
      return { isValid: false, message: 'Invalid date format' };
    }

    return { isValid: true, message: 'Valid date' };
  } catch (error) {
    logger.error('Error validating date:', error.message);
    return { isValid: false, message: 'Validation error' };
  }
};

/**
 * Validate complete patient data
 */
const validatePatientData = (patientData) => {
  try {
    const errors = [];

    // Required fields
    const nameValidation = validateName(patientData.name);
    if (!nameValidation.isValid) {
      errors.push({ field: 'name', message: nameValidation.message });
    }

    const emailValidation = validateEmail(patientData.email);
    if (!emailValidation.isValid) {
      errors.push({ field: 'email', message: emailValidation.message });
    }

    const phoneValidation = validatePhone(patientData.phone);
    if (!phoneValidation.isValid) {
      errors.push({ field: 'phone', message: phoneValidation.message });
    }

    // Optional fields (only validate if provided)
    if (patientData.age !== undefined && patientData.age !== null) {
      const ageValidation = validateAge(patientData.age);
      if (!ageValidation.isValid) {
        errors.push({ field: 'age', message: ageValidation.message });
      }
    }

    if (patientData.gender) {
      const genderValidation = validateGender(patientData.gender);
      if (!genderValidation.isValid) {
        errors.push({ field: 'gender', message: genderValidation.message });
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return { isValid: true, message: 'All validations passed' };
  } catch (error) {
    logger.error('Error validating patient data:', error.message);
    return { isValid: false, errors: [{ field: 'general', message: 'Validation error' }] };
  }
};

/**
 * Validate complete appointment data
 */
const validateAppointmentData = (appointmentData) => {
  try {
    const errors = [];

    // Required fields
    if (!appointmentData.patient_id) {
      errors.push({ field: 'patient_id', message: 'Patient ID is required' });
    }

    if (!appointmentData.doctor_id) {
      errors.push({ field: 'doctor_id', message: 'Doctor ID is required' });
    }

    const dateValidation = validateDate(appointmentData.scheduled_start_time);
    if (!dateValidation.isValid) {
      errors.push({ field: 'scheduled_start_time', message: dateValidation.message });
    }

    const endDateValidation = validateDate(appointmentData.scheduled_end_time);
    if (!endDateValidation.isValid) {
      errors.push({ field: 'scheduled_end_time', message: endDateValidation.message });
    }

    // Optional fields
    if (appointmentData.department) {
      const departmentValidation = validateDepartment(appointmentData.department);
      if (!departmentValidation.isValid) {
        errors.push({ field: 'department', message: departmentValidation.message });
      }
    }

    if (appointmentData.chief_complaint) {
      const symptomsValidation = validateSymptoms(appointmentData.chief_complaint);
      if (!symptomsValidation.isValid) {
        errors.push({ field: 'chief_complaint', message: symptomsValidation.message });
      }
    }

    if (appointmentData.urgency) {
      const urgencyValidation = validateUrgency(appointmentData.urgency);
      if (!urgencyValidation.isValid) {
        errors.push({ field: 'urgency', message: urgencyValidation.message });
      }
    }

    if (appointmentData.status) {
      const statusValidation = validateAppointmentStatus(appointmentData.status);
      if (!statusValidation.isValid) {
        errors.push({ field: 'status', message: statusValidation.message });
      }
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return { isValid: true, message: 'All validations passed' };
  } catch (error) {
    logger.error('Error validating appointment data:', error.message);
    return { isValid: false, errors: [{ field: 'general', message: 'Validation error' }] };
  }
};

/**
 * Sanitize string input (HIPAA-compliant - remove dangerous characters)
 */
const sanitizeString = (str) => {
  try {
    if (!str || typeof str !== 'string') {
      return '';
    }

    // Trim whitespace
    let sanitized = str.trim();

    // Remove any HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // Remove any script-like patterns
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove SQL injection patterns
    sanitized = sanitized.replace(/('|(--)|;|\/\*|\*\/|xp_|sp_|exec|execute|declare)/gi, '');

    return sanitized;
  } catch (error) {
    logger.error('Error sanitizing string:', error.message);
    return '';
  }
};

/**
 * Sanitize patient data (remove sensitive info from logs)
 */
const sanitizePatientForLogging = (patient) => {
  try {
    if (!patient) return null;

    return {
      id: patient._id || patient.id,
      name: patient.name ? patient.name.substring(0, 1) + '***' : 'Unknown',
      email: patient.email ? patient.email.substring(0, 3) + '***@***' : 'Unknown',
      phone: patient.phone ? '***' + patient.phone.slice(-4) : 'Unknown',
      age: patient.age || 'Unknown',
      gender: patient.gender || 'Unknown'
    };
  } catch (error) {
    logger.error('Error sanitizing patient for logging:', error.message);
    return null;
  }
};

module.exports = {
  validateEmail,
  validatePhone,
  validateName,
  validateAge,
  validateGender,
  validateDepartment,
  validateSymptoms,
  validateUrgency,
  validateAppointmentStatus,
  validateDate,
  validatePatientData,
  validateAppointmentData,
  sanitizeString,
  sanitizePatientForLogging,
};
