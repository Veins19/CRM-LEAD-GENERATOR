/**
 * Email Template Schema for MediFlow - Medical Appointment System
 * Stores HTML email templates for patient communication
 * 
 * Medical Email Categories:
 * - Appointment Confirmation
 * - Appointment Reminders (3-day, 1-day, 2-hour)
 * - No-Show Follow-up
 * - Follow-up Reminders
 * - Prescription Sharing
 * - Lab Report Notifications
 * - Welcome New Patient
 * 
 * ENHANCEMENTS:
 * - Department-based template selection
 * - Risk-based personalization (Emergency/Medium/Low)
 * - Appointment-specific variables
 * - HIPAA-compliant content guidelines
 */


import mongoose from 'mongoose';


const emailTemplateSchema = new mongoose.Schema(
  {
    // ==================== TEMPLATE IDENTIFICATION ====================
    
    name: {
      type: String,
      required: true,
      unique: true,
      description: 'Template name (e.g., "Appointment Confirmation - General Medicine")',
    },
    
    description: {
      type: String,
      required: true,
      description: 'Brief description of template purpose',
    },
    
    // ==================== DEPARTMENT-BASED CLASSIFICATION ====================
    
    department: {
      type: String,
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
        'Emergency',
        'General', // For department-agnostic templates
      ],
      default: 'General',
      index: true,
      description: 'Medical department this template is designed for',
    },
    
    // ==================== RISK CLASSIFICATION ====================
    
    risk_classification: {
      type: String,
      enum: ['Emergency', 'Medium', 'Low', 'General'],
      default: 'General',
      index: true,
      description: 'Patient risk level this template addresses',
    },
    
    // ==================== URGENCY-BASED CLASSIFICATION ====================
    
    urgency: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low', 'Any'],
      default: 'Any',
      description: 'Urgency level for appointment-related templates',
    },
    
    // ==================== EMAIL CONTENT ====================
    
    subject: {
      type: String,
      required: true,
      description: 'Email subject line with template variables',
    },
    
    html_content: {
      type: String,
      required: true,
      description: 'HTML email body with template variables',
    },
    
    text_content: {
      type: String,
      required: true,
      description: 'Plain text fallback',
    },
    
    // ==================== TEMPLATE VARIABLES ====================
    
    variables: {
      type: [String],
      default: [],
      description: 'Available variables: {{patient_name}}, {{doctor_name}}, {{department}}, {{appointment_date}}, {{appointment_time}}, {{clinic_address}}, {{token_number}}, {{prescription_link}}, etc.',
    },
    
    // ==================== TEMPLATE CATEGORY ====================
    
    category: {
      type: String,
      enum: [
        'appointment_confirmation',
        'appointment_reminder_3day',
        'appointment_reminder_1day',
        'appointment_reminder_2hour',
        'no_show_followup',
        'follow_up_reminder',
        'prescription_sharing',
        'lab_report_ready',
        'appointment_cancellation',
        'welcome_new_patient',
        'payment_receipt',
        'consultation_summary',
      ],
      required: true,
      description: 'Email campaign category',
    },
    
    // ==================== APPOINTMENT TYPE ====================
    
    appointment_type: {
      type: String,
      enum: ['new_patient', 'follow_up', 'emergency', 'routine_checkup', 'telemedicine', 'any'],
      default: 'any',
      description: 'Type of appointment this template is for',
    },
    
    // ==================== TEMPLATE METADATA ====================
    
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      required: true,
      description: 'Email delivery priority',
    },
    
    // ==================== USAGE STATISTICS ====================
    
    stats: {
      times_used: {
        type: Number,
        default: 0,
        description: 'Number of times template has been used',
      },
      last_used: {
        type: Date,
        default: null,
      },
      success_rate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
        description: 'Email open/click success rate (%)',
      },
      open_rate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      click_rate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    },
    
    // ==================== COMPLIANCE & FEATURES ====================
    
    hipaa_compliant: {
      type: Boolean,
      default: true,
      description: 'Whether template follows HIPAA privacy guidelines',
    },
    
    contains_phi: {
      type: Boolean,
      default: false,
      description: 'Whether template contains Protected Health Information',
    },
    
    attachment_supported: {
      type: Boolean,
      default: false,
      description: 'Whether template supports attachments (prescription, lab reports)',
    },
    
    // ==================== TEMPLATE STATUS ====================
    
    is_active: {
      type: Boolean,
      default: true,
    },
    
    version: {
      type: String,
      default: '1.0',
      description: 'Template version for tracking updates',
    },
  },
  {
    timestamps: true,
  }
);


