/**
 * Risk Calculator Utility for MediFlow
 * Calculates patient medical risk level and appointment urgency
 * Based on symptoms, vitals, age, medical history, and WHO/ATS triage standards
 * 
 * Risk Levels:
 * - Emergency (80-100): Immediate medical attention required
 * - Medium (50-79): Schedule within 1-3 days
 * - Low (0-49): Routine appointment acceptable
 * 
 * Urgency Levels:
 * - Critical: Life-threatening, call 102/108 immediately
 * - High: Urgent appointment needed (same day or next day)
 * - Medium: Schedule within 2-3 days
 * - Low: Routine scheduling (within 1-2 weeks)
 */

import logger from './logger.js';

/**
 * Calculate medical risk level and urgency based on patient data
 * @param {Object} patientData - Patient information (symptoms, vitals, age, etc.)
 * @param {number} riskScore - Risk score (0-100) from triage service
 * @returns {Object} - { urgency: string, reasoning: string, priority: number, appointmentWindow: string }
 */
function calculateRiskUrgency(patientData, riskScore) {
  try {
    let urgency = 'Low';
    let reasoning = '';
    let priority = 1; // 1-4 scale for sorting (4 = Critical, 1 = Low)
    let appointmentWindow = 'Within 1-2 weeks';

    const score = riskScore || 0;
    const painScale = patientData.pain_scale || 0;
    const age = patientData.age || 0;
    const hasChronicConditions = patientData.chronic_conditions && patientData.chronic_conditions.length > 0;

    // CRITICAL URGENCY (Priority 4) - EMERGENCY
    if (score >= 90) {
      urgency = 'Critical';
      reasoning = 'Severe symptoms detected (score ≥90) - IMMEDIATE emergency care required. Call 102/108 or visit ER.';
      priority = 4;
      appointmentWindow = 'IMMEDIATE - Emergency Services';
    }
    else if (score >= 80 || painScale >= 9) {
      urgency = 'Critical';
      reasoning = 'High-risk symptoms or severe pain (score ≥80 or pain 9-10/10) - Emergency evaluation needed NOW.';
      priority = 4;
      appointmentWindow = 'IMMEDIATE - Emergency Services';
    }

    // HIGH URGENCY (Priority 3) - SAME DAY / NEXT DAY
    else if (score >= 70 && painScale >= 7) {
      urgency = 'High';
      reasoning = 'High-risk score with significant pain - Urgent appointment needed today.';
      priority = 3;
      appointmentWindow = 'Same day or within 24 hours';
    }
    else if (score >= 65 && age >= 65) {
      urgency = 'High';
      reasoning = 'High-risk elderly patient (age ≥65) - Urgent evaluation needed.';
      priority = 3;
      appointmentWindow = 'Same day or within 24 hours';
    }
    else if (score >= 65 && hasChronicConditions) {
      urgency = 'High';
      reasoning = 'High-risk score with chronic conditions - Priority appointment needed.';
      priority = 3;
      appointmentWindow = 'Within 24-48 hours';
    }
    else if (score >= 60) {
      urgency = 'High';
      reasoning = 'Moderate-high risk symptoms - Schedule urgent appointment.';
      priority = 3;
      appointmentWindow = 'Within 24-48 hours';
    }

    // MEDIUM URGENCY (Priority 2) - WITHIN 2-3 DAYS
    else if (score >= 50 && painScale >= 5) {
      urgency = 'Medium';
      reasoning = 'Medium risk with moderate pain (5-7/10) - Schedule within 2-3 days.';
      priority = 2;
      appointmentWindow = 'Within 2-3 days';
    }
    else if (score >= 50 && age < 3) {
      urgency = 'Medium';
      reasoning = 'Medium risk in young child (age <3) - Pediatric evaluation needed soon.';
      priority = 2;
      appointmentWindow = 'Within 2-3 days';
    }
    else if (score >= 50) {
      urgency = 'Medium';
      reasoning = 'Medium risk symptoms - Schedule appointment this week.';
      priority = 2;
      appointmentWindow = 'Within 3-5 days';
    }
    else if (score >= 40 && hasChronicConditions) {
      urgency = 'Medium';
      reasoning = 'Moderate risk with chronic conditions - Schedule follow-up soon.';
      priority = 2;
      appointmentWindow = 'Within 5-7 days';
    }

    // LOW URGENCY (Priority 1) - ROUTINE
    else {
      urgency = 'Low';
      reasoning = 'Low-risk symptoms - Routine appointment acceptable.';
      priority = 1;
      appointmentWindow = 'Within 1-2 weeks';
    }

    logger.info(`🏥 Risk urgency calculated: ${urgency} (Priority ${priority}) | Risk Score: ${score} | Pain: ${painScale}/10`);

    return {
      urgency,
      reasoning,
      priority,
      appointmentWindow,
      riskScore: score,
      painScale,
      age,
      hasChronicConditions
    };

  } catch (error) {
    logger.error('❌ Error calculating risk urgency:', error.message);
    return {
      urgency: 'Medium',
      reasoning: 'Error in calculation - defaulting to Medium urgency for safety',
      priority: 2,
      appointmentWindow: 'Within 2-3 days',
      riskScore: riskScore || 0
    };
  }
}

