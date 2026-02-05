/**
 * Doctor Assignment Service for MediFlow
 * Matches patients to appropriate doctors based on:
 * - Department/Specialization
 * - Symptom analysis
 * - Doctor availability (shifts/schedule)
 * - Workload balancing
 * - Patient preferences (returning patients)
 * - Emergency on-call assignments
 * 
 * Medical Departments:
 * - General Medicine, Cardiology, Pediatrics, Dermatology, Orthopedics,
 * - Gynecology, ENT, Ophthalmology, Dentistry, Psychiatry, Neurology,
 * - Urology, Gastroenterology, Emergency
 */

import logger from '../utils/logger.js';

/**
 * Department mapping - ensures consistent naming
 * Maps patient symptoms/complaints to medical departments
 */
const DEPARTMENT_MAPPING = {
  'General Medicine': 'General Medicine',
  'Cardiology': 'Cardiology',
  'Pediatrics': 'Pediatrics',
  'Dermatology': 'Dermatology',
  'Orthopedics': 'Orthopedics',
  'Gynecology': 'Gynecology',
  'ENT': 'ENT',
  'Ophthalmology': 'Ophthalmology',
  'Dentistry': 'Dentistry',
  'Psychiatry': 'Psychiatry',
  'Neurology': 'Neurology',
  'Urology': 'Urology',
  'Gastroenterology': 'Gastroenterology',
  'Emergency': 'Emergency',
  'Other': 'General Medicine' // Default fallback
};

/**
 * Symptom-to-Department mapping for intelligent routing
 */
const SYMPTOM_DEPARTMENT_MAP = {
  // Cardiology
  'chest pain': 'Cardiology',
  'heart': 'Cardiology',
  'palpitation': 'Cardiology',
  'high blood pressure': 'Cardiology',
  'hypertension': 'Cardiology',
  
  // Pediatrics (age-based)
  'child': 'Pediatrics',
  'infant': 'Pediatrics',
  'baby': 'Pediatrics',
  
  // Dermatology
  'skin': 'Dermatology',
  'rash': 'Dermatology',
  'acne': 'Dermatology',
  'hair loss': 'Dermatology',
  
  // Orthopedics
  'bone': 'Orthopedics',
  'joint': 'Orthopedics',
  'fracture': 'Orthopedics',
  'back pain': 'Orthopedics',
  'knee pain': 'Orthopedics',
  
  // Gynecology
  'pregnancy': 'Gynecology',
  'menstrual': 'Gynecology',
  'women health': 'Gynecology',
  
  // ENT
  'ear': 'ENT',
  'nose': 'ENT',
  'throat': 'ENT',
  'hearing': 'ENT',
  'sinus': 'ENT',
  
  // Ophthalmology
  'eye': 'Ophthalmology',
  'vision': 'Ophthalmology',
  'blurred vision': 'Ophthalmology',
  
  // Dentistry
  'tooth': 'Dentistry',
  'dental': 'Dentistry',
  'gum': 'Dentistry',
  
  // Psychiatry
  'anxiety': 'Psychiatry',
  'depression': 'Psychiatry',
  'mental health': 'Psychiatry',
  'stress': 'Psychiatry',
  
  // Neurology
  'headache': 'Neurology',
  'migraine': 'Neurology',
  'seizure': 'Neurology',
  'numbness': 'Neurology',
  
  // Emergency
  'severe': 'Emergency',
  'emergency': 'Emergency',
  'accident': 'Emergency',
  'trauma': 'Emergency',
};

/**
 * In-memory doctor cache (in production, this would be from Doctor model)
 * This is a placeholder - replace with actual database queries
 */
let doctorCache = [];

/**
 * Initialize doctor cache from database
 * Call this on server startup or periodically
 */
