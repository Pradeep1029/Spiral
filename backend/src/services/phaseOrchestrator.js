/**
 * Phase Orchestrator - Implements the 7-phase "I'm Spiraling" rescue flow
 * 
 * PHASES:
 * 0 - Arrival & Containment (1-2 steps)
 * 1 - Body Downshift (1-2 steps)
 * 2 - Dump & Name (2-3 steps)
 * 3 - Understand & Unhook (2-3 steps) - CBT / defusion / acceptance
 * 4 - Self-Compassion & Common Humanity (1-2 steps)
 * 5 - Choose: Sleep or Tiny Action (1-2 steps)
 * 6 - Closing Ritual & Integration (2 steps)
 */

const logger = require('../config/logger');

// Phase definitions with required step types and minimum steps
const PHASES = {
  0: {
    name: 'arrival',
    displayName: 'Arrival & Containment',
    minSteps: 1,
    maxSteps: 2,
    requiredTypes: ['intro'],
    optionalTypes: ['context_check'],
    goal: 'Create safe container, instant relief feeling',
  },
  1: {
    name: 'body_downshift',
    displayName: 'Body Downshift',
    minSteps: 1,
    maxSteps: 2,
    requiredTypes: ['body_choice', 'breathing', 'grounding_5_4_3_2_1'],
    optionalTypes: [],
    goal: 'Get nervous system out of alarm mode',
  },
  2: {
    name: 'dump_and_name',
    displayName: 'Dump & Name',
    minSteps: 2,
    maxSteps: 3,
    requiredTypes: ['intensity_scale', 'dump_text', 'spiral_title'],
    optionalTypes: ['dump_voice'],
    goal: 'Externalize the spiral and give it a handle',
  },
  3: {
    name: 'understand_unhook',
    displayName: 'Understand & Unhook',
    minSteps: 2,
    maxSteps: 3,
    requiredTypes: ['cbt_question', 'reframe_review'],
    optionalTypes: ['defusion', 'acceptance'],
    goal: 'Change relationship to thought via CBT/defusion/acceptance',
  },
  4: {
    name: 'self_compassion',
    displayName: 'Self-Compassion & Common Humanity',
    minSteps: 1,
    maxSteps: 2,
    requiredTypes: ['self_compassion_script'],
    optionalTypes: ['common_humanity'],
    goal: 'Turn off self-attack, especially for shame/self-crit spirals',
  },
  5: {
    name: 'choose_path',
    displayName: 'Choose: Sleep or Tiny Action',
    minSteps: 1,
    maxSteps: 2,
    requiredTypes: ['sleep_or_action_choice'],
    optionalTypes: ['action_plan'],
    goal: 'Respect what they need: sleep or a concrete step',
  },
  6: {
    name: 'closing',
    displayName: 'Closing Ritual & Integration',
    minSteps: 2,
    maxSteps: 2,
    requiredTypes: ['closing_ritual', 'summary'],
    optionalTypes: ['sleep_wind_down', 'final_intensity'],
    goal: 'Grounded closure and acknowledgment',
  },
};

// Thought form to phase 3 method mapping
const THOUGHT_FORM_METHODS = {
  worry: {
    primary: 'cbt_probability',
    questions: [
      "What's the catastrophe your brain is predicting?",
      "What are 1-2 other realistic possibilities?",
      "If a calm expert looked at your situation, how likely would they say the catastrophe is?",
    ],
  },
  self_criticism: {
    primary: 'cbt_self_attack',
    questions: [
      "What are you afraid this says about you as a person?",
      "What's one piece of evidence that you're not only what this spiral says you are?",
    ],
  },
  rumination: {
    primary: 'defusion',
    questions: [
      "Notice your mind is telling you the story again. Is that story helpful right now?",
      "What would happen if you just let this thought pass by like a cloud?",
    ],
  },
  existential: {
    primary: 'acceptance_values',
    questions: [
      "Without solving everything, what's one value or person you care about even a little?",
      "How might that matter tomorrow in a small way?",
    ],
  },
  anger: {
    primary: 'defusion',
    questions: [
      "What story is your mind telling you about what this means?",
      "Behind the anger, what might you be needing or wanting?",
    ],
  },
  grief: {
    primary: 'acceptance_values',
    questions: [
      "What are you missing right now?",
      "What would it mean to honor that feeling without fighting it?",
    ],
  },
  mixed: {
    primary: 'cbt_general',
    questions: [
      "What thought is loudest right now?",
      "What would a kind friend say about this?",
    ],
  },
};

