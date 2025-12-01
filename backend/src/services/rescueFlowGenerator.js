/**
 * Rescue Flow Generator - Phase-based step generation for "I'm Spiraling"
 * 
 * Implements the 7-phase rescue flow:
 * 0 - Arrival & Containment
 * 1 - Body Downshift
 * 2 - Dump & Name  
 * 3 - Understand & Unhook
 * 4 - Self-Compassion
 * 5 - Choose: Sleep or Action
 * 6 - Closing Ritual
 */

const OpenAI = require('openai');
const logger = require('../config/logger');
const SessionStep = require('../models/SessionStep');
const Session = require('../models/Session');
const { classifySpiral } = require('./spiralClassifier');
const {
  PHASES,
  THOUGHT_FORM_METHODS,
  getCurrentPhase,
  isPhaseComplete,
  getNextStepTypeForPhase,
  estimateTotalSteps,
  getPhaseMetadata,
} = require('./phaseOrchestrator');

// Initialize OpenAI client
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Generate next step in the rescue flow
 */
async function generateNextRescueStep(sessionId, userId, userProfile = {}) {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const session = await Session.findById(sessionId);
    const previousSteps = await SessionStep.find({ session: sessionId })
      .sort({ stepIndex: 1 });

    logger.info('generateNextRescueStep: starting', {
      sessionId,
      previousStepCount: previousSteps.length,
      currentPhase: session.currentPhase,
    });

    // Determine current phase and what step is needed
    const currentPhase = session.currentPhase || 0;
    const stepsInCurrentPhase = previousSteps.filter(s => s.phaseNumber === currentPhase);
    
    // Check if current phase is complete
    if (isPhaseComplete(currentPhase, stepsInCurrentPhase, session)) {
      // Advance to next phase
      const nextPhase = currentPhase + 1;
      if (nextPhase > 6) {
        // Flow is complete
        return createFlowCompleteResponse(session, previousSteps);
      }
      
      // Update session phase
      session.currentPhase = nextPhase;
      await session.save();
      
      logger.info('Advancing to next phase', { sessionId, nextPhase });
      
      // Generate step for new phase
      return generateStepForPhase(nextPhase, [], session, previousSteps, userProfile);
    }
    
    // Generate step for current phase
    return generateStepForPhase(currentPhase, stepsInCurrentPhase, session, previousSteps, userProfile);
    
  } catch (error) {
    logger.error('Error generating rescue step:', error);
    throw error;
  }
}

/**
 * Generate a step for a specific phase
 */
async function generateStepForPhase(phaseNumber, stepsInPhase, session, allPreviousSteps, userProfile) {
  const stepType = getNextStepTypeForPhase(phaseNumber, stepsInPhase, session, userProfile);
  
  if (!stepType) {
    // Phase is complete, should not reach here
    logger.warn('No step type returned for phase', { phaseNumber });
    return null;
  }
  
  logger.info('Generating step', { phaseNumber, stepType, sessionId: session._id });
  
  // For certain phases, we need classification first
  if (phaseNumber >= 3 && !session.classification) {
    await runClassification(session, allPreviousSteps, userProfile);
  }
  
  // Generate the step
  const step = await createStepForType(stepType, phaseNumber, session, allPreviousSteps, userProfile);
  
  return step;
}

/**
 * Run classification on the session (after dump step)
 */
async function runClassification(session, previousSteps, userProfile) {
  const dumpStep = previousSteps.find(s => s.stepType === 'dump_text' || s.stepType === 'dump_voice');
  const userText = dumpStep?.answer?.text || dumpStep?.answer?.transcript || 'User is spiraling';
  
  const spiralTitle = session.spiralTitle || '';
  const combinedText = spiralTitle ? `${spiralTitle}: ${userText}` : userText;

  const sessionContext = {
    timeOfDay: getTimeOfDay(),
    sleepRelated: session.sleepRelated || false,
    initialIntensity: session.initialIntensity,
  };

  const classification = await classifySpiral(combinedText, userProfile, sessionContext);
  
  session.classification = classification;
  session.rawDumpText = userText;
  await session.save();

  logger.info('Session classified', {
    sessionId: session._id,
    thoughtForm: classification.thoughtForm,
    intensity: classification.intensity,
  });
}

// =============================================================================
// STEP CREATORS - One for each step type
// =============================================================================

