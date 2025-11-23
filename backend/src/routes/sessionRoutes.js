const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createSession,
  sendMessage,
  getSessions,
  getSession,
  submitFeedback,
} = require('../controllers/sessionController');

// All routes require authentication
router.use(protect);

// Session routes
router.post('/', createSession);
router.get('/', getSessions);
router.get('/:id', getSession);

// Message route
router.post('/:id/messages', sendMessage);

// Feedback route
router.post('/:id/feedback', submitFeedback);

module.exports = router;
