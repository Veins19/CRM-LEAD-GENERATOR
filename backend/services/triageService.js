import logger from '../utils/logger.js';
import geminiService from './geminiService.js';

/**
 * Triage Service for MediFlow
 * Handles medical risk assessment using WHO/ATS triage standards
 * with Gemini AI and rule-based fallback
 * 
 * Risk Classifications:
 * - Emergency (80-100): Requires immediate medical attention
 * - Medium (50-79): Schedule within 1-3 days
 * - Low (0-49): Routine appointment acceptable
 */

/**
 * Red Flag Symptoms (Automatic Emergency Classification)
 */
const RED_FLAG_SYMPTOMS = [
  // Cardiovascular
  'severe chest pain', 'chest pressure', 'chest tightness', 'heart attack',
  'crushing chest pain', 'radiating pain to arm', 'jaw pain with chest',
  
  // Respiratory
  'difficulty breathing', 'shortness of breath', 'can\'t breathe', 'gasping for air',
  'severe wheezing', 'blue lips', 'cyanosis',
  
  // Neurological
  'severe headache', 'worst headache of life', 'thunderclap headache',
  'loss of consciousness', 'passed out', 'fainted', 'seizure', 'convulsion',
  'stroke', 'face drooping', 'arm weakness', 'slurred speech', 'confusion',
  'sudden numbness', 'sudden weakness', 'sudden vision loss',
  
  // Trauma/Bleeding
  'severe bleeding', 'uncontrolled bleeding', 'heavy bleeding', 'bleeding won\'t stop',
  'severe trauma', 'severe injury', 'broken bone through skin',
  
  // Abdominal
  'severe abdominal pain', 'severe stomach pain', 'rigid abdomen',
  'vomiting blood', 'blood in stool', 'black tarry stool',
  
  // Allergic
  'severe allergic reaction', 'anaphylaxis', 'throat closing', 'tongue swelling',
  'difficulty swallowing', 'severe rash with breathing difficulty',
  
  // Mental Health
  'suicidal', 'want to kill myself', 'suicide attempt', 'severe depression',
  'homicidal', 'want to hurt others',
  
  // Other Critical
  'poisoning', 'overdose', 'drug overdose', 'severe burns',
  'severe pain 9/10', 'severe pain 10/10', 'unbearable pain',
];

/**
 * Triage Scoring Configuration (WHO/ATS Standards)
 */
const TRIAGE_CONFIG = {
  // Pain Scale Scoring (0-10) - Max 25 points
  pain_scale: {
    9: 25,  // Severe
    10: 25, // Worst possible
    8: 20,  // Severe
    7: 15,  // Moderate-Severe
    6: 12,  // Moderate
    5: 10,  // Moderate
    4: 8,   // Mild-Moderate
    3: 6,   // Mild
    2: 4,   // Minimal
    1: 2,   // Minimal
    0: 0,   // No pain
  },
  
  // Symptom Duration - Max 20 points
  symptom_duration: {
    '< 24 hours': 20,      // Acute onset (urgent)
    '1-3 days': 15,        // Recent acute
    '3-7 days': 10,        // Subacute
    '1-2 weeks': 8,        // Subacute
    '2+ weeks': 5,         // Chronic
    'Chronic': 3,          // Stable chronic
  },
  
  // Age Risk Modifiers - Max 15 points
  age_risk: {
    infant: 15,      // 0-1 years (high risk)
    toddler: 12,     // 1-3 years
    child: 8,        // 3-12 years
    teen: 5,         // 12-18 years
    adult: 3,        // 18-60 years
    elderly: 12,     // 60-75 years (higher risk)
    very_elderly: 15, // 75+ years (high risk)
  },
  
  // Chronic Conditions Impact - Max 15 points
  chronic_conditions_impact: {
    0: 0,   // No chronic conditions
    1: 5,   // Single condition
    2: 10,  // Multiple conditions
    3: 15,  // Multiple serious conditions
  },
  
  // Vital Signs Severity (if available) - Max 25 points
  vitals_severity: {
    critical: 25,  // Severely abnormal vitals
    abnormal: 15,  // Moderately abnormal
    borderline: 8, // Slightly abnormal
    normal: 0,     // Within normal range
  },
};

