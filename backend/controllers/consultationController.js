/**
 * Consultation Controller for MediFlow
 * Handles Socket.io events for real-time medical triage chatbot with:
 * - Patient symptom collection and validation
 * - Medical triage and risk assessment
 * - Emergency detection and escalation
 * - Doctor assignment based on symptoms/department
 * - Appointment scheduling
 * - Returning patient detection
 * - Enhanced error handling and HIPAA compliance
 */

import logger from '../utils/logger.js';
import Consultation from '../models/Consultation.js';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import geminiService from '../services/geminiService.js';
import triageService from '../services/triageService.js';
import emailService from '../services/emailService.js';
import smsService from '../services/smsService.js';
import doctorAssignmentService from '../services/doctorAssignmentService.js';
import riskCalculator from '../utils/riskCalculator.js';
import { v4 as uuidv4 } from 'uuid';

// Store active sessions in memory (session_id -> session data)
const activeSessions = new Map();

/**
 * Handle new socket connection
 */
const handleConnection = (socket) => {
  try {
    logger.info(`New client connected: ${socket.id}`);

    socket.emit('connected', {
      message: 'Connected to MediFlow Medical Chatbot',
      socketId: socket.id,
    });
  } catch (error) {
    logger.error('Error handling connection:', error.message);
  }
};

/**
 * Handle chat start event
 */
const handleChatStart = async (socket, data) => {
  try {
    logger.info('Consultation session starting');
    logger.debug('Start data received:', JSON.stringify(data, null, 2));

    const sessionId = uuidv4();

    const consultation = new Consultation({
      session_id: sessionId,
      socket_id: socket.id,
      status: 'active',
      consultation_type: 'pre_appointment_chat',
      patient_id: null,
      source: 'chatbot',
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
      metadata: {
        source: 'chatbot',
        start_time: new Date(),
        patient_journey: data.behaviorData || {
          sessionId: null,
          pagesVisited: 0,
          departmentsViewed: [],
          topDepartments: [],
          totalTimeSpent: 0,
          journeyScore: 0,
          engagementLevel: 'none',
        },
      },
    });

    await consultation.save();
    logger.success(`Consultation created: ${sessionId}`);

    // Store in active sessions with tracking data
    activeSessions.set(sessionId, {
      lastMessageTime: Date.now(),
      emailSent: false,
      smsSent: false,
      patientProcessed: false,
      appointmentScheduled: false,
      emergencyDetected: false,
    });

    // Send initial bot message
    const welcomeMessage = `Hello! 👋 I'm MediBot, your MediFlow Clinic assistant. I'm here to help you schedule an appointment with the right doctor.

⚠️ **IMPORTANT:** If you're experiencing a medical emergency, please call 102/108 or visit the nearest emergency room immediately.

How can I assist you today?`;

    await consultation.addMessage('assistant', welcomeMessage);

    socket.emit('chatStarted', {
      sessionId,
      message: welcomeMessage,
    });

    logger.success('Consultation session started successfully');
  } catch (error) {
    logger.error('Error starting consultation:', error.message);
    logger.error('Error stack:', error.stack);
    socket.emit('error', {
      message: 'Failed to start consultation session',
      error: error.message,
    });
  }
};

/**
 * Handle user message
 */
