const mongoose = require('mongoose');

const BODY_LOCATIONS = ['head', 'chest', 'belly', 'hands'];
const PATHS = ['REFRAME', 'COMPASSION', 'ACT', 'PARK', 'CLARITY', 'CRISIS'];

const spiralSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
    },
    durationSec: {
      type: Number,
    },
    entryPoint: {
      type: String,
    },

    arrivalGreeting: {
      type: String,
    },

    bodyLocationPre: {
      type: String,
      enum: BODY_LOCATIONS,
    },
    bodyLocationPost: {
      type: String,
      enum: BODY_LOCATIONS,
    },

    intensityPre: {
      type: Number,
      min: 0,
      max: 10,
    },
    intensityPost: {
      type: Number,
      min: 0,
      max: 10,
    },

    spiralText: {
      type: String,
    },

    path: {
      type: String,
      enum: PATHS,
    },
    pathConfidence: {
      type: Number,
      min: 0,
      max: 100,
    },
    pathReasoning: {
      type: String,
    },

    pathPrompts: {
      type: [String],
      default: [],
    },
    pathAnswers: {
      type: [String],
      default: [],
    },

    closureValidation: {
      type: String,
    },

    anchorRecommended: {
      type: Number,
      min: 0,
      max: 3,
    },
    anchorSelected: {
      type: Number,
      min: 0,
      max: 3,
    },

    currentStep: {
      type: String,
    },

    events: {
      type: Array,
      default: [],
    },
  },
  { timestamps: true }
);

spiralSessionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('SpiralSession', spiralSessionSchema);
