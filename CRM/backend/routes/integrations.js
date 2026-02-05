// backend/routes/integrations.js

const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const User = require('../models/User');

// Allowed statuses taken from Lead schema enum
const STATUS_VALUES =
  (Lead.schema.path('status') && Lead.schema.path('status').enumValues) || [
    'New',
    'Contacted',
    'Qualified',
    'Lost',
    'Won',
    'Converted',
  ];

/**
 * Helper: sanitize user before returning via API
 */
function sanitizeUser(user) {
  if (!user) return null;

  return {
    _id: user._id,
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    active: user.active,
    specialization: user.specialization || 'General',
    max_active_leads: user.max_active_leads || 0,
    current_active_leads: user.current_active_leads || 0,
  };
}

/**
 * Helper: normalize email
 */
function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

/**
 * POST /api/integrations/leads
 * Create a new lead from an external system (chatbot, landing page, etc.).
 *
 * Body:
 * {
 *   name: string,
 *   email: string,
 *   contact?: string,
 *   phone?: string,           // fallback support
 *   company?: string,
 *   status?: "New" | "Contacted" | "Qualified" | "Lost" | "Won" | "Converted",
 *   tags?: string[] | string,
 *   notes?: string,
 *   assignedTo?: string (userId)
 * }
 */
router.post('/leads', async (req, res, next) => {
  try {
    const {
      name,
      email,
      contact,
      phone,
      company,
      status,
      tags,
      notes,
      assignedTo,
    } = req.body || {};

    // Accept either "contact" or "phone" from callers; store as "contact"
    const finalContact = contact || phone || '';

    if (!name || !email || !finalContact) {
      return res.status(400).json({
        success: false,
        message: 'name, email and contact are required',
      });
    }

    let finalStatus = status || 'New';
    if (!STATUS_VALUES.includes(finalStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${STATUS_VALUES.join(', ')}`,
      });
    }

    let finalTags = [];
    if (Array.isArray(tags)) {
      finalTags = tags.map((t) => String(t).trim()).filter(Boolean);
    } else if (typeof tags === 'string' && tags.trim()) {
      finalTags = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
    }

    const lead = await Lead.create({
      name,
      email: normalizeEmail(email),
      contact: finalContact,
      company: company || '',
      status: finalStatus,
      tags: finalTags,
      notes: notes || '',
      assignedTo: assignedTo || null,
    });

    // Log activity for creation (only if we know a user)
    if (assignedTo) {
      await Activity.create({
        type: 'Create',
        details: 'Lead created via integration API',
        lead: lead._id,
        user: assignedTo,
      });
    }

    return res.status(201).json({
      success: true,
      lead,
    });
  } catch (err) {
    console.error('❌ Integration API - create lead failed:', err.message);
    return next(err);
  }
});

/**
 * NEW: GET /api/integrations/leads/check?email=...
 * Check if a lead already exists by email (used by lead-gen to avoid duplicates)
 */
router.get('/leads/check', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.query.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'email query parameter is required',
      });
    }

    const lead = await Lead.findOne({ email });

    if (!lead) {
      return res.status(200).json({
        success: true,
        exists: false,
      });
    }

    return res.status(200).json({
      success: true,
      exists: true,
      lead,
    });
  } catch (err) {
    console.error('❌ Integration API - check lead failed:', err.message);
    return next(err);
  }
});

/**
 * NEW: PATCH /api/integrations/leads/:id
 * Generic lead update for returning leads (used by crmService.crmUpdateLead)
 *
 * Body: partial fields to update, e.g.
 * {
 *   name?, email?, contact?, phone?, company?, status?,
 *   tags?, notes?, assignedTo?, userId?
 * }
 */
router.patch('/leads/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    // Status validation if provided
    if (updates.status) {
      if (!STATUS_VALUES.includes(updates.status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed: ${STATUS_VALUES.join(', ')}`,
        });
      }
      lead.status = updates.status;
    }

    if (typeof updates.name === 'string') lead.name = updates.name;
    if (typeof updates.email === 'string')
      lead.email = normalizeEmail(updates.email);

    // Accept "contact" or "phone" on update as well
    if (typeof updates.contact === 'string' && updates.contact.trim()) {
      lead.contact = updates.contact.trim();
    } else if (typeof updates.phone === 'string' && updates.phone.trim()) {
      lead.contact = updates.phone.trim();
    }

    if (typeof updates.company === 'string') lead.company = updates.company;
    if (typeof updates.notes === 'string') lead.notes = updates.notes;
    if (updates.assignedTo !== undefined) lead.assignedTo = updates.assignedTo;

    if (updates.tags) {
      if (Array.isArray(updates.tags)) {
        lead.tags = updates.tags.map((t) => String(t).trim()).filter(Boolean);
      } else if (typeof updates.tags === 'string') {
        lead.tags = updates.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
      }
    }

    await lead.save();

    // Only log an Activity if we know which user performed the action
    if (updates.userId) {
      await Activity.create({
        type: 'Edit', // valid enum value in Activity model
        details: 'Lead updated via integration API',
        lead: lead._id,
        user: updates.userId,
      });
    }

    return res.status(200).json({
      success: true,
      lead,
    });
  } catch (err) {
    console.error('❌ Integration API - update lead failed:', err.message);
    return next(err);
  }
});

/**
 * PATCH /api/integrations/leads/:id/status
 * Update the status of an existing lead.
 *
 * Body:
 * {
 *   status: one of STATUS_VALUES,
 *   userId?: string (who performed the action, optional)
 * }
 */