async function initializeDoctorCache() {
  try {
    logger.info('🔄 Initializing doctor cache from database...');
    
    // TODO: Replace with actual Doctor.find() query
    // import Doctor from '../models/Doctor.js';
    // doctorCache = await Doctor.find({ active: true }).select('name email department specialization shift availability');
    
    // Placeholder data for now
    doctorCache = [
      {
        _id: 'doc1',
        name: 'Dr. Rajesh Kumar',
        email: 'rajesh.kumar@mediflow.com',
        department: 'General Medicine',
        specialization: 'General Physician',
        shift: 'morning', // morning, evening, night, full-day
        currentPatientCount: 5,
        maxPatientsPerDay: 20,
        isAvailable: true,
        isOnCall: false,
      },
      {
        _id: 'doc2',
        name: 'Dr. Priya Sharma',
        email: 'priya.sharma@mediflow.com',
        department: 'Cardiology',
        specialization: 'Cardiologist',
        shift: 'full-day',
        currentPatientCount: 3,
        maxPatientsPerDay: 15,
        isAvailable: true,
        isOnCall: false,
      },
      {
        _id: 'doc3',
        name: 'Dr. Amit Verma',
        email: 'amit.verma@mediflow.com',
        department: 'Pediatrics',
        specialization: 'Pediatrician',
        shift: 'morning',
        currentPatientCount: 8,
        maxPatientsPerDay: 25,
        isAvailable: true,
        isOnCall: false,
      },
      {
        _id: 'doc4',
        name: 'Dr. Emergency On-Call',
        email: 'emergency@mediflow.com',
        department: 'Emergency',
        specialization: 'Emergency Medicine',
        shift: 'full-day',
        currentPatientCount: 0,
        maxPatientsPerDay: 100,
        isAvailable: true,
        isOnCall: true,
      },
    ];
    
    logger.success(`✅ Doctor cache initialized with ${doctorCache.length} doctors`);
    
    return doctorCache;
  } catch (error) {
    logger.error('❌ Error initializing doctor cache:', error.message);
    return [];
  }
}

/**
 * Determine department based on symptoms and chief complaint
 * @param {string} chiefComplaint - Main reason for visit
 * @param {Array} symptoms - Array of symptoms
 * @param {number} age - Patient age (for pediatrics routing)
 * @returns {string} - Department name
 */