const handleUserMessage = async (socket, data) => {
  try {
    const { sessionId, message } = data;

    logger.info(`Message received from session ${sessionId}`);
    logger.debug('User message:', message);

    // Validate input
    if (!sessionId || !message || message.trim().length === 0) {
      socket.emit('error', { message: 'Invalid message data' });
      return;
    }

    // Find consultation
    const consultation = await Consultation.findOne({ session_id: sessionId });
    if (!consultation) {
      logger.error('Consultation not found:', sessionId);
      socket.emit('error', { message: 'Session not found' });
      return;
    }

    // Get session data
    const sessionData = activeSessions.get(sessionId);
    if (!sessionData) {
      logger.error('Session data not found:', sessionId);
      socket.emit('error', { message: 'Session expired' });
      return;
    }

    // Calculate response time
    const lastMessageTime = sessionData.lastMessageTime || Date.now();
    const responseTime = Math.round((Date.now() - lastMessageTime) / 1000);

    // Add user message to consultation
    await consultation.addMessage('user', message, { response_time: responseTime });

    // Update last message timestamp
    sessionData.lastMessageTime = Date.now();

    // Get conversation history for Gemini
    const conversationHistory = consultation.getFormattedHistory();

    // Get bot response from Gemini
    logger.ai('Getting response from Gemini Medical AI');
    const geminiResponse = await geminiService.getChatResponse(
      message,
      conversationHistory
    );

    if (!geminiResponse.success) {
      throw new Error('Failed to get response from Gemini');
    }

    // Add assistant message to consultation
    await consultation.addMessage('assistant', geminiResponse.response);

    // Check for emergency keywords
    if (geminiResponse.isEmergency && !sessionData.emergencyDetected) {
      logger.warn('🚨 EMERGENCY DETECTED IN CONVERSATION');
      sessionData.emergencyDetected = true;

      try {
        const partialPatientData = await extractPartialPatientData(consultation);
        await emailService.sendEmergencyAlert(
          partialPatientData,
          [message],
          ['Emergency keywords detected in chat']
        );
        await smsService.sendEmergencyAlertSms(partialPatientData);
        logger.success('✅ Emergency alerts sent');
      } catch (alertError) {
        logger.error('❌ Failed to send emergency alerts:', alertError.message);
      }
    }

    // Send response to client
    socket.emit('botMessage', {
      message: geminiResponse.response,
      isPatientComplete: geminiResponse.isPatientComplete,
      isEmergency: geminiResponse.isEmergency || false,
    });

    logger.success('Bot response sent');

    // If patient data collection is complete AND not processed yet
    if (geminiResponse.isPatientComplete && !sessionData.patientProcessed) {
      logger.info('Patient data collection complete, processing...');
      sessionData.patientProcessed = true;
      await processPatientCompletion(socket, consultation, sessionData);
    } else if (geminiResponse.isPatientComplete && sessionData.patientProcessed) {
      logger.info('Patient already processed, continuing conversation...');
    }
  } catch (error) {
    logger.error('Error handling user message:', error.message);
    logger.error('Error stack:', error.stack);
    socket.emit('error', {
      message: 'Sorry, something went wrong. Please try again.',
      error: error.message,
    });
  }
};

/**
 * Extract partial patient data for emergency alerts
 */
async function extractPartialPatientData(consultation) {
  try {
    const messages = consultation.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    const extractionResult = await geminiService.extractPatientData(messages);
    
    if (extractionResult.success) {
      return extractionResult.data;
    }

    return {
      name: 'Unknown Patient',
      phone: 'Not provided',
      email: 'Not provided',
    };
  } catch (error) {
    logger.error('Error extracting partial patient data:', error.message);
    return {
      name: 'Unknown Patient',
      phone: 'Not provided',
      email: 'Not provided',
    };
  }
}

/**
 * Process patient completion - MEDICAL VERSION
 */
