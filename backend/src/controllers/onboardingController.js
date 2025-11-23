const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * @desc    Complete onboarding
 * @route   POST /api/v1/onboarding/complete
 * @access  Private
 */
exports.completeOnboarding = asyncHandler(async (req, res) => {
  const { spiralPatterns, spiralTiming, spiralTopics } = req.body;

  // Check if already completed
  if (req.user.onboarding.completed) {
    return sendError(res, 'Onboarding already completed', 400);
  }

  // Update user onboarding data
  req.user.onboarding = {
    completed: true,
    spiralPatterns,
    spiralTiming,
    spiralTopics,
    completedAt: new Date(),
  };

  await req.user.save();

  logger.info(`User completed onboarding: ${req.user._id}`);

  sendSuccess(res, {
    user: req.user.toPublicJSON(),
  }, 'Onboarding completed successfully');
});

/**
 * @desc    Get onboarding status
 * @route   GET /api/v1/onboarding/status
 * @access  Private
 */
exports.getOnboardingStatus = asyncHandler(async (req, res) => {
  sendSuccess(res, {
    completed: req.user.onboarding.completed,
    onboarding: req.user.onboarding,
  }, 'Onboarding status retrieved');
});

/**
 * @desc    Update onboarding (if user wants to change answers)
 * @route   PUT /api/v1/onboarding/update
 * @access  Private
 */
exports.updateOnboarding = asyncHandler(async (req, res) => {
  const { spiralPatterns, spiralTiming, spiralTopics } = req.body;

  // Update onboarding data
  if (spiralPatterns) req.user.onboarding.spiralPatterns = spiralPatterns;
  if (spiralTiming) req.user.onboarding.spiralTiming = spiralTiming;
  if (spiralTopics) req.user.onboarding.spiralTopics = spiralTopics;

  await req.user.save();

  logger.info(`User updated onboarding: ${req.user._id}`);

  sendSuccess(res, {
    user: req.user.toPublicJSON(),
  }, 'Onboarding updated successfully');
});