function determineDepartmentFromSymptoms(chiefComplaint, symptoms = [], age = null) {
  try {
    // Check age first (pediatrics for children)
    if (age !== null && age < 18) {
      logger.info('👶 Patient is under 18 - routing to Pediatrics');
      return 'Pediatrics';
    }

    // Combine chief complaint and symptoms for analysis
    const combinedText = [
      chiefComplaint,
      ...(Array.isArray(symptoms) ? symptoms : [])
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    // Check symptom-department mapping
    for (const [keyword, department] of Object.entries(SYMPTOM_DEPARTMENT_MAP)) {
      if (combinedText.includes(keyword.toLowerCase())) {
        logger.info(`🎯 Matched symptom keyword "${keyword}" → ${department}`);
        return department;
      }
    }

    // Default to General Medicine
    logger.info('📌 No specific match - defaulting to General Medicine');
    return 'General Medicine';

  } catch (error) {
    logger.error('❌ Error determining department:', error.message);
    return 'General Medicine';
  }
}

/**
 * Find doctor by department with availability and workload balancing
 * @param {string} department - Department name
 * @param {string} shift - Preferred shift (morning/evening/night/full-day)
 * @param {boolean} isEmergency - Emergency case flag
 * @returns {Object|null} - Doctor data or null
 */
async function findDoctorByDepartment(department, shift = 'morning', isEmergency = false) {
  try {
    logger.info(`🔍 Finding doctor for department: ${department} (shift: ${shift}, emergency: ${isEmergency})`);

    // Initialize cache if empty
    if (doctorCache.length === 0) {
      await initializeDoctorCache();
    }

    // Filter doctors by department and availability
    let availableDoctors = doctorCache.filter(doc => 
      doc.department === department && 
      doc.isAvailable === true &&
      doc.currentPatientCount < doc.maxPatientsPerDay
    );

    if (availableDoctors.length === 0) {
      logger.warn(`⚠️ No available doctors in ${department}`);
      return null;
    }

    // If emergency, prioritize on-call doctors
    if (isEmergency) {
      const onCallDoctors = availableDoctors.filter(doc => doc.isOnCall === true);
      if (onCallDoctors.length > 0) {
        availableDoctors = onCallDoctors;
        logger.info('🚨 Emergency case - using on-call doctor');
      }
    }

    // Filter by shift preference
    const shiftDoctors = availableDoctors.filter(doc => 
      doc.shift === shift || doc.shift === 'full-day'
    );

    // Use shift doctors if available, otherwise any available
    const candidateDoctors = shiftDoctors.length > 0 ? shiftDoctors : availableDoctors;

    // Workload balancing - assign to doctor with lowest patient count
    candidateDoctors.sort((a, b) => a.currentPatientCount - b.currentPatientCount);

    const selectedDoctor = candidateDoctors[0];

    logger.success(`✅ Assigned doctor: ${selectedDoctor.name} (${selectedDoctor.department}) - Current load: ${selectedDoctor.currentPatientCount}/${selectedDoctor.maxPatientsPerDay}`);

    return {
      id: selectedDoctor._id,
      name: selectedDoctor.name,
      email: selectedDoctor.email,
      department: selectedDoctor.department,
      specialization: selectedDoctor.specialization,
      shift: selectedDoctor.shift,
      currentLoad: selectedDoctor.currentPatientCount,
      maxLoad: selectedDoctor.maxPatientsPerDay,
    };

  } catch (error) {
    logger.error('❌ Error finding doctor by department:', error.message);
    return null;
  }
}

/**
 * Get default/fallback doctor (usually General Medicine)
 * @returns {Object|null} - Default doctor data or null
 */
async function getDefaultDoctor() {
  try {
    logger.info('🔍 Fetching default doctor (General Medicine)...');

    // Try to find any available General Medicine doctor
    const defaultDoc = await findDoctorByDepartment('General Medicine');

    if (defaultDoc) {
      logger.success(`✅ Default doctor: ${defaultDoc.name}`);
      return defaultDoc;
    }

    // If no General Medicine doctor, get ANY available doctor
    if (doctorCache.length === 0) {
      await initializeDoctorCache();
    }

    const anyDoctor = doctorCache.find(doc => 
      doc.isAvailable === true && 
      doc.currentPatientCount < doc.maxPatientsPerDay
    );

    if (anyDoctor) {
      logger.warn(`⚠️ No General Medicine doctor - using ${anyDoctor.name} (${anyDoctor.department})`);
      return {
        id: anyDoctor._id,
        name: anyDoctor.name,
        email: anyDoctor.email,
        department: anyDoctor.department,
        specialization: anyDoctor.specialization,
        shift: anyDoctor.shift,
        currentLoad: anyDoctor.currentPatientCount,
        maxLoad: anyDoctor.maxPatientsPerDay,
      };
    }

    logger.error('❌ No doctors available at all');
    return null;

  } catch (error) {
    logger.error('❌ Error getting default doctor:', error.message);
    return null;
  }
}

/**
 * Assign patient to appropriate doctor based on symptoms and preferences
 * Main function used during appointment creation
 * 
 * @param {Object} patientData - Patient data with symptoms, chief complaint, preferences
 * @param {Object} appointmentData - Appointment data with department, shift, emergency flag
 * @returns {Object} - { doctorId, doctor, department, reason }
 */
async function assignPatientToDoctor(patientData, appointmentData = {}) {
  try {
    const { name, age, chief_complaint, symptoms, preferred_doctor_id } = patientData;
    const { department, shift = 'morning', isEmergency = false } = appointmentData;

    logger.info(`👨‍⚕️ Assigning doctor for patient: ${name} (Age: ${age})`);

    // 1. CHECK FOR PREFERRED DOCTOR (Returning patients)
    if (preferred_doctor_id) {
      logger.info(`🎯 Patient has preferred doctor: ${preferred_doctor_id}`);
      
      const preferredDoc = doctorCache.find(doc => 
        doc._id === preferred_doctor_id && 
        doc.isAvailable === true &&
        doc.currentPatientCount < doc.maxPatientsPerDay
      );

      if (preferredDoc) {
        logger.success(`✅ Assigned to preferred doctor: ${preferredDoc.name}`);
        return {
          doctorId: preferredDoc._id,
          doctor: {
            id: preferredDoc._id,
            name: preferredDoc.name,
            email: preferredDoc.email,
            department: preferredDoc.department,
            specialization: preferredDoc.specialization,
          },
          department: preferredDoc.department,
          reason: `Assigned to preferred doctor (returning patient): ${preferredDoc.name}`,
        };
      } else {
        logger.warn('⚠️ Preferred doctor not available - finding alternative');
      }
    }

    // 2. DETERMINE DEPARTMENT (if not provided)
    let targetDepartment = department;
    
    if (!targetDepartment || targetDepartment === 'Other') {
      targetDepartment = determineDepartmentFromSymptoms(chief_complaint, symptoms, age);
      logger.info(`🎯 Department determined from symptoms: ${targetDepartment}`);
    }

    // 3. FIND DOCTOR IN TARGET DEPARTMENT
    const doctor = await findDoctorByDepartment(targetDepartment, shift, isEmergency);

    if (doctor) {
      return {
        doctorId: doctor.id,
        doctor,
        department: targetDepartment,
        reason: `Assigned to ${doctor.name} (${doctor.specialization}) in ${targetDepartment}`,
      };
    }

    // 4. FALLBACK TO DEFAULT DOCTOR
    logger.warn(`⚠️ No doctor available in ${targetDepartment} - trying default`);
    
    const defaultDoc = await getDefaultDoctor();
    
    if (defaultDoc) {
      return {
        doctorId: defaultDoc.id,
        doctor: defaultDoc,
        department: defaultDoc.department,
        reason: `No specialist available in ${targetDepartment} - assigned to ${defaultDoc.name} (General Medicine)`,
      };
    }

    // 5. NO DOCTOR AVAILABLE
    logger.error('❌ No doctors available for assignment');
    return {
      doctorId: null,
      doctor: null,
      department: targetDepartment,
      reason: 'No doctors currently available - please try again later or contact clinic',
    };

  } catch (error) {
    logger.error('❌ Error assigning patient to doctor:', error.message);
    
    return {
      doctorId: null,
      doctor: null,
      department: null,
      reason: `Assignment failed: ${error.message}`,
    };
  }
}

/**
 * Get all available doctors with their current workload
 * Useful for dashboard/admin UI
 * @param {string} department - Optional department filter
 * @returns {Array} - Array of doctors
 */
async function getAllDoctors(department = null) {
  try {
    logger.info(`📋 Fetching all doctors${department ? ` in ${department}` : ''}...`);

    if (doctorCache.length === 0) {
      await initializeDoctorCache();
    }

    let doctors = doctorCache;

    if (department) {
      doctors = doctors.filter(doc => doc.department === department);
    }

    logger.success(`✅ Retrieved ${doctors.length} doctors`);

    return doctors.map(doc => ({
      id: doc._id,
      name: doc.name,
      email: doc.email,
      department: doc.department,
      specialization: doc.specialization,
      shift: doc.shift,
      currentPatientCount: doc.currentPatientCount,
      maxPatientsPerDay: doc.maxPatientsPerDay,
      isAvailable: doc.isAvailable,
      isOnCall: doc.isOnCall,
      utilizationRate: Math.round((doc.currentPatientCount / doc.maxPatientsPerDay) * 100),
    }));

  } catch (error) {
    logger.error('❌ Error fetching all doctors:', error.message);
    return [];
  }
}

/**
 * Validate doctor assignment (check if doctor exists and is available)
 * @param {string} doctorId - Doctor ID to validate
 * @returns {boolean} - True if doctor exists and is available
 */
async function validateDoctorAssignment(doctorId) {
  try {
    if (!doctorId) {
      return false;
    }

    logger.info(`🔍 Validating doctor assignment: ${doctorId}`);

    if (doctorCache.length === 0) {
      await initializeDoctorCache();
    }

    const doctor = doctorCache.find(doc => 
      doc._id === doctorId && 
      doc.isAvailable === true
    );

    const isValid = !!doctor;
    
    if (isValid) {
      logger.success(`✅ Doctor ${doctorId} validated (${doctor.name})`);
    } else {
      logger.warn(`⚠️ Doctor ${doctorId} not found or not available`);
    }

    return isValid;

  } catch (error) {
    logger.error(`❌ Error validating doctor: ${error.message}`);
    return false;
  }
}

/**
 * Get assignment statistics (workload per doctor/department)
 * @returns {Object} - Statistics object
 */
async function getAssignmentStats() {
  try {
    logger.info('📊 Fetching doctor assignment statistics...');

    if (doctorCache.length === 0) {
      await initializeDoctorCache();
    }

    const stats = {
      totalDoctors: doctorCache.length,
      availableDoctors: doctorCache.filter(d => d.isAvailable).length,
      byDepartment: {},
      overallUtilization: 0,
    };

    // Group by department
    doctorCache.forEach(doc => {
      const dept = doc.department;
      if (!stats.byDepartment[dept]) {
        stats.byDepartment[dept] = {
          doctorCount: 0,
          totalPatients: 0,
          totalCapacity: 0,
          doctors: [],
        };
      }
      stats.byDepartment[dept].doctorCount++;
      stats.byDepartment[dept].totalPatients += doc.currentPatientCount;
      stats.byDepartment[dept].totalCapacity += doc.maxPatientsPerDay;
      stats.byDepartment[dept].doctors.push({
        name: doc.name,
        load: `${doc.currentPatientCount}/${doc.maxPatientsPerDay}`,
      });
    });

    // Calculate utilization rates
    Object.keys(stats.byDepartment).forEach(dept => {
      const deptStats = stats.byDepartment[dept];
      deptStats.utilizationRate = Math.round((deptStats.totalPatients / deptStats.totalCapacity) * 100);
    });

    // Overall utilization
    const totalPatients = Object.values(stats.byDepartment).reduce((sum, d) => sum + d.totalPatients, 0);
    const totalCapacity = Object.values(stats.byDepartment).reduce((sum, d) => sum + d.totalCapacity, 0);
    stats.overallUtilization = totalCapacity > 0 ? Math.round((totalPatients / totalCapacity) * 100) : 0;

    logger.info('📊 Assignment statistics calculated');

    return stats;

  } catch (error) {
    logger.error('❌ Error getting assignment stats:', error.message);
    return null;
  }
}

/**
 * Increment doctor's patient count (called after successful appointment booking)
 * @param {string} doctorId - Doctor ID
 */
async function incrementDoctorPatientCount(doctorId) {
  try {
    const doctor = doctorCache.find(doc => doc._id === doctorId);
    if (doctor) {
      doctor.currentPatientCount++;
      logger.info(`📈 Incremented patient count for ${doctor.name}: ${doctor.currentPatientCount}/${doctor.maxPatientsPerDay}`);
    }
  } catch (error) {
    logger.error('❌ Error incrementing patient count:', error.message);
  }
}

/**
 * Decrement doctor's patient count (called after appointment cancellation/completion)
 * @param {string} doctorId - Doctor ID
 */
async function decrementDoctorPatientCount(doctorId) {
  try {
    const doctor = doctorCache.find(doc => doc._id === doctorId);
    if (doctor && doctor.currentPatientCount > 0) {
      doctor.currentPatientCount--;
      logger.info(`📉 Decremented patient count for ${doctor.name}: ${doctor.currentPatientCount}/${doctor.maxPatientsPerDay}`);
    }
  } catch (error) {
    logger.error('❌ Error decrementing patient count:', error.message);
  }
}

export default {
  initializeDoctorCache,
  determineDepartmentFromSymptoms,
  findDoctorByDepartment,
  getDefaultDoctor,
  assignPatientToDoctor,
  getAllDoctors,
  validateDoctorAssignment,
  getAssignmentStats,
  incrementDoctorPatientCount,
  decrementDoctorPatientCount,
  DEPARTMENT_MAPPING,
  SYMPTOM_DEPARTMENT_MAP,
};