async function createStepForType(stepType, phaseNumber, session, previousSteps, userProfile) {
  const phaseMetadata = getPhaseMetadata(phaseNumber);
  const stepIndex = previousSteps.length;
  const isQuickRescue = session.mode === 'quick_rescue';
  const totalSteps = estimateTotalSteps(session, isQuickRescue);
  
  const baseStep = {
    meta: {
      step_index: stepIndex + 1,
      step_count: totalSteps,
      phase_number: phaseNumber,
      phase_name: phaseMetadata?.phaseName,
      show_progress: stepType !== 'intro' && stepType !== 'crisis_info',
    },
  };

  switch (stepType) {
    // Phase 0: Arrival
    case 'intro':
      return createIntroStep(session, stepIndex, baseStep);
    case 'context_check':
      return createContextCheckStep(session, stepIndex, baseStep);
      
    // Phase 1: Body Downshift
    case 'body_choice':
      return createBodyChoiceStep(session, stepIndex, baseStep, userProfile);
    case 'breathing':
      return createBreathingStep(session, stepIndex, baseStep);
    case 'grounding_5_4_3_2_1':
      return createGroundingStep(session, stepIndex, baseStep);
      
    // Phase 2: Dump & Name
    case 'intensity_scale':
      return createIntensityStep(session, stepIndex, baseStep);
    case 'dump_text':
      return createDumpTextStep(session, stepIndex, baseStep);
    case 'spiral_title':
      return createSpiralTitleStep(session, stepIndex, baseStep);
      
    // Phase 3: Understand & Unhook
    case 'cbt_question':
      return createCBTQuestionStep(session, previousSteps, stepIndex, baseStep, userProfile);
    case 'defusion':
      return createDefusionStep(session, previousSteps, stepIndex, baseStep, userProfile);
    case 'reframe_review':
      return createReframeStep(session, previousSteps, stepIndex, baseStep, userProfile);
      
    // Phase 4: Self-Compassion
    case 'self_compassion_script':
      return createSelfCompassionStep(session, previousSteps, stepIndex, baseStep, userProfile);
      
    // Phase 5: Choose Path
    case 'sleep_or_action_choice':
      return createSleepOrActionChoiceStep(session, stepIndex, baseStep);
    case 'action_plan':
      return createActionPlanStep(session, previousSteps, stepIndex, baseStep, userProfile);
      
    // Phase 6: Closing
    case 'sleep_wind_down':
      return createSleepWindDownStep(session, stepIndex, baseStep);
    case 'future_orientation':
      return createFutureOrientationStep(session, stepIndex, baseStep);
    case 'final_intensity':
      return createFinalIntensityStep(session, stepIndex, baseStep);
    case 'summary':
      return createSummaryStep(session, previousSteps, stepIndex, baseStep);
      
    default:
      logger.warn('Unknown step type', { stepType });
      return createFallbackStep(stepType, stepIndex, baseStep);
  }
}

// =============================================================================
// PHASE 0: ARRIVAL
// =============================================================================

function createIntroStep(session, stepIndex, baseStep) {
  return {
    step_id: `intro-${Date.now()}`,
    step_type: 'intro',
    title: "You're not alone with this spiral.",
    subtitle: null,
    description: "We're going to take a few minutes to calm your body and soften the thoughts.\nYou don't have to solve your whole life right now.",
    ui: {
      component: 'IntroScreen',
      props: {
        header: 'Rescue in progress',
        showStepCount: false,
      },
    },
    skippable: false,
    primary_cta: { label: 'Start', action: 'next_step' },
    secondary_cta: null,
    ...baseStep,
    meta: {
      ...baseStep.meta,
      intervention_type: null,
      estimated_duration_sec: 20,
      show_progress: false,
    },
  };
}

function createContextCheckStep(session, stepIndex, baseStep) {
  return {
    step_id: `context-${Date.now()}`,
    step_type: 'context_check',
    title: "Before we start...",
    subtitle: null,
    description: null,
    ui: {
      component: 'ChoiceButtons',
      props: {
        choices: [
          { id: 'trying_to_sleep', label: "I'm trying to sleep", icon: '🌙' },
          { id: 'not_sleeping_yet', label: "I'm not trying to sleep yet", icon: '☀️' },
        ],
      },
    },
    skippable: false,
    primary_cta: null, // Choices handle navigation
    secondary_cta: null,
    ...baseStep,
    meta: {
      ...baseStep.meta,
      intervention_type: null,
      estimated_duration_sec: 10,
    },
  };
}

