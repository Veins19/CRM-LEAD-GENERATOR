import mongoose from 'mongoose';


/**
 * Appointment Schema for MediFlow
 * Stores appointment scheduling, reminders, and patient visit tracking
 * 
 * Medical Industry Standards:
 * - 3-tier reminder system (3-day, 1-day, 2-hour)
 * - 15-minute grace period for no-shows
 * - QR code token system for clinic check-in
 * - Support for in-person and telemedicine appointments
 */


const appointmentSchema = new mongoose.Schema(
  {
    // ==================== PATIENT & DOCTOR REFERENCES ====================
    
    patient_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    
    doctor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      description: 'Assigned doctor for this appointment',
    },
    
    // ==================== APPOINTMENT DETAILS ====================
    
    department: {
      type: String,
      required: true,
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
        'Other',
      ],
      index: true,
    },
    
    appointment_type: {
      type: String,
      enum: ['new_patient', 'follow_up', 'emergency', 'routine_checkup', 'lab_review', 'telemedicine'],
      default: 'new_patient',
    },
    
    chief_complaint: {
      type: String,
      trim: true,
      required: true,
      description: 'Primary reason for visit / main symptom',
    },
    
    symptoms: {
      type: [String],
      default: [],
      description: 'List of symptoms reported by patient',
    },
    
    // ==================== TIME SLOT OPTIONS ====================
    
    time_slots: [
      {
        slot_id: {
          type: String,
          required: true,
        },
        start_time: {
          type: Date,
          required: true,
        },
        end_time: {
          type: Date,
          required: true,
        },
        timezone: {
          type: String,
          default: 'Asia/Kolkata',
        },
        is_available: {
          type: Boolean,
          default: true,
        },
      },
    ],
    
    // ==================== SELECTED TIME SLOT ====================
    
    selected_slot: {
      slot_id: {
        type: String,
        default: null,
      },
      start_time: {
        type: Date,
        default: null,
      },
      end_time: {
        type: Date,
        default: null,
      },
      timezone: {
        type: String,
        default: 'Asia/Kolkata',
      },
    },
    
    // ==================== APPOINTMENT CONFIGURATION ====================
    
    appointment_duration: {
      type: Number,
      default: 15, // minutes (General Medicine default)
      enum: [15, 20, 30, 45, 60],
      description: 'Appointment duration in minutes',
    },
    
    appointment_title: {
      type: String,
      default: function() {
        return `${this.department} Consultation`;
      },
    },
    
    appointment_notes: {
      type: String,
      default: null,
      description: 'Additional notes about appointment (internal)',
    },
    
    // ==================== CALENDAR & TELEMEDICINE INTEGRATION ====================
    
    calendar_event_id: {
      type: String,
      default: null,
      index: true,
      description: 'Google Calendar event ID (for doctor schedule sync)',
    },
    
    is_telemedicine: {
      type: Boolean,
      default: false,
      description: 'Whether this is a virtual consultation',
    },
    
    telemedicine_link: {
      type: String,
      default: null,
      description: 'Google Meet / Zoom link for virtual appointments',
    },
    
    // ==================== CHECK-IN & TOKEN SYSTEM ====================
    
    token_number: {
      type: String,
      default: null,
      description: 'Queue token number (e.g., A001, B045)',
    },
    
    qr_code: {
      type: String,
      default: null,
      description: 'QR code data for patient check-in',
    },
    
    patient_checked_in: {
      type: Boolean,
      default: false,
    },
    
    checked_in_at: {
      type: Date,
      default: null,
    },
    
    checked_in_by: {
      type: String,
      default: null,
      enum: ['patient', 'receptionist', 'self_service_kiosk', null],
    },
    
    // ==================== APPOINTMENT STATUS ====================
    
    status: {
      type: String,
      enum: [
        'slots_generated',    // Time slots created, waiting for selection
        'scheduled',          // Patient selected a slot, appointment booked
        'confirmed',          // Patient confirmed via SMS/email
        'reminder_sent',      // Reminders sent (3-day/1-day/2-hour)
        'checked_in',         // Patient checked in at clinic
        'in_progress',        // Doctor consultation in progress
        'completed',          // Consultation completed
        'no_show',            // Patient didn't show up (15+ min late)
        'cancelled',          // Appointment cancelled
        'rescheduled',        // Appointment rescheduled to new time
        'expired',            // Time slots expired without booking
      ],
      default: 'slots_generated',
      index: true,
    },
    
    // ==================== CONFIRMATION REMINDER TRACKING ====================
    
    confirmation_reminders: {
      sent_count: {
        type: Number,
        default: 0,
      },
      last_sent_at: {
        type: Date,
        default: null,
      },
      max_reminders: {
        type: Number,
        default: 3, // Industry standard: 3 strikes rule
      },
      reminder_timestamps: [
        {
          sent_at: Date,
          reminder_number: Number,
          channel: {
            type: String,
            enum: ['sms', 'whatsapp', 'email'],
          },
          status: {
            type: String,
            enum: ['sent', 'failed'],
          },
        },
      ],
    },
    
    // ==================== 3-DAY REMINDER ====================
    
    '3_day_reminder': {
      sent: {
        type: Boolean,
        default: false,
      },
      sent_at: {
        type: Date,
        default: null,
      },
      email_sent: {
        type: Boolean,
        default: false,
      },
      sms_sent: {
        type: Boolean,
        default: false,
      },
    },
    
    // ==================== 1-DAY REMINDER ====================
    
    '1_day_reminder': {
      sent: {
        type: Boolean,
        default: false,
      },
      sent_at: {
        type: Date,
        default: null,
      },
      email_sent: {
        type: Boolean,
        default: false,
      },
      sms_sent: {
        type: Boolean,
        default: false,
      },
    },
    
    // ==================== 2-HOUR REMINDER ====================
    
    '2_hour_reminder': {
      sent: {
        type: Boolean,
        default: false,
      },
      sent_at: {
        type: Date,
        default: null,
      },
      email_sent: {
        type: Boolean,
        default: false,
      },
      sms_sent: {
        type: Boolean,
        default: false,
      },
    },
    
    // ==================== NO-SHOW FOLLOW-UP ====================
    
    no_show_reminder: {
      sent: {
        type: Boolean,
        default: false,
      },
      sent_at: {
        type: Date,
        default: null,
      },
      email_sent: {
        type: Boolean,
        default: false,
      },
      sms_sent: {
        type: Boolean,
        default: false,
      },
    },
    
    // ==================== CONSULTATION OUTCOME ====================
    
    consultation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      default: null,
      description: 'Link to detailed consultation record',
    },
    
    diagnosis: {
      type: String,
      trim: true,
      default: null,
      description: 'Doctor\'s diagnosis (brief)',
    },
    
    prescription_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription',
      default: null,
    },
    
    lab_tests_ordered: {
      type: [String],
      default: [],
      description: 'Lab tests ordered by doctor',
    },
    
    follow_up_required: {
      type: Boolean,
      default: false,
    },
    
    follow_up_date: {
      type: Date,
      default: null,
    },
    
    follow_up_appointment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
      description: 'Link to next follow-up appointment',
    },
    
    // ==================== PAYMENT TRACKING ====================
    
    consultation_fee: {
      type: Number,
      default: 0,
      description: 'Doctor consultation fee in INR',
    },
    
    payment_status: {
      type: String,
      enum: ['pending', 'paid', 'partial', 'waived', 'insurance'],
      default: 'pending',
    },
    
    payment_method: {
      type: String,
      enum: ['cash', 'card', 'upi', 'insurance', 'online', null],
      default: null,
    },
    
    payment_date: {
      type: Date,
      default: null,
    },
    
    // ==================== TIMESTAMPS ====================
    
    slots_generated_at: {
      type: Date,
      default: Date.now,
    },
    
    booked_at: {
      type: Date,
      default: null,
    },
    
    confirmed_at: {
      type: Date,
      default: null,
    },
    
    scheduled_start_time: {
      type: Date,
      default: null,
      index: true, // For efficient querying of upcoming appointments
    },
    
    scheduled_end_time: {
      type: Date,
      default: null,
    },
    
    actual_start_time: {
      type: Date,
      default: null,
      description: 'Actual time consultation started',
    },
    
    actual_end_time: {
      type: Date,
      default: null,
      description: 'Actual time consultation ended',
    },
    
    completed_at: {
      type: Date,
      default: null,
    },
    
    cancelled_at: {
      type: Date,
      default: null,
    },
    
    rescheduled_at: {
      type: Date,
      default: null,
    },
    
    // ==================== METADATA ====================
    
    cancellation_reason: {
      type: String,
      default: null,
      enum: ['patient_request', 'doctor_unavailable', 'emergency', 'no_show', 'duplicate', 'other', null],
    },
    
    reschedule_reason: {
      type: String,
      default: null,
    },
    
    previous_appointment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
      description: 'If rescheduled, link to original appointment',
    },
    
    notes: {
      type: String,
      default: null,
      description: 'Internal notes (receptionist/admin)',
    },
    
    created_by: {
      type: String,
      default: 'system', // 'system', 'receptionist', 'doctor', 'patient'
      enum: ['system', 'receptionist', 'doctor', 'patient'],
    },
    
    source: {
      type: String,
      default: 'chatbot',
      enum: ['chatbot', 'walk-in', 'phone', 'online', 'referral', 'emergency'],
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);