const processPatientCompletion = async (socket, consultation, sessionData) => {
  try {
    logger.section('PATIENT PROCESSING - MEDICAL TRIAGE');

    if (
      sessionData.emailSent &&
      sessionData.smsSent &&
      sessionData.appointmentScheduled
    ) {
      logger.warn(
        'Email, SMS, and appointment already processed for this session, skipping...'
      );
      return;
    }

    // ===== STEP 1: EXTRACT PATIENT DATA =====
    logger.info('📋 Step 1: Extracting patient data from consultation');

    const extractionResult = await geminiService.extractPatientData(
      consultation.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))
    );

    if (!extractionResult.success || !extractionResult.data) {
      throw new Error('Failed to extract patient data');
    }

    const extractedData = extractionResult.data;
    logger.success('Patient data extracted');
    logger.object('Extracted Data', extractedData);

    // ===== STEP 2: VALIDATE PATIENT DATA =====
    logger.info('✅ Step 2: Validating patient data');

    if (!extractedData.name || !extractedData.email) {
      logger.error('❌ Missing required fields: name or email');
      socket.emit('error', {
        message: 'We need your name and email to proceed. Please provide them.',
      });
      return;
    }

    // Normalize phone number
    if (extractedData.phone && !extractedData.phone.startsWith('+91')) {
      extractedData.phone = `+91${extractedData.phone.replace(/\D/g, '')}`;
    }

    logger.success('✅ Patient data validation passed');

    // ===== STEP 3: UPDATE CONSULTATION METRICS =====
    consultation.calculateAvgResponseTime();
    consultation.calculateDuration();
    await consultation.save();

    // ===== STEP 4: CHECK FOR EXISTING PATIENT =====
    logger.info('🔍 Step 4: Checking for returning patient');

    let patient = await Patient.findOne({ email: extractedData.email });
    let isReturningPatient = false;

    if (patient) {
      isReturningPatient = true;
      logger.success(`✅ RETURNING PATIENT DETECTED: ${patient.email}`);
      logger.info(`Previous consultations: ${patient.consultation_count}`);
    } else {
      logger.info('📝 New patient detected');
    }

    // ===== STEP 5: MEDICAL TRIAGE =====
    logger.info('🏥 Step 5: Performing medical triage');

    const triageResult = await triageService.triagePatient(
      extractedData,
      consultation.messages
    );

    logger.success(`Risk score: ${triageResult.risk_score}/100`);
    logger.success(`Risk classification: ${triageResult.risk_classification}`);
    logger.success(`Recommended department: ${triageResult.recommended_department}`);

    if (triageResult.red_flags_detected && triageResult.red_flags_detected.length > 0) {
      logger.warn(`🚨 RED FLAGS DETECTED: ${triageResult.red_flags_detected.join(', ')}`);
      sessionData.emergencyDetected = true;
    }

    // ===== STEP 6: CALCULATE URGENCY =====
    logger.info('⏰ Step 6: Calculating appointment urgency');

    const urgencyData = riskCalculator.calculateRiskUrgency(
      extractedData,
      triageResult.risk_score
    );

    logger.success(`Urgency: ${urgencyData.urgency} (Priority ${urgencyData.priority})`);
    logger.info(`Appointment window: ${urgencyData.appointmentWindow}`);

    // ===== STEP 7: CREATE OR UPDATE PATIENT =====
    if (isReturningPatient) {
      logger.info('♻️ Step 7: Updating returning patient');

      patient.name = extractedData.name || patient.name;
      patient.phone = extractedData.phone || patient.phone;
      patient.age = extractedData.age || patient.age;
      patient.gender = extractedData.gender || patient.gender;
      patient.blood_group = extractedData.blood_group || patient.blood_group;

      // Update medical history
      if (extractedData.chronic_conditions && extractedData.chronic_conditions.length > 0) {
        patient.chronic_conditions = [
          ...new Set([...patient.chronic_conditions, ...extractedData.chronic_conditions])
        ];
      }
      if (extractedData.allergies && extractedData.allergies.length > 0) {
        patient.allergies = [
          ...new Set([...patient.allergies, ...extractedData.allergies])
        ];
      }
      if (extractedData.current_medications && extractedData.current_medications.length > 0) {
        patient.current_medications = [
          ...new Set([...patient.current_medications, ...extractedData.current_medications])
        ];
      }

      // Update chief complaint and symptoms
      patient.chief_complaint = extractedData.chief_complaint;
      patient.symptoms = extractedData.symptoms || [];
      patient.symptom_duration = extractedData.symptom_duration;
      patient.pain_scale = extractedData.pain_scale || 0;

      // Update risk data
      patient.risk_score = triageResult.risk_score;
      patient.risk_classification = triageResult.risk_classification;
      patient.triage_reasoning = triageResult.reasoning;
      patient.urgency = urgencyData.urgency;
      patient.urgency_reasoning = urgencyData.reasoning;

      // Mark as returning patient
      await patient.markAsReturningPatient(consultation._id);

      logger.success(`✅ Returning patient updated: ${patient._id}`);

    } else {
      logger.info('✨ Step 7: Creating new patient');

      patient = new Patient({
        name: extractedData.name,
        email: extractedData.email,
        phone: extractedData.phone,
        age: extractedData.age,
        gender: extractedData.gender,
        blood_group: extractedData.blood_group,
        
        // Current symptoms
        chief_complaint: extractedData.chief_complaint,
        symptoms: extractedData.symptoms || [],
        symptom_duration: extractedData.symptom_duration,
        pain_scale: extractedData.pain_scale || 0,
        
        // Medical history
        chronic_conditions: extractedData.chronic_conditions || [],
        allergies: extractedData.allergies || [],
        current_medications: extractedData.current_medications || [],
        family_medical_history: extractedData.family_medical_history,
        is_pregnant: extractedData.is_pregnant || false,
        
        // Risk assessment
        risk_score: triageResult.risk_score,
        risk_classification: triageResult.risk_classification,
        triage_reasoning: triageResult.reasoning,
        urgency: urgencyData.urgency,
        urgency_reasoning: urgencyData.reasoning,
        
        // Metadata
        source: 'chatbot',
        ip_address: consultation.ip_address,
        user_agent: consultation.user_agent,
        consultation_id: consultation._id,
        first_visit_date: new Date(),
      });

      await patient.save();
      logger.success(`✅ New patient created: ${patient._id}`);
    }

    // ===== STEP 8: ASSIGN DOCTOR =====
    logger.info('👨‍⚕️ Step 8: Assigning doctor');

    const doctorAssignment = await doctorAssignmentService.assignPatientToDoctor(
      {
        ...extractedData,
        preferred_doctor_id: patient.preferred_doctor_id,
      },
      {
        department: triageResult.recommended_department,
        shift: 'morning',
        isEmergency: triageResult.requires_immediate_attention,
      }
    );

    if (!doctorAssignment.doctorId) {
      logger.error('❌ No doctor available');
      socket.emit('error', {
        message: 'No doctors currently available. Please contact the clinic directly.',
      });
      return;
    }

    logger.success(`✅ Doctor assigned: ${doctorAssignment.doctor.name}`);

    // ===== STEP 9: CREATE APPOINTMENT =====
    if (!sessionData.appointmentScheduled) {
      logger.info('📅 Step 9: Creating appointment');

      try {
        const appointmentDate = new Date();
        appointmentDate.setDate(appointmentDate.getDate() + 1);
        appointmentDate.setHours(10, 0, 0, 0);

        // ✅ FIXED: Changed appointment_type to 'In-Person' (valid enum)
        // ✅ FIXED: Using actual doctor ObjectId instead of 'doc1' string
        const appointment = new Appointment({
          patient_id: patient._id,
          doctor_id: doctorAssignment.doctorId, // ✅ FIXED: Real ObjectId
          department: doctorAssignment.department,
          appointment_type: 'In-Person', // ✅ FIXED: Valid enum value
          scheduled_start_time: appointmentDate,
          scheduled_end_time: new Date(appointmentDate.getTime() + 30 * 60000),
          status: 'scheduled',
          
          // Triage data
          chief_complaint: extractedData.chief_complaint,
          symptoms: extractedData.symptoms || [],
          pain_scale: extractedData.pain_scale || 0,
          symptom_duration: extractedData.symptom_duration,
          
          // Risk assessment
          risk_score: triageResult.risk_score,
          risk_classification: triageResult.risk_classification,
          urgency: urgencyData.urgency,
          
          // Notes
          notes: `Triage via chatbot. ${triageResult.reasoning}`,
          
          // Metadata
          source: 'chatbot',
          consultation_id: consultation._id,
        });

        await appointment.save();
        logger.success(`✅ Appointment created: ${appointment._id}`);

        // Update patient with appointment
        await patient.updateAppointmentStatus(
          appointment._id,
          'scheduled',
          appointment.scheduled_start_time
        );

        // Update consultation
        consultation.patient_id = patient._id;
        consultation.appointment_id = appointment._id;
        consultation.ai_triage = {
          risk_score: triageResult.risk_score,
          risk_classification: triageResult.risk_classification,
          reasoning: triageResult.reasoning,
          red_flags_detected: triageResult.red_flags_detected || [],
          triaged_at: new Date(),
        };
        await consultation.complete();

        sessionData.appointmentScheduled = true;

        // Increment doctor patient count
        await doctorAssignmentService.incrementDoctorPatientCount(doctorAssignment.doctorId);

        // ===== STEP 10: SEND EMAILS =====
        if (!sessionData.emailSent) {
          logger.info('📧 Step 10: Sending emails');

          const emailResults = await emailService.sendAllAppointmentEmails(
            appointment,
            patient,
            doctorAssignment.doctor
          );

          if (emailResults.patientConfirmation.success) {
            logger.success('✅ Patient email sent');
          } else {
            logger.error('❌ Patient email failed:', emailResults.patientConfirmation.error);
          }

          if (emailResults.doctorNotification.success) {
            logger.success('✅ Doctor email sent');
          } else {
            logger.error('❌ Doctor email failed:', emailResults.doctorNotification.error);
          }

          sessionData.emailSent = true;
        }

        // ===== STEP 11: SEND SMS =====
        if (!sessionData.smsSent && patient.phone) {
          logger.info('📱 Step 11: Sending SMS');

          try {
            const smsResult = await smsService.sendAllAppointmentSms(
              appointment,
              patient,
              doctorAssignment.doctor
            );

            if (smsResult.confirmationSms.success) {
              logger.success('✅ SMS sent successfully');
              sessionData.smsSent = true;
            } else {
              logger.error('❌ SMS failed:', smsResult.confirmationSms.error);
            }
          } catch (smsError) {
            logger.error('❌ SMS failed:', smsError.message);
          }
        } else if (!patient.phone) {
          logger.warn('⚠️ No phone number, skipping SMS');
        }

        // ===== FINAL: NOTIFY CLIENT =====
        const responseMessage = isReturningPatient
          ? `Welcome back, ${patient.name}! Your appointment with Dr. ${doctorAssignment.doctor.name} (${doctorAssignment.department}) has been scheduled. Check your email and SMS for details.`
          : `Thank you, ${patient.name}! Your appointment with Dr. ${doctorAssignment.doctor.name} (${doctorAssignment.department}) has been scheduled. We've sent confirmation to your email and phone.`;

        socket.emit('patientProcessed', {
          message: responseMessage,
          patientId: patient._id,
          appointmentId: appointment._id,
          riskScore: triageResult.risk_score,
          riskClassification: triageResult.risk_classification,
          urgency: urgencyData.urgency,
          department: doctorAssignment.department,
          doctorName: doctorAssignment.doctor.name,
          appointmentTime: appointment.scheduled_start_time,
          isReturningPatient,
        });

        logger.success(`✅ Patient processing complete: ${urgencyData.urgency} urgency`);
        logger.separator();

      } catch (appointmentError) {
        logger.error('❌ Appointment creation failed:', appointmentError.message);
        logger.error('Error stack:', appointmentError.stack);
        throw appointmentError;
      }
    }

  } catch (error) {
    logger.error('❌ Error processing patient completion:', error.message);
    logger.error('Stack trace:', error.stack);
    
    socket.emit('error', {
      message: 'We received your information but encountered an issue. Please call the clinic directly.',
    });
  }
};

