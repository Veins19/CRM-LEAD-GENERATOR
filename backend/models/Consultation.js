import mongoose from 'mongoose';




/**
 * Message Schema (nested in Consultation)
 * Represents individual messages in the patient-chatbot/doctor interaction
 */
const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['patient', 'doctor', 'assistant', 'system', 'user'],
      required: true,
      description: 'patient/user: patient messages, doctor: doctor notes, assistant: AI chatbot, system: automated messages',
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      response_time: {
        type: Number,
        default: null,
        description: 'Response time in milliseconds',
      },
      word_count: {
        type: Number,
        default: 0,
      },
      sentiment: {
        type: String,
        enum: ['positive', 'neutral', 'negative', 'unknown'],
        default: 'unknown',
      },
      is_critical: {
        type: Boolean,
        default: false,
        description: 'Flagged if message contains critical medical information',
      },
    },
  },
  { _id: true }
);




/**
 * Vitals Schema
 * Patient vital signs recorded during consultation
 */
const vitalsSchema = new mongoose.Schema(
  {
    blood_pressure: {
      systolic: { type: Number, default: null, description: 'Systolic BP (mmHg)' },
      diastolic: { type: Number, default: null, description: 'Diastolic BP (mmHg)' },
    },
    pulse_rate: {
      type: Number,
      default: null,
      description: 'Heart rate (bpm)',
    },
    temperature: {
      type: Number,
      default: null,
      description: 'Body temperature (°F)',
    },
    respiratory_rate: {
      type: Number,
      default: null,
      description: 'Breaths per minute',
    },
    oxygen_saturation: {
      type: Number,
      default: null,
      description: 'SpO2 (%)',
    },
    weight: {
      type: Number,
      default: null,
      description: 'Weight (kg)',
    },
    height: {
      type: Number,
      default: null,
      description: 'Height (cm)',
    },
    bmi: {
      type: Number,
      default: null,
      description: 'Body Mass Index (auto-calculated)',
    },
    recorded_at: {
      type: Date,
      default: Date.now,
    },
    recorded_by: {
      type: String,
      default: 'nurse',
      enum: ['nurse', 'doctor', 'self_reported'],
    },
  },
  { _id: false }
);




/**
 * Consultation Schema for MediFlow
 * Stores complete medical consultation data including:
 * - Pre-appointment chatbot interaction (symptom checker)
 * - Doctor consultation notes
 * - Vitals, diagnosis, treatment plan
 * - Prescription and lab test orders
 */