// =============================================================================
// PHASE 1: BODY DOWNSHIFT
// =============================================================================

function createBodyChoiceStep(session, stepIndex, baseStep, userProfile) {
  return {
    step_id: `body-choice-${Date.now()}`,
    step_type: 'body_choice',
    title: "First, let's settle your body a bit.",
    subtitle: "Your nervous system is on high alert. Let's bring it down before we think.",
    description: null,
    ui: {
      component: 'ChoiceButtons',
      props: {
        choices: [
          { 
            id: 'breathing', 
            label: 'Breathing for ~1 minute', 
            description: 'Slow exhales calm your nervous system',
            icon: '🌬️',
          },
          { 
            id: 'grounding', 
            label: 'Grounding with senses', 
            description: 'Anchor yourself in the present',
            icon: '🌍',
          },
        ],
      },
    },
    skippable: false,
    primary_cta: null,
    secondary_cta: null,
    educational_content: {
      why_this_matters: "When you're spiraling, your body is in fight-or-flight mode. Calming your body first makes it easier to think clearly.",
      technique_name: 'Nervous System Regulation',
    },
    ...baseStep,
    meta: {
      ...baseStep.meta,
      intervention_type: 'body_regulation',
      estimated_duration_sec: 15,
    },
  };
}

function createBreathingStep(session, stepIndex, baseStep) {
  return {
    step_id: `breathing-${Date.now()}`,
    step_type: 'breathing',
    title: "Breathe with me for a moment.",
    subtitle: "Follow the circle. Longer exhales calm your nervous system.",
    description: null,
    ui: {
      component: 'BreathingExercise',
      props: {
        breath_count: 6,
        inhale_sec: 4,
        exhale_sec: 6,
        hold_sec: 0,
        animation: 'circle',
        showCounter: true,
      },
    },
    skippable: true,
    primary_cta: { label: "I did about a minute", action: 'next_step' },
    secondary_cta: { label: 'Skip', action: 'skip_step' },
    educational_content: {
      why_this_matters: "Extended exhales activate your parasympathetic nervous system—your body's 'rest and digest' mode.",
      technique_name: '4-6 Breathing',
    },
    ...baseStep,
    meta: {
      ...baseStep.meta,
      intervention_type: 'breathing',
      estimated_duration_sec: 60,
    },
  };
}

function createGroundingStep(session, stepIndex, baseStep) {
  return {
    step_id: `grounding-${Date.now()}`,
    step_type: 'grounding_5_4_3_2_1',
    title: "Let's ground you in the present.",
    subtitle: "Look around and notice what's actually here.",
    description: null,
    ui: {
      component: 'Grounding543',
      props: {
        prompts: [
          { sense: 'see', count: 3, prompt: 'Name 3 things you can see' },
          { sense: 'feel', count: 3, prompt: 'Name 3 things you can physically feel' },
        ],
      },
    },
    skippable: true,
    primary_cta: { label: 'Done', action: 'next_step' },
    secondary_cta: { label: 'Skip', action: 'skip_step' },
    educational_content: {
      why_this_matters: "Anxiety pulls you into the future or past. Grounding brings you back to right now, where you're actually safe.",
      technique_name: 'Sensory Grounding',
    },
    ...baseStep,
    meta: {
      ...baseStep.meta,
      intervention_type: 'grounding',
      estimated_duration_sec: 45,
    },
  };
}

// =============================================================================
// PHASE 2: DUMP & NAME
// =============================================================================

function createIntensityStep(session, stepIndex, baseStep) {
  return {
    step_id: `intensity-${Date.now()}`,
    step_type: 'intensity_scale',
    title: "How loud does this feel right now?",
    subtitle: "No right answer. Just a gut feeling.",
    description: null,
    ui: {
      component: 'IntensityScale',
      props: {
        min: 1,
        max: 10,
        default: 5,
        labels: { 1: 'Whisper', 10: 'Deafening' },
      },
    },
    skippable: false,
    primary_cta: { label: 'Next', action: 'next_step' },
    secondary_cta: null,
    ...baseStep,
    meta: {
      ...baseStep.meta,
      intervention_type: null,
      estimated_duration_sec: 15,
    },
  };
}

