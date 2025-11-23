const mongoose = require('mongoose');

const interventionEventSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
    index: true,
  },
  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Intervention type
  type: {
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
      'intensity_check',
      'other',
    ],
    required: true,
  },
  
  // Timestamps
  startedAt: {
    type: Date,
    default: Date.now,
  },
  endedAt: Date,
  
  // AI payload (what the AI generated for this intervention)
  aiPayload: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  
  // User feedback on this specific intervention
  userFeedback: {
    type: String,
    enum: ['positive', 'neutral', 'negative', 'none'],
    default: 'none',
  },
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Indexes
interventionEventSchema.index({ session: 1, startedAt: 1 });
interventionEventSchema.index({ user: 1, type: 1 });

// Virtual for duration
interventionEventSchema.virtual('duration').get(function() {
  if (this.endedAt) {
    return Math.round((this.endedAt - this.startedAt) / 1000); // seconds
  }
  return null;
});

interventionEventSchema.set('toJSON', { virtuals: true });
interventionEventSchema.set('toObject', { virtuals: true });

const InterventionEvent = mongoose.model('InterventionEvent', interventionEventSchema);

module.exports = InterventionEvent;