// ==================== INDEXES FOR PERFORMANCE ====================


appointmentSchema.index({ patient_id: 1, status: 1 });
appointmentSchema.index({ doctor_id: 1, scheduled_start_time: 1 });
appointmentSchema.index({ scheduled_start_time: 1, status: 1 });
appointmentSchema.index({ department: 1, scheduled_start_time: 1 });
appointmentSchema.index({ 'confirmation_reminders.sent_count': 1, status: 1 });
appointmentSchema.index({ appointment_type: 1 });
appointmentSchema.index({ payment_status: 1 });
appointmentSchema.index({ token_number: 1 });
appointmentSchema.index({ qr_code: 1 }, { sparse: true });


// ==================== VIRTUAL FIELDS ====================


appointmentSchema.virtual('duration_display').get(function () {
  return `${this.appointment_duration} min`;
});


appointmentSchema.virtual('status_display').get(function () {
  const statusEmojis = {
    slots_generated: '📅',
    scheduled: '✅',
    confirmed: '✔️',
    reminder_sent: '🔔',
    checked_in: '👤',
    in_progress: '⏳',
    completed: '✅',
    no_show: '🚫',
    cancelled: '❌',
    rescheduled: '🔄',
    expired: '⏰'
  };
  return `${statusEmojis[this.status] || ''} ${this.status.replace(/_/g, ' ').toUpperCase()}`;
});


