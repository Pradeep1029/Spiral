const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Session metadata
  context: {
    type: String,
    enum: ['spiral', 'checkin', 'self_compassion', 'training', 'autopilot_rescue', 'autopilot_buffer'],
    default: 'spiral',
  },
  
  // Session mode (v2)
  mode: {
    type: String,
    enum: ['rescue', 'training', 'quick_rescue', 'buffer'],
    default: 'rescue',
  },
  
  // Training mode specifics
  trainingSkill: {
    type: String,
    enum: ['defusion', 'self_compassion', 'sleep_beliefs', 'cognitive_reframe', 'grounding', 'acceptance'],
  },
  
  // Autopilot trigger type (if applicable)
  autopilotTrigger: {
    type: String,
    enum: ['evening_checkin', 'night_unlock', 'daytime_followup'],
  },
  
  // Timestamps
  startedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  endedAt: Date,
  
  // UPGRADED: Multi-dimensional classification (filled by AI)
  classification: {
    topics: {
      type: mongoose.Schema.Types.Mixed, // { work: 0.3, relationships: 0.8, self_worth: 0.9 }
      default: {},
    },
    thoughtForm: {
      type: String,
      enum: ['worry', 'rumination', 'self_criticism', 'anger', 'grief', 'existential', 'mixed'],
    },
    primaryEmotions: [{
      type: String,
      enum: ['anxiety', 'shame', 'sadness', 'anger', 'guilt', 'mixed'],
    }],
    intensity: {
      type: Number,
      min: 1,
      max: 10,
    },
    context: {
      timeOfDay: {
        type: String,
        enum: ['morning', 'afternoon', 'evening', 'late_night'],
      },
      sleepRelated: {
        type: Boolean,
        default: false,
      },
      acuteTrigger: String, // free text if detected
    },
    cognitiveCapacity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    recommendedStrategies: [{
      type: String,
      enum: [
        'breathing',
        'grounding',
        'expressive_release',
        'brief_cbt',
        'deep_cbt',
        'defusion',
        'self_compassion',
        'behavioral_micro_plan',
        'sleep_wind_down',
        'acceptance_values'
      ],
    }],
    classifiedAt: Date,
  },
  
  // Micro plan (sequence of methods for this session)
  microPlan: [{
    type: String,
    enum: [
      'breathing',
      'grounding',
      'expressive_release',
      'brief_cbt',
      'deep_cbt',
      'defusion',
      'self_compassion',
      'behavioral_micro_plan',
      'sleep_wind_down',
      'acceptance_values',
      'summary'
    ],
  }],
  currentMethodIndex: {
    type: Number,
    default: 0,
  },
  methodStepCount: {
    type: Number,
    default: 0,
  },
  
  // Phase-based flow tracking (v3)
  currentPhase: {
    type: Number,
    min: 0,
    max: 6,
    default: 0,
  },
  phaseHistory: [{
    phaseNumber: Number,
    phaseName: String,
    startedAt: Date,
    completedAt: Date,
    completed: { type: Boolean, default: false },
    stepsCompleted: [String], // step IDs
  }],
  
  // User's path choice in Phase 5
  pathChoice: {
    type: String,
    enum: ['sleep', 'action'],
  },
  
  // Spiral title from Phase 2
  spiralTitle: String,
  
  // User's action plan from Phase 5 (if chosen)
  actionPlan: String,
  
  // Legacy fields (kept for backwards compatibility)
  topic: {
    type: String,
    enum: ['work', 'relationships', 'money', 'health', 'self', 'other', 'unknown'],
    default: 'unknown',
  },
  emotion: {
    type: String,
    enum: ['anxiety', 'shame', 'sadness', 'anger', 'mixed', 'unclear'],
  },
  thinkingStyle: {
    type: String,
    enum: ['catastrophic', 'self_critical', 'worry', 'regret', 'rumination', 'mixed'],
  },
  
  // Intensity tracking
  initialIntensity: {
    type: Number,
    min: 1,
    max: 10,
  },
  finalIntensity: {
    type: Number,
    min: 1,
    max: 10,
  },
  
  // Sleep context
  sleepRelated: {
    type: Boolean,
    default: false,
  },
  
  // Outcome
  outcome: {
    type: String,
    enum: ['calmer', 'same', 'worse', 'unknown'],
    default: 'unknown',
  },
  
  // v2 Enhanced outcome data
  outcomeData: {
    // User-reported helpfulness (1-5 or emoticons)
    helpfulnessRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    // Body arousal rating
    bodyArousalBefore: {
      type: Number,
      min: 1,
      max: 10,
    },
    bodyArousalAfter: {
      type: Number,
      min: 1,
      max: 10,
    },
    // Self-attack level
    selfAttackBefore: {
      type: Number,
      min: 1,
      max: 10,
    },
    selfAttackAfter: {
      type: Number,
      min: 1,
      max: 10,
    },
    // Time to sleep (for sleep-related sessions, self-reported next day)
    timeToSleepMinutes: Number,
    // Qualitative feedback
    whatHelped: String,
    whatDidntHelp: String,
  },
  
  // Archetype association
  archetypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SpiralArchetype',
  },
  archetypeConfidence: {
    type: Number,
    min: 0,
    max: 1,
  },
  archetypeMatchedAt: Date,
  
  // Interventions used (array of types)
  interventionsUsed: [{
    type: String,
    enum: [
      'breathing',
      'grounding',
      'expressive_writing',
      'expressive_release',
      'cbt_question',
      'brief_cbt',
      'deep_cbt',
      'reframe',
      'self_compassion',
      'defusion',
      'sleep_wind_down',
      'action_plan',
      'behavioral_micro_plan',
      'acceptance_values',
    ],
  }],
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  
  // v2 User's raw vent/dump text for archetype clustering
  rawDumpText: String,
  
  // Steps skipped by user (for learning preferences)
  skippedStepTypes: [{
    type: String,
  }],
  
  // Total step count for this session
  totalSteps: {
    type: Number,
    default: 0,
  },
  currentStepIndex: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Indexes for querying
sessionSchema.index({ user: 1, startedAt: -1 });
sessionSchema.index({ user: 1, topic: 1 });
sessionSchema.index({ createdAt: -1 });

// Virtual for duration
sessionSchema.virtual('duration').get(function() {
  if (this.endedAt) {
    return Math.round((this.endedAt - this.startedAt) / 1000); // seconds
  }
  return null;
});

// Virtual for intensity change
sessionSchema.virtual('intensityChange').get(function() {
  if (this.initialIntensity && this.finalIntensity) {
    return this.finalIntensity - this.initialIntensity;
  }
  return null;
});

sessionSchema.set('toJSON', { virtuals: true });
sessionSchema.set('toObject', { virtuals: true });

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