/**
 * Get appointment reminder frequency based on risk/urgency
 * Returns email and SMS reminder schedule
 * 
 * @param {string} urgency - Urgency level (Critical/High/Medium/Low)
 * @returns {Object} - Reminder frequency rules
 */
function getReminderFrequency(urgency) {
  const frequencies = {
    Critical: {
      reminders: [
        { type: 'immediate', timing: 'Immediate SMS/Call', channel: 'SMS + Phone Call' },
        { type: 'emergency', timing: 'No reminders - Emergency case', channel: 'N/A' }
      ],
      strategy: 'Emergency protocol - Direct emergency services referral, no appointment reminders',
      appointmentReminders: false,
      emergencyProtocol: true
    },
    
    High: {
      reminders: [
        { type: 'confirmation', timing: 'Immediately after booking', channel: 'SMS + Email' },
        { type: '2_hour', timing: '2 hours before appointment', channel: 'SMS' },
        { type: 'same_day_morning', timing: 'Morning of appointment (if afternoon slot)', channel: 'SMS' }
      ],
      strategy: 'Urgent appointment - Multiple reminders to ensure patient attendance',
      appointmentReminders: true,
      emergencyProtocol: false,
      missedAppointmentFollowUp: 'Same day call + SMS'
    },
    
    Medium: {
      reminders: [
        { type: 'confirmation', timing: 'Immediately after booking', channel: 'Email + SMS' },
        { type: '1_day', timing: '1 day before appointment', channel: 'SMS + Email' },
        { type: '2_hour', timing: '2 hours before appointment', channel: 'SMS' }
      ],
      strategy: 'Standard reminder protocol - Ensure patient doesn\'t forget',
      appointmentReminders: true,
      emergencyProtocol: false,
      missedAppointmentFollowUp: 'Next day SMS + Email'
    },
    
    Low: {
      reminders: [
        { type: 'confirmation', timing: 'Immediately after booking', channel: 'Email' },
        { type: '3_day', timing: '3 days before appointment', channel: 'Email' },
        { type: '1_day', timing: '1 day before appointment', channel: 'SMS' }
      ],
      strategy: 'Standard reminder protocol for routine appointments',
      appointmentReminders: true,
      emergencyProtocol: false,
      missedAppointmentFollowUp: 'Within 3 days via email'
    }
  };

  const frequency = frequencies[urgency] || frequencies.Low;

  logger.info(`📞 Reminder frequency for ${urgency}: ${frequency.reminders.length} reminders`);

  return {
    urgency,
    ...frequency,
    lastUpdated: new Date()
  };
}

/**
 * Calculate follow-up appointment schedule based on risk level
 * @param {string} riskClassification - Risk classification (Emergency/Medium/Low)
 * @param {string} diagnosis - Optional diagnosis for specific follow-up rules
 * @returns {Object} - Follow-up schedule
 */
