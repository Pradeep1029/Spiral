const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic info
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: false,
    minlength: 6,
    select: false,
  },
  
  // Anonymous users support
  anonymousId: {
    type: String,
    unique: true,
    sparse: true,
  },
  isAnonymous: {
    type: Boolean,
    default: true,
  },
  
  // Onboarding data
  onboarding: {
    completed: {
      type: Boolean,
      default: false,
    },
    spiralPatterns: [{
      type: String,
      enum: ['replay_conversations', 'obsess_mistakes', 'worry_tomorrow', 'failure_thoughts'],
    }],
    spiralTiming: {
      type: String,
      enum: ['before_sleep', 'middle_night', 'random'],
    },
    spiralTopics: [{
      type: String,
      enum: ['work_study', 'relationships', 'money', 'health', 'myself'],
    }],
    completedAt: Date,
  },
  
  // User preferences
  preferences: {
    defaultSpiralPath: {
      type: String,
      enum: ['think_through', 'let_go'],
      default: 'think_through',
    },
    enableNotifications: {
      type: Boolean,
      default: true,
    },
    checkInTime: {
      type: String,
      default: '22:30',
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
  },
  
  // Push notification tokens
  pushTokens: [{
    token: String,
    platform: {
      type: String,
      enum: ['ios', 'android', 'web'],
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  
  // Stats (cached for performance)
  stats: {
    totalSpirals: {
      type: Number,
      default: 0,
    },
    totalCheckIns: {
      type: Number,
      default: 0,
    },
    totalCompassionExercises: {
      type: Number,
      default: 0,
    },
    averageIntensityBefore: {
      type: Number,
      default: 0,
    },
    averageIntensityAfter: {
      type: Number,
      default: 0,
    },
    lastSpiralAt: Date,
    lastCheckInAt: Date,
  },
  
  // Account metadata
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLoginAt: Date,
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ anonymousId: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to convert anonymous user to registered user
userSchema.methods.convertToRegistered = async function(email, password) {
  this.email = email;
  this.password = password;
  this.isAnonymous = false;
  return await this.save();
};

// Method to get public profile
userSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    email: this.email,
    isAnonymous: this.isAnonymous,
    onboarding: this.onboarding,
    preferences: this.preferences,
    stats: this.stats,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