// ==================== INSTANCE METHODS ====================


/**
 * Mark appointment as scheduled
 */
appointmentSchema.methods.markAsScheduled = function (slotId, calendarEventId = null, telemedicineLink = null) {
  try {
    const selectedSlot = this.time_slots.find((slot) => slot.slot_id === slotId);
    
    if (!selectedSlot) {
      throw new Error('Selected slot not found');
    }


    this.selected_slot = {
      slot_id: selectedSlot.slot_id,
      start_time: selectedSlot.start_time,
      end_time: selectedSlot.end_time,
      timezone: selectedSlot.timezone,
    };


    this.status = 'scheduled';
    this.scheduled_start_time = selectedSlot.start_time;
    this.scheduled_end_time = selectedSlot.end_time;
    this.booked_at = new Date();
    
    if (calendarEventId) {
      this.calendar_event_id = calendarEventId;
    }
    
    if (telemedicineLink) {
      this.is_telemedicine = true;
      this.telemedicine_link = telemedicineLink;
    }


    return this.save();
  } catch (error) {
    throw error;
  }
};


/**
 * Mark appointment as confirmed (patient replied to confirmation request)
 */
appointmentSchema.methods.markAsConfirmed = function () {
  try {
    this.status = 'confirmed';
    this.confirmed_at = new Date();
    return this.save();
  } catch (error) {
    throw error;
  }
};


