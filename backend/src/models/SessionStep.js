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
      // Phase 0: Arrival
      'intro',
      'context_check',
      // Phase 1: Body Downshift
      'body_choice',
      'breathing',
      'grounding_5_4_3_2_1',
      // Phase 2: Dump & Name
      'intensity_scale',
      'dump_text',
      'dump_voice',
      'spiral_title',
      // Phase 3: Understand & Unhook
      'cbt_question',
      'defusion',
      'acceptance',
      'reframe_review',
      // Phase 4: Self-Compassion
      'self_compassion_script',
      'common_humanity',
      // Phase 5: Choose Path
      'sleep_or_action_choice',
      'action_plan',
      // Phase 6: Closing
      'sleep_wind_down',
      'future_orientation',
      'final_intensity',
      'summary',
      // Utility
      'choice_buttons',
      'sleep_choice',
      'crisis_info',
    ],
    required: true,
  },
  
  // Phase tracking
  phaseNumber: {
    type: Number,
    min: 0,
    max: 6,
  },
  phaseName: {
    type: String,
    enum: ['arrival', 'body_downshift', 'dump_and_name', 'understand_unhook', 'self_compassion', 'choose_path', 'closing'],
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