function createDumpTextStep(session, stepIndex, baseStep) {
  return {
    step_id: `dump-${Date.now()}`,
    step_type: 'dump_text',
    title: "Let your brain spill.",
    subtitle: "You can write half-sentences, fragments, swear, whatever. Just get it out of your head and onto the screen.",
    description: null,
    ui: {
      component: 'TextDump',
      props: {
        placeholder: "What's spinning in your head...",
        minLength: 10,
        maxLength: 2000,
        showVoiceOption: true,
      },
    },
    skippable: false,
    primary_cta: { label: 'Done for now', action: 'next_step' },
    secondary_cta: null,
    ...baseStep,
    meta: {
      ...baseStep.meta,
      intervention_type: 'expressive_writing',
      estimated_duration_sec: 120,
    },
  };
}

function createSpiralTitleStep(session, stepIndex, baseStep) {
  return {
    step_id: `spiral-title-${Date.now()}`,
    step_type: 'spiral_title',
    title: "Give this spiral a short title, like it's a movie.",
    subtitle: "This helps your brain see it as a thing, not as 'the truth'.",
    description: null,
    ui: {
      component: 'SingleLineInput',
      props: {
        placeholder: "Tonight's spiral is called...",
        maxLength: 100,
        examples: [
          "The Fraud Movie",
          "Midnight Money Panic",
          "Replay of That Conversation",
          "The 'Everyone Hates Me' Special",
        ],
      },
    },
    skippable: false,
    primary_cta: { label: 'Next', action: 'next_step' },
    secondary_cta: null,
    educational_content: {
      why_this_matters: "Naming creates distance. When you label your spiral, it becomes 'a thing your brain is doing' rather than reality.",
      technique_name: 'Cognitive Labeling',
    },
    ...baseStep,
    meta: {
      ...baseStep.meta,
      intervention_type: 'cognitive_labeling',
      estimated_duration_sec: 30,
    },
  };
}

// =============================================================================
// PHASE 3: UNDERSTAND & UNHOOK
// =============================================================================

async function createCBTQuestionStep(session, previousSteps, stepIndex, baseStep, userProfile) {
  const classification = session.classification || {};
  const thoughtForm = classification.thoughtForm || 'mixed';
  const method = THOUGHT_FORM_METHODS[thoughtForm] || THOUGHT_FORM_METHODS.mixed;
  
  // Determine which question number this is
  const existingCBTSteps = previousSteps.filter(s => s.stepType === 'cbt_question');
  const questionIndex = existingCBTSteps.length;
  
  // Get the spiral title and dump text for personalization
  const spiralTitle = session.spiralTitle || 'this spiral';
  const dumpText = session.rawDumpText || '';
  
  // Generate personalized question using AI
  const question = await generatePersonalizedCBTQuestion(
    thoughtForm,
    questionIndex,
    spiralTitle,
    dumpText,
    classification,
    userProfile
  );
  
  return {
    step_id: `cbt-q-${Date.now()}`,
    step_type: 'cbt_question',
    title: question.title,
    subtitle: question.subtitle || null,
    description: null,
    ui: {
      component: 'CBTQuestion',
      props: {
        questionType: method.primary,
        placeholder: question.placeholder || 'Your honest answer...',
      },
    },
    skippable: false,
    primary_cta: { label: 'Next', action: 'next_step' },
    secondary_cta: null,
    educational_content: {
      why_this_matters: question.why_this_matters || "Examining your thoughts helps your brain see the full picture, not just the scary parts.",
      technique_name: question.technique_name || 'Cognitive Restructuring',
    },
    ...baseStep,
    meta: {
      ...baseStep.meta,
      intervention_type: 'cbt_question',
      estimated_duration_sec: 60,
      question_index: questionIndex,
    },
  };
}

async function createDefusionStep(session, previousSteps, stepIndex, baseStep, userProfile) {
  const spiralTitle = session.spiralTitle || 'this thought';
  
  return {
    step_id: `defusion-${Date.now()}`,
    step_type: 'defusion',
    title: `Notice: your mind is telling you the story '${spiralTitle}'.`,
    subtitle: "Is that story helpful right now?",
    description: null,
    ui: {
      component: 'DefusionExercise',
      props: {
        technique: 'leaves_on_stream',
        spiralTitle,
      },
    },
    skippable: false,
    primary_cta: { label: 'I see it as a thought', action: 'next_step' },
    secondary_cta: null,
    educational_content: {
      why_this_matters: "Thoughts are just thoughts, not facts. Watching them like clouds creates distance and reduces their power.",
      technique_name: 'Cognitive Defusion',
    },
    ...baseStep,
    meta: {
      ...baseStep.meta,
      intervention_type: 'defusion',
      estimated_duration_sec: 45,
    },
  };
}

