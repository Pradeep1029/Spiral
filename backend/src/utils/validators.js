const { body, param, query, validationResult } = require('express-validator');
const { sendError } = require('./response');

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
    body('spiralPatterns')
      .isArray({ min: 1 })
      .withMessage('At least one spiral pattern must be selected'),
    body('spiralPatterns.*')
      .isIn(['replay_conversations', 'obsess_mistakes', 'worry_tomorrow', 'failure_thoughts'])
      .withMessage('Invalid spiral pattern'),
    body('spiralTiming')
      .isIn(['before_sleep', 'middle_night', 'random'])
      .withMessage('Invalid spiral timing'),
    body('spiralTopics')
      .isArray({ min: 1 })
      .withMessage('At least one spiral topic must be selected'),
    body('spiralTopics.*')
      .isIn(['work_study', 'relationships', 'money', 'health', 'myself'])
      .withMessage('Invalid spiral topic'),
  ],
};

/**
 * Spiral session validation rules
 */
const spiralValidators = {
  start: [
    body('intensityBefore')
      .isInt({ min: 1, max: 5 })
      .withMessage('Intensity must be between 1 and 5'),
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
    body('intensityAfter')
      .isInt({ min: 1, max: 5 })
      .withMessage('Intensity must be between 1 and 5'),
    body('nextAction')
      .isIn(['try_sleep', 'calm_more'])
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
