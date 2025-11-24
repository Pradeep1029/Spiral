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
const {
  getNextStep,
  submitStepAnswer,
} = require('../controllers/stepController');

// All routes require authentication
router.use(protect);

// Session routes
router.post('/', createSession);
router.get('/', getSessions);
router.get('/:id', getSession);

// Step-based flow routes (NEW)
router.get('/:id/next_step', getNextStep);
router.post('/:id/steps/:stepId/answer', submitStepAnswer);

// Message route (legacy chat-based)
router.post('/:id/messages', sendMessage);

// Feedback route
router.post('/:id/feedback', submitFeedback);

module.exports = router;