/**
 * Determine which phase the session is currently in
 */
function getCurrentPhase(session, completedSteps) {
  const phaseHistory = session.phaseHistory || [];
  
  // Find the highest phase we've completed
  let currentPhase = 0;
  for (const phase of phaseHistory) {
    if (phase.completed) {
      currentPhase = Math.max(currentPhase, phase.phaseNumber + 1);
    }
  }
  
  // Don't exceed max phase
  return Math.min(currentPhase, 6);
}

/**
 * Check if current phase is complete based on steps taken
 */
function isPhaseComplete(phaseNumber, stepsInPhase, session) {
  const phase = PHASES[phaseNumber];
  if (!phase) return true;
  
  // Check minimum step count
  if (stepsInPhase.length < phase.minSteps) {
    return false;
  }
  
  // Check if required step types are covered
  const completedTypes = stepsInPhase.map(s => s.stepType);
  
  // For phase 1, need either breathing or grounding
  if (phaseNumber === 1) {
    return completedTypes.includes('breathing') || completedTypes.includes('grounding_5_4_3_2_1');
  }
  
  // For phase 2, need intensity + dump + spiral_title
  if (phaseNumber === 2) {
    return completedTypes.includes('intensity_scale') && 
           (completedTypes.includes('dump_text') || completedTypes.includes('dump_voice')) &&
           completedTypes.includes('spiral_title');
  }
  
  // For phase 3, need at least one CBT/defusion question and a reframe
  if (phaseNumber === 3) {
    const hasCognitive = completedTypes.includes('cbt_question') || 
                         completedTypes.includes('defusion') ||
                         completedTypes.includes('acceptance');
    const hasReframe = completedTypes.includes('reframe_review');
    return hasCognitive && hasReframe;
  }
  
  // For phase 4, need self_compassion_script
  if (phaseNumber === 4) {
    return completedTypes.includes('self_compassion_script');
  }
  
  // For phase 5, need choice
  if (phaseNumber === 5) {
    const hasChoice = completedTypes.includes('sleep_or_action_choice');
    // If they chose action, also need action_plan
    const choiceStep = stepsInPhase.find(s => s.stepType === 'sleep_or_action_choice');
    if (choiceStep?.answer?.choice_id === 'action') {
      return hasChoice && completedTypes.includes('action_plan');
    }
    return hasChoice;
  }
  
  // For phase 6, need closing
  if (phaseNumber === 6) {
    return completedTypes.includes('summary');
  }
  
  return stepsInPhase.length >= phase.minSteps;
}

/**
 * Get the next step type needed for a phase
 */