/**
 * Department-Specific Risk Adjustments
 */
const DEPARTMENT_RISK_MODIFIERS = {
  'Cardiology': 1.2,       // Higher risk for cardiac symptoms
  'Neurology': 1.2,        // Higher risk for neurological symptoms
  'Emergency': 1.5,        // Emergency department auto-boost
  'Pediatrics': 1.1,       // Children need closer monitoring
  'General Medicine': 1.0, // Baseline
  'Dermatology': 0.8,      // Generally lower urgency
  'Ophthalmology': 0.9,    // Generally lower urgency
  'Dentistry': 0.85,       // Generally lower urgency (except severe infections)
};

/**
 * Check for red flag symptoms
 */
const detectRedFlags = (symptoms, chiefComplaint) => {
  try {
    const combinedText = [
      ...(Array.isArray(symptoms) ? symptoms : [symptoms]),
      chiefComplaint
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const detectedRedFlags = RED_FLAG_SYMPTOMS.filter(redFlag =>
      combinedText.includes(redFlag.toLowerCase())
    );

    return detectedRedFlags;
  } catch (error) {
    logger.error('Error detecting red flags:', error.message);
    return [];
  }
};

/**
 * Calculate age risk category
 */
const calculateAgeRisk = (age) => {
  try {
    if (!age) return TRIAGE_CONFIG.age_risk.adult;

    if (age < 1) return TRIAGE_CONFIG.age_risk.infant;
    if (age < 3) return TRIAGE_CONFIG.age_risk.toddler;
    if (age < 12) return TRIAGE_CONFIG.age_risk.child;
    if (age < 18) return TRIAGE_CONFIG.age_risk.teen;
    if (age < 60) return TRIAGE_CONFIG.age_risk.adult;
    if (age < 75) return TRIAGE_CONFIG.age_risk.elderly;
    return TRIAGE_CONFIG.age_risk.very_elderly;
  } catch (error) {
    logger.error('Error calculating age risk:', error.message);
    return TRIAGE_CONFIG.age_risk.adult;
  }
};

/**
 * Calculate chronic conditions impact
 */
const calculateChronicImpact = (chronicConditions) => {
  try {
    if (!chronicConditions || !Array.isArray(chronicConditions)) return 0;

    const count = chronicConditions.length;
    
    if (count === 0) return TRIAGE_CONFIG.chronic_conditions_impact[0];
    if (count === 1) return TRIAGE_CONFIG.chronic_conditions_impact[1];
    if (count === 2) return TRIAGE_CONFIG.chronic_conditions_impact[2];
    return TRIAGE_CONFIG.chronic_conditions_impact[3];
  } catch (error) {
    logger.error('Error calculating chronic conditions impact:', error.message);
    return 0;
  }
};

/**
 * Assess vital signs severity (if available)
 */
const assessVitalsSeverity = (vitals) => {
  try {
    if (!vitals) return 0;

    let severity = 'normal';

    // Blood Pressure Assessment
    if (vitals.blood_pressure) {
      const { systolic, diastolic } = vitals.blood_pressure;
      if (systolic > 180 || systolic < 90 || diastolic > 120 || diastolic < 60) {
        severity = 'critical';
      } else if (systolic > 160 || systolic < 100 || diastolic > 100 || diastolic < 70) {
        severity = 'abnormal';
      } else if (systolic > 140 || systolic < 110 || diastolic > 90 || diastolic < 75) {
        severity = 'borderline';
      }
    }

    // Pulse Rate Assessment
    if (vitals.pulse_rate) {
      if (vitals.pulse_rate > 120 || vitals.pulse_rate < 50) {
        severity = severity === 'critical' ? 'critical' : 'abnormal';
      }
    }

    // Temperature Assessment
    if (vitals.temperature) {
      if (vitals.temperature > 103 || vitals.temperature < 95) {
        severity = 'critical';
      } else if (vitals.temperature > 101 || vitals.temperature < 96) {
        severity = severity === 'critical' ? 'critical' : 'abnormal';
      }
    }

    // Oxygen Saturation Assessment
    if (vitals.oxygen_saturation) {
      if (vitals.oxygen_saturation < 90) {
        severity = 'critical';
      } else if (vitals.oxygen_saturation < 94) {
        severity = severity === 'critical' ? 'critical' : 'abnormal';
      }
    }

    return TRIAGE_CONFIG.vitals_severity[severity] || 0;
  } catch (error) {
    logger.error('Error assessing vitals severity:', error.message);
    return 0;
  }
};

/**
 * Rule-based medical triage (fallback when Gemini fails)
 */
const calculateRuleBasedTriage = (patientData, consultationMetadata = {}) => {
  try {
    logger.info('Calculating rule-based medical triage');

    let totalScore = 0;
    const breakdown = {
      pain_scale_score: 0,
      symptom_duration_score: 0,
      age_risk_score: 0,
      chronic_conditions_score: 0,
      vitals_score: 0,
      red_flags_bonus: 0,
    };

    // 1. RED FLAG CHECK (Automatic Emergency if detected)
    const redFlags = detectRedFlags(
      patientData.symptoms,
      patientData.chief_complaint
    );

    if (redFlags.length > 0) {
      logger.warn(`🚨 RED FLAGS DETECTED: ${redFlags.join(', ')}`);
      return {
        success: true,
        risk_score: 100,
        risk_classification: 'Emergency',
        urgency: 'Critical',
        reasoning: `RED FLAG SYMPTOMS DETECTED: ${redFlags.join(', ')}. Patient requires IMMEDIATE medical attention. Recommend calling emergency services (102/108) or visiting nearest emergency room.`,
        red_flags_detected: redFlags,
        requires_immediate_attention: true,
        recommended_department: 'Emergency',
        breakdown,
        method: 'rule-based-red-flag',
      };
    }

    // 2. PAIN SCALE SCORE (Max 25 points)
    const painScale = patientData.pain_scale || 0;
    breakdown.pain_scale_score = TRIAGE_CONFIG.pain_scale[painScale] || 0;
    totalScore += breakdown.pain_scale_score;
    logger.debug(`Pain scale (${painScale}/10): ${breakdown.pain_scale_score} points`);

    // 3. SYMPTOM DURATION SCORE (Max 20 points)
    const durationScore = TRIAGE_CONFIG.symptom_duration[patientData.symptom_duration] || 5;
    breakdown.symptom_duration_score = durationScore;
    totalScore += durationScore;
    logger.debug(`Symptom duration (${patientData.symptom_duration}): ${durationScore} points`);

    // 4. AGE RISK SCORE (Max 15 points)
    const ageRiskScore = calculateAgeRisk(patientData.age);
    breakdown.age_risk_score = ageRiskScore;
    totalScore += ageRiskScore;
    logger.debug(`Age risk (${patientData.age} years): ${ageRiskScore} points`);

    // 5. CHRONIC CONDITIONS SCORE (Max 15 points)
    const chronicScore = calculateChronicImpact(patientData.chronic_conditions);
    breakdown.chronic_conditions_score = chronicScore;
    totalScore += chronicScore;
    logger.debug(`Chronic conditions: ${chronicScore} points`);

    // 6. VITALS ASSESSMENT (Max 25 points)
    const vitalsScore = assessVitalsSeverity(patientData.vitals);
    breakdown.vitals_score = vitalsScore;
    totalScore += vitalsScore;
    logger.debug(`Vitals severity: ${vitalsScore} points`);

    // 7. Apply department-specific risk modifier
    const departmentModifier = DEPARTMENT_RISK_MODIFIERS[patientData.primary_department] || 1.0;
    totalScore = Math.round(totalScore * departmentModifier);

    // Ensure score is between 0-100
    totalScore = Math.max(0, Math.min(100, totalScore));

    // Classify risk
    let riskClassification;
    let urgency;
    
    if (totalScore >= 80) {
      riskClassification = 'Emergency';
      urgency = 'Critical';
    } else if (totalScore >= 50) {
      riskClassification = 'Medium';
      urgency = totalScore >= 65 ? 'High' : 'Medium';
    } else {
      riskClassification = 'Low';
      urgency = totalScore >= 30 ? 'Medium' : 'Low';
    }

    const reasoning = `Patient risk assessed at ${totalScore}/100 (${riskClassification}). Pain scale: ${painScale}/10, Symptom duration: ${patientData.symptom_duration}, Age: ${patientData.age} years, Chronic conditions: ${patientData.chronic_conditions?.length || 0}. ${riskClassification === 'Emergency' ? 'Requires urgent medical attention.' : riskClassification === 'Medium' ? 'Schedule appointment within 1-3 days.' : 'Routine appointment acceptable.'}`;

    logger.success(`Rule-based triage complete: ${totalScore} (${riskClassification})`);
    logger.object('Triage Breakdown', breakdown);

    return {
      success: true,
      risk_score: totalScore,
      risk_classification: riskClassification,
      urgency,
      reasoning,
      red_flags_detected: [],
      requires_immediate_attention: riskClassification === 'Emergency',
      recommended_department: patientData.primary_department || 'General Medicine',
      breakdown,
      method: 'rule-based',
    };
  } catch (error) {
    logger.error('Error calculating rule-based triage:', error.message);
    
    // Ultimate fallback - assume Medium risk for safety
    return {
      success: false,
      risk_score: 50,
      risk_classification: 'Medium',
      urgency: 'Medium',
      reasoning: 'Default medium-risk classification due to calculation error. Recommend medical evaluation.',
      red_flags_detected: [],
      requires_immediate_attention: false,
      recommended_department: 'General Medicine',
      breakdown: {},
      method: 'fallback',
      error: error.message,
    };
  }
};

/**
 * Triage patient using Gemini AI with rule-based fallback
 */
const triagePatient = async (patientData, conversationHistory, consultationMetadata = {}) => {
  try {
    logger.info('Starting medical triage process');
    logger.object('Patient Data', patientData);

    // Pre-check for red flags (immediate emergency detection)
    const redFlags = detectRedFlags(
      patientData.symptoms,
      patientData.chief_complaint
    );

    if (redFlags.length > 0) {
      logger.warn(`🚨 CRITICAL: Red flag symptoms detected, bypassing AI triage`);
      return {
        success: true,
        risk_score: 100,
        risk_classification: 'Emergency',
        urgency: 'Critical',
        reasoning: `RED FLAG SYMPTOMS DETECTED: ${redFlags.join(', ')}. Patient requires IMMEDIATE medical attention. Call emergency services (102/108) or visit nearest emergency room NOW.`,
        red_flags_detected: redFlags,
        requires_immediate_attention: true,
        recommended_department: 'Emergency',
        breakdown: {},
        method: 'red-flag-auto',
      };
    }

    // Try Gemini AI triage first
    logger.ai('Attempting Gemini AI triage');
    const geminiResult = await geminiService.triagePatient(patientData, conversationHistory);

    if (geminiResult.success && geminiResult.risk_score !== null) {
      logger.success('Gemini AI triage successful');
      return {
        ...geminiResult,
        method: 'gemini-ai',
      };
    }

    // Fallback to rule-based triage
    logger.warn('Gemini AI triage failed, using rule-based fallback');
    return calculateRuleBasedTriage(patientData, consultationMetadata);

  } catch (error) {
    logger.error('Error in triage process:', error.message);
    
    // Ultimate fallback - safety first
    logger.warn('Using ultimate fallback triage (Medium risk)');
    return calculateRuleBasedTriage(patientData, consultationMetadata);
  }
};

/**
 * Get risk classification only (Emergency/Medium/Low)
 */
const classifyRisk = (riskScore) => {
  if (riskScore >= 80) return 'Emergency';
  if (riskScore >= 50) return 'Medium';
  return 'Low';
};

/**
 * Get urgency level from risk score
 */
const getUrgencyLevel = (riskScore) => {
  if (riskScore >= 80) return 'Critical';
  if (riskScore >= 65) return 'High';
  if (riskScore >= 30) return 'Medium';
  return 'Low';
};

export default {
  triagePatient,
  calculateRuleBasedTriage,
  classifyRisk,
  getUrgencyLevel,
  detectRedFlags,
};