// ==================== INDEXES ====================


emailTemplateSchema.index({ is_active: 1 });
emailTemplateSchema.index({ department: 1, risk_classification: 1 });
emailTemplateSchema.index({ category: 1 });
emailTemplateSchema.index({ urgency: 1 });
emailTemplateSchema.index({ appointment_type: 1 });


// ==================== INSTANCE METHODS ====================


/**
 * Personalize template with patient and appointment data
 * ENHANCED: Medical-specific personalization with HIPAA compliance
 */
emailTemplateSchema.methods.personalize = function (patientData, appointmentData = null) {
  try {
    let personalizedSubject = this.subject;
    let personalizedHtml = this.html_content;
    let personalizedText = this.text_content;


    // Urgency emoji mapping (medical context)
    const urgencyEmojis = {
      Critical: '🚨',
      High: '⚡',
      Medium: '⏰',
      Low: '📅',
    };


    // Risk emoji mapping
    const riskEmojis = {
      Emergency: '🚨',
      Medium: '⚠️',
      Low: '✅',
    };


    // Format appointment date/time
    const appointmentDate = appointmentData?.scheduled_start_time
      ? new Date(appointmentData.scheduled_start_time).toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'your scheduled date';


    const appointmentTime = appointmentData?.scheduled_start_time
      ? new Date(appointmentData.scheduled_start_time).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      : 'your scheduled time';


    // Calculate days until appointment
    const daysUntil = appointmentData?.scheduled_start_time
      ? Math.ceil(
          (new Date(appointmentData.scheduled_start_time) - new Date()) / (1000 * 60 * 60 * 24)
        )
      : null;


    // Prepare replacements
    const replacements = {
      // Patient Details
      '{{patient_name}}': patientData.name || 'Patient',
      '{{patient_age}}': patientData.age || '',
      '{{patient_gender}}': patientData.gender || '',
      '{{patient_phone}}': patientData.phone || '',
      '{{patient_email}}': patientData.email || '',
      
      // Doctor & Department
      '{{doctor_name}}': appointmentData?.doctor_id?.name || 'Dr. [Doctor Name]',
      '{{department}}': appointmentData?.department || patientData.primary_department || 'General Medicine',
      
      // Appointment Details
      '{{appointment_date}}': appointmentDate,
      '{{appointment_time}}': appointmentTime,
      '{{appointment_duration}}': appointmentData?.appointment_duration
        ? `${appointmentData.appointment_duration} minutes`
        : '15 minutes',
      '{{token_number}}': appointmentData?.token_number || 'N/A',
      '{{days_until}}': daysUntil || '',
      
      // Clinic Information
      '{{clinic_name}}': process.env.CLINIC_NAME || 'MediFlow Clinic',
      '{{clinic_address}}': process.env.CLINIC_ADDRESS || '123 Medical Street, Bangalore, Karnataka 560001',
      '{{clinic_phone}}': process.env.CLINIC_PHONE || '+91-80-12345678',
      '{{clinic_email}}': process.env.CLINIC_EMAIL || 'info@mediflow.com',
      
      // Links
      '{{appointment_link}}': appointmentData?.telemedicine_link || `${process.env.CLIENT_ORIGIN || 'http://localhost:3000'}/appointments/${appointmentData?._id}`,
      '{{prescription_link}}': appointmentData?.prescription_document_url || '#',
      '{{lab_report_link}}': appointmentData?.lab_report_urls?.[0] || '#',
      '{{reschedule_link}}': `${process.env.CLIENT_ORIGIN || 'http://localhost:3000'}/reschedule/${appointmentData?._id}`,
      '{{cancel_link}}': `${process.env.CLIENT_ORIGIN || 'http://localhost:3000'}/cancel/${appointmentData?._id}`,
      
      // Medical Info (HIPAA-safe, no specific diagnoses)
      '{{chief_complaint}}': appointmentData?.chief_complaint || patientData.chief_complaint || 'general consultation',
      '{{symptoms}}': Array.isArray(patientData.symptoms)
        ? patientData.symptoms.join(', ')
        : patientData.symptoms || 'N/A',
      
      // Risk & Urgency
      '{{risk_level}}': patientData.risk_classification || 'Low',
      '{{risk_emoji}}': riskEmojis[patientData.risk_classification] || '✅',
      '{{urgency}}': patientData.urgency || 'Medium',
      '{{urgency_emoji}}': urgencyEmojis[patientData.urgency] || '⏰',
      
      // Payment
      '{{consultation_fee}}': appointmentData?.consultation_fee
        ? `₹${appointmentData.consultation_fee}`
        : '₹500',
      '{{payment_status}}': appointmentData?.payment_status || 'pending',
      
      // QR Code (for check-in)
      '{{qr_code}}': appointmentData?.qr_code || '',
      
      // Dynamic content
      '{{greeting}}': this.getTimeBasedGreeting(),
      '{{current_year}}': new Date().getFullYear(),
    };


    // Apply replacements
    Object.keys(replacements).forEach((variable) => {
      const regex = new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g');
      personalizedSubject = personalizedSubject.replace(regex, replacements[variable]);
      personalizedHtml = personalizedHtml.replace(regex, replacements[variable]);
      personalizedText = personalizedText.replace(regex, replacements[variable]);
    });


    console.log(
      `[${new Date().toISOString()}] ✅ Template "${this.name}" personalized for ${patientData.name} (${this.category})`
    );


    return {
      subject: personalizedSubject,
      html: personalizedHtml,
      text: personalizedText,
    };
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Error personalizing template:`,
      error.message
    );
    throw error;
  }
};


/**
 * Get time-based greeting
 */
emailTemplateSchema.methods.getTimeBasedGreeting = function () {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};


/**
 * Record template usage
 */
emailTemplateSchema.methods.recordUsage = function () {
  try {
    this.stats.times_used += 1;
    this.stats.last_used = new Date();


    console.log(
      `[${new Date().toISOString()}] ✅ Template "${this.name}" usage recorded (Total: ${this.stats.times_used})`
    );


    return this.save();
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Error recording template usage:`,
      error.message
    );
    throw error;
  }
};


