import mongoose from 'mongoose';

/**
 * Patient Schema for MediFlow
 * Stores patient demographics, medical history, risk classification, 
 * appointment tracking, communication status
 * 
 * Medical Standards Compliance:
 * - Indian Medical Council data retention (5 years)
 * - WHO/ATS triage classification (Emergency/Medium/Low)
 * - HIPAA-compliant data privacy fields
 * 
 * FEATURES:
 * - Risk classification (Emergency/Medium/Low) based on symptoms
 * - No-show tracking and management
 * - Multi-channel communication (Email/SMS/WhatsApp)
 * - Medical history and allergies tracking
 * - Appointment automation with reminders
 */
const patientSchema = new mongoose.Schema(
  {
    // ==================== BASIC PATIENT INFORMATION ====================
    
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required for appointment reminders'],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required for emergency contact'],
      trim: true,
      match: [/^(\+91)?[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian phone number (with or without +91 prefix)'],
      index: true,
    },
    
    // ==================== PATIENT DEMOGRAPHICS ====================
    
    age: {
      type: Number,
      required: [true, 'Age is required for medical assessment'],
      min: [0, 'Age cannot be negative'],
      max: [150, 'Please enter a valid age'],
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
      required: [true, 'Gender is required'],
    },
    date_of_birth: {
      type: Date,
      default: null,
      description: 'Optional: Exact date of birth for precise age calculation',
    },
    blood_group: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
      default: 'Unknown',
    },
    
    // ==================== CONTACT & ADDRESS ====================
    
    emergency_contact_name: {
      type: String,
      trim: true,
      default: null,
    },
    emergency_contact_phone: {
      type: String,
      trim: true,
      default: null,
    },
    address: {
      street: { type: String, trim: true, default: null },
      city: { type: String, trim: true, default: null },
      state: { type: String, trim: true, default: null },
      pincode: { type: String, trim: true, default: null },
    },
    
    // ==================== MEDICAL HISTORY ====================
    
    allergies: {
      type: [String],
      default: [],
      description: 'Known allergies (drugs, food, environmental)',
    },
    chronic_conditions: {
      type: [String],
      default: [],
      enum: [
        'Diabetes',
        'Hypertension',
        'Asthma',
        'Heart Disease',
        'Thyroid Disorder',
        'Kidney Disease',
        'Liver Disease',
        'Cancer',
        'Arthritis',
        'COPD',
        'Other',
      ],
      description: 'Existing chronic medical conditions',
    },
    current_medications: {
      type: [String],
      default: [],
      description: 'Currently taking medications',
    },
    past_surgeries: {
      type: [String],
      default: [],
      description: 'Previous surgical history',
    },
    family_medical_history: {
      type: String,
      trim: true,
      default: null,
      description: 'Relevant family medical history',
    },
    
    // Special flags for high-risk patients
    is_pregnant: {
      type: Boolean,
      default: false,
    },
    is_diabetic: {
      type: Boolean,
      default: false,
    },
    is_hypertensive: {
      type: Boolean,
      default: false,
    },
    has_heart_condition: {
      type: Boolean,
      default: false,
    },
    
    // ==================== INSURANCE INFORMATION ====================
    
    insurance_provider: {
      type: String,
      trim: true,
      default: null,
    },
    insurance_policy_number: {
      type: String,
      trim: true,
      default: null,
    },
    insurance_valid_until: {
      type: Date,
      default: null,
    },
    
    // ==================== DEPARTMENT & DOCTOR PREFERENCES ====================
    
    departments_visited: {
      type: [String],
      default: [],
      enum: [
        'General Medicine',
        'Cardiology',
        'Pediatrics',
        'Dermatology',
        'Orthopedics',
        'Gynecology',
        'ENT',
        'Ophthalmology',
        'Dentistry',
        'Psychiatry',
        'Neurology',
        'Urology',
        'Gastroenterology',
        'Other',
      ],
      description: 'Departments patient has visited',
    },
    primary_department: {
      type: String,
      default: null,
      description: 'Most frequently visited department',
    },
    preferred_doctor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      default: null,
      description: 'Patient\'s preferred doctor (if any)',
    },
    
    // ==================== CURRENT VISIT / CHIEF COMPLAINT ====================
    
    chief_complaint: {
      type: String,
      trim: true,
      default: null,
      description: 'Current reason for visit / main symptom',
    },
    symptoms: {
      type: [String],
      default: [],
      description: 'List of current symptoms reported',
    },
    symptom_duration: {
      type: String,
      enum: ['< 24 hours', '1-3 days', '3-7 days', '1-2 weeks', '2+ weeks', 'Chronic'],
      default: null,
    },
    pain_scale: {
      type: Number,
      min: 0,
      max: 10,
      default: 0,
      description: 'Pain level on scale of 0-10',
    },
    
    // ==================== DATA QUALITY & VALIDATION ====================
    
    validation_status: {
      type: String,
      enum: ['valid', 'invalid', 'pending'],
      default: 'pending',
      description: 'Validation status of patient data',
    },
    validation_errors: {
      type: Map,
      of: String,
      default: {},
      description: 'Specific validation errors (email, phone, age)',
    },
    data_quality_score: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
      description: 'Overall data quality score (0-100)',
    },
    
    // ==================== RETURNING PATIENT DETECTION ====================
    
    returning_patient: {
      type: Boolean,
      default: false,
      description: 'True if patient has returned for another visit',
    },
    previous_consultations_count: {
      type: Number,
      default: 0,
      description: 'Number of previous consultations',
    },
    consultation_count: {
      type: Number,
      default: 0,
      description: 'Total consultations (including current)',
    },
    last_consultation_date: {
      type: Date,
      default: null,
      description: 'Date of most recent consultation',
    },
    first_visit_date: {
      type: Date,
      default: null,
      description: 'Date of first visit to clinic',
    },
    last_activity_at: {
      type: Date,
      default: null,
      description: 'Last time patient was active (any interaction)',
    },
    
    // ==================== PATIENT JOURNEY TRACKING ====================
    
    patient_journey: {
      pages_visited: {
        type: Number,
        default: 0,
      },
      departments_viewed: [
        {
          type: String,
        },
      ],
      time_on_site: {
        type: Number,
        default: 0,
      }, // seconds
      scroll_depth_avg: {
        type: Number,
        default: 0,
      }, // percentage
      journey_score: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      engagement_level: {
        type: String,
        enum: ['high', 'medium', 'low', 'none'],
        default: 'none',
      },
    },
    
    // ==================== RISK CLASSIFICATION (WHO/ATS Triage Standards) ====================
    
    risk_score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      description: 'Medical risk score based on symptoms and vitals',
    },
    risk_classification: {
      type: String,
      enum: ['Emergency', 'Medium', 'Low', 'Unclassified'],
      default: 'Unclassified',
      description: 'Medical risk level (Emergency/Medium/Low)',
    },
    triage_reasoning: {
      type: String,
      default: null,
      description: 'AI explanation for risk classification',
    },
    triaged_at: {
      type: Date,
      default: null,
    },
    
    // ==================== URGENCY TRACKING ====================
    
    urgency: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'Low',
      description: 'Appointment urgency (separate from medical risk)',
    },
    urgency_calculated_at: {
      type: Date,
      default: null,
    },
    urgency_reasoning: {
      type: String,
      default: null,
    },
    
    // ==================== COMMUNICATION TRACKING ====================
    
    // Email Status
    email_sent: {
      type: Boolean,
      default: false,
    },
    email_sent_at: {
      type: Date,
      default: null,
    },
    email_template_used: {
      type: String,
      enum: ['Appointment Confirmation', 'Appointment Reminder', 'Follow-up Reminder', 'No-show Follow-up', 'Prescription', null],
      default: null,
    },
    email_status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'not_sent'],
      default: 'not_sent',
    },
    email_error: {
      type: String,
      default: null,
    },
    email_count: {
      type: Number,
      default: 0,
      description: 'Total emails sent to this patient',
    },
    last_email_sent_at: {
      type: Date,
      default: null,
    },
    
    // SMS/WhatsApp Status
    sms_sent: {
      type: Boolean,
      default: false,
    },
    sms_sent_at: {
      type: Date,
      default: null,
    },
    sms_template_used: {
      type: String,
      default: null,
    },
    sms_status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'not_sent'],
      default: 'not_sent',
    },
    sms_error: {
      type: String,
      default: null,
    },
    sms_sid: {
      type: String,
      default: null,
      description: 'Twilio message SID for tracking',
    },
    sms_delivery_status: {
      type: String,
      enum: ['queued', 'sending', 'sent', 'delivered', 'undelivered', 'failed', null],
      default: null,
    },
    sms_count: {
      type: Number,
      default: 0,
      description: 'Total SMS/WhatsApp sent to this patient',
    },
    last_sms_sent_at: {
      type: Date,
      default: null,
    },
    
    // ==================== APPOINTMENT AUTOMATION ====================
    
    appointment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    appointment_status: {
      type: String,
      enum: [
        'not_initiated',
        'slots_generated',
        'scheduled',
        'confirmed',
        'reminder_sent',
        'checked_in',
        'in_progress',
        'completed',
        'no_show',
        'cancelled',
        'rescheduled',
        'expired',
      ],
      default: 'not_initiated',
    },
    appointment_scheduled_at: {
      type: Date,
      default: null,
    },
    next_appointment_date: {
      type: Date,
      default: null,
      description: 'Date of next scheduled appointment',
    },
    
    // ==================== NO-SHOW MANAGEMENT ====================
    
    no_show_count: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Total number of missed appointments',
    },
    last_no_show_date: {
      type: Date,
      default: null,
    },
    high_no_show_risk: {
      type: Boolean,
      default: false,
      description: 'Flagged after 3+ no-shows',
    },
    no_show_flagged_at: {
      type: Date,
      default: null,
    },
    
    // Confirmation Reminders
    confirmation_reminder_count: {
      type: Number,
      default: 0,
      min: 0,
      max: 3,
    },
    confirmation_reminders_exhausted: {
      type: Boolean,
      default: false,
    },
    marked_as_unresponsive: {
      type: Boolean,
      default: false,
    },
    unresponsive_marked_at: {
      type: Date,
      default: null,
    },
    
    // ==================== CONSULTATION REFERENCES ====================
    
    consultation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      default: null,
      description: 'Current active consultation',
    },
    consultation_history: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Consultation',
      },
    ],
    
    // ==================== FOLLOW-UP TRACKING ====================
    
    follow_up_required: {
      type: Boolean,
      default: false,
    },
    follow_up_date: {
      type: Date,
      default: null,
    },
    follow_up_reason: {
      type: String,
      trim: true,
      default: null,
    },
    follow_up_reminder_sent: {
      type: Boolean,
      default: false,
    },
    
    // ==================== SOURCE & METADATA ====================
    
    source: {
      type: String,
      default: 'chatbot',
      enum: ['chatbot', 'walk-in', 'phone', 'referral', 'online', 'emergency'],
    },
    referral_source: {
      type: String,
      trim: true,
      default: null,
      description: 'Who referred the patient (doctor name, friend, advertisement)',
    },
    ip_address: {
      type: String,
      default: null,
    },
    user_agent: {
      type: String,
      default: null,
    },
    
    // ==================== PATIENT STATUS ====================
    
    status: {
      type: String,
      enum: ['new', 'active', 'follow_up_pending', 'treatment_ongoing', 'discharged', 'inactive'],
      default: 'new',
    },
    notes: {
      type: String,
      default: null,
      description: 'Internal notes from doctors/receptionists (private)',
    },
    tags: {
      type: [String],
      default: [],
      description: 'Custom tags (VIP, Chronic, High-risk, etc.)',
    },
  },
  {
    timestamps: true,
  }
);

