const logger = require('../config/logger');

/**
 * Generate a micro-plan (sequence of methods) for this session
 * Based on classification + user profile
 * This is rule-based, not AI, for consistency
 * 
 * @param {object} classification - SessionClassification
 * @param {object} userProfile - User onboarding + preferences
 * @returns {string[]} Array of method labels
 */
function generateMicroPlan(classification, userProfile) {
  const { thoughtForm, context, intensity, cognitiveCapacity } = classification;
  const methods = [];

  // Always start with intro (handled separately, not in methods)
  // Always get intensity_scale first (handled separately)

  // 1. PHYSIOLOGICAL GROUNDING (if needed)
  if (context.sleepRelated && context.timeOfDay === 'late_night') {
    // Late night + sleep = start with body regulation
    if (userProfile.profile?.hatesBreathingExercises) {
      methods.push('grounding');
    } else {
      methods.push('breathing');
    }
  } else if (intensity >= 7 && cognitiveCapacity === 'low') {
    // High intensity + low capacity = grounding first
    methods.push('grounding');
  }

  // 2. EXPRESSIVE RELEASE
  // Always allow venting early
  methods.push('expressive_release');

  // 3. CORE COGNITIVE/EMOTIONAL METHOD (based on thought form)
  switch (thoughtForm) {
    case 'self_criticism':
      // Self-criticism: CBT + self-compassion
      if (cognitiveCapacity !== 'low') {
        methods.push('brief_cbt');
      }
      methods.push('self_compassion');
      break;

    case 'worry':
      // Worry: CBT to challenge catastrophizing
      methods.push('brief_cbt');
      // Action plan if not late night
      if (!context.sleepRelated && context.timeOfDay !== 'late_night') {
        methods.push('behavioral_micro_plan');
      }
      break;

    case 'rumination':
      // Rumination: Defusion to unhook from stuck thoughts
      methods.push('defusion');
      // Maybe light CBT if capacity allows
      if (cognitiveCapacity !== 'low' && intensity <= 7) {
        methods.push('brief_cbt');
      }
      break;

    case 'anger':
      // Anger: More expressive release, then defusion
      methods.push('defusion');
      // Self-compassion if anger is self-directed
      if (hasPattern(userProfile, 'obsess_mistakes') || hasPattern(userProfile, 'failure_thoughts')) {
        methods.push('self_compassion');
      }
      break;

    case 'grief':
      // Grief: Acceptance + self-compassion
      methods.push('acceptance_values');
      methods.push('self_compassion');
      break;

    case 'existential':
      // Existential: Values clarification
      methods.push('acceptance_values');
      break;

    case 'mixed':
    default:
      // Mixed/unclear: Default path
      if (cognitiveCapacity !== 'low') {
        methods.push('brief_cbt');
      }
      methods.push('self_compassion');
      break;
  }

  // 4. SLEEP WIND-DOWN (if late night context)
  if (context.sleepRelated && context.timeOfDay === 'late_night') {
    methods.push('sleep_wind_down');
  }

  // 5. ALWAYS END WITH SUMMARY
  methods.push('summary');

  // Trim if user prefers short sessions
  if (userProfile.onboarding?.effortTolerance === 'keep_it_short_at_night') {
    methods = trimForShortSession(methods, context);
  }

  logger.info('Generated micro plan', {
    thoughtForm,
    methods,
    methodCount: methods.length,
  });

  return methods;
}

/**
 * Check if user has a specific pattern
 */
function hasPattern(userProfile, patternName) {
  return userProfile.onboarding?.spiralPatterns?.includes(patternName) || false;
}

/**
 * Trim methods for short session preference
 * Keep: grounding/breathing → expressive → 1 core method → sleep_wind_down → summary
 */
function trimForShortSession(methods, context) {
  const trimmed = [];
  let coreMethodCount = 0;

  for (const method of methods) {
    // Always keep grounding/breathing if present
    if (method === 'breathing' || method === 'grounding') {
      trimmed.push(method);
      continue;
    }

    // Always keep expressive release
    if (method === 'expressive_release') {
      trimmed.push(method);
      continue;
    }

    // Always keep sleep wind down if late night
    if (method === 'sleep_wind_down' && context.sleepRelated) {
      trimmed.push(method);
      continue;
    }

    // Always keep summary
    if (method === 'summary') {
      trimmed.push(method);
      continue;
    }

    // For core methods, only keep 1
    if (coreMethodCount === 0) {
      trimmed.push(method);
      coreMethodCount++;
    }
  }

  return trimmed;
}

/**
 * Get current method and stage from session state
 * @param {object} session - Session document
 * @returns {object} { currentMethod, methodStage, isComplete }
 */
function getCurrentMethod(session) {
  if (!session.microPlan || session.microPlan.length === 0) {
    return { currentMethod: null, methodStage: 0, isComplete: true };
  }

  const currentIndex = session.currentMethodIndex || 0;

  if (currentIndex >= session.microPlan.length) {
    return { currentMethod: 'summary', methodStage: 0, isComplete: true };
  }

  const currentMethod = session.microPlan[currentIndex];
  
  // Get method stage (how many steps of this method have been completed)
  const methodStage = getMethodStage(session, currentMethod);

  return { currentMethod, methodStage, isComplete: false };
}

/**
 * Calculate stage within current method
 * E.g., for brief_cbt, might be question 1, 2, or 3, then reframe
 */
function getMethodStage(session, currentMethod) {
  // Count how many steps of this method type have been completed
  // This is a simplified version - you'd query SessionStep in real implementation
  // For now, return 0 (first step of this method)
  return 0;
}

/**
 * Advance to next method in micro plan
 * Call this after completing all steps of current method
 */
async function advanceToNextMethod(session) {
  session.currentMethodIndex = (session.currentMethodIndex || 0) + 1;
  await session.save();
  
  logger.info('Advanced to next method', {
    sessionId: session._id,
    newIndex: session.currentMethodIndex,
    nextMethod: session.microPlan[session.currentMethodIndex],
  });
}

module.exports = {
  generateMicroPlan,
  getCurrentMethod,
  advanceToNextMethod,
};