async function createReframeStep(session, previousSteps, stepIndex, baseStep, userProfile) {
  const spiralTitle = session.spiralTitle || 'this spiral';
  const dumpText = session.rawDumpText || '';
  const classification = session.classification || {};
  
  // Get CBT answers for building reframe
  const cbtAnswers = previousSteps
    .filter(s => s.stepType === 'cbt_question')
    .map(s => s.answer?.response || '')
    .filter(Boolean);
  
  // Generate personalized reframe using AI
  const reframe = await generatePersonalizedReframe(
    spiralTitle,
    dumpText,
    cbtAnswers,
    classification,
    userProfile
  );
  
  return {
    step_id: `reframe-${Date.now()}`,
    step_type: 'reframe_review',
    title: "Here's a more balanced perspective.",
    subtitle: "You can tweak this if it doesn't feel quite right.",
    description: null,
    ui: {
      component: 'ReframeReview',
      props: {
        spiralTitle,
        originalThought: dumpText.substring(0, 200),
        aiReframe: reframe.text,
        editable: true,
      },
    },
    skippable: false,
    primary_cta: { label: 'This feels okay enough', action: 'next_step' },
    secondary_cta: null,
    educational_content: {
      why_this_matters: "A balanced thought isn't toxic positivity—it's seeing the full picture, including the parts your anxious brain is ignoring.",
      technique_name: 'Cognitive Reframing',
    },
    ...baseStep,
    meta: {
      ...baseStep.meta,
      intervention_type: 'reframe',
      estimated_duration_sec: 45,
    },
  };
}

// =============================================================================
// PHASE 4: SELF-COMPASSION
// =============================================================================

async function createSelfCompassionStep(session, previousSteps, stepIndex, baseStep, userProfile) {
  const spiralTitle = session.spiralTitle || 'this spiral';
  const classification = session.classification || {};
  const thoughtForm = classification.thoughtForm || 'mixed';
  
  // Generate personalized compassion script
  const script = await generatePersonalizedCompassionScript(
    spiralTitle,
    thoughtForm,
    classification,
    userProfile
  );
  
  return {
    step_id: `compassion-${Date.now()}`,
    step_type: 'self_compassion_script',
    title: "This is a human moment, not a personal defect.",
    subtitle: null,
    description: null,
    ui: {
      component: 'SelfCompassionScript',
      props: {
        commonHumanityLines: script.commonHumanity,
        selfKindnessLines: script.selfKindness,
        showAddOwnField: true,
        addOwnPrompt: "One kind sentence I'd add...",
      },
    },
    skippable: false,
    primary_cta: { label: 'Next', action: 'next_step' },
    secondary_cta: null,
    educational_content: {
      why_this_matters: "Self-criticism activates your brain's threat response. Self-compassion activates the soothing system, making it easier to cope.",
      technique_name: 'Self-Compassion',
    },
    ...baseStep,
    meta: {
      ...baseStep.meta,
      intervention_type: 'self_compassion',
      estimated_duration_sec: 60,
    },
  };
}

// =============================================================================
// PHASE 5: CHOOSE PATH
// =============================================================================

function createSleepOrActionChoiceStep(session, stepIndex, baseStep) {
  return {
    step_id: `choice-${Date.now()}`,
    step_type: 'sleep_or_action_choice',
    title: "Right now, what do you want most?",
    subtitle: null,
    description: null,
    ui: {
      component: 'ChoiceButtons',
      props: {
        choices: [
          { 
            id: 'sleep', 
            label: 'Wind down towards sleep', 
            description: "I've done enough thinking for tonight",
            icon: '🌙',
          },
          { 
            id: 'action', 
            label: 'Make a tiny plan for tomorrow, then rest', 
            description: "One small step to take with me",
            icon: '📝',
          },
        ],
      },
    },
    skippable: false,
    primary_cta: null,
    secondary_cta: null,
    ...baseStep,
    meta: {
      ...baseStep.meta,
      intervention_type: null,
      estimated_duration_sec: 15,
    },
  };
}