function calculateFollowUpSchedule(riskClassification, diagnosis = null) {
  try {
    let followUpRequired = true;
    let followUpTiming = '';
    let followUpReason = '';

    switch (riskClassification) {
      case 'Emergency':
        followUpRequired = true;
        followUpTiming = 'Within 24-48 hours after ER visit';
        followUpReason = 'Post-emergency follow-up to ensure recovery and monitor condition';
        break;

      case 'Medium':
        followUpRequired = true;
        followUpTiming = 'Within 1-2 weeks';
        followUpReason = 'Follow-up to assess treatment effectiveness and symptom improvement';
        break;

      case 'Low':
        followUpRequired = false;
        followUpTiming = 'Only if symptoms persist or worsen';
        followUpReason = 'Routine conditions typically don\'t require scheduled follow-up';
        break;

      default:
        followUpRequired = false;
        followUpTiming = 'As needed';
        followUpReason = 'Follow-up based on patient symptoms';
    }

    // Diagnosis-specific follow-up rules
    if (diagnosis) {
      const diagnosisLower = diagnosis.toLowerCase();
      
      if (diagnosisLower.includes('diabetes') || diagnosisLower.includes('hypertension')) {
        followUpRequired = true;
        followUpTiming = 'Every 3 months';
        followUpReason = 'Chronic condition monitoring';
      }
      else if (diagnosisLower.includes('infection')) {
        followUpRequired = true;
        followUpTiming = 'Within 3-5 days';
        followUpReason = 'Monitor infection resolution';
      }
    }

    logger.info(`📅 Follow-up schedule calculated: ${followUpRequired ? followUpTiming : 'Not required'}`);

    return {
      followUpRequired,
      followUpTiming,
      followUpReason,
      riskClassification
    };

  } catch (error) {
    logger.error('❌ Error calculating follow-up schedule:', error.message);
    return {
      followUpRequired: true,
      followUpTiming: 'Within 1-2 weeks',
      followUpReason: 'Standard follow-up',
      riskClassification
    };
  }
}

/**
 * Determine if patient should receive reminder now
 * @param {Object} appointment - Appointment document with scheduled time
 * @param {Date} lastReminderSent - Last reminder timestamp
 * @param {string} reminderType - Type of reminder (3_day, 1_day, 2_hour)
 * @returns {Object} - { shouldSend: boolean, reason: string }
 */
function shouldSendReminderNow(appointment, lastReminderSent = null, reminderType = '1_day') {
  try {
    const now = new Date();
    const appointmentTime = new Date(appointment.scheduled_start_time);
    const hoursUntilAppointment = (appointmentTime - now) / (1000 * 60 * 60);

    let shouldSend = false;
    let reason = '';

    // Define reminder windows
    const reminderWindows = {
      '3_day': { minHours: 72, maxHours: 84, label: '3 days before' },
      '1_day': { minHours: 24, maxHours: 30, label: '1 day before' },
      '2_hour': { minHours: 2, maxHours: 3, label: '2 hours before' }
    };

    const window = reminderWindows[reminderType];

    if (!window) {
      return { shouldSend: false, reason: 'Invalid reminder type' };
    }

    // Check if we're in the reminder window
    if (hoursUntilAppointment >= window.minHours && hoursUntilAppointment <= window.maxHours) {
      // Check if reminder hasn't been sent yet for this type
      if (!lastReminderSent) {
        shouldSend = true;
        reason = `${window.label} reminder due`;
      } else {
        reason = `${window.label} reminder already sent`;
      }
    } else if (hoursUntilAppointment < window.minHours) {
      reason = `Too late for ${window.label} reminder (appointment in ${Math.round(hoursUntilAppointment)}h)`;
    } else {
      reason = `Too early for ${window.label} reminder (appointment in ${Math.round(hoursUntilAppointment)}h)`;
    }

    return {
      shouldSend,
      reason,
      hoursUntilAppointment: Math.round(hoursUntilAppointment * 10) / 10
    };

  } catch (error) {
    logger.error('❌ Error checking reminder timing:', error.message);
    return {
      shouldSend: false,
      reason: 'Error checking timing',
      hoursUntilAppointment: null
    };
  }
}

