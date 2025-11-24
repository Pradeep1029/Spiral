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
    enum: ['spiral', 'checkin', 'self_compassion'],
    default: 'spiral',
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
  
  // Interventions used (array of types)
  interventionsUsed: [{
    type: String,
    enum: [
      'breathing',
      'grounding',
      'expressive_writing',
      'cbt_question',
      'reframe',
      'self_compassion',
      'defusion',
      'sleep_wind_down',
      'action_plan',
      'acceptance_values',
    ],
  }],
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
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