const consultationSchema = new mongoose.Schema(
  {
    // ==================== SESSION INFORMATION ====================
    
    session_id: {
      type: String,
      required: true,
      unique: true,
      description: 'Unique consultation session ID',
    },
    socket_id: {
      type: String,
      default: null,
      description: 'Socket.io connection ID (for real-time chat)',
    },
    
    // ==================== PATIENT & APPOINTMENT REFERENCES ====================
    
    patient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: false,
      default: null,
    },
    
    appointment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
      description: 'Linked appointment (if scheduled)',
    },
    
    doctor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      default: null,
      description: 'Consulting doctor',
    },
    
    department: {
      type: String,
      default: null,
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
        'Emergency',
        'Other',
        null,
      ],
    },
    
    // ==================== CONSULTATION TYPE ====================
    
    consultation_type: {
      type: String,
      enum: ['pre_appointment_chat', 'in_person', 'telemedicine', 'follow_up', 'emergency'],
      default: 'pre_appointment_chat',
      description: 'Type of consultation',
    },
    
    // ==================== MESSAGES ARRAY (Chat History) ====================
    
    messages: {
      type: [messageSchema],
      default: [],
      description: 'Complete conversation history (patient chatbot + doctor notes)',
    },
    
    // ==================== CHIEF COMPLAINT & SYMPTOMS ====================
    
    chief_complaint: {
      type: String,
      trim: true,
      default: null,
      description: 'Primary reason for visit',
    },
    
    symptoms: {
      type: [String],
      default: [],
      description: 'List of symptoms reported by patient',
    },
    
    symptom_duration: {
      type: String,
      enum: ['< 24 hours', '1-3 days', '3-7 days', '1-2 weeks', '2+ weeks', 'Chronic', null],
      default: null,
    },
    
    pain_scale: {
      type: Number,
      min: 0,
      max: 10,
      default: 0,
      description: 'Pain level (0-10 scale)',
    },
    
    // ==================== VITALS ====================
    
    vitals: {
      type: vitalsSchema,
      default: null,
    },
    
    // ==================== EXAMINATION & DIAGNOSIS ====================
    
    physical_examination: {
      type: String,
      default: null,
      description: 'Doctor\'s physical examination notes',
    },
    
    diagnosis: {
      type: String,
      trim: true,
      default: null,
      description: 'Primary diagnosis',
    },
    
    differential_diagnosis: {
      type: [String],
      default: [],
      description: 'Alternative diagnoses considered',
    },
    
    icd_codes: {
      type: [String],
      default: [],
      description: 'ICD-10 diagnostic codes',
    },
    
    // ==================== TREATMENT PLAN ====================
    
    treatment_plan: {
      type: String,
      default: null,
      description: 'Detailed treatment plan',
    },
    
    prescription_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription',
      default: null,
    },
    
    medications_prescribed: {
      type: [String],
      default: [],
      description: 'List of medications prescribed',
    },
    
    lab_tests_ordered: {
      type: [String],
      default: [],
      description: 'Lab tests ordered',
    },
    
    imaging_ordered: {
      type: [String],
      default: [],
      description: 'Imaging studies ordered (X-ray, MRI, CT, etc.)',
    },
    
    // ==================== FOLLOW-UP ====================
    
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
    
    follow_up_appointment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    
    // ==================== REFERRALS ====================
    
    referral_required: {
      type: Boolean,
      default: false,
    },
    
    referred_to_department: {
      type: String,
      default: null,
    },
    
    referred_to_doctor: {
      type: String,
      default: null,
    },
    
    referral_reason: {
      type: String,
      default: null,
    },
    
    // ==================== CONSULTATION STATUS ====================
    
    status: {
      type: String,
      enum: ['active', 'in_progress', 'completed', 'abandoned', 'cancelled'],
      default: 'active',
    },
    
    started_at: {
      type: Date,
      default: Date.now,
    },
    
    completed_at: {
      type: Date,
      default: null,
    },
    
    // ==================== CONSULTATION METADATA ====================
    
    metadata: {
      total_messages: {
        type: Number,
        default: 0,
      },
      patient_messages: {
        type: Number,
        default: 0,
      },
      doctor_messages: {
        type: Number,
        default: 0,
      },
      assistant_messages: {
        type: Number,
        default: 0,
      },
      duration: {
        type: Number,
        default: 0,
        description: 'Consultation duration in seconds',
      },
      avg_response_time: {
        type: Number,
        default: 0,
      },
      // Patient journey tracking (pre-appointment)
      patient_journey: {
        sessionId: { type: String, default: null },
        pagesVisited: { type: Number, default: 0 },
        departmentsViewed: { type: [String], default: [] },
        topDepartments: { type: [String], default: [] },
        totalTimeSpent: { type: Number, default: 0 },
        journeyScore: { type: Number, default: 0 },
        engagementLevel: { 
          type: String, 
          enum: ['high', 'medium', 'low', 'none'],
          default: 'none' 
        },
      },
    },
    
    // ==================== EXTRACTED DATA (Quick Access) ====================
    
    extracted_data: {
      name: { type: String, default: null },
      age: { type: Number, default: null },
      gender: { type: String, default: null },
      phone: { type: String, default: null },
      email: { type: String, default: null },
      chief_complaint_summary: { type: String, default: null },
      risk_level: { 
        type: String, 
        enum: ['Emergency', 'Medium', 'Low', 'Unclassified'],
        default: 'Unclassified' 
      },
    },
    
    // ==================== AI TRIAGE DATA ====================
    
    ai_triage: {
      risk_score: { type: Number, default: 0, min: 0, max: 100 },
      risk_classification: {
        type: String,
        enum: ['Emergency', 'Medium', 'Low', 'Unclassified'],
        default: 'Unclassified',
      },
      reasoning: { type: String, default: null },
      red_flags_detected: { type: [String], default: [] },
      triaged_at: { type: Date, default: null },
    },
    
    // ==================== DOCUMENT REFERENCES ====================
    
    prescription_document_url: {
      type: String,
      default: null,
      description: 'URL to prescription PDF',
    },
    
    lab_report_urls: {
      type: [String],
      default: [],
      description: 'URLs to lab reports',
    },
    
    medical_certificate_url: {
      type: String,
      default: null,
    },
    
    // ==================== PRIVACY & COMPLIANCE ====================
    
    patient_consent_given: {
      type: Boolean,
      default: false,
      description: 'Patient consent for data storage and ABDM sharing',
    },
    
    abdm_synced: {
      type: Boolean,
      default: false,
      description: 'Consultation synced to ABDM PHR',
    },
    
    abdm_synced_at: {
      type: Date,
      default: null,
    },
    
    // ==================== SOURCE TRACKING ====================
    
    source: {
      type: String,
      default: 'chatbot',
      enum: ['chatbot', 'walk-in', 'phone', 'telemedicine', 'emergency'],
    },
    
    ip_address: {
      type: String,
      default: null,
    },
    
    user_agent: {
      type: String,
      default: null,
    },
    
    // ==================== DOCTOR NOTES (PRIVATE) ====================
    
    doctor_notes: {
      type: String,
      default: null,
      description: 'Private notes from doctor (not shared with patient)',
    },
    
    // ==================== BILLING ====================
    
    consultation_fee: {
      type: Number,
      default: 0,
      description: 'Consultation fee in INR',
    },
    
    payment_status: {
      type: String,
      enum: ['pending', 'paid', 'waived', 'insurance'],
      default: 'pending',
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);