function getNextStepTypeForPhase(phaseNumber, stepsInPhase, session, userProfile) {
  const phase = PHASES[phaseNumber];
  const completedTypes = stepsInPhase.map(s => s.stepType);
  const classification = session.classification || {};
  const sleepRelated = classification.context?.sleepRelated || session.sleepRelated;
  const isQuickRescue = session.mode === 'quick_rescue';
  
  switch (phaseNumber) {
    case 0:
      // Phase 0: Arrival
      if (!completedTypes.includes('intro')) {
        return 'intro';
      }
      // Optional context check for sleep detection
      if (sleepRelated && !completedTypes.includes('context_check') && !isQuickRescue) {
        return 'context_check';
      }
      return null; // Phase complete
      
    case 1:
      // Phase 1: Body Downshift
      // First, let them choose (unless quick rescue or user preference)
      if (!completedTypes.includes('body_choice') && !isQuickRescue) {
        if (!userProfile?.profile?.hatesBreathingExercises) {
          return 'body_choice';
        }
      }
      // Then do the chosen technique
      if (!completedTypes.includes('breathing') && !completedTypes.includes('grounding_5_4_3_2_1')) {
        // Default based on preference or choice
        const choice = stepsInPhase.find(s => s.stepType === 'body_choice')?.answer?.choice_id;
        if (choice === 'grounding' || userProfile?.profile?.hatesBreathingExercises) {
          return 'grounding_5_4_3_2_1';
        }
        return 'breathing';
      }
      return null;
      
    case 2:
      // Phase 2: Dump & Name
      if (!completedTypes.includes('intensity_scale')) {
        return 'intensity_scale';
      }
      if (!completedTypes.includes('dump_text') && !completedTypes.includes('dump_voice')) {
        return 'dump_text';
      }
      if (!completedTypes.includes('spiral_title')) {
        return 'spiral_title';
      }
      return null;
      
    case 3:
      // Phase 3: Understand & Unhook
      // Choose method based on thought form
      const thoughtForm = classification.thoughtForm || 'mixed';
      const method = THOUGHT_FORM_METHODS[thoughtForm] || THOUGHT_FORM_METHODS.mixed;
      const cbtSteps = stepsInPhase.filter(s => s.stepType === 'cbt_question');
      
      // Need 1-2 CBT questions depending on quick rescue
      const maxQuestions = isQuickRescue ? 1 : 2;
      if (cbtSteps.length < maxQuestions && cbtSteps.length < method.questions.length) {
        return 'cbt_question';
      }
      
      // Then reframe
      if (!completedTypes.includes('reframe_review')) {
        return 'reframe_review';
      }
      return null;
      
    case 4:
      // Phase 4: Self-Compassion
      if (!completedTypes.includes('self_compassion_script')) {
        return 'self_compassion_script';
      }
      return null;
      
    case 5:
      // Phase 5: Choose Sleep or Action
      if (!completedTypes.includes('sleep_or_action_choice')) {
        return 'sleep_or_action_choice';
      }
      // If they chose action, need action plan
      const choiceStep = stepsInPhase.find(s => s.stepType === 'sleep_or_action_choice');
      if (choiceStep?.answer?.choice_id === 'action' && !completedTypes.includes('action_plan')) {
        return 'action_plan';
      }
      return null;
      
    case 6:
      // Phase 6: Closing
      const pathChoice = session.pathChoice || 'sleep';
      
      if (pathChoice === 'sleep') {
        // Sleep path: wind-down first
        if (!completedTypes.includes('sleep_wind_down') && !isQuickRescue) {
          return 'sleep_wind_down';
        }
      } else {
        // Action path: future orientation
        if (!completedTypes.includes('future_orientation')) {
          return 'future_orientation';
        }
      }
      
      // Final intensity check
      if (!completedTypes.includes('final_intensity')) {
        return 'final_intensity';
      }
      
      // Summary
      if (!completedTypes.includes('summary')) {
        return 'summary';
      }
      return null;
      
    default:
      return null;
  }
}

/**
 * Calculate total estimated step count for the flow
 */
function estimateTotalSteps(session, isQuickRescue = false) {
  if (isQuickRescue) {
    // Quick rescue: validate → body → externalize → one cognitive → close
    // Minimum: intro + breathing/grounding + intensity + dump + 1 cbt + compassion + summary = 7
    return 7;
  }
  
  // Full rescue: at least 10-12 steps across 7 phases
  // Phase 0: 1-2, Phase 1: 1-2, Phase 2: 3, Phase 3: 2-3, Phase 4: 1-2, Phase 5: 1-2, Phase 6: 2
  return 12;
}

