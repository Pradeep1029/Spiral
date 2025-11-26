const Session = require('../models/Session');
const SessionStep = require('../models/SessionStep');
// const { generateNextStep } = require('../services/stepGenerator_v2'); // DELETED - using SpiralRescueScreen instead
const { getCurrentMethod, advanceToNextMethod } = require('../services/microPlanGenerator');
const logger = require('../config/logger');

/**
 * Detect crisis language in user input
 */
function detectCrisis(answer) {
  const text = JSON.stringify(answer).toLowerCase();
  const crisisKeywords = [
    'kill myself',
    'end my life',
    'suicide',
    'suicidal',
    'hurt myself',
    'self harm',
    'self-harm',
    'don\'t want to live',
    'better off dead',
    'want to die',
  ];

  return crisisKeywords.some(keyword => text.includes(keyword));
}

/**
 * Generate crisis info step
 */
function generateCrisisStep(stepIndex) {
  return {
    step_id: `crisis-${Date.now()}`,
    step_type: 'crisis_info',
    title: "I'm here, but I need you to know something important",
    subtitle: null,
    description: "Unspiral is not an emergency service. If you're in immediate danger or having thoughts of suicide, please reach out to a crisis resource right now.",
    ui: {
      component: 'CrisisInfo',
      props: {
        resources: [
          {
            name: '988 Suicide & Crisis Lifeline',
            phone: '988',
            description: 'Call or text 988 - Available 24/7',
          },
          {
            name: 'Crisis Text Line',
            phone: '741741',
            description: 'Text HOME to 741741 - Available 24/7',
          },
          {
            name: 'Emergency Services',
            phone: '911',
            description: 'For immediate danger',
          },
        ],
      },
    },
    skippable: false,
    primary_cta: { label: 'I understand', action: 'acknowledge' },
    secondary_cta: null,
    meta: {
      intervention_type: 'crisis',
      estimated_duration_sec: 60,
      show_progress: false,
      step_index: stepIndex + 1,
      step_count: stepIndex + 1,
    },
  };
}

/**
 * Get next step in flow
 * GET /sessions/:id/next_step
 */
