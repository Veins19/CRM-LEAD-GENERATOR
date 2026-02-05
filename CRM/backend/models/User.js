// backend/models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/**
 * User Schema (CRM)
 * Roles:
 *  - Admin: full access
 *  - Executive: owns/manages leads, can have a specialization
 *
 * ENHANCEMENTS:
 *  - specialization: which service/department this executive represents
 *  - max_active_leads / current_active_leads: optional capacity controls
 */

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['Admin', 'Executive'],
      default: 'Executive',
    },
    active: {
      type: Boolean,
      default: true,
    },

    // Executive specialization for lead routing
    specialization: {
      type: String,
      enum: [
        'Website Optimization',
        'SEO Engineering',
        'Digital Marketing',
        'AI Automation',
        'Custom Website Development',
        'Conversion Optimization',
        'Analytics Implementation',
        'Content Strategy',
        'General', // fallback / catch-all
      ],
      default: 'General',
      index: true,
      description:
        'Primary service/department this executive represents for auto-assignment',
    },

    // Capacity controls for load-balancing
    max_active_leads: {
      type: Number,
      default: 0, // 0 = unlimited
      min: 0,
      description: 'Maximum number of active leads this executive should handle (0 = unlimited)',
    },
    current_active_leads: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Current number of active leads assigned',
    },

    // Optional metadata
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

// Helpful indexes for executive lookup
userSchema.index({ role: 1, active: 1, specialization: 1 });

/**
 * Hash password before saving (Mongoose pre-save hook)
 */
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    console.error('❌ Error hashing password:', error.message);
    throw error;
  }
});

// Method to compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

/**
 * Check if user is an active executive for a given service
 * - role must be Executive
 * - active must be true
 * - specialization must match service OR be 'General'
 * - if max_active_leads > 0, capacity is not exceeded
 */
userSchema.methods.isAvailableForService = function (serviceType) {
  if (this.role !== 'Executive') return false;
  if (!this.active) return false;

  const spec = this.specialization || 'General';
  const matchesService = spec === 'General' || spec === serviceType;
  if (!matchesService) return false;

  // Capacity check (0 = unlimited)
  if (
    typeof this.max_active_leads === 'number' &&
    this.max_active_leads > 0 &&
    typeof this.current_active_leads === 'number' &&
    this.current_active_leads >= this.max_active_leads
  ) {
    return false;
  }
  return true;
};

/**
 * Increment active lead count (for load balancing)
 */
userSchema.methods.incrementActiveLeads = async function () {
  this.current_active_leads = (this.current_active_leads || 0) + 1;
  return this.save();
};

/**
 * Decrement active lead count (for load balancing)
 */
userSchema.methods.decrementActiveLeads = async function () {
  this.current_active_leads = Math.max(
    0,
    (this.current_active_leads || 0) - 1
  );
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
