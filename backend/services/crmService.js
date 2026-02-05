/**
 * CRM Service - Enhanced
 * Handles all CRM integration API calls with validation, retries, and executive assignment
 * 
 * ENHANCEMENTS:
 * - Pre-sync validation and cleaning
 * - Returning lead detection (check if email exists in CRM)
 * - Executive assignment integration
 * - Retry logic with exponential backoff
 * - Detailed error logging and recovery
 * - Activity logging for all CRM operations
 */

import logger from '../utils/logger.js';
import fetch from 'node-fetch';
import cleaningService from './cleaningService.js';
import executiveAssignmentService from './executiveAssignmentService.js';

const CRM_BASE_URL = process.env.CRM_BASE_URL; // e.g. http://localhost:5000
const CRM_API_KEY = process.env.CRM_INTEGRATION_KEY; // crm_integrations_...

if (!CRM_BASE_URL || !CRM_API_KEY) {
  throw new Error(
    'CRM integration is not configured. Please set CRM_BASE_URL and CRM_INTEGRATION_KEY in .env'
  );
}

/**
 * Internal helper to call the CRM Integration API with retry logic
 * Handles base URL, headers, JSON, error logging, and retries
 * 
 * @param {string} path - API path (e.g., '/api/integrations/leads')
 * @param {Object} options - Request options
 * @param {number} retries - Number of retry attempts (default: 3)
 * @returns {Object} - Response data
 */
