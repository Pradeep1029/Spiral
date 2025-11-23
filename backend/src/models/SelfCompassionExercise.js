const mongoose = require('mongoose');

const selfCompassionExerciseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Exercise type
  type: {
    type: String,
    enum: ['standalone', 'post_spiral', 'emergency'],
    default: 'standalone',
  },
  
  // What triggered this
  trigger: {
    type: String,
    enum: ['being_harsh', 'post_spiral', 'general_distress', 'other'],
  },
  
  // Feeling labeled
  feeling: {
    type: String,
    enum: ['ashamed', 'stupid', 'anxious', 'angry', 'sad', 'guilty', 'worthless', 'other'],
  },
  customFeeling: String,
  
  // Core self-compassion statements
  acknowledgedSuffering: {
    type: Boolean,
    default: true,
  },
  acknowledgedHumanity: {
    type: Boolean,
    default: true,
  },
  
  // User's custom self-compassion line
  customCompassionLine: String,
  
  // How helpful was it
  helpfulnessRating: {
    type: Number,
    min: 1,
    max: 5,
  },
  
  // Related sessions
  linkedSpiralSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SpiralSession',
  },
  
  // Timestamps
  startedAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: Date,
  duration: Number, // in seconds
  
}, {
  timestamps: true,
});

// Indexes
selfCompassionExerciseSchema.index({ user: 1, createdAt: -1 });
selfCompassionExerciseSchema.index({ user: 1, type: 1 });

// Calculate duration before saving
selfCompassionExerciseSchema.pre('save', function(next) {
  if (this.completedAt && this.startedAt) {
    this.duration = Math.floor((this.completedAt - this.startedAt) / 1000);
  }
  next();
});

// Method to get a shareable version
selfCompassionExerciseSchema.methods.toShareable = function() {
  return {
    id: this._id,
    feeling: this.feeling || this.customFeeling,
    customCompassionLine: this.customCompassionLine,
    createdAt: this.createdAt,
  };
};

const SelfCompassionExercise = mongoose.model('SelfCompassionExercise', selfCompassionExerciseSchema);

module.exports = SelfCompassionExercise;
