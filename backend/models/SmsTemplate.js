/**
 * SMS Template Schema for MediFlow - Medical Appointment System
 * Stores SMS/WhatsApp templates for patient communication
 * 
 * India-Specific Compliance:
 * - TRAI DND regulations (no promotional SMS 9 PM - 9 AM)
 * - WhatsApp Business API preferred for appointment reminders
 * - 160 characters SMS limit (or use Unicode for 70 chars)
 * 
 * Message Categories:
 * - Appointment Confirmation
 * - Appointment Reminders (3-day, 1-day, 2-hour)
 * - Token Number Notification
 * - Check-in Instructions
 * - No-Show Follow-up
 * - Prescription Ready
 * - Lab Results Ready
 * 
 * ENHANCEMENTS:
 * - Department-based template selection
 * - Risk-based personalization (Emergency/Medium/Low)
 * - WhatsApp template support
 * - TRAI compliance with DND time restrictions
 */


import mongoose from 'mongoose';


const smsTemplateSchema = new mongoose.Schema(
  {
    // ==================== TEMPLATE IDENTIFICATION ====================
    
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      description: 'Template identifier (e.g., "appointment-confirmation-cardiology", "reminder-2hour-general")',
    },
    
    description: {
      type: String,
      required: true,
      description: 'Brief description of template purpose',
    },
    
    // ==================== RISK CLASSIFICATION ====================
    
    risk_classification: {
      type: String,
      enum: ['Emergency', 'Medium', 'Low', 'General'],
      default: 'General',
      index: true,
      description: 'Patient risk level this template addresses',
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
      description: 'Medical department this template is tailored for',
    },
    
    // ==================== URGENCY-BASED CLASSIFICATION ====================
    
    urgency: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low', 'Any'],
      default: 'Any',
      description: 'Urgency level for appointment-related SMS',
    },
    
    // ==================== MESSAGE CONTENT ====================
    
    message: {
      type: String,
      required: true,
      maxlength: 1600, // SMS character limit with buffer
      description: 'SMS/WhatsApp message body (supports {{placeholders}})',
    },
    
    // ==================== WHATSAPP SUPPORT ====================
    
    whatsapp_template_name: {
      type: String,
      default: null,
      description: 'WhatsApp Business template name (if using WhatsApp API)',
    },
    
    whatsapp_supported: {
      type: Boolean,
      default: true,
      description: 'Whether this template can be sent via WhatsApp',
    },
    
    // ==================== TEMPLATE VARIABLES ====================
    
    variables: {
      type: [String],
      default: [],
      description: 'List of placeholder variables (e.g., ["patient_name", "appointment_time", "doctor_name"])',
    },
    
    // ==================== MESSAGE CATEGORY ====================
    
    category: {
      type: String,
      enum: [
        'appointment_confirmation',
        'appointment_reminder_3day',
        'appointment_reminder_1day',
        'appointment_reminder_2hour',
        'token_notification',
        'checkin_instruction',
        'no_show_followup',
        'prescription_ready',
        'lab_results_ready',
        'payment_reminder',
        'follow_up_reminder',
        'appointment_cancellation',
        'welcome_new_patient',
      ],
      required: true,
      description: 'SMS campaign category',
    },
    
    // ==================== APPOINTMENT TYPE ====================
    
    appointment_type: {
      type: String,
      enum: ['new_patient', 'follow_up', 'emergency', 'routine_checkup', 'telemedicine', 'any'],
      default: 'any',
      description: 'Type of appointment this template is for',
    },
    
    // ==================== TIMING CONFIGURATION ====================
    
    delay_minutes: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Delay in minutes before sending after appointment creation',
    },
    
    // TRAI DND Compliance - Optimal Send Time Window
    optimal_send_window: {
      start_hour: {
        type: Number,
        default: 9,
        min: 0,
        max: 23,
        description: 'Earliest hour to send (9 AM as per TRAI)',
      },
      end_hour: {
        type: Number,
        default: 21,
        min: 0,
        max: 23,
        description: 'Latest hour to send (9 PM as per TRAI)',
      },
    },
    
    // ==================== MESSAGE PRIORITY ====================
    
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
      description: 'SMS delivery priority',
    },
    
    // ==================== TEMPLATE STATUS ====================
    
    active: {
      type: Boolean,
      default: true,
      description: 'Whether this template is currently active',
    },
    
    // ==================== USAGE STATISTICS ====================
    
    usage_count: {
      type: Number,
      default: 0,
      description: 'Number of times this template has been used',
    },
    
    last_used: {
      type: Date,
      default: null,
      description: 'Last time this template was used',
    },
    
    success_rate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      description: 'Delivery success rate percentage',
    },
    
    delivery_stats: {
      total_sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
    },
    
    // ==================== MESSAGE TYPE ====================
    
    message_type: {
      type: String,
      enum: ['transactional', 'promotional', 'otp'],
      default: 'transactional',
      description: 'Type of message for TRAI compliance',
    },
    
    // ==================== COMPLIANCE ====================
    
    trai_compliant: {
      type: Boolean,
      default: true,
      description: 'Whether template follows TRAI DND regulations',
    },
    
    contains_phi: {
      type: Boolean,
      default: false,
      description: 'Whether template contains Protected Health Information',
    },
  },
  {
    timestamps: true,
  }
);


