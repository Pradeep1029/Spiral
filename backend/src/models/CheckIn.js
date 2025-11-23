const mongoose = require('mongoose');

const checkInSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Check-in type
  type: {
    type: String,
    enum: ['nightly', 'quick', 'post_spiral'],
    default: 'quick',
  },
  
  // Mental state
  mentalState: {
    type: String,
    enum: ['calm', 'bit_loud', 'spiraling'],
    required: true,
  },
  
  // Optional intensity rating
  intensity: {
    type: Number,
    min: 1,
    max: 5,
  },
  
  // Optional notes
  notes: String,
  
  // What happened after
  actionTaken: {
    type: String,
    enum: ['nothing', 'started_spiral_rescue', 'self_compassion', 'other'],
  },
  
  // Related sessions
  linkedSpiralSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SpiralSession',
  },
  
  // Metadata
  checkInTime: {
    type: Date,
    default: Date.now,
  },
  scheduledTime: String, // Original scheduled time (e.g., "22:30")
  
  deviceInfo: {
    platform: String,
    appVersion: String,
  },
  
}, {
  timestamps: true,
});

// Indexes
checkInSchema.index({ user: 1, checkInTime: -1 });
checkInSchema.index({ user: 1, type: 1 });
checkInSchema.index({ checkInTime: -1 });

// Method to create follow-up action
checkInSchema.methods.createFollowUpAction = async function() {
  if (this.mentalState === 'spiraling' && !this.linkedSpiralSession) {
    // Would trigger creation of a new spiral session
    return { action: 'start_spiral_rescue' };
  } else if (this.mentalState === 'bit_loud') {
    return { action: 'light_exercise' };
  }
  return { action: 'continue' };
};

const CheckIn = mongoose.model('CheckIn', checkInSchema);

module.exports = CheckIn;