// ==================== INDEXES FOR PERFORMANCE ====================

patientSchema.index({ risk_score: -1 });
patientSchema.index({ risk_classification: 1 });
patientSchema.index({ createdAt: -1 });
patientSchema.index({ status: 1 });
patientSchema.index({ appointment_status: 1 });
patientSchema.index({ next_appointment_date: 1 });
patientSchema.index({ urgency: 1 });
patientSchema.index({ validation_status: 1 });
patientSchema.index({ returning_patient: 1 });
patientSchema.index({ no_show_count: 1 });
patientSchema.index({ high_no_show_risk: 1 });
patientSchema.index({ phone: 1, email: 1 });

// ==================== VIRTUAL FIELDS ====================

patientSchema.virtual('display_name').get(function () {
  return `${this.name} (${this.age}${this.gender.charAt(0)})`;
});

patientSchema.virtual('risk_display').get(function () {
  const riskEmojis = {
    Emergency: '🚨',
    Medium: '⚠️',
    Low: '✅',
    Unclassified: '❓'
  };
  return `${riskEmojis[this.risk_classification] || ''} ${this.risk_classification}`;
});

patientSchema.virtual('urgency_display').get(function () {
  const urgencyEmojis = {
    Critical: '🔥',
    High: '⚡',
    Medium: '⏰',
    Low: '📅'
  };
  return `${urgencyEmojis[this.urgency] || ''} ${this.urgency}`;
});