async function crmRequest(path, { method = 'GET', body } = {}, retries = 3) {
  const base = CRM_BASE_URL.replace(/\/+$/, ''); // remove trailing slash
  const url = `${base}${path}`;

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CRM_API_KEY,
    },
    timeout: 15000 // 15 second timeout
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  let lastError = null;

  // Retry logic with exponential backoff
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.info(`🌉 CRM Request → ${method} ${url} (Attempt ${attempt}/${retries})`);

      const res = await fetch(url, options);

      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        logger.warn(`CRM response is not valid JSON for ${method} ${path}`);
      }

      if (!res.ok || !data || data.success === false) {
        const message = (data && data.message) || res.statusText || 'Unknown CRM error';

        logger.error(
          `❌ CRM Error ${res.status} on ${method} ${path}: ${message}`
        );

        const error = new Error(message);
        error.status = res.status;
        error.data = data;
        
        // Don't retry on 4xx errors (client errors - bad request, not found, etc.)
        if (res.status >= 400 && res.status < 500) {
          throw error;
        }
        
        lastError = error;
        
        // Exponential backoff: 1s, 2s, 4s
        if (attempt < retries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          logger.warn(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw error;
      }

      logger.success(`✅ CRM OK ${method} ${path}`);
      return data;

    } catch (error) {
      lastError = error;
      
      // Network errors - retry
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.type === 'request-timeout') {
        logger.warn(`⚠️ Network error on attempt ${attempt}: ${error.message}`);
        
        if (attempt < retries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          logger.warn(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // Non-retryable error
      throw error;
    }
  }

  // All retries exhausted
  logger.error(`❌ All ${retries} CRM request attempts failed`);
  throw lastError;
}

/**
 * Check if a lead already exists in CRM by email
 * Used to detect returning leads
 * 
 * @param {string} email - Lead email to check
 * @returns {Object|null} - Existing CRM lead or null
 */
async function checkLeadExists(email) {
  try {
    logger.info(`🔍 Checking if lead exists in CRM: ${email}`);

    const data = await crmRequest(`/api/integrations/leads/check?email=${encodeURIComponent(email)}`, {
      method: 'GET'
    });

    if (data.exists && data.lead) {
      logger.success(`✅ Lead exists in CRM: ${email} (ID: ${data.lead._id})`);
      return data.lead;
    } else {
      logger.info(`📝 Lead does not exist in CRM: ${email}`);
      return null;
    }

  } catch (error) {
    // If endpoint doesn't exist yet (404), treat as not existing
    if (error.status === 404) {
      logger.warn('⚠️ CRM check endpoint not implemented yet - treating as new lead');
      return null;
    }
    
    logger.error('❌ Error checking if lead exists:', error.message);
    // On error, assume new lead (fail safe)
    return null;
  }
}

/**
 * Create a lead in CRM via POST /api/integrations/leads
 * WITH pre-sync validation, cleaning, and executive assignment
 * 
 * @param {Object} payload - Lead data (name, email, contact, services, etc.)
 * @param {boolean} skipValidation - Skip validation (default: false)
 * @returns {Object} - Created CRM lead
 */
async function crmCreateLead(payload, skipValidation = false) {
  try {
    logger.info(`📤 Creating lead in CRM: ${payload.email}`);

    // STEP 1: Validate lead data before CRM sync
    if (!skipValidation) {
      const validation = cleaningService.validateBeforeCRMSync({
        name: payload.name,
        email: payload.email,
        phone: payload.contact // CRM uses 'contact' field
      });

      if (!validation.valid) {
        logger.error(`❌ Lead validation failed for ${payload.email}:`, validation.errors);
        throw new Error(`Invalid lead data: ${JSON.stringify(validation.errors)}`);
      }

      // Use cleaned data
      payload.name = validation.cleanedData.name;
      payload.email = validation.cleanedData.email;
      payload.contact = validation.cleanedData.phone;
    }

    // STEP 2: Check if lead already exists (returning lead detection)
    const existingLead = await checkLeadExists(payload.email);
    
    if (existingLead) {
      logger.warn(`⚠️ Lead already exists in CRM: ${payload.email} - Use updateLead instead`);
      // Return existing lead instead of creating duplicate
      return existingLead;
    }

    // STEP 3: Assign to appropriate executive based on services
    let assignedExecutiveId = payload.assignedTo || null;
    
    if (!assignedExecutiveId && payload.services_interested) {
      const assignment = await executiveAssignmentService.assignLeadToExecutive({
        name: payload.name,
        email: payload.email,
        services_interested: payload.services_interested,
        primary_service: payload.primary_service || payload.services_interested[0]
      });

      if (assignment.executiveId) {
        assignedExecutiveId = assignment.executiveId;
        logger.success(`👥 Assigned lead to executive: ${assignment.reason}`);
      } else {
        logger.warn(`⚠️ No executive assigned: ${assignment.reason}`);
      }
    }

    // STEP 4: Prepare CRM payload with executive assignment
    const crmPayload = {
      name: payload.name,
      email: payload.email,
      contact: payload.contact || payload.phone,
      company: payload.company || null,
      status: payload.status || 'New',
      tags: payload.tags || [],
      notes: payload.notes || null,
      assignedTo: assignedExecutiveId
    };

    // STEP 5: Create lead in CRM
    const data = await crmRequest('/api/integrations/leads', {
      method: 'POST',
      body: crmPayload,
    });

    if (data.lead) {
      logger.success(`✅ Lead created in CRM: ${payload.email} (ID: ${data.lead._id})`);
      
      // STEP 6: Log activity for lead creation
      await crmLogActivity({
        type: 'Automation',
        details: `Lead created via chatbot integration`,
        leadId: data.lead._id,
        userId: assignedExecutiveId
      }).catch(err => logger.warn('Failed to log creation activity:', err.message));
      
      return data.lead;
    } else {
      throw new Error('CRM did not return lead data');
    }

  } catch (error) {
    logger.error('❌ CRM createLead failed:', error.message);
    throw error;
  }
}

/**
 * Update an existing lead in CRM (for returning leads)
 * PATCH /api/integrations/leads/:id
 * 
 * @param {string} crmLeadId - CRM lead ID to update
 * @param {Object} updates - Fields to update
 * @returns {Object} - Updated CRM lead
 */
async function crmUpdateLead(crmLeadId, updates) {
  if (!crmLeadId) {
    throw new Error('crmUpdateLead called without crmLeadId');
  }

  try {
    logger.info(`📝 Updating lead in CRM: ${crmLeadId}`);

    const data = await crmRequest(`/api/integrations/leads/${crmLeadId}`, {
      method: 'PATCH',
      body: updates
    });

    if (data.lead) {
      logger.success(`✅ Lead updated in CRM: ${crmLeadId}`);
      
      // Log activity for update
      await crmLogActivity({
        type: 'Automation',
        details: `Lead updated via chatbot (returning lead)`,
        leadId: crmLeadId
      }).catch(err => logger.warn('Failed to log update activity:', err.message));
      
      return data.lead;
    } else {
      throw new Error('CRM did not return updated lead data');
    }

  } catch (error) {
    logger.error('❌ CRM updateLead failed:', error.message);
    throw error;
  }
}

/**
 * Sync or update lead in CRM (smart function - creates or updates)
 * Handles both new and returning leads automatically
 * 
 * @param {Object} leadData - Complete lead data from Lead Gen
 * @returns {Object} - { crmLead, isNew: boolean, action: string }
 */
async function syncLeadToCRM(leadData) {
  try {
    logger.info(`🔄 Syncing lead to CRM: ${leadData.email}`);

    // Check if lead exists
    const existingLead = await checkLeadExists(leadData.email);

    if (existingLead) {
      // Returning lead - UPDATE
      logger.info(`🔄 Returning lead detected - updating: ${leadData.email}`);

      const updates = {
        notes: leadData.notes || existingLead.notes,
        tags: [...new Set([...(existingLead.tags || []), ...(leadData.tags || [])])], // Merge tags
        // Update other fields if needed
      };

      const updatedLead = await crmUpdateLead(existingLead._id, updates);

      return {
        crmLead: updatedLead,
        isNew: false,
        action: 'updated',
        message: 'Returning lead updated in CRM'
      };

    } else {
      // New lead - CREATE
      logger.info(`✨ New lead detected - creating: ${leadData.email}`);

      const crmPayload = {
        name: leadData.name,
        email: leadData.email,
        contact: leadData.phone,
        company: leadData.company,
        status: 'New',
        tags: leadData.tags || [],
        notes: leadData.notes,
        services_interested: leadData.services_interested,
        primary_service: leadData.primary_service
      };

      const createdLead = await crmCreateLead(crmPayload);

      return {
        crmLead: createdLead,
        isNew: true,
        action: 'created',
        message: 'New lead created in CRM'
      };
    }

  } catch (error) {
    logger.error('❌ syncLeadToCRM failed:', error.message);
    throw error;
  }
}

/**
 * Update CRM lead status
 * PATCH /api/integrations/leads/:id/status
 * 
 * @param {string} crmLeadId - CRM lead ID
 * @param {string} status - New status (New/Contacted/Qualified/Won/Lost/Converted)
 * @param {string} userId - User ID who triggered the change
 * @returns {Object} - Updated lead
 */
async function crmUpdateLeadStatus(crmLeadId, status, userId = null) {
  if (!crmLeadId) {
    throw new Error('crmUpdateLeadStatus called without crmLeadId');
  }

  try {
    logger.info(`📊 Updating lead status in CRM: ${crmLeadId} → ${status}`);

    const data = await crmRequest(
      `/api/integrations/leads/${crmLeadId}/status`,
      {
        method: 'PATCH',
        body: {
          status,
          userId: userId || undefined,
        },
      }
    );

    if (data.lead) {
      logger.success(`✅ Lead status updated: ${status}`);
      return data.lead;
    } else {
      throw new Error('CRM did not return updated lead');
    }

  } catch (error) {
    logger.error('❌ CRM updateLeadStatus failed:', error.message);
    throw error;
  }
}

/**
 * Log an activity in CRM
 * POST /api/integrations/activities
 * 
 * @param {Object} payload - Activity data
 * @returns {Object} - Created activity
 */
async function crmLogActivity(payload) {
  try {
    logger.info(`📝 Logging activity in CRM: ${payload.type}`);

    const data = await crmRequest('/api/integrations/activities', {
      method: 'POST',
      body: payload,
    });

    if (data.activity) {
      logger.success(`✅ Activity logged: ${payload.type}`);
      return data.activity;
    } else {
      throw new Error('CRM did not return activity data');
    }

  } catch (error) {
    // Activity logging failures should not break the main flow
    logger.warn('⚠️ CRM logActivity failed (non-critical):', error.message);
    return null;
  }
}

/**
 * Batch create/update multiple leads in CRM
 * Used for migration scripts
 * 
 * @param {Array} leads - Array of lead data objects
 * @returns {Object} - { created: number, updated: number, failed: number, details: array }
 */
async function batchSyncLeads(leads) {
  try {
    logger.info(`📦 Batch syncing ${leads.length} leads to CRM...`);

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      details: []
    };

    for (const lead of leads) {
      try {
        const syncResult = await syncLeadToCRM(lead);
        
        if (syncResult.isNew) {
          results.created++;
        } else {
          results.updated++;
        }

        results.details.push({
          email: lead.email,
          action: syncResult.action,
          crmLeadId: syncResult.crmLead._id,
          success: true
        });

        // Small delay to avoid overwhelming CRM
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        results.failed++;
        results.details.push({
          email: lead.email,
          action: 'failed',
          error: error.message,
          success: false
        });
        
        logger.error(`❌ Failed to sync lead ${lead.email}:`, error.message);
      }
    }

    logger.success(`✅ Batch sync complete: ${results.created} created, ${results.updated} updated, ${results.failed} failed`);

    return results;

  } catch (error) {
    logger.error('❌ Batch sync failed:', error.message);
    throw error;
  }
}

module.exports = {
  crmCreateLead,
  crmUpdateLead,
  crmUpdateLeadStatus,
  crmLogActivity,
  checkLeadExists,
  syncLeadToCRM,
  batchSyncLeads
};