// ==================== INDEXES ====================


smsTemplateSchema.index({ risk_classification: 1, active: 1 });
smsTemplateSchema.index({ department: 1, risk_classification: 1 });
smsTemplateSchema.index({ category: 1 });
smsTemplateSchema.index({ urgency: 1 });
smsTemplateSchema.index({ whatsapp_supported: 1 });


// ==================== INSTANCE METHODS ====================


/**
 * Render SMS message with patient and appointment data
 * ENHANCED: Medical-specific personalization with TRAI compliance
 */
smsTemplateSchema.methods.renderMessage = function (patientData, appointmentData = null) {
  try {
    let renderedMessage = this.message;


    // Urgency emoji mapping for SMS
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


    // Format appointment date/time for SMS (short format)
    const appointmentDate = appointmentData?.scheduled_start_time
      ? new Date(appointmentData.scheduled_start_time).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
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


    // Prepare enhanced data for replacement
    const enhancedData = {
      // Patient Details
      patient_name: patientData.name || 'Patient',
      patient_age: patientData.age || '',
      patient_phone: patientData.phone || '',
      
      // Doctor & Department
      doctor_name: appointmentData?.doctor_id?.name || 'Dr. [Doctor]',
      department: appointmentData?.department || patientData.primary_department || 'General Medicine',
      
      // Appointment Details
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      appointment_duration: appointmentData?.appointment_duration || '15',
      token_number: appointmentData?.token_number || 'N/A',
      days_until: daysUntil || '',
      
      // Clinic Information
      clinic_name: process.env.CLINIC_NAME || 'MediFlow Clinic',
      clinic_address: process.env.CLINIC_ADDRESS_SHORT || '123 Medical St, Bangalore',
      clinic_phone: process.env.CLINIC_PHONE || '+91-80-12345678',
      
      // Links (shortened for SMS)
      appointment_link: appointmentData?.telemedicine_link 
        ? this.shortenUrl(appointmentData.telemedicine_link)
        : `${process.env.CLIENT_ORIGIN}/apt/${appointmentData?._id}`,
      
      // Medical Info
      chief_complaint: appointmentData?.chief_complaint || patientData.chief_complaint || 'consultation',
      
      // Risk & Urgency
      risk_level: patientData.risk_classification || 'Low',
      risk_emoji: riskEmojis[patientData.risk_classification] || '✅',
      urgency: patientData.urgency || 'Medium',
      urgency_emoji: urgencyEmojis[patientData.urgency] || '⏰',
      
      // Payment
      consultation_fee: appointmentData?.consultation_fee
        ? `₹${appointmentData.consultation_fee}`
        : '₹500',
      
      // QR Code (for check-in)
      qr_code_link: appointmentData?.qr_code 
        ? `${process.env.CLIENT_ORIGIN}/qr/${appointmentData._id}`
        : '',
      
      // Dynamic content
      urgency_text: patientData.urgency === 'Critical' ? 'URGENT' : patientData.urgency === 'High' ? 'Important' : '',
    };


    // Replace all {{variable}} placeholders
    Object.keys(enhancedData).forEach((variable) => {
      const placeholder = new RegExp(`{{${variable}}}`, 'g');
      const value = enhancedData[variable] || '';
      renderedMessage = renderedMessage.replace(placeholder, value);
    });


    // Clean up any remaining unreplaced variables
    renderedMessage = renderedMessage.replace(/{{[^}]+}}/g, '');


    console.log(
      `[${new Date().toISOString()}] ✅ SMS template "${this.name}" rendered for ${patientData.name} (${this.category})`
    );


    return renderedMessage;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Error rendering SMS message:`,
      error.message
    );
    throw error;
  }
};


/**
 * Helper: Shorten URL for SMS (placeholder - implement bit.ly integration)
 */
smsTemplateSchema.methods.shortenUrl = function (url) {
  // TODO: Integrate with URL shortener service (bit.ly, tinyurl)
  return url;
};


/**
 * Check if current time is within optimal send window (TRAI compliance)
 */
smsTemplateSchema.methods.isOptimalSendTime = function () {
  try {
    const now = new Date();
    const currentHour = now.getHours();


    const isOptimal =
      currentHour >= this.optimal_send_window.start_hour &&
      currentHour < this.optimal_send_window.end_hour;


    if (!isOptimal) {
      console.warn(
        `[${new Date().toISOString()}] ⚠️ Current time (${currentHour}:00) is outside TRAI-compliant send window (${this.optimal_send_window.start_hour}:00-${this.optimal_send_window.end_hour}:00)`
      );
    }


    return isOptimal;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Error checking optimal send time:`,
      error.message
    );
    return false; // Default to NOT sending on error (TRAI compliance)
  }
};


/**
 * Mark template as used
 */
