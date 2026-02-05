// backend/scripts/migrateToCRM.js

require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const Lead = require('../models/Patient');
const { syncLeadToCRM } = require('../services/crmService');

/**
 * migrateToCRM.js
 *
 * One-off migration script to push existing Lead Gen leads into the external CRM.
 * - Finds leads that are NOT yet synced (no crm_lead_id OR crm_sync_status != 'synced')
 * - Calls crmService.syncLeadToCRM for each lead
 * - Updates local lead documents with crm_lead_id + crm_sync_status
 *
 * Usage:
 *   node backend/scripts/migrateToCRM.js
 *
 * Optional env:
 *   MIGRATION_LIMIT=100    // limit number of leads processed in one run
 *   MIGRATION_DRY_RUN=true // log actions but do NOT call CRM
 */

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  // Fail fast if DB URI missing
  // This is a critical configuration error
  // eslint-disable-next-line no-console
  console.error('❌ MONGODB_URI is not set in environment variables');
  process.exit(1);
}

const MIGRATION_LIMIT = parseInt(process.env.MIGRATION_LIMIT || '200', 10);
const DRY_RUN = String(process.env.MIGRATION_DRY_RUN || 'false') === 'true';

/**
 * Connect to MongoDB
 */
async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.success('✅ Connected to MongoDB for CRM migration');
  } catch (error) {
    logger.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

/**
 * Find leads that need CRM sync
 */
async function findLeadsToMigrate(limit) {
  const query = {
    $or: [
      { crm_lead_id: null },
      { crm_lead_id: { $exists: false } },
      { crm_sync_status: { $ne: 'synced' } },
      { crm_sync_status: { $exists: false } },
    ],
    email: { $ne: null },
  };

  const leads = await Lead.find(query)
    .sort({ createdAt: 1 })
    .limit(limit);

  logger.info(
    `📊 Found ${leads.length} leads to migrate (limit=${limit}, dryRun=${DRY_RUN})`
  );

  return leads;
}

/**
 * Build plain CRM payload from Lead document
 * (This mirrors what chatController passes to crmService.syncLeadToCRM,
 *  but maps phone -> contact for the CRM schema.)
 */
function buildCrmPayloadFromLead(lead) {
  const contact = lead.phone || null; // CRM requires "contact", lead-gen stores "phone"

  return {
    name: lead.name,
    email: lead.email,
    contact, // IMPORTANT: this is what CRM /integrations/leads expects
    company: lead.company,
    status:
      lead.status === 'converted'
        ? 'Converted'
        : lead.status === 'lost'
        ? 'Lost'
        : lead.status === 'qualified'
        ? 'Qualified'
        : lead.status === 'contacted'
        ? 'Contacted'
        : 'New',
    tags: [
      'migration',
      'leadgen',
      lead.lead_classification
        ? String(lead.lead_classification).toLowerCase()
        : 'unclassified',
      lead.urgency ? String(lead.urgency).toLowerCase() : 'unknown-urgency',
    ],
    notes:
      lead.notes ||
      `Migrated from LSOptimaize Lead Gen. Score=${lead.lead_score}, Urgency=${lead.urgency || 'N/A'}.`,
    services_interested: lead.services_interested || [],
    primary_service:
      lead.primary_service ||
      (Array.isArray(lead.services_interested) &&
        lead.services_interested[0]) ||
      null,
  };
}

/**
 * Migrate a single lead to CRM
 */
async function migrateSingleLead(lead) {
  try {
    if (!lead.email) {
      logger.warn(`⚠️ Skipping lead ${lead._id} - no email`);
      return {
        success: false,
        skipped: true,
        reason: 'No email on lead',
      };
    }

    // CRM requires "contact" (phone) in /integrations/leads
    if (!lead.phone) {
      logger.warn(
        `⚠️ Skipping lead ${lead._id} (${lead.email}) - no phone/contact available for CRM (contact is required)`
      );
      return {
        success: false,
        skipped: true,
        reason: 'No phone/contact on lead',
      };
    }

    const crmPayload = buildCrmPayloadFromLead(lead);

    if (DRY_RUN) {
      logger.info(
        `🧪 DRY RUN: Would sync lead ${lead.email} (id=${lead._id}) to CRM with payload:`
      );
      logger.object('CRM Payload', crmPayload);

      return {
        success: true,
        skipped: true,
        dryRun: true,
      };
    }

    logger.info(
      `🌉 Migrating lead to CRM: ${lead.email} (id=${lead._id})`
    );

    const syncResult = await syncLeadToCRM(crmPayload);

    // Update local lead with CRM data
    if (syncResult && syncResult.crmLead && syncResult.crmLead._id) {
      lead.crm_lead_id = syncResult.crmLead._id;
      lead.crm_sync_status = 'synced';
      lead.crm_synced_at = new Date();
      lead.crm_sync_error = null;
    } else {
      // If CRM did not return an id, mark as failed
      lead.crm_sync_status = 'failed';
      lead.crm_sync_error = 'CRM did not return lead id';
    }

    await lead.save();

    logger.success(
      `✅ Lead ${lead.email} ${
        syncResult.isNew ? 'created' : 'updated'
      } in CRM (crm_lead_id=${lead.crm_lead_id || 'N/A'})`
    );

    return {
      success: true,
      skipped: false,
      isNew: syncResult.isNew,
      action: syncResult.action,
      crmLeadId: syncResult.crmLead?._id || null,
    };
  } catch (error) {
    logger.error(
      `❌ Failed to migrate lead ${lead.email} (id=${lead._id}):`,
      error.message
    );

    try {
      lead.crm_sync_status = 'failed';
      lead.crm_sync_error = error.message;
      await lead.save();
    } catch (saveError) {
      logger.error(
        `❌ Also failed to save sync error on lead ${lead._id}:`,
        saveError.message
      );
    }

    return {
      success: false,
      skipped: false,
      error: error.message,
    };
  }
}

/**
 * Main migration runner
 */
async function runMigration() {
  await connectToDatabase();

  logger.section('🚀 STARTING CRM MIGRATION');

  try {
    const leads = await findLeadsToMigrate(MIGRATION_LIMIT);

    if (leads.length === 0) {
      logger.info('No leads require CRM migration. Exiting.');
      logger.separator();
      return;
    }

    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const lead of leads) {
      const result = await migrateSingleLead(lead);

      if (result.skipped) {
        skippedCount++;
      } else if (result.success) {
        if (result.isNew) createdCount++;
        else updatedCount++;
      } else {
        failedCount++;
      }

      // Small delay to avoid hammering CRM
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    logger.section('📊 CRM MIGRATION SUMMARY');
    logger.info(`Total leads processed: ${leads.length}`);
    logger.info(`Created in CRM: ${createdCount}`);
    logger.info(`Updated in CRM: ${updatedCount}`);
    logger.info(`Skipped: ${skippedCount}`);
    logger.info(`Failed: ${failedCount}`);
    logger.info(`Dry run mode: ${DRY_RUN ? 'YES' : 'NO'}`);
    logger.separator();
  } catch (error) {
    logger.error('❌ Migration run failed:', error.message);
    logger.separator();
  } finally {
    try {
      await mongoose.connection.close();
      logger.info('🔌 MongoDB connection closed');
    } catch (closeError) {
      logger.error(
        '❌ Error closing MongoDB connection:',
        closeError.message
      );
    }

    // Ensure process exits
    process.exit(0);
  }
}

// Run script if executed directly
if (require.main === module) {
  runMigration();
}

module.exports = {
  runMigration,
};