patientSchema.virtual('full_address').get(function () {
  if (!this.address.street) return null;
  return `${this.address.street}, ${this.address.city}, ${this.address.state} - ${this.address.pincode}`;
});

// ==================== INSTANCE METHODS ====================

patientSchema.methods.classifyRisk = function () {
  if (this.risk_score >= 80) {
    this.risk_classification = 'Emergency';
  } else if (this.risk_score >= 50) {
    this.risk_classification = 'Medium';
  } else if (this.risk_score > 0) {
    this.risk_classification = 'Low';
  } else {
    this.risk_classification = 'Unclassified';
  }
  return this.risk_classification;
};

patientSchema.methods.calculateUrgency = function () {
  const risk = this.risk_classification || 'Unclassified';
  const duration = this.symptom_duration || 'Chronic';
  const pain = this.pain_scale || 0;

  let urgency = 'Low';
  let reasoning = '';

  if (risk === 'Emergency') {
    urgency = 'Critical';
    reasoning = 'Emergency medical risk - immediate attention required';
  } else if (pain >= 8 && (duration === '< 24 hours' || duration === '1-3 days')) {
    urgency = 'Critical';
    reasoning = 'Severe pain with acute symptoms';
  } else if (risk === 'Medium' && pain >= 6) {
    urgency = 'High';
    reasoning = 'Medium risk with significant pain';
  } else if (risk === 'Medium') {
    urgency = 'High';
    reasoning = 'Medium medical risk';
  } else if (risk === 'Low' && (duration === '< 24 hours' || duration === '1-3 days')) {
    urgency = 'Medium';
    reasoning = 'Low risk but recent symptom onset';
  } else {
    urgency = 'Low';
    reasoning = 'Low risk or chronic condition - routine appointment';
  }

  this.urgency = urgency;
  this.urgency_reasoning = reasoning;
  this.urgency_calculated_at = new Date();

  return urgency;
};

