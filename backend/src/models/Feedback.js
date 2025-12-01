const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
  },
  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Overall session rating
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  
  // Optional comment
  comment: {
    type: String,
    maxlength: 500,
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

// Indexes
feedbackSchema.index({ session: 1 });
feedbackSchema.index({ user: 1, createdAt: -1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