/**
 * Update success metrics
 */
emailTemplateSchema.methods.updateMetrics = function (opened = false, clicked = false) {
  try {
    if (opened) {
      this.stats.open_rate = ((this.stats.open_rate * (this.stats.times_used - 1) + 100) / this.stats.times_used);
    }
    
    if (clicked) {
      this.stats.click_rate = ((this.stats.click_rate * (this.stats.times_used - 1) + 100) / this.stats.times_used);
    }
    
    this.stats.success_rate = (this.stats.open_rate + this.stats.click_rate) / 2;
    
    return this.save();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Error updating metrics:`, error.message);
    throw error;
  }
};


// ==================== STATIC METHODS ====================


/**
 * Get template by category and department
 * Primary method for template selection
 */
emailTemplateSchema.statics.getTemplateByCategory = async function (
  category,
  department = 'General',
  riskLevel = 'General'
) {
  try {
    console.log(
      `[${new Date().toISOString()}] 🔍 Finding template: category=${category}, department=${department}, risk=${riskLevel}`
    );


    // Try exact match (category + department + risk)
    let template = await this.findOne({
      is_active: true,
      category: category,
      department: { $in: [department, 'General'] },
      risk_classification: { $in: [riskLevel, 'General'] },
    }).sort({ department: department === 'General' ? 1 : -1 });


    // Fallback 1: Category + Department (any risk)
    if (!template) {
      console.log(`[${new Date().toISOString()}] ⚠️ No risk-specific template, trying category + department`);
      template = await this.findOne({
        is_active: true,
        category: category,
        department: { $in: [department, 'General'] },
      });
    }


    // Fallback 2: Category only (general department)
    if (!template) {
      console.log(`[${new Date().toISOString()}] ⚠️ No department-specific template, trying category only`);
      template = await this.findOne({
        is_active: true,
        category: category,
        department: 'General',
      });
    }


    if (template) {
      console.log(
        `[${new Date().toISOString()}] ✅ Template found: "${template.name}" (${template.department})`
      );
    } else {
      console.error(
        `[${new Date().toISOString()}] ❌ No template found for category=${category}, department=${department}`
      );
    }


    return template;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Error getting template by category:`,
      error.message
    );
    throw error;
  }
};