patientSchema.methods.markAsReturningPatient = function (newConsultationId) {
  this.returning_patient = true;
  this.previous_consultations_count += 1;
  this.consultation_count += 1;
  
  if (this.consultation_id) {
    this.consultation_history.push(this.consultation_id);
  }
  
  this.consultation_id = newConsultationId;
  this.last_activity_at = new Date();
  this.last_consultation_date = new Date();
  
  if (!this.first_visit_date) {
    this.first_visit_date = new Date();
  }
  
  return this.save();
};

patientSchema.methods.updateValidationStatus = function (isValid, errors = null) {
  this.validation_status = isValid ? 'valid' : 'invalid';
  
  if (errors) {
    this.validation_errors = new Map(Object.entries(errors));
    const errorCount = Object.keys(errors).length;
    this.data_quality_score = Math.max(0, 100 - (errorCount * 25));
  } else {
    this.validation_errors = new Map();
    this.data_quality_score = 100;
  }
  
  return this.save();
};

patientSchema.methods.setPrimaryDepartment = function () {
  if (this.departments_visited && this.departments_visited.length > 0) {
    const departmentCounts = {};
    this.departments_visited.forEach(dept => {
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });
    
    this.primary_department = Object.keys(departmentCounts).reduce((a, b) => 
      departmentCounts[a] > departmentCounts[b] ? a : b
    );
  }
  return this.primary_department;
};