// ==================== INDEXES ====================



consultationSchema.index({ status: 1 });
consultationSchema.index({ patient_id: 1 });
consultationSchema.index({ doctor_id: 1 });
consultationSchema.index({ appointment_id: 1 });
consultationSchema.index({ createdAt: -1 });
consultationSchema.index({ 'ai_triage.risk_classification': 1 });
consultationSchema.index({ department: 1 });




// ==================== VIRTUAL FIELDS ====================



// BMI auto-calculation
consultationSchema.virtual('calculated_bmi').get(function () {
  if (this.vitals && this.vitals.weight && this.vitals.height) {
    const heightInMeters = this.vitals.height / 100;
    const bmi = this.vitals.weight / (heightInMeters * heightInMeters);
    return parseFloat(bmi.toFixed(1));
  }
  return null;
});




// ==================== INSTANCE METHODS ====================



/**
 * Add a message to the consultation
 */
consultationSchema.methods.addMessage = function (role, content, metadata = {}) {
  try {
    const message = {
      role,
      content,
      timestamp: new Date(),
      metadata: {
        response_time: metadata.response_time || null,
        word_count: content.split(/\s+/).length,
        sentiment: metadata.sentiment || 'unknown',
        is_critical: metadata.is_critical || false,
      },
    };



    this.messages.push(message);



    // Update metadata
    this.metadata.total_messages = this.messages.length;
    this.metadata.patient_messages = this.messages.filter((m) => m.role === 'patient').length;
    this.metadata.doctor_messages = this.messages.filter((m) => m.role === 'doctor').length;
    this.metadata.assistant_messages = this.messages.filter((m) => m.role === 'assistant').length;



    console.log(`[${new Date().toISOString()}] ✅ Message added to consultation ${this.session_id} (${role})`);
    
    return this.save();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error adding message to consultation:`, error.message);
    throw error;
  }
};



/**
 * Record patient vitals
 */
consultationSchema.methods.recordVitals = function (vitalsData, recordedBy = 'nurse') {
  try {
    this.vitals = {
      ...vitalsData,
      recorded_at: new Date(),
      recorded_by: recordedBy,
    };
    
    // Auto-calculate BMI if weight and height provided
    if (vitalsData.weight && vitalsData.height) {
      const heightInMeters = vitalsData.height / 100;
      const bmi = vitalsData.weight / (heightInMeters * heightInMeters);
      this.vitals.bmi = parseFloat(bmi.toFixed(1));
    }
    
    console.log(`[${new Date().toISOString()}] ✅ Vitals recorded for consultation ${this.session_id}`);
    
    return this.save();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error recording vitals:`, error.message);
    throw error;
  }
};



/**
 * Set diagnosis and treatment plan
 */
