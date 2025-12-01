const mongoose = require('mongoose');

/**
 * SpiralArchetype - Represents a user's recurring spiral pattern
 * These are discovered/clustered over time from session data
 */
const spiralArchetypeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // Human-readable archetype label
  name: {
    type: String,
    required: true,
    // e.g., "Work – I'm a fraud", "Health – something is seriously wrong"
  },

  // Shortened label for quick reference
  shortLabel: {
    type: String,
    // e.g., "fraud spiral", "health worry"
  },

  // Primary category
  category: {
    type: String,
    enum: [
      'work_shame',
      'relationship_fear',
      'health_worry',
      'self_worth',
      'existential',
      'life_direction',
      'financial',
      'family',
      'social',
      'performance',
      'general',
    ],
    required: true,
  },

  // Core themes/phrases that define this archetype
  coreThemes: [{
    type: String,
    // e.g., "fraud", "not good enough", "will get fired"
  }],

  // Phrases commonly used in this archetype (extracted from dumps)
  commonPhrases: [{
    phrase: String,
    frequency: Number, // how many times this phrase appeared
  }],

  // Typical emotions associated with this archetype
  typicalEmotions: [{
    type: String,
    enum: ['anxiety', 'shame', 'sadness', 'anger', 'guilt', 'fear', 'hopelessness', 'mixed'],
  }],

  // Typical thought forms
  typicalThoughtForms: [{
    type: String,
    enum: ['worry', 'rumination', 'self_criticism', 'catastrophizing', 'all_or_nothing'],
  }],

  // When this archetype typically occurs
  typicalTimeWindows: [{
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'late_night', 'middle_of_night'],
  }],

  // Statistics
  stats: {
    totalOccurrences: {
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
    lastOccurredAt: Date,
    firstOccurredAt: Date,
  },

  // Methods that have helped most with this archetype (ranked by effectiveness)
  effectiveMethods: [{
    method: {
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
      ],
    },
    effectivenessScore: {
      type: Number, // 0-1 score based on intensity reduction & user feedback
      min: 0,
      max: 1,
    },
    usageCount: Number,
  }],

  // Best method combination for this archetype
  bestMethodSequence: [{
    type: String,
  }],

  // Sessions associated with this archetype
  sessionIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
  }],

  // Confidence score for this archetype (how well-defined it is)
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5,
  },

  // Whether this archetype is active/visible to user
  isActive: {
    type: Boolean,
    default: true,
  },

  // Last time archetype was updated (reclustered)
  lastUpdatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes
spiralArchetypeSchema.index({ user: 1, category: 1 });
spiralArchetypeSchema.index({ user: 1, 'stats.totalOccurrences': -1 });

// Virtual for average intensity reduction
spiralArchetypeSchema.virtual('averageIntensityReduction').get(function() {
  if (this.stats.averageIntensityBefore && this.stats.averageIntensityAfter) {
    return this.stats.averageIntensityBefore - this.stats.averageIntensityAfter;
  }
  return null;
});

spiralArchetypeSchema.set('toJSON', { virtuals: true });
spiralArchetypeSchema.set('toObject', { virtuals: true });

const SpiralArchetype = mongoose.model('SpiralArchetype', spiralArchetypeSchema);

module.exports = SpiralArchetype;