/**
 * Add confirmation reminder record
 */
appointmentSchema.methods.addConfirmationReminder = function (channel, status) {
  try {
    this.confirmation_reminders.sent_count += 1;
    this.confirmation_reminders.last_sent_at = new Date();
    this.confirmation_reminders.reminder_timestamps.push({
      sent_at: new Date(),
      reminder_number: this.confirmation_reminders.sent_count,
      channel,
      status,
    });


    return this.save();
  } catch (error) {
    throw error;
  }
};


/**
 * Mark 3-day reminder as sent
 */
appointmentSchema.methods.mark3DayReminderSent = function (emailSent = false, smsSent = false) {
  try {
    this['3_day_reminder'].sent = true;
    this['3_day_reminder'].sent_at = new Date();
    this['3_day_reminder'].email_sent = emailSent;
    this['3_day_reminder'].sms_sent = smsSent;


    return this.save();
  } catch (error) {
    throw error;
  }
};


/**
 * Mark 1-day reminder as sent
 */
appointmentSchema.methods.mark1DayReminderSent = function (emailSent = false, smsSent = false) {
  try {
    this['1_day_reminder'].sent = true;
    this['1_day_reminder'].sent_at = new Date();
    this['1_day_reminder'].email_sent = emailSent;
    this['1_day_reminder'].sms_sent = smsSent;


    return this.save();
  } catch (error) {
    throw error;
  }
};


/**
 * Mark 2-hour reminder as sent
 */
appointmentSchema.methods.mark2HourReminderSent = function (emailSent = false, smsSent = false) {
  try {
    this['2_hour_reminder'].sent = true;
    this['2_hour_reminder'].sent_at = new Date();
    this['2_hour_reminder'].email_sent = emailSent;
    this['2_hour_reminder'].sms_sent = smsSent;
    this.status = 'reminder_sent';


    return this.save();
  } catch (error) {
    throw error;
  }
};


/**
 * Mark patient as checked in
 */
appointmentSchema.methods.checkInPatient = function (checkedInBy = 'receptionist') {
  try {
    this.patient_checked_in = true;
    this.checked_in_at = new Date();
    this.checked_in_by = checkedInBy;
    this.status = 'checked_in';


    return this.save();
  } catch (error) {
    throw error;
  }
};


/**
 * Start consultation
 */
appointmentSchema.methods.startConsultation = function () {
  try {
    this.status = 'in_progress';
    this.actual_start_time = new Date();


    return this.save();
  } catch (error) {
    throw error;
  }
};


/**
 * Mark appointment as completed
 */
appointmentSchema.methods.markAsCompleted = function (consultationId = null, prescriptionId = null) {
  try {
    this.status = 'completed';
    this.actual_end_time = new Date();
    this.completed_at = new Date();
    
    if (consultationId) {
      this.consultation_id = consultationId;
    }
    
    if (prescriptionId) {
      this.prescription_id = prescriptionId;
    }


    return this.save();
  } catch (error) {
    throw error;
  }
};


/**
 * Mark appointment as no-show
 */
appointmentSchema.methods.markAsNoShow = function () {
  try {
    this.status = 'no_show';


    return this.save();
  } catch (error) {
    throw error;
  }
};


/**
 * Mark no-show reminder as sent
 */
appointmentSchema.methods.markNoShowReminderSent = function (emailSent = false, smsSent = false) {
  try {
    this.no_show_reminder.sent = true;
    this.no_show_reminder.sent_at = new Date();
    this.no_show_reminder.email_sent = emailSent;
    this.no_show_reminder.sms_sent = smsSent;


    return this.save();
  } catch (error) {
    throw error;
  }
};


/**
 * Cancel appointment
 */
appointmentSchema.methods.cancelAppointment = function (reason = 'patient_request') {
  try {
    this.status = 'cancelled';
    this.cancelled_at = new Date();
    this.cancellation_reason = reason;


    return this.save();
  } catch (error) {
    throw error;
  }
};


