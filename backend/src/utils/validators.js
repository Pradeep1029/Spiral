const { body, param, query, validationResult } = require('express-validator');
const { sendError } = require('./response');
const logger = require('../config/logger');

/**
 * Middleware to check validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
    }));

    // Debug logging for validation failures
    logger.warn('Validation failed', {
      path: req.originalUrl,
      method: req.method,
      body: req.body,
      errors: formattedErrors,
    });
    return sendError(res, 'Validation failed', 400, formattedErrors);
  }
  next();
};

/**
 * Auth validation rules
 */
const authValidators = {
  register: [
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .optional()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
  ],

  login: [
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('anonymousId')
      .optional()
      .isString()
      .withMessage('Anonymous ID must be a string'),
    body('password')
      .optional()
      .isString()
      .withMessage('Password is required'),
  ],
};

/**
 * Onboarding validation rules
 */
const onboardingValidators = {
  complete: [
    // Spiral patterns (multi-select)
    body('spiralPatterns')
      .isArray({ min: 1 })
      .withMessage('At least one spiral pattern must be selected'),
    body('spiralPatterns.*')
      .isIn([
        'replay_conversations',
        'obsess_mistakes',
        'worry_tomorrow',
        'failure_thoughts',
        'catastrophize_future',
        'cant_switch_off',
      ])
      .withMessage('Invalid spiral pattern'),

    // Timing (single-select)
    body('spiralTiming')
      .isIn(['before_sleep', 'middle_night', 'evenings', 'anytime'])
      .withMessage('Invalid spiral timing'),

    // Topics (multi-select)
    body('spiralTopics')
      .isArray({ min: 1 })
      .withMessage('At least one spiral topic must be selected'),
    body('spiralTopics.*')
      .isIn([
        'work_study',
        'relationships',
        'money',
        'health',
        'family',
        'myself',
        'future_direction',
      ])
      .withMessage('Invalid spiral topic'),

    // Emotional flavors (multi-select)
    body('spiralEmotions')
      .isArray({ min: 1 })
      .withMessage('At least one emotion must be selected'),
    body('spiralEmotions.*')
      .isIn([
        'anxiety_fear',
        'shame_defective',
        'sadness_grief',
        'anger_resentment',
        'guilt',
        'all_over',
      ])
      .withMessage('Invalid emotion'),

    // Help style (single-select)
    body('helpStyle')
      .isIn(['think_clearly', 'kinder_to_self', 'calm_body', 'not_sure'])
      .withMessage('Invalid help style'),

    // Night energy / effort tolerance (single-select)
    body('nightEnergy')
      .isIn(['some_energy', 'low_energy'])
      .withMessage('Invalid night energy preference'),

    // Nightly check-in preferences
    body('checkInPreferences.enabled')
      .optional()
      .isBoolean()
      .withMessage('checkInPreferences.enabled must be a boolean'),
    body('checkInPreferences.time')
      .optional()
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .withMessage('checkInPreferences.time must be in HH:MM format'),
  ],
};

/**
 * Spiral session validation rules
 */
const spiralValidators = {
  start: [
    body('intensityBefore')
      .isInt({ min: 1, max: 10 })
      .withMessage('Intensity must be between 1 and 10'),
    body('primaryTopic')
      .optional()
      .isIn(['work_study', 'relationships', 'money', 'health', 'myself', 'other'])
      .withMessage('Invalid primary topic'),
  ],

  updateStep: [
    param('id')
      .isMongoId()
      .withMessage('Invalid session ID'),
    body('stepNumber')
      .isInt({ min: 1, max: 4 })
      .withMessage('Step number must be between 1 and 4'),
  ],

  complete: [
    param('id')
      .isMongoId()
      .withMessage('Invalid session ID'),
    body('finalMood')
      .isInt({ min: 1, max: 10 })
      .withMessage('Final mood must be between 1 and 10'),
    body('nextAction')
      .isIn(['try_sleep', 'calm_more', 'sleep', 'continue'])
      .withMessage('Invalid next action'),
  ],
};

/**
 * Check-in validation rules
 */
const checkInValidators = {
  create: [
    body('mentalState')
      .isIn(['calm', 'bit_loud', 'spiraling'])
      .withMessage('Invalid mental state'),
    body('intensity')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Intensity must be between 1 and 5'),
    body('notes')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes must be less than 500 characters'),
  ],
};

/**
 * Self-compassion validation rules
 */
const compassionValidators = {
  create: [
    body('feeling')
      .isIn(['ashamed', 'stupid', 'anxious', 'angry', 'sad', 'guilty', 'worthless', 'other'])
      .withMessage('Invalid feeling'),
    body('customFeeling')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Custom feeling must be less than 100 characters'),
    body('customCompassionLine')
      .isString()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Compassion line must be between 1 and 500 characters'),
  ],
};

/**
 * Notification validation rules
 */
const notificationValidators = {
  registerToken: [
    body('token')
      .isString()
      .withMessage('Token is required'),
    body('platform')
      .isIn(['ios', 'android', 'web'])
      .withMessage('Invalid platform'),
  ],

  updatePreferences: [
    body('enableNotifications')
      .optional()
      .isBoolean()
      .withMessage('Enable notifications must be a boolean'),
    body('checkInTime')
      .optional()
      .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .withMessage('Check-in time must be in HH:MM format'),
  ],
};

module.exports = {
  validate,
  authValidators,
  onboardingValidators,
  spiralValidators,
  checkInValidators,
  compassionValidators,
  notificationValidators,
};
