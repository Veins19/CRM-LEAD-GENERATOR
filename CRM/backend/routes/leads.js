// backend/routes/leads.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const {
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
  importLeadsCSV,    // will handle both CSV & JSON internally
  exportLeadsCSV,    // will use req.query.format (csv/json)
} = require('../controllers/leadController');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept common file types including JSON for import
    const allowedExt = /pdf|csv|doc|docx|txt|xlsx|xls|json/;
    const allowedMime = /pdf|csv|msword|officedocument|plain|sheet|json/;

    const lowerName = file.originalname.toLowerCase();
    const extname = allowedExt.test(lowerName);
    const mimetype = allowedMime.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }

    cb(
      new Error(
        'Only PDF, CSV, JSON, DOC, DOCX, TXT, XLS, XLSX files are allowed'
      )
    );
  },
});

// Bulk operations (MUST come before /:id routes to avoid conflicts)
router.post('/bulk/assign', authenticate, authorizeRoles('Admin'), bulkAssignLeads);
router.post('/bulk/archive', authenticate, authorizeRoles('Admin'), bulkArchiveLeads);
router.post('/bulk/delete', authenticate, authorizeRoles('Admin'), bulkDeleteLeads);

// Import (CSV or JSON auto-detected in controller)
router.post(
  '/import',
  authenticate,
  authorizeRoles('Admin', 'Executive'),
  upload.single('file'),
  importLeadsCSV
);

// Export (format decided by ?format=csv|json in controller)
router.get(
  '/export',
  authenticate,
  authorizeRoles('Admin', 'Executive'),
  exportLeadsCSV
);

// GET all leads
router.get('/', authenticate, authorizeRoles('Admin', 'Executive'), getAllLeads);

// CREATE a new lead
router.post('/', authenticate, authorizeRoles('Admin', 'Executive'), createLead);

// GET one lead by ID
router.get('/:id', authenticate, authorizeRoles('Admin', 'Executive'), getLeadById);

// UPDATE lead by ID
router.put('/:id', authenticate, authorizeRoles('Admin', 'Executive'), updateLead);

// SOFT DELETE (archive) lead by ID (Admin only)
router.delete('/:id', authenticate, authorizeRoles('Admin'), deleteLead);

// ASSIGN lead to user (Admin only)
router.patch('/:id/assign', authenticate, authorizeRoles('Admin'), assignLead);

// RESTORE (un-archive) lead by ID (Admin only)
router.patch('/:id/restore', authenticate, authorizeRoles('Admin'), restoreLead);

// FILE UPLOAD for leads
router.post(
  '/:id/upload',
  authenticate,
  authorizeRoles('Admin', 'Executive'),
  upload.single('file'),
  uploadFile
);

module.exports = router;
