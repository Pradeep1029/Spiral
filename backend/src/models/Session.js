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
  
  // Classification (filled by AI)
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
      'cbt_question',
      'reframe',
      'self_compassion',
      'defusion',
      'sleep_wind_down',
      'action_plan',
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