async function createActionPlanStep(session, previousSteps, stepIndex, baseStep, userProfile) {
  const spiralTitle = session.spiralTitle || 'this';
  const classification = session.classification || {};
  
  // Generate example actions based on classification
  const examples = generateActionExamples(classification);
  
  return {
    step_id: `action-${Date.now()}`,
    step_type: 'action_plan',
    title: "One small step for tomorrow",
    subtitle: "Not a giant fix. Just one thing that would move this 1%.",
    description: null,
    ui: {
      component: 'ActionPlan',
      props: {
        placeholder: "Tomorrow I will...",
        examples,
      },
    },
    skippable: false,
    primary_cta: { label: 'Save my plan', action: 'next_step' },
    secondary_cta: null,
    ...baseStep,
    meta: {
      ...baseStep.meta,
      intervention_type: 'action_plan',
      estimated_duration_sec: 45,
    },
  };
}

// =============================================================================
// PHASE 6: CLOSING
// =============================================================================

function createSleepWindDownStep(session, stepIndex, baseStep) {
  return {
    step_id: `wind-down-${Date.now()}`,
    step_type: 'sleep_wind_down',
    title: "You've done enough thinking for tonight.",
    subtitle: "Let's help your mind settle.",
    description: null,
    ui: {
      component: 'SleepWindDown',
      props: {
        technique: 'cognitive_shuffle',
        words: ['apple', 'train', 'river', 'book', 'cloud', 'guitar', 'sunset', 'mountain'],
        breathCount: 5,
      },
    },
    skippable: true,
    primary_cta: { label: "I'm ready to put my phone down", action: 'next_step' },
    secondary_cta: { label: 'Skip to summary', action: 'skip_step' },
    educational_content: {
      why_this_matters: "The cognitive shuffle gives your problem-solving brain something boring to do, allowing the sleep system to take over.",
      technique_name: 'Cognitive Shuffle',
    },
    ...baseStep,
    meta: {
      ...baseStep.meta,
      intervention_type: 'sleep_wind_down',
      estimated_duration_sec: 120,
    },
  };
}

function createFutureOrientationStep(session, stepIndex, baseStep) {
  const actionPlan = session.actionPlan || 'your small step';
  
  return {
    step_id: `future-${Date.now()}`,
    step_type: 'future_orientation',
    title: "You're leaving this spiral with a plan.",
    subtitle: null,
    description: null,
    ui: {
      component: 'FutureOrientation',
      props: {
        actionPlan,
        showReminder: true,
      },
    },
    skippable: false,
    primary_cta: { label: 'Next', action: 'next_step' },
    secondary_cta: null,
    ...baseStep,
    meta: {
      ...baseStep.meta,
      intervention_type: null,
      estimated_duration_sec: 20,
    },
  };
}

function createFinalIntensityStep(session, stepIndex, baseStep) {
  return {
    step_id: `final-intensity-${Date.now()}`,
    step_type: 'final_intensity',
    title: "How loud does it feel now?",
    subtitle: null,
    description: null,
    ui: {
      component: 'IntensityScale',
      props: {
        min: 1,
        max: 10,
        default: session.initialIntensity || 5,
        labels: { 1: 'Whisper', 10: 'Deafening' },
      },
    },
    skippable: false,
    primary_cta: { label: 'Next', action: 'next_step' },
    secondary_cta: null,
    ...baseStep,
    meta: {
      ...baseStep.meta,
      intervention_type: null,
      estimated_duration_sec: 10,
    },
  };
}