consultationSchema.methods.setDiagnosis = function (diagnosis, treatmentPlan, prescriptionId = null) {
  try {
    this.diagnosis = diagnosis;
    this.treatment_plan = treatmentPlan;
    this.prescription_id = prescriptionId;
    
    console.log(`[${new Date().toISOString()}] ✅ Diagnosis set for consultation ${this.session_id}`);
    
    return this.save();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error setting diagnosis:`, error.message);
    throw error;
  }
};



/**
 * Mark consultation as completed
 */
consultationSchema.methods.complete = function () {
  try {
    this.status = 'completed';
    this.completed_at = new Date();
    this.calculateAvgResponseTime();
    this.calculateDuration();
    
    console.log(`[${new Date().toISOString()}] ✅ Consultation ${this.session_id} marked as completed`);
    
    return this.save();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error completing consultation:`, error.message);
    throw error;
  }
};



/**
 * Calculate average response time
 */
consultationSchema.methods.calculateAvgResponseTime = function () {
  try {
    const patientMessages = this.messages.filter((m) => m.role === 'patient' && m.metadata.response_time);
    
    if (patientMessages.length === 0) {
      this.metadata.avg_response_time = 0;
      return 0;
    }



    const totalResponseTime = patientMessages.reduce((sum, msg) => sum + (msg.metadata.response_time || 0), 0);
    this.metadata.avg_response_time = Math.round(totalResponseTime / patientMessages.length);
    
    return this.metadata.avg_response_time;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error calculating avg response time:`, error.message);
    return 0;
  }
};



/**
 * Calculate consultation duration
 */
consultationSchema.methods.calculateDuration = function () {
  try {
    if (this.messages.length < 2) {
      this.metadata.duration = 0;
      return 0;
    }



    const firstMessage = this.messages[0];
    const lastMessage = this.messages[this.messages.length - 1];
    
    const duration = Math.round((lastMessage.timestamp - firstMessage.timestamp) / 1000);
    this.metadata.duration = duration;
    
    return duration;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error calculating duration:`, error.message);
    return 0;
  }
};



/**
 * Get formatted history for AI (Gemini format)
 */
consultationSchema.methods.getFormattedHistory = function () {
  try {
    return this.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' || m.role === 'doctor' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error formatting consultation history:`, error.message);
    return [];
  }
};



/**
 * Get consultation summary for patient
 */
consultationSchema.methods.getSummaryForPatient = function () {
  try {
    return {
      session_id: this.session_id,
      date: this.createdAt,
      doctor: this.doctor_id,
      department: this.department,
      chief_complaint: this.chief_complaint,
      diagnosis: this.diagnosis,
      treatment_plan: this.treatment_plan,
      medications: this.medications_prescribed,
      lab_tests: this.lab_tests_ordered,
      follow_up_required: this.follow_up_required,
      follow_up_date: this.follow_up_date,
      consultation_fee: this.consultation_fee,
      payment_status: this.payment_status,
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error generating summary:`, error.message);
    return null;
  }
};



/**
 * Sync to ABDM
 */
consultationSchema.methods.syncToABDM = function () {
  try {
    if (!this.patient_consent_given) {
      console.warn(`[${new Date().toISOString()}] ⚠️ Cannot sync to ABDM - patient consent not given`);
      return false;
    }
    
    // TODO: Implement ABDM API sync
    this.abdm_synced = true;
    this.abdm_synced_at = new Date();
    
    console.log(`[${new Date().toISOString()}] ✅ Consultation ${this.session_id} synced to ABDM`);
    
    return this.save();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error syncing to ABDM:`, error.message);
    throw error;
  }
};




// ==================== PRE-SAVE MIDDLEWARE ====================



/**
 * Auto-update metadata on save
 */
consultationSchema.pre('save', function (next) {
  try {
    if (this.isModified('messages')) {
      this.metadata.total_messages = this.messages.length;
      this.metadata.patient_messages = this.messages.filter((m) => m.role === 'patient').length;
      this.metadata.doctor_messages = this.messages.filter((m) => m.role === 'doctor').length;
      this.metadata.assistant_messages = this.messages.filter((m) => m.role === 'assistant').length;
    }
    
    // Auto-calculate BMI if vitals modified
    if (this.isModified('vitals') && this.vitals && this.vitals.weight && this.vitals.height) {
      const heightInMeters = this.vitals.height / 100;
      const bmi = this.vitals.weight / (heightInMeters * heightInMeters);
      this.vitals.bmi = parseFloat(bmi.toFixed(1));
    }
    
    next();
  } catch (error) {
    next(error);
  }
});




const Consultation = mongoose.model('Consultation', consultationSchema);




export default Consultation;
