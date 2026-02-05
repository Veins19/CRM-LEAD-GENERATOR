// backend/controllers/leadController.js

const Lead = require('../models/Lead');
const Notification = require('../models/Notification');
const logActivity = require('../utils/logActivity');
const fs = require('fs');
const csv = require('csv-parser');
const { Parser } = require('json2csv');

/**
 * Helper: read CSV file into rows (array of objects)
 */
const readCsvFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
};

/**
 * Helper to build query object from request parameters
 * Ensures consistency between getAllLeads and exportLeadsCSV
 */
const buildLeadQuery = (req) => {
  const {
    search,
    status,
    assignedTo,
    archived,
    startDate,
    endDate,
    tags,
  } = req.query;

  const query = {};

  // 1. Role-based Access & Assignee Filter
  if (req.user.role === 'Executive') {
    query.assignedTo = req.user._id;
  } else {
    if (assignedTo === 'unassigned') {
      query.assignedTo = null;
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
    }
  }

  // 2. Search
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
      { contact: { $regex: search, $options: 'i' } },
    ];
  }

  // 3. Status
  if (status) {
    query.status = status;
  }

  // 4. Tags
  if (tags) {
    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t);
    if (tagList.length > 0) {
      query.tags = { $in: tagList };
    }
  }

  // 5. Archived (Default to false if not specified)
  if (archived !== undefined) {
    query.archived = archived === 'true';
  } else {
    query.archived = false;
  }

  // 6. Date Range
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  return query;
};

/**
 * Get all leads
 * GET /api/leads
 */
const getAllLeads = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } =
      req.query;

    const query = buildLeadQuery(req);

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const leads = await Lead.find(query)
      .populate('assignedTo', 'username email')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const count = await Lead.countDocuments(query);

    console.log(`✅ Retrieved ${leads.length} leads (Page ${page}, Total ${count})`);

    res.status(200).json({
      success: true,
      leads,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalLeads: count,
    });
  } catch (error) {
    console.error('❌ Error fetching leads:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leads',
      error: error.message,
    });
  }
};

/**
 * Get lead by ID
 * GET /api/leads/:id
 */
const getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate(
      'assignedTo',
      'username email'
    );

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Access Control
    if (
      req.user.role === 'Executive' &&
      lead.assignedTo?._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.status(200).json({ success: true, lead });
  } catch (error) {
    console.error('❌ Error fetching lead:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead',
      error: error.message,
    });
  }
};

/**
 * Create new lead
 * POST /api/leads
 */
const createLead = async (req, res) => {
  try {
    const { name, email, contact, company, status, assignedTo, notes, tags } =
      req.body;

    if (!name || !email || !contact) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and contact are required',
      });
    }

    // Auto-assign if executive
    let assignee = assignedTo;
    if (req.user.role === 'Executive') {
      assignee = req.user._id;
    }

    const lead = new Lead({
      name,
      email,
      contact,
      company,
      status: status || 'New',
      assignedTo: assignee || null,
      notes,
      tags: tags || [],
    });

    await lead.save();

    await logActivity(lead._id, req.user._id, 'Create', `Lead created: ${lead.name}`);

    // Notification logic
    if (assignee && assignee.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: assignee,
        message: `You have been assigned a new lead: ${lead.name}`,
        relatedId: lead._id,
        type: 'assignment',
      });
    }

    res
      .status(201)
      .json({ success: true, message: 'Lead created successfully', lead });
  } catch (error) {
    console.error('❌ Error creating lead:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create lead',
      error: error.message,
    });
  }
};

/**
 * Update lead
 * PUT /api/leads/:id
 */
const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead)
      return res.status(404).json({ success: false, message: 'Lead not found' });

    if (
      req.user.role === 'Executive' &&
      lead.assignedTo?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const oldStatus = lead.status;
    const oldAssignee = lead.assignedTo;
    const { name, email, contact, company, status, assignedTo, notes, tags } =
      req.body;

    if (name) lead.name = name;
    if (email) lead.email = email;
    if (contact) lead.contact = contact;
    if (company !== undefined) lead.company = company;
    if (status) lead.status = status;
    if (notes !== undefined) lead.notes = notes;
    if (tags !== undefined) lead.tags = tags;

    // Reassignment (Admin only)
    if (assignedTo !== undefined && req.user.role === 'Admin') {
      lead.assignedTo = assignedTo;
      if (
        assignedTo &&
        assignedTo.toString() !== (oldAssignee ? oldAssignee.toString() : '')
      ) {
        await Notification.create({
          recipient: assignedTo,
          message: `Lead "${lead.name}" has been reassigned to you.`,
          relatedId: lead._id,
          type: 'assignment',
        });
      }
    }

    await lead.save();

    // Log Activity
    if (status && status !== oldStatus) {
      await logActivity(
        lead._id,
        req.user._id,
        'Status Change',
        `Status changed from ${oldStatus} to ${status}`,
        oldStatus,
        status
      );
    } else {
      await logActivity(lead._id, req.user._id, 'Edit', `Lead updated: ${lead.name}`);
    }

    res
      .status(200)
      .json({ success: true, message: 'Lead updated successfully', lead });
  } catch (error) {
    console.error('❌ Error updating lead:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update lead',
      error: error.message,
    });
  }
};