function createSummaryStep(session, previousSteps, stepIndex, baseStep) {
  // Build accomplishments based on what they did
  const accomplishments = [];
  const spiralTitle = session.spiralTitle;
  
  if (spiralTitle) {
    accomplishments.push(`You named this spiral ('${spiralTitle}')`);
  }
  
  if (previousSteps.some(s => ['breathing', 'grounding_5_4_3_2_1'].includes(s.stepType))) {
    accomplishments.push('You calmed your body a bit');
  }
  
  if (previousSteps.some(s => ['dump_text', 'dump_voice'].includes(s.stepType))) {
    accomplishments.push('You got the thoughts out of your head');
  }
  
  if (previousSteps.some(s => ['cbt_question', 'reframe_review'].includes(s.stepType))) {
    accomplishments.push("You stepped back from your brain's story");
  }
  
  if (previousSteps.some(s => s.stepType === 'self_compassion_script')) {
    accomplishments.push('You practiced talking to yourself more kindly');
  }
  
  if (previousSteps.some(s => s.stepType === 'action_plan')) {
    accomplishments.push('You made a small plan for tomorrow');
  }
  
  return {
    step_id: `summary-${Date.now()}`,
    step_type: 'summary',
    title: "You did something for yourself tonight.",
    subtitle: null,
    description: null,
    ui: {
      component: 'Summary',
      props: {
        accomplishments,
        closingMessage: "These steps matter, even if it doesn't feel like it yet.",
        // NO success banner, NO gamification
      },
    },
    skippable: false,
    primary_cta: { label: 'Finish', action: 'complete_session' },
    secondary_cta: null,
    ...baseStep,
    meta: {
      ...baseStep.meta,
      intervention_type: 'summary',
      estimated_duration_sec: 30,
    },
  };
}

function createFallbackStep(stepType, stepIndex, baseStep) {
  return {
    step_id: `fallback-${Date.now()}`,
    step_type: stepType,
    title: "Let's continue.",
    subtitle: null,
    description: null,
    ui: { component: 'Generic', props: {} },
    skippable: true,
    primary_cta: { label: 'Next', action: 'next_step' },
    secondary_cta: null,
    ...baseStep,
  };
}

function createFlowCompleteResponse(session, previousSteps) {
  return {
    flow_complete: true,
    session_id: session._id,
    summary: {
      duration: Math.round((Date.now() - session.startedAt) / 1000),
      steps_completed: previousSteps.length,
      intensity_change: session.finalIntensity && session.initialIntensity 
        ? session.initialIntensity - session.finalIntensity 
        : null,
    },
  };
}

// =============================================================================
// AI HELPERS
// =============================================================================

async function generatePersonalizedCBTQuestion(thoughtForm, questionIndex, spiralTitle, dumpText, classification, userProfile) {
  const method = THOUGHT_FORM_METHODS[thoughtForm] || THOUGHT_FORM_METHODS.mixed;
  
  // For first question, use templates. For subsequent, use AI.
  if (questionIndex === 0) {
    // Return template-based question
    switch (thoughtForm) {
      case 'self_criticism':
        return {
          title: "What are you afraid this says about you as a person?",
          placeholder: "I'm afraid this means I'm...",
          why_this_matters: "Self-critical thoughts often contain hidden fears. Naming them makes them easier to address.",
          technique_name: 'Core Belief Identification',
        };
      case 'worry':
        return {
          title: "What's the catastrophe your brain is predicting?",
          placeholder: "I'm worried that...",
          why_this_matters: "Anxious brains jump to worst-case scenarios. Naming the fear is the first step to evaluating it.",
          technique_name: 'Catastrophe Identification',
        };
      case 'rumination':
        return {
          title: "What conversation or moment is your brain replaying?",
          placeholder: "I keep thinking about...",
          why_this_matters: "Rumination keeps you stuck in a loop. Externalizing it helps you step off the treadmill.",
          technique_name: 'Thought Recording',
        };
      case 'existential':
        return {
          title: "Without solving everything, what's one value or person you care about even a little?",
          placeholder: "I care about...",
          why_this_matters: "Existential spirals feel overwhelming. Connecting to one small value grounds you.",
          technique_name: 'Values Connection',
        };
      default:
        return {
          title: "What thought is loudest right now?",
          placeholder: "The loudest thought is...",
          why_this_matters: "Identifying the dominant thought helps your brain process it differently.",
          technique_name: 'Thought Identification',
        };
    }
  }
  
  // Second question - counter-evidence or realistic alternatives
  switch (thoughtForm) {
    case 'self_criticism':
      return {
        title: "What's one piece of evidence that you're not only what this spiral says you are?",
        subtitle: "A time you did well, were kind, or showed up for something.",
        placeholder: "For example...",
        why_this_matters: "Your brain is showing you one angle. This helps you see the fuller picture.",
        technique_name: 'Evidence Gathering',
      };
    case 'worry':
      return {
        title: "What are 1-2 other realistic possibilities?",
        subtitle: "If a calm expert looked at your situation, what else might they see?",
        placeholder: "It could also be that...",
        why_this_matters: "Anxiety narrows vision. Considering alternatives reopens it.",
        technique_name: 'Alternative Perspectives',
      };
    default:
      return {
        title: "What would a kind friend say about this?",
        placeholder: "They might say...",
        why_this_matters: "Distance helps. Imagining outside perspective reduces emotional intensity.",
        technique_name: 'Perspective Taking',
      };
  }
}