/**
 * Get template for patient appointment
 * Smart selection based on patient and appointment data
 */
emailTemplateSchema.statics.getTemplateForAppointment = async function (
  category,
  patientData,
  appointmentData = null
) {
  try {
    const department = appointmentData?.department || patientData.primary_department || 'General';
    const riskLevel = patientData.risk_classification || 'General';


    console.log(
      `[${new Date().toISOString()}] 🎯 Getting template for appointment: ${patientData.email} (${category}, ${department}, ${riskLevel})`
    );


    const template = await this.getTemplateByCategory(category, department, riskLevel);


    if (!template) {
      throw new Error(`No suitable template found for category: ${category}`);
    }


    return template;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Error getting template for appointment:`,
      error.message
    );
    throw error;
  }
};


/**
 * Get template by department
 * Useful for department-specific communications
 */
emailTemplateSchema.statics.getTemplatesByDepartment = async function (department) {
  try {
    const templates = await this.find({
      is_active: true,
      department: { $in: [department, 'General'] },
    }).sort({ category: 1, risk_classification: 1 });


    console.log(
      `[${new Date().toISOString()}] ✅ Found ${templates.length} templates for department: ${department}`
    );


    return templates;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Error getting templates by department:`,
      error.message
    );
    throw error;
  }
};


/**
 * Get all active templates by category
 */
emailTemplateSchema.statics.getTemplatesByCategory = async function (category) {
  try {
    const templates = await this.find({
      is_active: true,
      category: category,
    }).sort({ department: 1 });


    console.log(
      `[${new Date().toISOString()}] ✅ Found ${templates.length} templates for category: ${category}`
    );


    return templates;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Error getting templates by category:`,
      error.message
    );
    throw error;
  }
};


/**
 * Get template analytics
 */
emailTemplateSchema.statics.getTemplateAnalytics = async function () {
  try {
    const analytics = await this.aggregate([
      { $match: { is_active: true } },
      {
        $group: {
          _id: '$category',
          total_templates: { $sum: 1 },
          total_uses: { $sum: '$stats.times_used' },
          avg_success_rate: { $avg: '$stats.success_rate' },
          avg_open_rate: { $avg: '$stats.open_rate' },
        },
      },
      { $sort: { total_uses: -1 } },
    ]);


    console.log(`[${new Date().toISOString()}] ✅ Template analytics generated`);


    return analytics;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Error getting template analytics:`,
      error.message
    );
    throw error;
  }
};


const EmailTemplate = mongoose.model('EmailTemplate', emailTemplateSchema);


export default EmailTemplate;
