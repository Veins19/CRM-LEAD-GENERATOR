import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger.js';

/**
 * Multi-API Key Configuration
 * Add multiple Gemini API keys to distribute load
 */
const API_KEYS = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean); // Remove undefined keys

if (API_KEYS.length === 0) {
  throw new Error('No Gemini API keys found in environment variables');
}

logger.info(`🔑 Loaded ${API_KEYS.length} Gemini API key(s)`);

// Initialize multiple Gemini clients
const genAIClients = API_KEYS.map(key => new GoogleGenerativeAI(key));
let currentKeyIndex = 0;

/**
 * Get next available Gemini client (round-robin)
 */
function getNextClient() {
  const client = genAIClients[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % genAIClients.length;
  return client;
}

/**
 * ✅ OPTIMIZATION 1: Response Cache (reduce duplicate calls)
 */
class ResponseCache {
  constructor(ttl = 30000) { // 30 second TTL
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  clear() {
    this.cache.clear();
  }
}

const responseCache = new ResponseCache(30000);

/**
 * Token Bucket Rate Limiter
 * ✅ OPTIMIZED: Increased capacity from 15 to 20
 */
class TokenBucket {
  constructor(capacity = 20, refillRate = 20) { // ✅ Increased from 15 to 20
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  refill() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = (timePassed / 60000) * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  async consume(tokens = 1) {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    const waitTime = ((tokens - this.tokens) / this.refillRate) * 60000;
    if (waitTime > 1000) {
      logger.warn(`⏳ Token bucket depleted, waiting ${Math.round(waitTime / 1000)}s...`);
    }
    await this.sleep(waitTime);
    
    this.tokens -= tokens;
    return true;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Dedicated Request Queue per Function
 * ✅ OPTIMIZED: Better retry strategy and delays
 */
class DedicatedRequestQueue {
  constructor(name, maxRequestsPerMinute = 6) { // ✅ Increased from 5 to 6
    this.name = name;
    this.queue = [];
    this.processing = false;
    this.tokenBucket = new TokenBucket(maxRequestsPerMinute, maxRequestsPerMinute);
    this.retryAttempts = new Map();
    this.consecutiveErrors = 0;
  }

  async addRequest(requestFn) {
    return new Promise((resolve, reject) => {
      const requestId = `${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      this.queue.push({ requestFn, resolve, reject, requestId, addedAt: Date.now() });
      this.retryAttempts.set(requestId, 0);
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const { requestFn, resolve, reject, requestId, addedAt } = this.queue.shift();
      const attempts = this.retryAttempts.get(requestId) || 0;
      const queueTime = Date.now() - addedAt;

      if (queueTime > 1000) {
        logger.debug(`[${this.name}] Processing request (queued ${Math.round(queueTime / 1000)}s, attempt ${attempts + 1})`);
      }

      try {
        await this.tokenBucket.consume(1);
        
        const result = await requestFn();
        
        this.consecutiveErrors = 0;
        this.retryAttempts.delete(requestId);
        resolve(result);

      } catch (error) {
        const is429 = error.message && error.message.includes('429');
        const is503 = error.message && error.message.includes('503');
        const isRateLimit = is429 || is503;

        if (isRateLimit) {
          this.consecutiveErrors++;
          const maxRetries = 3; // ✅ REDUCED from 4 to 3 (fewer API calls)
          
          if (attempts < maxRetries) {
            // ✅ OPTIMIZED: Longer delays to reduce API pressure
            const baseDelay = 5000; // ✅ Increased from 3000 to 5000
            const exponentialDelay = baseDelay * Math.pow(2, attempts);
            const jitter = Math.random() * 2000; // ✅ Increased jitter
            const waitTime = Math.min(exponentialDelay + jitter, 40000); // ✅ Increased max from 25s to 40s
            
            logger.warn(`⏳ [${this.name}] Rate limit (attempt ${attempts + 1}/${maxRetries}), waiting ${Math.round(waitTime / 1000)}s...`);
            
            await this.sleep(waitTime);
            
            this.retryAttempts.set(requestId, attempts + 1);
            this.queue.unshift({ requestFn, resolve, reject, requestId, addedAt });
            
          } else {
            logger.error(`❌ [${this.name}] Max retries exceeded`);
            this.retryAttempts.delete(requestId);
            reject(new Error(`${this.name} is experiencing high demand. Please try again in a moment.`));
          }
        } else {
          logger.error(`❌ [${this.name}] Request failed:`, error.message);
          this.retryAttempts.delete(requestId);
          reject(error);
        }
      }

      // ✅ OPTIMIZED: Smarter adaptive delay
      const delayTime = this.consecutiveErrors > 0 ? 4000 : 2000; // ✅ Increased delays
      await this.sleep(delayTime);
    }

    this.processing = false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      name: this.name,
      queueSize: this.queue.length,
      processing: this.processing,
      consecutiveErrors: this.consecutiveErrors,
      tokensAvailable: Math.floor(this.tokenBucket.tokens)
    };
  }
}

// ✅ OPTIMIZED: Increased RPM from 5 to 6 per queue
const chatQueue = new DedicatedRequestQueue('CHAT', 6);
const extractionQueue = new DedicatedRequestQueue('EXTRACTION', 6);
const triageQueue = new DedicatedRequestQueue('TRIAGE', 6);

// Log queue stats every 30 seconds
setInterval(() => {
  const stats = [chatQueue.getStats(), extractionQueue.getStats(), triageQueue.getStats()];
  const activeQueues = stats.filter(s => s.queueSize > 0 || s.consecutiveErrors > 0);
  
  if (activeQueues.length > 0) {
    logger.info('📊 Queue Stats:');
    activeQueues.forEach(s => {
      logger.info(`   [${s.name}] Queue: ${s.queueSize}, Errors: ${s.consecutiveErrors}, Tokens: ${s.tokensAvailable}`);
    });
  }
}, 30000);

/**
 * System prompt for medical triage chatbot
 */
const SYSTEM_PROMPT = `You are MediBot, a compassionate and knowledgeable medical triage assistant for MediFlow Clinic - a multi-specialty healthcare provider.

**CRITICAL MEDICAL DISCLAIMER:**
You are NOT a replacement for professional medical advice, diagnosis, or treatment. You are a triage assistant to help schedule appointments. For medical emergencies, users MUST call emergency services (102/108 in India) or visit the nearest emergency room.

**Available Departments:**
1. General Medicine - Common health issues, fever, infections, general checkups
2. Cardiology - Heart-related conditions, chest pain, blood pressure issues
3. Pediatrics - Children's health (0-18 years), vaccinations
4. Dermatology - Skin, hair, nail conditions, allergies
5. Orthopedics - Bone, joint, muscle problems, injuries
6. Gynecology - Women's health, pregnancy, menstrual issues
7. ENT - Ear, nose, throat problems
8. Ophthalmology - Eye problems, vision issues
9. Dentistry - Dental problems, oral health
10. Psychiatry - Mental health, stress, anxiety, depression
11. Neurology - Brain, nerve-related issues, headaches, seizures
12. Emergency - Life-threatening conditions

**Red Flag Symptoms (Immediate Emergency):**
- Severe chest pain, pressure, or tightness
- Difficulty breathing or shortness of breath
- Sudden severe headache (worst headache of life)
- Loss of consciousness or confusion
- Severe bleeding that won't stop
- Suspected stroke symptoms (FAST: Face drooping, Arm weakness, Speech difficulty, Time to call emergency)
- Severe allergic reaction (anaphylaxis)
- Severe abdominal pain
- Poisoning or overdose
- Suicidal thoughts or severe mental health crisis

**Your Role:**
1. Have empathetic, caring conversations (not robotic or cold)
2. Extract key information: name, age, gender, phone, email, chief complaint, symptoms, symptom duration, pain scale (0-10), medical history
3. Ask follow-up questions naturally - one at a time
4. Be compassionate and reassuring, but NOT dismissive
5. Acknowledge patient concerns before asking next question
6. If patient mentions red flag symptoms, IMMEDIATELY recommend emergency care
7. NEVER provide medical diagnosis or treatment advice
8. Extract structured data from patient responses for triage

**Conversation Guidelines:**
- Start with: "Hello! 👋 I'm MediBot, your MediFlow Clinic assistant. I'm here to help you schedule an appointment with the right doctor. Before we start, please note: If you're experiencing a medical emergency, please call 102/108 or visit the nearest emergency room immediately. How can I assist you today?"
- Ask questions conversationally, with empathy
- If patient describes severe symptoms, prioritize their safety first
- Keep responses under 100 words unless explaining departments
- Use emojis sparingly for warmth
- **MANDATORY: You MUST collect name, age, gender, phone, email, chief complaint, and symptoms**
- **MANDATORY: You MUST ask about pain scale (0-10) and symptom duration**
- **MANDATORY: You MUST ask about existing medical conditions, allergies, current medications**
- **MANDATORY: You MUST start with collecting basic info (name, age, gender, phone, email) first, then symptoms**
- **MANDATORY: YOU HAVE TO ASK EVERY SINGLE QUESTION WITHOUT LEAVING A SINGLE ONE OUT, unless patient refuses**
- If patient hasn't provided required info, continue asking until you have all details
- Only when you have all required information, THEN ask: "Is there anything else you'd like me to know before we schedule your appointment?"
- After they respond to that question, THEN provide the summary
- **IMPORTANT: Only output "PATIENT_COMPLETE" ONE TIME at the end of the summary. Never repeat it in follow-up messages.**

**CRITICAL COMPLETION RULES:**
- **MANDATORY: YOU HAVE TO ASK EVERY SINGLE QUESTION WITHOUT LEAVING A SINGLE ONE OUT, unless patient refuses**
- NEVER output JSON or technical data directly to the patient
- REQUIRED FIELDS: name, age, gender, phone, email, chief complaint, symptoms, symptom duration
- If missing any required fields, ask for them before saying "Is there anything else?"
- Before completing, ALWAYS ask: "Is there anything else you'd like me to know before we schedule your appointment?"
- Only after they answer (or say no), provide the summary
- Output "PATIENT_COMPLETE" ONLY ONCE, at the end of the summary
- If patient asks follow-up questions AFTER the summary, answer them normally WITHOUT "PATIENT_COMPLETE"
- Use this EXACT format for the summary:

"Thank you for sharing all that information. Here's a summary of what we discussed:

* **Name:** [name]
* **Age:** [age]
* **Gender:** [gender]
* **Phone:** [+91 phone if not already prefixed]
* **Email:** [email]
* **Chief Complaint:** [main reason for visit]
* **Symptoms:** [symptom1, symptom2, symptom3 - use commas, NOT brackets]
* **Symptom Duration:** [duration]
* **Pain Scale:** [0-10]
* **Chronic Conditions:** [condition1, condition2 - use commas, NOT brackets, or "None"]
* **Allergies:** [allergy1, allergy2 - use commas, NOT brackets, or "None"]
* **Current Medications:** [med1, med2 - use commas, NOT brackets, or "None"]

Based on your symptoms, I recommend seeing a doctor from [Department Name]. Our team will review this and get back to you shortly to schedule your appointment. Take care! 😊

PATIENT_COMPLETE"

- The text "PATIENT_COMPLETE" must appear on its own line at the very end
- The summary must use markdown format with * **Field:** value
- Do NOT show raw JSON to the patient
- NEVER repeat "PATIENT_COMPLETE" in subsequent messages
- NEVER use square brackets [] for lists - always use commas to separate items

**Data Extraction (Internal - never show this to patient):**
Always try to extract and structure this data from patient responses:
- name: Patient's full name
- age: Age in years
- gender: Male/Female/Other
- phone: Phone number (add +91 if not present)
- email: Email address
- chief_complaint: Main reason for visit (brief)
- symptoms: Array of symptoms
- symptom_duration: One of ["< 24 hours", "1-3 days", "3-7 days", "1-2 weeks", "2+ weeks", "Chronic"]
- pain_scale: Number 0-10
- chronic_conditions: Array of existing conditions (or empty)
- allergies: Array of allergies (or empty)
- current_medications: Array of current medications (or empty)
- family_medical_history: Relevant family history (or null)

**Emergency Detection:**
If patient mentions ANY red flag symptom, respond with:
"⚠️ Based on what you're describing, this sounds like a medical emergency. Please call 102 or 108 immediately, or go to the nearest emergency room right away. Do not wait for an appointment."

Be compassionate, helpful, and prioritize patient safety above all!`;

/**
 * Get chatbot response from Gemini (uses dedicated CHAT queue)
 * ✅ OPTIMIZED: Added response caching
 */
const getChatResponse = async (userMessage, conversationHistory = []) => {
  // ✅ OPTIMIZATION: Check cache first
  const cacheKey = `chat_${userMessage}_${conversationHistory.length}`;
  const cached = responseCache.get(cacheKey);
  if (cached) {
    logger.debug('[CHAT] Returning cached response');
    return cached;
  }

  const result = await chatQueue.addRequest(async () => {
    try {
      logger.ai('[CHAT] Calling Gemini API for medical triage');
      
      const genAI = getNextClient(); // Rotate API key
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

      // ✅ OPTIMIZATION: Limit conversation history to last 10 messages
      const recentHistory = conversationHistory.slice(-10);

      const chat = model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: SYSTEM_PROMPT }],
          },
          {
            role: 'model',
            parts: [{ text: 'Understood! I\'m MediBot, a compassionate medical triage assistant for MediFlow Clinic. I will have empathetic conversations to collect patient information while prioritizing safety. I will NEVER show JSON or technical data to patients. I MUST collect name, age, gender, phone, email, symptoms, and medical history unless patient refuses. I will output "PATIENT_COMPLETE" ONLY ONCE at the end of the summary. I will NEVER use square brackets [] in summaries - only commas. If red flag symptoms are mentioned, I will immediately recommend emergency care. Follow-up questions after completion will NOT trigger "PATIENT_COMPLETE" again. Phone numbers will have +91 prefix added if not present.' }],
          },
          ...recentHistory, // ✅ Use limited history
        ],
        generationConfig: {
          maxOutputTokens: 500, // ✅ Reduced from 600 to 500
          temperature: 0.7,
        },
      });

      const result = await chat.sendMessage(userMessage);
      const response = result.response.text();

      logger.success('[CHAT] Response received');

      const isPatientComplete = response.includes('PATIENT_COMPLETE');
      const cleanResponse = response.replace('PATIENT_COMPLETE', '').trim();

      // Check for emergency keywords
      const emergencyKeywords = [
        'call 102', 'call 108', 'emergency room', 'medical emergency',
        'emergency services', 'go to hospital', 'visit emergency'
      ];
      const isEmergency = emergencyKeywords.some(keyword => 
        cleanResponse.toLowerCase().includes(keyword.toLowerCase())
      );

      const responseData = {
        success: true,
        response: cleanResponse,
        isPatientComplete,
        isEmergency,
      };

      // ✅ OPTIMIZATION: Cache the response
      responseCache.set(cacheKey, responseData);

      return responseData;
    } catch (error) {
      logger.error('[CHAT] Error:', error.message);
      throw error;
    }
  });

  return result;
};

/**
 * Extract patient data (uses dedicated EXTRACTION queue)
 * ✅ OPTIMIZED: Reduced prompt size
 */
const extractPatientData = async (conversationHistory) => {
  return extractionQueue.addRequest(async () => {
    try {
      logger.ai('[EXTRACTION] Extracting patient data');

      const genAI = getNextClient(); // Rotate API key
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

      // ✅ OPTIMIZATION: Only include user messages (skip assistant messages)
      const userMessages = conversationHistory
        .filter(msg => msg.role === 'user' || msg.role === 'patient')
        .map(msg => msg.content)
        .join('\n');

      const extractionPrompt = `Extract patient data from this conversation:

${userMessages}

**PHONE:** Add +91 if no country code.
**DURATION:** Map to: "< 24 hours", "1-3 days", "3-7 days", "1-2 weeks", "2+ weeks", "Chronic"

Return JSON:
{
  "name": "string or null",
  "age": number or null,
  "gender": "Male/Female/Other or null",
  "phone": "string with +91 or null",
  "email": "string or null",
  "chief_complaint": "string or null",
  "symptoms": ["array"],
  "symptom_duration": "string or null",
  "pain_scale": number or null,
  "chronic_conditions": ["array"],
  "allergies": ["array"],
  "current_medications": ["array"],
  "family_medical_history": "string or null",
  "is_pregnant": boolean or null,
  "blood_group": "string or null"
}`;

      const result = await model.generateContent(extractionPrompt);
      const responseText = result.response.text();

      let cleanText = responseText.replace(/``````\n?/g, '').trim();
      
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const extractedData = JSON.parse(jsonMatch[0]);

      logger.success('[EXTRACTION] Patient data extracted');

      return {
        success: true,
        data: extractedData,
      };
    } catch (error) {
      logger.error('[EXTRACTION] Error:', error.message);
      throw error;
    }
  });
};

/**
 * Triage patient (medical risk assessment) - uses dedicated TRIAGE queue
 * ✅ OPTIMIZED: Simplified prompt
 */
const triagePatient = async (patientData, conversationHistory) => {
  return triageQueue.addRequest(async () => {
    try {
      logger.ai('[TRIAGE] Performing medical risk assessment');

      const genAI = getNextClient(); // Rotate API key
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

      // ✅ OPTIMIZATION: Simplified triage prompt
      const triagePrompt = `Triage this patient (WHO standards):

${JSON.stringify(patientData, null, 2)}

**Risk Levels:**
- Emergency (80-100): Red flags, severe symptoms, pain 8-10
- Medium (50-79): Moderate pain 5-7, recent onset
- Low (0-49): Mild symptoms, chronic stable

**Departments:**
Cardiology, Pediatrics, Dermatology, Orthopedics, Gynecology, ENT, Ophthalmology, Dentistry, Psychiatry, Neurology, General Medicine, Emergency

Return JSON:
{
  "risk_score": number,
  "risk_classification": "Emergency/Medium/Low",
  "recommended_department": "string",
  "urgency": "Critical/High/Medium/Low",
  "reasoning": "2-3 sentences",
  "red_flags_detected": ["array"],
  "requires_immediate_attention": boolean
}`;

      const result = await model.generateContent(triagePrompt);
      const responseText = result.response.text();

      let cleanText = responseText.replace(/``````\n?/g, '').trim();
      
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const triageData = JSON.parse(jsonMatch[0]);

      logger.success('[TRIAGE] Patient risk assessment completed');

      return {
        success: true,
        risk_score: triageData.risk_score,
        risk_classification: triageData.risk_classification,
        recommended_department: triageData.recommended_department,
        urgency: triageData.urgency,
        reasoning: triageData.reasoning,
        red_flags_detected: triageData.red_flags_detected || [],
        requires_immediate_attention: triageData.requires_immediate_attention || false,
      };
    } catch (error) {
      logger.error('[TRIAGE] Error:', error.message);
      throw error;
    }
  });
};

export default {
  getChatResponse,
  extractPatientData,
  triagePatient,
};