smsTemplateSchema.methods.markAsUsed = async function () {
  try {
    this.usage_count += 1;
    this.last_used = new Date();
    this.delivery_stats.total_sent += 1;


    console.log(
      `[${new Date().toISOString()}] ✅ SMS template "${this.name}" usage recorded (Total: ${this.usage_count})`
    );


    await this.save();
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Error marking SMS template as used:`,
      error.message
    );
    throw error;
  }
};


/**
 * Update delivery status
 */
smsTemplateSchema.methods.updateDeliveryStatus = async function (status) {
  try {
    if (status === 'delivered') {
      this.delivery_stats.delivered += 1;
    } else if (status === 'failed') {
      this.delivery_stats.failed += 1;
    } else if (status === 'pending') {
      this.delivery_stats.pending += 1;
    }


    // Recalculate success rate
    const totalCompleted = this.delivery_stats.delivered + this.delivery_stats.failed;
    if (totalCompleted > 0) {
      this.success_rate = Math.round((this.delivery_stats.delivered / totalCompleted) * 100);
    }


    console.log(
      `[${new Date().toISOString()}] ✅ SMS template "${this.name}" delivery status updated: ${status} (Success rate: ${this.success_rate}%)`
    );


    await this.save();
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Error updating SMS delivery status:`,
      error.message
    );
    throw error;
  }
};


// ==================== STATIC METHODS ====================


/**
 * Get template by category and department
 * Primary method for template selection
 */
smsTemplateSchema.statics.getTemplateByCategory = async function (
  category,
  department = 'General',
  riskLevel = 'General'
) {
  try {
    console.log(
      `[${new Date().toISOString()}] 🔍 Finding SMS template: category=${category}, department=${department}, risk=${riskLevel}`
    );


    // Try exact match (category + department + risk)
    let template = await this.findOne({
      active: true,
      category: category,
      department: { $in: [department, 'General'] },
      risk_classification: { $in: [riskLevel, 'General'] },
    }).sort({ department: department === 'General' ? 1 : -1 });


    // Fallback 1: Category + Department (any risk)
    if (!template) {
      console.log(`[${new Date().toISOString()}] ⚠️ No risk-specific SMS template, trying category + department`);
      template = await this.findOne({
        active: true,
        category: category,
        department: { $in: [department, 'General'] },
      });
    }


    // Fallback 2: Category only (general department)
    if (!template) {
      console.log(`[${new Date().toISOString()}] ⚠️ No department-specific SMS template, trying category only`);
      template = await this.findOne({
        active: true,
        category: category,
        department: 'General',
      });
    }


    if (template) {
      console.log(
        `[${new Date().toISOString()}] ✅ SMS template found: "${template.name}" (${template.department})`
      );
    } else {
      console.error(
        `[${new Date().toISOString()}] ❌ No SMS template found for category=${category}, department=${department}`
      );
    }


    return template;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Error getting SMS template by category:`,
      error.message
    );
    throw error;
  }
};


/**
 * Get template for patient appointment
 * Smart selection based on patient and appointment data
 */
smsTemplateSchema.statics.getTemplateForAppointment = async function (
  category,
  patientData,
  appointmentData = null
) {
  try {
    const department = appointmentData?.department || patientData.primary_department || 'General';
    const riskLevel = patientData.risk_classification || 'General';


    console.log(
      `[${new Date().toISOString()}] 🎯 Getting SMS template for appointment: ${patientData.phone} (${category}, ${department}, ${riskLevel})`
    );


    const template = await this.getTemplateByCategory(category, department, riskLevel);


    if (!template) {
      throw new Error(`No suitable SMS template found for category: ${category}`);
    }


    return template;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Error getting SMS template for appointment:`,
      error.message
    );
    throw error;
  }
};


/**
 * Get WhatsApp-supported templates
 */
smsTemplateSchema.statics.getWhatsAppTemplates = async function (category = null) {
  try {
    const query = {
      active: true,
      whatsapp_supported: true,
    };


    if (category) {
      query.category = category;
    }


    const templates = await this.find(query).sort({ category: 1 });


    console.log(
      `[${new Date().toISOString()}] ✅ Found ${templates.length} WhatsApp-supported templates${category ? ` for category: ${category}` : ''}`
    );


    return templates;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Error getting WhatsApp templates:`,
      error.message
    );
    throw error;
  }
};


/**
 * Get template analytics
 */
smsTemplateSchema.statics.getTemplateAnalytics = async function () {
  try {
    const analytics = await this.aggregate([
      { $match: { active: true } },
      {
        $group: {
          _id: '$category',
          total_templates: { $sum: 1 },
          total_uses: { $sum: '$usage_count' },
          avg_success_rate: { $avg: '$success_rate' },
          total_delivered: { $sum: '$delivery_stats.delivered' },
          total_failed: { $sum: '$delivery_stats.failed' },
        },
      },
      { $sort: { total_uses: -1 } },
    ]);


    console.log(`[${new Date().toISOString()}] ✅ SMS template analytics generated`);


    return analytics;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ❌ Error getting SMS template analytics:`,
      error.message
    );
    throw error;
  }
};


const SmsTemplate = mongoose.model('SmsTemplate', smsTemplateSchema);


export default SmsTemplate;
