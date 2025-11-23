const mongoose = require('mongoose');

const spiralSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Session metadata
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned'],
    default: 'in_progress',
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: Date,
  duration: Number, // in seconds
  
  // Step 1: Ground the body
  step1_breathing: {
    completed: {
      type: Boolean,
      default: false,
    },
    skipped: {
      type: Boolean,
      default: false,
    },
    duration: Number,
    completedAt: Date,
  },
  
  // Step 2: Dump the spiral
  step2_dump: {
    completed: {
      type: Boolean,
      default: false,
    },
    text: String,
    audio: String, // URL or reference if audio is used
    duration: Number,
    completedAt: Date,
    
    // AI analysis (optional)
    detectedTopics: [String],
    detectedEmotions: [String],
    cognitiveDistortions: [String],
  },
  
  // Step 3: Choose path and work through
  step3_exit: {
    completed: {
      type: Boolean,
      default: false,
    },
    pathChosen: {
      type: String,
      enum: ['think_through', 'let_go'],
    },
    
    // For "Think it through" path
    thinkThrough: {
      fearQuestion: String, // What exactly are you afraid will happen?
      evidenceFor: String,  // What evidence do you have that this will happen?
      evidenceAgainst: String, // What evidence against?
      
      // Reframe
      reframe: String,
      reframeAccepted: Boolean,
      reframeEdited: String,
      
      // Self-compassion
      selfCompassionLine: String,
    },
    
    // For "Let it float by" path
    letGo: {
      metaphorUsed: {
        type: String,
        enum: ['cloud', 'leaf', 'river'],
      },
      groundingCompleted: Boolean,
      groundingAnswers: {
        see: [String],
        feel: [String],
        hear: [String],
        smell: [String],
        taste: [String],
      },
    },
    
    completedAt: Date,
  },
  
  // Step 4: Sleep mode & close
  step4_close: {
    completed: {
      type: Boolean,
      default: false,
    },
    feelingAfter: {
      type: Number,
      min: 1,
      max: 5,
    },
    nextAction: {
      type: String,
      enum: ['try_sleep', 'calm_more'],
    },
    sleepWindDownCompleted: Boolean,
    completedAt: Date,
  },
  
  // Intensity tracking
  intensityBefore: {
    type: Number,
    min: 1,
    max: 5,
  },
  intensityAfter: {
    type: Number,
    min: 1,
    max: 5,
  },
  
  // Categorization
  primaryTopic: {
    type: String,
    enum: ['work_study', 'relationships', 'money', 'health', 'myself', 'other'],
  },
  
  // Metadata
  deviceInfo: {
    platform: String,
    appVersion: String,
    os: String,
  },
  
}, {
  timestamps: true,
});

// Indexes
spiralSessionSchema.index({ user: 1, createdAt: -1 });
spiralSessionSchema.index({ user: 1, status: 1 });
spiralSessionSchema.index({ startedAt: -1 });

// Calculate duration before saving
spiralSessionSchema.pre('save', function(next) {
  if (this.status === 'completed' && this.completedAt && this.startedAt) {
    this.duration = Math.floor((this.completedAt - this.startedAt) / 1000);
  }
  next();
});

// Method to mark step as complete
spiralSessionSchema.methods.completeStep = function(stepNumber, stepData) {
  const stepField = `step${stepNumber}_${['breathing', 'dump', 'exit', 'close'][stepNumber - 1]}`;
  
  if (this[stepField]) {
    this[stepField] = {
      ...this[stepField],
      ...stepData,
      completed: true,
      completedAt: new Date(),
    };
  }
  
  return this.save();
};

// Method to complete entire session
spiralSessionSchema.methods.completeSession = function(intensityAfter, nextAction) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.intensityAfter = intensityAfter;
  
  if (this.step4_close) {
    this.step4_close.completed = true;
    this.step4_close.feelingAfter = intensityAfter;
    this.step4_close.nextAction = nextAction;
    this.step4_close.completedAt = new Date();
  }
  
  return this.save();
};

// Method to get session summary
spiralSessionSchema.methods.getSummary = function() {
  return {
    id: this._id,
    status: this.status,
    startedAt: this.startedAt,
    completedAt: this.completedAt,
    duration: this.duration,
    intensityBefore: this.intensityBefore,
    intensityAfter: this.intensityAfter,
    primaryTopic: this.primaryTopic,
    pathChosen: this.step3_exit?.pathChosen,
    improvement: this.intensityBefore && this.intensityAfter 
      ? this.intensityBefore - this.intensityAfter 
      : null,
  };
};

const SpiralSession = mongoose.model('SpiralSession', spiralSessionSchema);

module.exports = SpiralSession;