/**
 * Delete lead (Archive)
 * DELETE /api/leads/:id
 */
const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead)
      return res.status(404).json({ success: false, message: 'Lead not found' });

    if (req.user.role !== 'Admin') {
      return res
        .status(403)
        .json({ success: false, message: 'Access denied. Admin only.' });
    }

    lead.archived = true;
    await lead.save();

    await logActivity(lead._id, req.user._id, 'Archive', `Lead archived: ${lead.name}`);

    res
      .status(200)
      .json({ success: true, message: 'Lead archived successfully' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete lead',
      error: error.message,
    });
  }
};

/**
 * Assign lead (Patch)
 * PATCH /api/leads/:id/assign
 */
const assignLead = async (req, res) => {
  try {
    const { userId } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead)
      return res.status(404).json({ success: false, message: 'Lead not found' });

    if (req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    lead.assignedTo = userId || null;
    await lead.save();

    await logActivity(
      lead._id,
      req.user._id,
      'Edit',
      `Lead assigned to user: ${userId || 'Unassigned'}`
    );

    if (userId) {
      await Notification.create({
        recipient: userId,
        message: `You have been assigned a lead: ${lead.name}`,
        relatedId: lead._id,
        type: 'assignment',
      });
    }

    res
      .status(200)
      .json({ success: true, message: 'Lead assigned successfully', lead });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to assign lead',
      error: error.message,
    });
  }
};

/**
 * Bulk Assign
 */
const bulkAssignLeads = async (req, res) => {
  try {
    const { leadIds, userId } = req.body;
    if (req.user.role !== 'Admin')
      return res.status(403).json({ success: false, message: 'Admin only' });
    if (!leadIds || !Array.isArray(leadIds))
      return res
        .status(400)
        .json({ success: false, message: 'Invalid lead IDs' });

    const result = await Lead.updateMany(
      { _id: { $in: leadIds } },
      { assignedTo: userId || null }
    );

    for (const leadId of leadIds) {
      await logActivity(
        leadId,
        req.user._id,
        'Edit',
        `Bulk assigned to user: ${userId || 'Unassigned'}`
      );
    }

    if (userId) {
      await Notification.create({
        recipient: userId,
        message: `You have been assigned ${leadIds.length} new leads via bulk action.`,
        type: 'assignment',
      });
    }

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} leads assigned`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Bulk assign failed',
      error: error.message,
    });
  }
};

/**
 * Bulk Archive
 */
const bulkArchiveLeads = async (req, res) => {
  try {
    const { leadIds } = req.body;
    if (req.user.role !== 'Admin')
      return res.status(403).json({ success: false, message: 'Admin only' });
    if (!leadIds || !Array.isArray(leadIds))
      return res
        .status(400)
        .json({ success: false, message: 'Invalid lead IDs' });

    const result = await Lead.updateMany(
      { _id: { $in: leadIds } },
      { archived: true }
    );

    for (const leadId of leadIds) {
      await logActivity(leadId, req.user._id, 'Archive', 'Bulk archived');
    }

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} leads archived`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Bulk archive failed',
      error: error.message,
    });
  }
};

/**
 * Bulk Delete
 */
