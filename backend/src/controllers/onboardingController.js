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
  const {
    spiralPatterns,
    spiralTiming,
    spiralTopics,
    spiralEmotions,
    helpStyle,
    nightEnergy,
    checkInPreferences,
  } = req.body;

  // Check if already completed
  if (req.user.onboarding.completed) {
    return sendError(res, 'Onboarding already completed', 400);
  }

  // Canonicalize topics and emotions for storage/AI
  const canonicalTopics = Array.isArray(spiralTopics)
    ? spiralTopics
      .map(mapTopicKeyToCanonical)
      .filter(Boolean)
    : [];

  const canonicalEmotions = Array.isArray(spiralEmotions)
    ? spiralEmotions
      .map(mapEmotionKeyToCanonical)
      .filter(Boolean)
    : [];

  const helpPreference = mapHelpStyleToPreference(helpStyle);
  const effortTolerance = mapNightEnergyToEffortTolerance(nightEnergy);

  // Update user onboarding data
  req.user.onboarding = {
    completed: true,
    spiralPatterns: spiralPatterns || [],
    spiralTiming,
    spiralTopics: canonicalTopics,
    emotionalFlavors: canonicalEmotions,
    helpPreference,
    effortTolerance,
    completedAt: new Date(),
  };

  // Ensure profile object exists
  if (!req.user.profile) {
    req.user.profile = {};
  }

  // Nightly check-in preferences
  if (checkInPreferences) {
    const enabled = !!checkInPreferences.enabled;
    req.user.profile.nightlyCheckinEnabled = enabled;
    if (enabled && checkInPreferences.time) {
      req.user.profile.nightlyCheckinTime = checkInPreferences.time;
    }
  }

  await req.user.save();

  logger.info(`User completed onboarding: ${req.user._id}`);

  sendSuccess(
    res,
    {
      user: req.user.toPublicJSON(),
    },
    'Onboarding completed successfully'
  );
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
  const {
    spiralPatterns,
    spiralTiming,
    spiralTopics,
    spiralEmotions,
    helpStyle,
    nightEnergy,
    checkInPreferences,
  } = req.body;

  // Ensure onboarding object exists
  if (!req.user.onboarding) {
    req.user.onboarding = { completed: false };
  }

  if (spiralPatterns) req.user.onboarding.spiralPatterns = spiralPatterns;
  if (spiralTiming) req.user.onboarding.spiralTiming = spiralTiming;
  if (spiralTopics) {
    req.user.onboarding.spiralTopics = spiralTopics
      .map(mapTopicKeyToCanonical)
      .filter(Boolean);
  }
  if (spiralEmotions) {
    req.user.onboarding.emotionalFlavors = spiralEmotions
      .map(mapEmotionKeyToCanonical)
      .filter(Boolean);
  }
  if (helpStyle) {
    req.user.onboarding.helpPreference = mapHelpStyleToPreference(helpStyle);
  }
  if (nightEnergy) {
    req.user.onboarding.effortTolerance = mapNightEnergyToEffortTolerance(
      nightEnergy
    );
  }

  // Ensure profile object exists
  if (!req.user.profile) {
    req.user.profile = {};
  }

  if (checkInPreferences) {
    if (typeof checkInPreferences.enabled === 'boolean') {
      req.user.profile.nightlyCheckinEnabled = checkInPreferences.enabled;
    }
    if (checkInPreferences.time) {
      req.user.profile.nightlyCheckinTime = checkInPreferences.time;
    }
  }

  await req.user.save();

  logger.info(`User updated onboarding: ${req.user._id}`);

  sendSuccess(
    res,
    {
      user: req.user.toPublicJSON(),
    },
    'Onboarding updated successfully'
  );
});

// -----------------------------------------------------------------------------
// Helper mappers for onboarding mental map
// -----------------------------------------------------------------------------

function mapTopicKeyToCanonical(key) {
  switch (key) {
    case 'work_study':
      return 'work';
    case 'myself':
      return 'self_worth';
    case 'future_direction':
      return 'life_direction';
    case 'relationships':
    case 'money':
    case 'health':
    case 'family':
      return key;
    default:
      return 'other';
  }
}

function mapEmotionKeyToCanonical(key) {
  switch (key) {
    case 'anxiety_fear':
      return 'anxiety';
    case 'shame_defective':
      return 'shame';
    case 'sadness_grief':
      return 'sadness';
    case 'anger_resentment':
      return 'anger';
    case 'guilt':
      return 'guilt';
    case 'all_over':
      return 'mixed';
    default:
      return null;
  }
}

function mapHelpStyleToPreference(key) {
  switch (key) {
    case 'think_clearly':
      return 'help_me_think_more_clearly';
    case 'kinder_to_self':
      return 'help_me_be_kinder_to_myself';
    case 'calm_body':
      return 'help_me_calm_my_body';
    case 'not_sure':
      return 'not_sure';
    default:
      return undefined;
  }
}

function mapNightEnergyToEffortTolerance(key) {
  switch (key) {
    case 'some_energy':
      return 'dont_mind_questions';
    case 'low_energy':
      return 'keep_it_short_at_night';
    default:
      return undefined;
  }
}