async function generatePersonalizedReframe(spiralTitle, dumpText, cbtAnswers, classification, userProfile) {
  // Use AI for personalization if available, otherwise template
  if (openai && dumpText) {
    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You generate a balanced reframe for someone spiraling. Rules:
- Use THEIR words and spiral title
- Acknowledge the difficulty, don't dismiss
- Offer a more balanced perspective
- Keep it to 2-3 sentences max
- Warm, grounded tone
- NO toxic positivity
- Reference their specific situation

Output only the reframe text, no explanation.`,
          },
          {
            role: 'user',
            content: `Spiral title: "${spiralTitle}"
Their vent: "${dumpText.substring(0, 500)}"
Their CBT answers: ${cbtAnswers.join(' | ')}
Thought form: ${classification.thoughtForm}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });
      
      return { text: response.choices[0].message.content };
    } catch (err) {
      logger.warn('Failed to generate AI reframe', { error: err.message });
    }
  }
  
  // Fallback template
  return {
    text: `Your spiral tonight is: '${spiralTitle}'. The bigger picture is: this is one moment in a much longer story. A more balanced take might be: this feels overwhelming right now, but it doesn't define you or your future.`,
  };
}

async function generatePersonalizedCompassionScript(spiralTitle, thoughtForm, classification, userProfile) {
  // Generate context-appropriate compassion lines
  const commonHumanity = [];
  const selfKindness = [];
  
  switch (thoughtForm) {
    case 'self_criticism':
      commonHumanity.push("It's human to cringe over things we said.");
      commonHumanity.push("It's human to worry about being 'found out'.");
      commonHumanity.push("You're not the only one whose brain does this at night.");
      selfKindness.push("I'm allowed to be learning.");
      selfKindness.push("I'm allowed to be kind to myself even when I mess up.");
      break;
    case 'worry':
      commonHumanity.push("It's human to worry about the future.");
      commonHumanity.push("Brains evolved to scan for threats—yours is working overtime.");
      selfKindness.push("I'm doing the best I can with the information I have.");
      selfKindness.push("Worrying doesn't mean I'm weak—it means I care.");
      break;
    case 'rumination':
      commonHumanity.push("Everyone replays conversations and moments.");
      commonHumanity.push("Your brain is trying to solve something—even if there's nothing to solve.");
      selfKindness.push("I can let go of this loop for tonight.");
      selfKindness.push("I don't have to have all the answers right now.");
      break;
    default:
      commonHumanity.push("This is a human moment, not a personal failing.");
      commonHumanity.push("Many people feel this way—you're not alone.");
      selfKindness.push("I'm allowed to struggle and still be worthy of kindness.");
      selfKindness.push("I'm doing what I can, and that's enough for now.");
  }
  
  return { commonHumanity, selfKindness };
}

function generateActionExamples(classification) {
  const topics = Object.keys(classification.topics || {}).filter(t => classification.topics[t] > 0.3);
  const examples = [];
  
  if (topics.includes('work')) {
    examples.push("Write down questions to ask my manager");
    examples.push("Block 10 minutes to look at this instead of carrying it all night");
  }
  if (topics.includes('relationships')) {
    examples.push("Send one message I've been avoiding");
    examples.push("Write what I actually want to say (just for me)");
  }
  if (topics.includes('money')) {
    examples.push("Look at one account balance for 2 minutes");
    examples.push("Write down the specific number I'm worried about");
  }
  if (topics.includes('health')) {
    examples.push("Book one appointment");
    examples.push("Write down my symptoms to discuss with a doctor");
  }
  
  // Default examples
  if (examples.length === 0) {
    examples.push("Write a 2-sentence note about what I'm actually afraid of");
    examples.push("Talk to one person about this for 5 minutes");
    examples.push("Google one specific question I have");
  }
  
  return examples.slice(0, 3);
}

// =============================================================================
// UTILITIES
// =============================================================================

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 6) return 'late_night';
  if (hour >= 18) return 'evening';
  if (hour >= 12) return 'afternoon';
  return 'morning';
}

module.exports = {
  generateNextRescueStep,
};