const bulkDeleteLeads = async (req, res) => {
  try {
    const { leadIds } = req.body;
    if (req.user.role !== 'Admin')
      return res.status(403).json({ success: false, message: 'Admin only' });
    if (!leadIds || !Array.isArray(leadIds))
      return res
        .status(400)
        .json({ success: false, message: 'Invalid lead IDs' });

    for (const leadId of leadIds) {
      await logActivity(leadId, req.user._id, 'Delete', 'Bulk deleted (permanent)');
    }

    const result = await Lead.deleteMany({ _id: { $in: leadIds } });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} leads deleted`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Bulk delete failed',
      error: error.message,
    });
  }
};

/**
 * Restore Lead
 */
const restoreLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead)
      return res.status(404).json({ success: false, message: 'Lead not found' });
    if (req.user.role !== 'Admin')
      return res.status(403).json({ success: false, message: 'Admin only' });

    lead.archived = false;
    await lead.save();
    await logActivity(lead._id, req.user._id, 'Restore', `Lead restored: ${lead.name}`);

    res.status(200).json({ success: true, message: 'Lead restored', lead });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Restore failed',
      error: error.message,
    });
  }
};

/**
 * Upload File
 */
const uploadFile = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead)
      return res.status(404).json({ success: false, message: 'Lead not found' });
    if (!req.file)
      return res.status(400).json({ success: false, message: 'No file uploaded' });

    lead.filePath = req.file.path;
    await lead.save();
    await logActivity(
      lead._id,
      req.user._id,
      'Edit',
      `File uploaded: ${req.file.originalname}`
    );

    res.status(200).json({
      success: true,
      message: 'File uploaded',
      filePath: req.file.path,
      lead,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Upload failed',
      error: error.message,
    });
  }
};

/**
 * Import Leads (CSV or JSON)
 * POST /api/leads/import
 */
const importLeadsCSV = async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: 'No file uploaded for import' });
  }

  const filePath = req.file.path;
  const originalName = req.file.originalname.toLowerCase();
  const isJson =
    originalName.endsWith('.json') ||
    (req.file.mimetype && req.file.mimetype.includes('json'));

  const processRows = async (rows) => {
    let importedCount = 0;
    const errors = [];

    for (const row of rows) {
      try {
        const name = row.name || row.fullName;
        const email = row.email;
        const contact = row.contact || row.phone || row.phoneNumber;

        if (!name || !email || !contact) {
          errors.push(
            `Skipped ${name || 'unknown'}: Missing required name, email or contact`
          );
          continue;
        }

        let tags = [];
        if (Array.isArray(row.tags)) {
          tags = row.tags.map((t) => String(t).trim()).filter(Boolean);
        } else if (typeof row.tags === 'string' && row.tags.trim()) {
          tags = row.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
        }

        const lead = new Lead({
          name,
          email,
          contact,
          company: row.company || '',
          status: row.status || 'New',
          tags,
          assignedTo: req.user.role === 'Executive' ? req.user._id : null,
        });

        await lead.save();
        importedCount++;
      } catch (err) {
        errors.push(
          `Error importing ${row.name || 'unknown'}: ${err.message}`
        );
      }
    }

    return { importedCount, errors };
  };

  try {
    let rows;

    if (isJson) {
      // JSON import
      const fileData = await fs.promises.readFile(filePath, 'utf8');
      let parsed = JSON.parse(fileData);

      if (Array.isArray(parsed)) {
        rows = parsed;
      } else if (parsed && Array.isArray(parsed.leads)) {
        rows = parsed.leads;
      } else {
        return res.status(400).json({
          success: false,
          message:
            'Invalid JSON format. Expected an array of leads or { "leads": [...] }',
        });
      }

      const { importedCount, errors } = await processRows(rows);
      console.log(`✅ JSON import complete. Imported ${importedCount} leads.`);
      return res.status(200).json({
        success: true,
        message: `Imported ${importedCount} leads from JSON.`,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    // CSV import (default)
    rows = await readCsvFile(filePath);
    const { importedCount, errors } = await processRows(rows);
    console.log(`✅ CSV import complete. Imported ${importedCount} leads.`);
    return res.status(200).json({
      success: true,
      message: `Imported ${importedCount} leads from CSV.`,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('❌ Import Failed:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Import failed',
      error: error.message,
    });
  } finally {
    // Best-effort cleanup
    fs.unlink(filePath, () => {});
  }
};

/**
 * Export Leads (CSV or JSON) – respects current filters
 * GET /api/leads/export?format=csv|json
 */
const exportLeadsCSV = async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    const query = buildLeadQuery(req);

    const leads = await Lead.find(query).populate('assignedTo', 'username email');

    if (format === 'json') {
      // Export JSON array of simplified lead objects
      const payload = leads.map((lead) => ({
        name: lead.name,
        email: lead.email,
        contact: lead.contact,
        company: lead.company,
        status: lead.status,
        tags: lead.tags || [],
        assignedTo: lead.assignedTo ? lead.assignedTo.username : null,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        archived: lead.archived,
        _id: lead._id,
      }));

      res.header('Content-Type', 'application/json');
      res.attachment('leads_export.json');
      return res.send(JSON.stringify(payload, null, 2));
    }

    // Default: CSV export
    const fields = [
      'name',
      'email',
      'contact',
      'company',
      'status',
      'tags',
      'assignedTo.username',
      'createdAt',
    ];
    const opts = { fields };
    const parser = new Parser(opts);
    const csvData = parser.parse(leads);

    res.header('Content-Type', 'text/csv');
    res.attachment('leads_export.csv');
    return res.send(csvData);
  } catch (error) {
    console.error('❌ Export Error:', error);
    res.status(500).json({
      success: false,
      message: 'Export Failed',
      error: error.message,
    });
  }
};

module.exports = {
  getAllLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  assignLead,
  bulkAssignLeads,
  bulkArchiveLeads,
  bulkDeleteLeads,
  restoreLead,
  uploadFile,
  importLeadsCSV,
  exportLeadsCSV,
};