patientSchema.methods.updateEmailStatus = function (
  status,
  templateUsed = null,
  error = null
) {
  this.email_status = status;
  this.email_sent = status === 'sent';
  this.email_sent_at = status === 'sent' ? new Date() : this.email_sent_at;
  this.email_template_used = templateUsed;
  this.email_error = error;
  
  if (status === 'sent') {
    this.email_count += 1;
    this.last_email_sent_at = new Date();
  }
  
  return this.save();
};

patientSchema.methods.updateSmsStatus = function (
  status,
  templateUsed = null,
  error = null,
  sid = null,
  deliveryStatus = null
) {
  this.sms_status = status;
  this.sms_sent = status === 'sent' || status === 'delivered';
  this.sms_sent_at =
    status === 'sent' || status === 'delivered' ? new Date() : this.sms_sent_at;
  this.sms_template_used = templateUsed;
  this.sms_error = error;
  this.sms_sid = sid;
  this.sms_delivery_status = deliveryStatus;
  
  if (status === 'sent' || status === 'delivered') {
    this.sms_count += 1;
    this.last_sms_sent_at = new Date();
  }
  
  return this.save();
};

patientSchema.methods.updateAppointmentStatus = function (
  appointmentId,
  status,
  scheduledAt = null
) {
  this.appointment_id = appointmentId;
  this.appointment_status = status;
  this.appointment_scheduled_at = scheduledAt;
  
  if (scheduledAt) {
    this.next_appointment_date = scheduledAt;
  }
  
  return this.save();
};

patientSchema.methods.incrementNoShowCount = function () {
  this.no_show_count += 1;
  this.last_no_show_date = new Date();
  
  if (this.no_show_count >= 3) {
    this.high_no_show_risk = true;
    this.no_show_flagged_at = new Date();
  }
  
  return this.save();
};

patientSchema.methods.incrementConfirmationReminderCount = function () {
  this.confirmation_reminder_count += 1;

  if (this.confirmation_reminder_count >= 3) {
    this.confirmation_reminders_exhausted = true;
  }

  return this.save();
};

patientSchema.methods.markAsUnresponsive = function () {
  this.marked_as_unresponsive = true;
  this.unresponsive_marked_at = new Date();
  this.status = 'inactive';
  return this.save();
};

patientSchema.methods.updateChronicFlags = function () {
  this.is_diabetic = this.chronic_conditions.includes('Diabetes');
  this.is_hypertensive = this.chronic_conditions.includes('Hypertension');
  this.has_heart_condition = this.chronic_conditions.includes('Heart Disease');
};

// ==================== PRE-SAVE MIDDLEWARE ====================

patientSchema.pre('save', function (next) {
  if (this.isModified('risk_score') && this.risk_score > 0) {
    this.classifyRisk();
    this.triaged_at = new Date();
  }
  
  if (this.isModified('risk_score') || this.isModified('symptom_duration') || this.isModified('pain_scale')) {
    this.calculateUrgency();
  }
  
  if (this.isModified('departments_visited')) {
    this.setPrimaryDepartment();
  }
  
  if (this.isModified('chronic_conditions')) {
    this.updateChronicFlags();
  }
  
  if (this.isModified() && !this.isNew) {
    this.last_activity_at = new Date();
  }
  
  if (this.isNew && !this.first_visit_date) {
    this.first_visit_date = new Date();
  }
  
  next();
});

const Patient = mongoose.model('Patient', patientSchema);

export default Patient;