exports.getNextStep = async (req, res, next) => {
  try {
    const { id } = req.params;

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Check ownership
    if (session.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Check if flow has ended
    const lastStep = await SessionStep.findOne({ session: session._id })
      .sort({ stepIndex: -1 });

    if (lastStep && (lastStep.stepType === 'summary' || lastStep.stepType === 'crisis_info')) {
      return res.status(200).json({
        success: true,
        flow_complete: true,
        message: 'Flow has ended',
      });
    }

    // Get user profile
    const user = await req.user.populate('profile');
    const userProfile = user.profile || {};

    // Generate next step - DISABLED: Using SpiralRescueScreen instead
    // const stepData = await generateNextStep(session._id, req.user.id, userProfile);

    return res.status(501).json({
      success: false,
      message: 'Step-based flow is deprecated. Please use the SpiralRescue screen instead.',
    });

    // Save step to database
    const stepCount = await SessionStep.countDocuments({ session: session._id });
    await SessionStep.create({
      session: session._id,
      user: req.user.id,
      stepId: stepData.step_id,
      stepType: stepData.step_type,
      stepData,
      stepIndex: stepCount,
      interventionType: stepData.meta?.intervention_type,
    });

    // Update session interventions
    if (stepData.meta?.intervention_type) {
      await Session.findByIdAndUpdate(session._id, {
        $addToSet: { interventionsUsed: stepData.meta.intervention_type },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        session_id: session._id,
        step: stepData,
      },
    });
  } catch (error) {
    logger.error('Error getting next step:', error);
    next(error);
  }
};

/**
 * Submit answer for a step
 * POST /sessions/:id/steps/:stepId/answer
 */
exports.submitStepAnswer = async (req, res, next) => {
  try {
    const { id, stepId } = req.params;
    const { answer } = req.body;

    logger.info(`Submitting answer for session ${id}, step ${stepId}`, {
      answer: JSON.stringify(answer).substring(0, 200),
    });

    if (!answer) {
      return res.status(400).json({
        success: false,
        message: 'Answer is required',
      });
    }

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    // Check ownership
    if (session.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Find the step
    let step = await SessionStep.findOne({
      session: session._id,
      stepId,
    });

    if (!step) {
      return res.status(404).json({
        success: false,
        message: 'Step not found',
      });
    }

    // Update step with answer
    step.answer = answer;
    step.completedAt = new Date();
    await step.save();

    // Check for crisis language in answer
    if (detectCrisis(answer)) {
      logger.warn(`Crisis language detected in session ${session._id}`);

      // Get current step count
      const stepCount = await SessionStep.countDocuments({ session: session._id });

      // Create crisis step
      const crisisStepData = generateCrisisStep(stepCount);
      const crisisStep = await SessionStep.create({
        session: session._id,
        user: req.user.id,
        stepId: crisisStepData.step_id,
        stepType: crisisStepData.step_type,
        stepData: crisisStepData,
        stepIndex: stepCount,
        interventionType: 'crisis',
      });

      return res.status(200).json({
        success: true,
        crisis_detected: true,
        next_step: crisisStepData,
      });
    }

    // Handle special step types
    await handleSpecialStepLogic(step, session, answer);

    res.status(200).json({
      success: true,
      message: 'Answer submitted',
    });
  } catch (error) {
    logger.error('Error submitting step answer:', error);
    next(error);
  }
};

/**
 * Handle special logic for certain step types
 */
async function handleSpecialStepLogic(step, session, answer) {
  switch (step.stepType) {
    case 'intensity_scale':
      // Update session intensity
      if (!session.initialIntensity) {
        session.initialIntensity = answer.value;
      } else {
        session.finalIntensity = answer.value;
      }
      await session.save();
      break;

    case 'dump_text':
    case 'dump_voice':
      // Venting step - classification will happen on next step request
      logger.info(`User vented: ${step.stepType}`, {
        sessionId: session._id,
      });
      break;

    case 'choice_buttons':
      // Log the choice
      logger.info(`User chose: ${answer.choice_id}`, {
        sessionId: session._id,
      });
      break;

    case 'reframe_review':
    case 'self_compassion_script':
    case 'action_plan':
    case 'sleep_wind_down':
      // These steps typically complete a method - advance to next method
      await checkAndAdvanceMethod(session, step.stepType);
      break;

    case 'summary':
      // Mark session as ended
      session.endedAt = new Date();
      session.outcome = 'calmer'; // Default, could be determined by final intensity
      await session.save();
      break;
  }
}

/**
 * Check if current method is complete and advance to next
 */
async function checkAndAdvanceMethod(session, completedStepType) {
  if (!session.microPlan || session.microPlan.length === 0) {
    return; // No micro plan yet
  }

  const { currentMethod } = getCurrentMethod(session);
  let shouldAdvance = false;

  // Determine if this step completes the current method
  switch (currentMethod) {
    case 'brief_cbt':
      // brief_cbt is complete after reframe_review
      if (completedStepType === 'reframe_review') {
        shouldAdvance = true;
      }
      break;

    case 'self_compassion':
      if (completedStepType === 'self_compassion_script') {
        shouldAdvance = true;
      }
      break;

    case 'defusion':
      // Defusion is typically one cbt_question
      if (completedStepType === 'cbt_question') {
        shouldAdvance = true;
      }
      break;

    case 'behavioral_micro_plan':
      if (completedStepType === 'action_plan') {
        shouldAdvance = true;
      }
      break;

    case 'sleep_wind_down':
      if (completedStepType === 'sleep_wind_down') {
        shouldAdvance = true;
      }
      break;

    case 'breathing':
    case 'grounding':
    case 'expressive_release':
    case 'acceptance_values':
      // These are typically one step
      shouldAdvance = true;
      break;
  }

  if (shouldAdvance) {
    await advanceToNextMethod(session);
    logger.info('Advanced to next method', {
      sessionId: session._id,
      completedMethod: currentMethod,
    });
  }
}

/**
 * Save a step (called internally when generating step)
 */
async function saveStep(sessionId, userId, stepData, stepIndex) {
  const step = await SessionStep.create({
    session: sessionId,
    user: userId,
    stepId: stepData.step_id,
    stepType: stepData.step_type,
    stepData,
    stepIndex,
    interventionType: stepData.meta?.intervention_type,
  });

  // Update session interventions
  if (stepData.meta?.intervention_type) {
    await Session.findByIdAndUpdate(sessionId, {
      $addToSet: { interventionsUsed: stepData.meta.intervention_type },
    });
  }

  return step;
}

// Note: Functions are already exported using exports.functionName pattern above
