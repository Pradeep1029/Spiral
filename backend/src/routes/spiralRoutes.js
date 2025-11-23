const express = require('express');
const router = express.Router();
const {
  startSession,
  updateStep,
  completeSession,
  getHistory,
  getSession,
  abandonSession,
} = require('../controllers/spiralController');
const { protect } = require('../middleware/auth');
const { spiralValidators, validate } = require('../utils/validators');

// All routes require authentication
router.post('/start', protect, spiralValidators.start, validate, startSession);
router.get('/history', protect, getHistory);
router.get('/:id', protect, getSession);
router.put('/:id/step', protect, spiralValidators.updateStep, validate, updateStep);
router.put('/:id/complete', protect, spiralValidators.complete, validate, completeSession);
router.put('/:id/abandon', protect, abandonSession);

module.exports = router;
