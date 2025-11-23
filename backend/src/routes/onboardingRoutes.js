const express = require('express');
const router = express.Router();
const {
  completeOnboarding,
  getOnboardingStatus,
  updateOnboarding,
} = require('../controllers/onboardingController');
const { protect } = require('../middleware/auth');
const { onboardingValidators, validate } = require('../utils/validators');

// All routes require authentication
router.post('/complete', protect, onboardingValidators.complete, validate, completeOnboarding);
router.get('/status', protect, getOnboardingStatus);
router.put('/update', protect, updateOnboarding);

module.exports = router;