/**
 * Get phase metadata for the current step
 */
function getPhaseMetadata(phaseNumber) {
  const phase = PHASES[phaseNumber];
  if (!phase) return null;
  
  return {
    phaseNumber,
    phaseName: phase.name,
    phaseDisplayName: phase.displayName,
    goal: phase.goal,
  };
}

/**
 * Generate quick rescue plan (3-5 min, Autopilot at 2am)
 * Still must hit: validate → body → externalize → one cognitive/emotional step → close
 */
function generateQuickRescuePlan() {
  return {
    phases: [0, 1, 2, 3, 4, 6], // Skip phase 5 (choice) - assume sleep
    stepsPerPhase: {
      0: 1, // Just intro
      1: 1, // Just breathing/grounding (no choice)
      2: 2, // Intensity + dump (skip naming for speed)
      3: 1, // One cognitive step + immediate reframe
      4: 1, // Light self-compassion
      6: 1, // Quick summary
    },
    targetDuration: 240, // 4 minutes
    mode: 'quick_rescue',
  };
}

/**
 * Generate buffer mode plan (2 min, evening pre-spiral prevention)
 */
function generateBufferPlan() {
  return {
    phases: [0, 1, 4], // Arrival, body, compassion only
    stepsPerPhase: {
      0: 1,
      1: 1,
      4: 1,
    },
    targetDuration: 120,
    mode: 'buffer',
  };
}

/**
 * Validate that a session flow follows the rules
 */
function validateFlow(completedSteps) {
  const errors = [];
  const warnings = [];
  
  // Rule: Minimum 7 steps for full rescue
  if (completedSteps.length < 7) {
    errors.push('Session has fewer than 7 steps');
  }
  
  // Rule: Must include at least 3 distinct step types
  const stepTypes = [...new Set(completedSteps.map(s => s.stepType))];
  if (stepTypes.length < 3) {
    errors.push('Session has fewer than 3 distinct step types');
  }
  
  // Rule: Reframe alone is NEVER the last real step before summary
  const nonSummarySteps = completedSteps.filter(s => s.stepType !== 'summary');
  if (nonSummarySteps.length > 0) {
    const lastRealStep = nonSummarySteps[nonSummarySteps.length - 1];
    if (lastRealStep.stepType === 'reframe_review') {
      errors.push('Reframe cannot be the last real step before summary');
    }
  }
  
  // Rule: Must have body regulation step
  if (!completedSteps.some(s => ['breathing', 'grounding_5_4_3_2_1'].includes(s.stepType))) {
    errors.push('Missing body regulation step');
  }
  
  // Rule: Must have externalization step
  if (!completedSteps.some(s => ['dump_text', 'dump_voice'].includes(s.stepType))) {
    errors.push('Missing externalization step');
  }
  
  // Rule: Must have cognitive/emotional work
  if (!completedSteps.some(s => ['cbt_question', 'defusion', 'acceptance'].includes(s.stepType))) {
    errors.push('Missing cognitive/emotional work step');
  }
  
  // Rule: Must have self-compassion (for shame/self-crit)
  // This is a warning since it might be skipped for non-shame spirals
  if (!completedSteps.some(s => s.stepType === 'self_compassion_script')) {
    warnings.push('Missing self-compassion step');
  }
  
  // Rule: Must have closing
  if (!completedSteps.some(s => s.stepType === 'summary')) {
    errors.push('Missing closing/summary step');
  }
  
  return { valid: errors.length === 0, errors, warnings };
}

module.exports = {
  PHASES,
  THOUGHT_FORM_METHODS,
  getCurrentPhase,
  isPhaseComplete,
  getNextStepTypeForPhase,
  estimateTotalSteps,
  getPhaseMetadata,
  generateQuickRescuePlan,
  generateBufferPlan,
  validateFlow,
};