/**
 * Reschedule appointment
 */
appointmentSchema.methods.rescheduleAppointment = function (newAppointmentId, reason = null) {
  try {
    this.status = 'rescheduled';
    this.rescheduled_at = new Date();
    this.reschedule_reason = reason;
    // Store reference to new appointment (will be set from new appointment as previous_appointment_id)


    return this.save();
  } catch (error) {
    throw error;
  }
};


/**
 * Generate QR code data
 */
appointmentSchema.methods.generateQRCode = function () {
  try {
    // QR code contains: AppointmentID|PatientID|DoctorID|DateTime
    const qrData = `${this._id}|${this.patient_id}|${this.doctor_id}|${this.scheduled_start_time.toISOString()}`;
    this.qr_code = qrData;
    return this.save();
  } catch (error) {
    throw error;
  }
};


/**
 * Assign token number
 */
appointmentSchema.methods.assignTokenNumber = function (departmentCode) {
  try {
    // Format: DeptCode + Sequential Number (e.g., GM001, CD045)
    const timestamp = Date.now().toString().slice(-3); // Last 3 digits
    this.token_number = `${departmentCode}${timestamp}`;
    return this.save();
  } catch (error) {
    throw error;
  }
};


/**
 * Check if appointment needs confirmation reminder
 */
appointmentSchema.methods.needsConfirmationReminder = function () {
  return (
    this.status === 'slots_generated' &&
    this.confirmation_reminders.sent_count < this.confirmation_reminders.max_reminders
  );
};


/**
 * Check if all confirmation reminders exhausted
 */
appointmentSchema.methods.hasExhaustedConfirmationReminders = function () {
  return (
    this.status === 'slots_generated' &&
    this.confirmation_reminders.sent_count >= this.confirmation_reminders.max_reminders
  );
};


/**
 * Calculate actual wait time (check-in to actual start)
 */
appointmentSchema.methods.getWaitTime = function () {
  if (this.checked_in_at && this.actual_start_time) {
    const waitTimeMs = this.actual_start_time - this.checked_in_at;
    return Math.floor(waitTimeMs / (1000 * 60)); // minutes
  }
  return null;
};


/**
 * Calculate consultation duration
 */
appointmentSchema.methods.getConsultationDuration = function () {
  if (this.actual_start_time && this.actual_end_time) {
    const durationMs = this.actual_end_time - this.actual_start_time;
    return Math.floor(durationMs / (1000 * 60)); // minutes
  }
  return null;
};


// ==================== PRE-SAVE MIDDLEWARE ====================


/**
 * Auto-expire slots if not booked within 24 hours
 * Set appointment duration based on department
 * Generate QR code on schedule
 */
appointmentSchema.pre('save', function (next) {
  try {
    // Auto-expire slots after 24 hours
    if (this.status === 'slots_generated') {
      const now = new Date();
      const expiryTime = new Date(this.slots_generated_at);
      expiryTime.setHours(expiryTime.getHours() + 24); // 24-hour expiry


      if (now > expiryTime) {
        this.status = 'expired';
      }
    }
    
    // Set department-specific durations
    if (this.isNew || this.isModified('department')) {
      const durationMap = {
        'General Medicine': 15,
        'Pediatrics': 20,
        'Cardiology': 30,
        'Orthopedics': 30,
        'Dermatology': 20,
        'Gynecology': 30,
        'ENT': 20,
        'Ophthalmology': 20,
        'Dentistry': 30,
        'Psychiatry': 45,
        'Neurology': 30,
        'Emergency': 15,
      };
      
      this.appointment_duration = durationMap[this.department] || 15;
    }
    
    // Generate QR code when appointment is scheduled
    if (this.isModified('status') && this.status === 'scheduled' && !this.qr_code) {
      const qrData = `${this._id}|${this.patient_id}|${this.doctor_id}|${this.scheduled_start_time.toISOString()}`;
      this.qr_code = qrData;
    }


    next();
  } catch (error) {
    next(error);
  }
});


const Appointment = mongoose.model('Appointment', appointmentSchema);


export default Appointment;
