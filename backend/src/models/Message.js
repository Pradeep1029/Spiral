const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
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
  
  // Message content
  sender: {
    type: String,
    enum: ['user', 'ai', 'system'],
    required: true,
  },
  
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  
  content: {
    type: String,
    required: true,
  },
  
  // For voice messages
  audioUrl: String,
  audioTranscript: String,
  
  // Link to intervention if this message triggered one
  interventionRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InterventionEvent',
  },
  
  // Additional metadata (function calls, etc.)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: false, // Using createdAt manually for consistency
});

// Compound index for efficient message retrieval
messageSchema.index({ session: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
