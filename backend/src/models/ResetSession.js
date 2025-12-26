const mongoose = require('mongoose');

const resetSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    quickFinish: {
      type: Boolean,
      default: false,
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
    emotion: {
      type: String,
      enum: ['worry', 'panic', 'shame', 'anger', 'overwhelm'],
      required: true,
    },
    intensityPre: {
      type: Number,
      min: 0,
      max: 10,
      required: false,
    },
    intensityMid: {
      type: Number,
      min: 0,
      max: 10,
    },
    intensityPost: {
      type: Number,
      min: 0,
      max: 10,
    },
    confidencePost: {
      type: Number,
      min: 0,
      max: 10,
    },
    freeText: {
      type: String,
    },
    spiralText: {
      type: String,
    },
    object: {
      type: String,
      enum: ['breathing_orb', 'grounding_tap', 'hum_hold'],
      required: false,
    },
    labelSummary: {
      type: String,
    },
    cbtPath: {
      type: String,
      enum: ['SOLVE', 'REFRAME', 'PARK', 'CONNECT', 'CRISIS_ROUTE'],
    },
    cbtLabel: {
      type: String,
    },
    cbtDistortion: {
      type: String,
    },
    cbtSteps: {
      type: Array,
      default: [],
    },
    cbtAnswers: {
      type: Object,
      default: {},
    },
    closureLine: {
      type: String,
    },
    summaryWhatHelped: {
      type: Array,
      default: [],
    },
    summaryNextLine: {
      type: String,
    },
    summarySkipped: {
      type: Boolean,
      default: false,
    },
    nextAction: {
      type: String,
    },
    fallbackUsed: {
      type: Boolean,
      default: false,
    },
    actionDone: {
      type: Boolean,
    },
    dropoffStep: {
      type: String,
    },
    currentStep: {
      type: String,
    },
    lastProgressAt: {
      type: Date,
    },
    events: {
      type: Array,
      default: [],
    },
    aiReasoning: {
      type: String,
    },
    aiGenerated: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

resetSessionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ResetSession', resetSessionSchema);