/**
 * Handle chat end event
 */
const handleChatEnd = async (socket, data) => {
  try {
    const { sessionId } = data;
    logger.info(`Consultation session ending: ${sessionId}`);

    const consultation = await Consultation.findOne({ session_id: sessionId });

    if (consultation && consultation.status === 'active') {
      consultation.status = 'abandoned';
      await consultation.save();
      logger.info('Consultation marked as abandoned');
    }

    activeSessions.delete(sessionId);

    socket.emit('chatEnded', {
      message: 'Consultation session ended',
    });

    logger.success('Consultation session ended successfully');
  } catch (error) {
    logger.error('Error ending consultation:', error.message);
    logger.error('Error stack:', error.stack);
  }
};

/**
 * Handle socket disconnect
 */
const handleDisconnect = async (socket) => {
  try {
    logger.info(`Client disconnected: ${socket.id}`);

    const consultation = await Consultation.findOne({
      socket_id: socket.id,
      status: 'active',
    });

    if (consultation) {
      consultation.status = 'abandoned';
      await consultation.save();
      logger.info(
        `Consultation ${consultation.session_id} marked as abandoned`
      );
      activeSessions.delete(consultation.session_id);
    }
  } catch (error) {
    logger.error('Error handling disconnect:', error.message);
    logger.error('Error stack:', error.stack);
  }
};

/**
 * Setup Socket.io event listeners
 */
const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    handleConnection(socket);

    socket.on('chatStart', (data) => handleChatStart(socket, data));
    socket.on('userMessage', (data) => handleUserMessage(socket, data));
    socket.on('chatEnd', (data) => handleChatEnd(socket, data));
    socket.on('disconnect', () => handleDisconnect(socket));
  });

  logger.success('Socket.io handlers set up successfully');
};

export default {
  setupSocketHandlers,
};
