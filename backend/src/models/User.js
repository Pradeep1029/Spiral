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
  
  // Onboarding data (UPGRADED)
  onboarding: {
    completed: {
      type: Boolean,
      default: false,
    },
    spiralPatterns: [{
      type: String,
      enum: [
        'replay_conversations',
        'obsess_mistakes',
        'worry_tomorrow',
        'failure_thoughts',
        'anger_at_others',
        'health_anxiety',
        'existential_thinking',
        'catastrophize_future',
        'cant_switch_off',
      ],
    }],
    spiralTiming: {
      type: String,
      enum: ['late_night', 'before_sleep', 'random', 'morning', 'other', 'middle_night', 'evenings', 'anytime'],
    },
    spiralTopics: [{
      type: String,
      enum: ['work', 'relationships', 'money', 'health', 'family', 'self_worth', 'life_direction', 'other'],
    }],
    emotionalFlavors: [{
      type: String,
      enum: ['anxiety', 'shame', 'sadness', 'anger', 'guilt', 'mixed'],
    }],
    helpPreference: {
      type: String,
      enum: ['help_me_think_more_clearly', 'help_me_be_kinder_to_myself', 'help_me_calm_my_body', 'not_sure'],
    },
    effortTolerance: {
      type: String,
      enum: ['dont_mind_questions', 'keep_it_short_at_night'],
    },
    completedAt: Date,
    // v2 enhanced onboarding fields
    emotionalFlavors: [{
      type: String,
      enum: ['anxiety', 'shame', 'sadness', 'anger', 'guilt', 'fear', 'hopelessness', 'mixed'],
    }],
    helpStylePreference: {
      type: String,
      enum: ['think_clearly', 'be_kinder', 'calm_body', 'not_sure'],
    },
    effortTolerance: {
      type: String,
      enum: ['dont_mind_questions', 'keep_it_short_at_night', 'depends_on_mood'],
    },
    // Autopilot consent captured during onboarding
    autopilotConsent: {
      type: Boolean,
      default: false,
    },
  },
  
  // User profile & preferences (AI-driven personalization)
  profile: {
    displayName: String,
    
    // Spiral topics (updated from onboarding + AI classification)
    spiralTopics: [{
      type: String,
      enum: ['work', 'relationships', 'money', 'health', 'self', 'other'],
    }],
    
    // Input preferences
    preferredInputMode: {
      type: String,
      enum: ['text', 'voice', 'either'],
      default: 'either',
    },
    
    // AI style preferences (learned over time)
    preferredStyle: {
      type: String,
      enum: ['logic', 'compassion', 'short', 'long', 'unknown'],
      default: 'unknown',
    },
    
    // Learned dislikes (AI updates these)
    hatesBreathingExercises: {
      type: Boolean,
      default: false,
    },
    prefersLogicOverVisualization: {
      type: Boolean,
      default: false,
    },
    likesSelfCompassion: {
      type: Boolean,
      default: false,
    },
    
    // Notification preferences (legacy)
    nightlyCheckinEnabled: {
      type: Boolean,
      default: true,
    },
    nightlyCheckinTime: {
      type: String,
      default: '22:30',
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
  },

  // Autopilot settings (v2)
  autopilot: {
    enabled: {
      type: Boolean,
      default: false,
    },
    lateNightPromptsEnabled: {
      type: Boolean,
      default: true,
    },
    daytimeFollowupsEnabled: {
      type: Boolean,
      default: true,
    },
    eveningCheckinsEnabled: {
      type: Boolean,
      default: true,
    },
    maxPromptsPerDay: {
      type: Number,
      default: 2,
      min: 1,
      max: 3,
    },
    // User's typical sleep window
    sleepWindowStart: {
      type: String,
      default: '22:00', // HH:MM format
    },
    sleepWindowEnd: {
      type: String,
      default: '07:00',
    },
    // Tracking for notification throttling
    promptsSentToday: {
      type: Number,
      default: 0,
    },
    lastPromptResetDate: {
      type: Date,
    },
    lastPromptSentAt: {
      type: Date,
    },
    // Specific notification type toggles
    preSpiraleveningEnabled: {
      type: Boolean,
      default: true,
    },
    nightUnlockEnabled: {
      type: Boolean,
      default: true,
    },
    nextDayFollowupEnabled: {
      type: Boolean,
      default: true,
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
