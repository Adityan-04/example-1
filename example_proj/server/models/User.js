import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'super_admin'],
    default: 'user'
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      webhook: { type: Boolean, default: false }
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free'
    },
    startDate: Date,
    endDate: Date,
    isActive: { type: Boolean, default: true }
  },
  usage: {
    documentsUploaded: { type: Number, default: 0 },
    queriesExecuted: { type: Number, default: 0 },
    storageUsed: { type: Number, default: 0 }, // in bytes
    lastActive: Date
  },
  teams: [{
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    role: { type: String, enum: ['owner', 'admin', 'member', 'viewer'] },
    joinedAt: { type: Date, default: Date.now }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Update last active
userSchema.methods.updateLastActive = function() {
  this.usage.lastActive = new Date();
  return this.save();
};

// Check if user can upload document
userSchema.methods.canUploadDocument = function(fileSize) {
  const limits = {
    free: { maxDocuments: 10, maxFileSize: 10 * 1024 * 1024 }, // 10MB
    pro: { maxDocuments: 100, maxFileSize: 100 * 1024 * 1024 }, // 100MB
    enterprise: { maxDocuments: -1, maxFileSize: 500 * 1024 * 1024 } // 500MB
  };
  
  const limit = limits[this.subscription.plan];
  const canUploadSize = limit.maxFileSize === -1 || fileSize <= limit.maxFileSize;
  const canUploadCount = limit.maxDocuments === -1 || this.usage.documentsUploaded < limit.maxDocuments;
  
  return canUploadSize && canUploadCount;
};

export default mongoose.model('User', userSchema);
