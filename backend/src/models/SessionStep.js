const mongoose = require('mongoose');

const sessionStepSchema = new mongoose.Schema({
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
  
  stepId: {
    type: String,
    required: true,
  },
  
  stepType: {
    type: String,
    enum: [
      'intro',
      'intensity_scale',
      'breathing',
      'grounding_5_4_3_2_1',
      'dump_text',
      'dump_voice',
      'choice_buttons',
      'cbt_question',
      'reframe_review',
      'self_compassion_script',
      'sleep_choice',
      'sleep_wind_down',
      'action_plan',
      'summary',
      'crisis_info',
    ],
    required: true,
  },
  
  // Full step JSON as returned by AI
  stepData: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  
  // User's answer to this step
  answer: {
    type: mongoose.Schema.Types.Mixed,
  },
  
  // Timing
  startedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: Date,
  
  // Step order
  stepIndex: {
    type: Number,
    required: true,
  },
  
  // Metadata
  interventionType: String,
  skipped: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes
sessionStepSchema.index({ session: 1, stepIndex: 1 });
sessionStepSchema.index({ session: 1, createdAt: 1 });

const SessionStep = mongoose.model('SessionStep', sessionStepSchema);

module.exports = SessionStep;
