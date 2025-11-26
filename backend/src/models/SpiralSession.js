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

  // Step 2: Dump the spiral (Voice & Tags)
  step2_dump: {
    completed: {
      type: Boolean,
      default: false,
    },
    text: String, // Transcribed text or typed text
    audioUrl: String, // URL to the voice recording
    isVoiceEntry: {
      type: Boolean,
      default: false,
    },
    selectedTags: [String], // "Bubble Cloud" selections (emotions/feelings)
    duration: Number,
    completedAt: Date,

    // AI analysis
    detectedTopics: [String],
    detectedEmotions: [String],
    cognitiveDistortions: [String],
  },

  // Step 3: Process & Defuse (Gamified)
  step3_exit: {
    completed: {
      type: Boolean,
      default: false,
    },
    techniqueUsed: {
      type: String,
      enum: ['defusion', 'weighing', 'other'],
    },

    // For "Thought Defusion" (Letting go)
    defusion: {
      visualTheme: {
        type: String,
        enum: ['clouds', 'leaves', 'balloons'],
      },
      thoughtsReleased: Number, // Count of thoughts "popped" or floated away
    },

    // For "Fact Weighing" (Challenging)
    weighing: {
      beliefStrengthBefore: {
        type: Number,
        min: 0,
        max: 100,
      },
      evidenceFor: [String],
      evidenceAgainst: [String],
      beliefStrengthAfter: {
        type: Number,
        min: 0,
        max: 100,
      },
    },

    completedAt: Date,
  },

  // Step 4: Closing
  step4_close: {
    completed: {
      type: Boolean,
      default: false,
    },
    finalMood: {
      type: Number,
      min: 1,
      max: 10, // Changed to 1-10 for more granularity
    },
    nextAction: {
      type: String,
      enum: ['sleep', 'more_breathing', 'journal', 'nothing'],
    },
    completedAt: Date,
  },

  // Intensity tracking
  intensityBefore: {
    type: Number,
    min: 1,
    max: 10,
    required: true,
  },
  intensityAfter: {
    type: Number,
    min: 1,
    max: 10,
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
spiralSessionSchema.pre('save', function (next) {
  if (this.status === 'completed' && this.completedAt && this.startedAt) {
    this.duration = Math.floor((this.completedAt - this.startedAt) / 1000);
  }
  next();
});

// Method to mark step as complete
spiralSessionSchema.methods.completeStep = function (stepNumber, stepData) {
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
spiralSessionSchema.methods.completeSession = function (intensityAfter, nextAction) {
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
spiralSessionSchema.methods.getSummary = function () {
  return {
    id: this._id,
    status: this.status,
    startedAt: this.startedAt,
    completedAt: this.completedAt,
    duration: this.duration,
    intensityBefore: this.intensityBefore,
    intensityAfter: this.intensityAfter,
    primaryTopic: this.primaryTopic,
    pathChosen: this.step3_exit?.techniqueUsed,
    improvement: this.intensityBefore && this.step4_close?.finalMood
      ? this.intensityBefore - this.step4_close.finalMood
      : null,
  };
};

const SpiralSession = mongoose.model('SpiralSession', spiralSessionSchema);

module.exports = SpiralSession;