/**
 * Get risk statistics for dashboard/reporting
 * @param {Array} patients - Array of patient documents
 * @returns {Object} - Statistics by risk level
 */
function getRiskStats(patients) {
  try {
    const stats = {
      Emergency: { count: 0, percentage: 0 },
      Medium: { count: 0, percentage: 0 },
      Low: { count: 0, percentage: 0 },
      Unclassified: { count: 0, percentage: 0 },
      total: patients.length
    };

    patients.forEach(patient => {
      const risk = patient.risk_classification || 'Unclassified';
      if (stats[risk]) {
        stats[risk].count++;
      }
    });

    // Calculate percentages
    Object.keys(stats).forEach(key => {
      if (key !== 'total' && stats.total > 0) {
        stats[key].percentage = Math.round((stats[key].count / stats.total) * 100);
      }
    });

    logger.info('📊 Risk statistics calculated:', stats);

    return stats;

  } catch (error) {
    logger.error('❌ Error calculating risk stats:', error.message);
    return null;
  }
}

/**
 * Recalculate risk for a patient (used when symptoms or vitals change)
 * @param {Object} patient - Patient document
 * @param {number} newRiskScore - New risk score from triage
 * @returns {Object} - Updated risk/urgency data
 */
function recalculatePatientRisk(patient, newRiskScore) {
  try {
    const riskUrgency = calculateRiskUrgency(patient, newRiskScore);

    logger.info(`🔄 Recalculated risk for ${patient.name}: ${riskUrgency.urgency} (Score: ${newRiskScore})`);

    return riskUrgency;

  } catch (error) {
    logger.error('❌ Error recalculating patient risk:', error.message);
    return {
      urgency: 'Medium',
      reasoning: 'Error in recalculation - defaulting to Medium',
      priority: 2,
      appointmentWindow: 'Within 2-3 days'
    };
  }
}

/**
 * Check if patient needs emergency escalation
 * @param {number} riskScore - Patient risk score
 * @param {number} painScale - Pain scale (0-10)
 * @param {Array} redFlags - Detected red flag symptoms
 * @returns {Object} - Emergency escalation decision
 */
function checkEmergencyEscalation(riskScore, painScale, redFlags = []) {
  try {
    let requiresEscalation = false;
    let escalationReason = '';
    let escalationAction = '';

    // Check red flags
    if (redFlags.length > 0) {
      requiresEscalation = true;
      escalationReason = `RED FLAG SYMPTOMS: ${redFlags.join(', ')}`;
      escalationAction = 'IMMEDIATE: Call 102/108 or visit nearest ER';
    }
    // Check critical risk score
    else if (riskScore >= 80) {
      requiresEscalation = true;
      escalationReason = `Critical risk score: ${riskScore}/100`;
      escalationAction = 'URGENT: Emergency medical evaluation needed NOW';
    }
    // Check severe pain
    else if (painScale >= 9) {
      requiresEscalation = true;
      escalationReason = `Severe pain: ${painScale}/10`;
      escalationAction = 'URGENT: Emergency evaluation for severe pain';
    }

    if (requiresEscalation) {
      logger.warn(`🚨 EMERGENCY ESCALATION TRIGGERED: ${escalationReason}`);
    }

    return {
      requiresEscalation,
      escalationReason,
      escalationAction,
      emergencyNumber: '102 / 108',
      riskScore,
      painScale,
      redFlagsCount: redFlags.length
    };

  } catch (error) {
    logger.error('❌ Error checking emergency escalation:', error.message);
    return {
      requiresEscalation: false,
      escalationReason: 'Error in escalation check',
      escalationAction: 'Contact clinic for assistance'
    };
  }
}

export default {
  calculateRiskUrgency,
  getReminderFrequency,
  calculateFollowUpSchedule,
  shouldSendReminderNow,
  getRiskStats,
  recalculatePatientRisk,
  checkEmergencyEscalation
};