router.patch('/leads/:id/status', async (req, res, next) => {
  try {
    const { status, userId } = req.body || {};
    const { id } = req.params;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'status is required',
      });
    }

    if (!STATUS_VALUES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${STATUS_VALUES.join(', ')}`,
      });
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    const before = lead.status;
    if (before === status) {
      return res.status(200).json({
        success: true,
        lead,
        message: 'Status unchanged',
      });
    }

    lead.status = status;
    await lead.save();

    // Only create status-change activity if we know a user
    if (userId) {
      await Activity.create({
        type: 'Status Change',
        details: `Lead status changed via integration from ${before} to ${status}`,
        lead: lead._id,
        user: userId,
        statusBefore: before,
        statusAfter: status,
      });
    }

    return res.status(200).json({
      success: true,
      lead,
    });
  } catch (err) {
    console.error('❌ Integration API - update status failed:', err.message);
    return next(err);
  }
});

/**
 * POST /api/integrations/activities
 * Log an arbitrary activity from your automation system.
 *
 * Body:
 * {
 *   type: string,
 *   details: string,
 *   leadId?: string,
 *   userId?: string,
 *   statusBefore?: string,
 *   statusAfter?: string
 * }
 */
router.post('/activities', async (req, res, next) => {
  try {
    const {
      type,
      details,
      leadId,
      userId,
      statusBefore,
      statusAfter,
    } = req.body || {};

    if (!type || !details) {
      return res.status(400).json({
        success: false,
        message: 'type and details are required',
      });
    }

    // Activity model requires both lead and user; enforce that here
    if (!leadId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'leadId and userId are required for activities',
      });
    }

    const activity = await Activity.create({
      type,
      details,
      lead: leadId,
      user: userId,
      statusBefore: statusBefore || undefined,
      statusAfter: statusAfter || undefined,
    });

    return res.status(201).json({
      success: true,
      activity,
    });
  } catch (err) {
    console.error('❌ Integration API - create activity failed:', err.message);
    return next(err);
  }
});

/**
 * NEW: GET /api/integrations/executives
 * List all executives (and optionally admins) for external systems.
 */
router.get('/executives', async (req, res, next) => {
  try {
    const includeAdmins =
      String(req.query.includeAdmins || 'true').toLowerCase() === 'true';

    const roles = includeAdmins ? ['Executive', 'Admin'] : ['Executive'];

    const users = await User.find({
      role: { $in: roles },
      active: true,
    }).sort({ role: -1, specialization: 1, username: 1 });

    const executives = users.map(sanitizeUser);

    return res.status(200).json({
      success: true,
      executives,
    });
  } catch (err) {
    console.error(
      '❌ Integration API - get executives failed:',
      err.message
    );
    return next(err);
  }
});

/**
 * NEW: GET /api/integrations/executives/by-specialization?specialization=...
 * Find the best executive for a given service specialization.
 * Uses specialization + basic capacity logic.
 */
router.get('/executives/by-specialization', async (req, res, next) => {
  try {
    const specialization = req.query.specialization;

    if (!specialization) {
      return res.status(400).json({
        success: false,
        message: 'specialization query parameter is required',
      });
    }

    // Find all active executives matching this specialization OR General
    const candidates = await User.find({
      role: 'Executive',
      active: true,
      specialization: { $in: [specialization, 'General'] },
    }).sort({ current_active_leads: 1, username: 1 });

    if (!candidates.length) {
      return res.status(200).json({
        success: true,
        executive: null,
        message: 'No executive available for this specialization',
      });
    }

    // Pick first available by capacity
    let chosen = null;
    for (const exec of candidates) {
      if (exec.isAvailableForService(specialization)) {
        chosen = exec;
        break;
      }
    }

    if (!chosen) {
      // All at capacity; still return least-loaded exec so system has someone
      chosen = candidates[0];
    }

    return res.status(200).json({
      success: true,
      executive: sanitizeUser(chosen),
    });
  } catch (err) {
    console.error(
      '❌ Integration API - by-specialization failed:',
      err.message
    );
    return next(err);
  }
});

/**
 * NEW: GET /api/integrations/executives/default
 * Return a default/fallback executive:
 *  - Prefer an Admin if available
 *  - Else an Executive with General specialization
 *  - Else any active Executive
 */
router.get('/executives/default', async (req, res, next) => {
  try {
    // 1) Try Admin
    let user = await User.findOne({
      role: 'Admin',
      active: true,
    }).sort({ createdAt: 1 });

    // 2) Try General Executive
    if (!user) {
      user = await User.findOne({
        role: 'Executive',
        active: true,
        specialization: 'General',
      }).sort({ current_active_leads: 1, createdAt: 1 });
    }

    // 3) Any active Executive
    if (!user) {
      user = await User.findOne({
        role: 'Executive',
        active: true,
      }).sort({ current_active_leads: 1, createdAt: 1 });
    }

    if (!user) {
      return res.status(200).json({
        success: true,
        executive: null,
        message: 'No default executive available',
      });
    }

    return res.status(200).json({
      success: true,
      executive: sanitizeUser(user),
    });
  } catch (err) {
    console.error(
      '❌ Integration API - default executive failed:',
      err.message
    );
    return next(err);
  }
});

/**
 * NEW: GET /api/integrations/executives/:id/validate
 * Validate whether an executive/user exists (used by crmService.validateExecutiveAssignment)
 */
router.get('/executives/:id/validate', async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user || !user.active) {
      return res.status(200).json({
        success: true,
        valid: false,
      });
    }

    return res.status(200).json({
      success: true,
      valid: true,
      executive: sanitizeUser(user),
    });
  } catch (err) {
    console.error(
      '❌ Integration API - validate executive failed:',
      err.message
    );
    return next(err);
  }
});

module.exports = router;
