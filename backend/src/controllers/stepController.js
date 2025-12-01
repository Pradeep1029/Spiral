const Session = require('../models/Session');
const SessionStep = require('../models/SessionStep');
const { generateNextStep } = require('../services/stepGenerator_v2');
const { generateNextRescueStep } = require('../services/rescueFlowGenerator');
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

    // Get user profile + onboarding for personalization
    const user = await req.user.populate('profile');
    const userContext = {
      onboarding: user.onboarding,
      profile: user.profile || {},
    };

    logger.info('getNextStep: generating step', {
      sessionId: session._id,
      userId: req.user.id,
      mode: session.mode,
    });

    // Generate next step - use phase-based generator for rescue mode
    let stepData;
    if (session.mode === 'rescue' || session.mode === 'quick_rescue' || session.context === 'spiral') {
      stepData = await generateNextRescueStep(session._id, req.user.id, userContext);
      
      // Check if flow is complete
      if (stepData.flow_complete) {
        return res.status(200).json({
          success: true,
          flow_complete: true,
          message: 'Flow has ended',
          summary: stepData.summary,
        });
      }
    } else {
      // Use legacy generator for training mode etc.
      stepData = await generateNextStep(session._id, req.user.id, userContext);
    }

    logger.info('getNextStep: generated step data', {
      sessionId: session._id,
      stepId: stepData.step_id,
      stepType: stepData.step_type,
      interventionType: stepData.meta?.intervention_type,
    });

    // Save step to database with phase tracking
    const stepCount = await SessionStep.countDocuments({ session: session._id });
    await SessionStep.create({
      session: session._id,
      user: req.user.id,
      stepId: stepData.step_id,
      stepType: stepData.step_type,
      stepData,
      stepIndex: stepCount,
      interventionType: stepData.meta?.intervention_type,
      phaseNumber: stepData.meta?.phase_number,
      phaseName: stepData.meta?.phase_name,
    });

    // Update session interventions
    if (stepData.meta?.intervention_type) {
      logger.info('getNextStep: updating session interventions', {
        sessionId: session._id,
        interventionType: stepData.meta.intervention_type,
      });

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
 * Handle special logic for certain step types (Phase-aware version)
 * This is called after a step answer is submitted
 */
async function handleSpecialStepLogic(step, session, answer) {
  logger.info('handleSpecialStepLogic called', {
    sessionId: session._id,
    stepType: step.stepType,
    phaseNumber: step.phaseNumber,
  });

  switch (step.stepType) {
    case 'intro':
      // Intro step - no special handling needed
      break;

    case 'context_check':
      // Update sleep context based on choice
      if (answer.choice_id === 'trying_to_sleep') {
        session.sleepRelated = true;
      }
      await session.save();
      break;

    case 'body_choice':
      // Store body technique preference
      logger.info(`User chose body technique: ${answer.choice_id}`, {
        sessionId: session._id,
      });
      break;

    case 'intensity_scale':
      // Update session intensity
      if (!session.initialIntensity) {
        session.initialIntensity = answer.value;
      }
      await session.save();
      break;

    case 'final_intensity':
      // Update final intensity
      session.finalIntensity = answer.value;
      await session.save();
      break;

    case 'dump_text':
    case 'dump_voice':
      // Store raw dump text for classification
      if (answer.text) {
        session.rawDumpText = answer.text;
      }
      await session.save();
      break;

    case 'spiral_title':
      // Store the spiral title for use in later steps
      if (answer.title || answer.text) {
        session.spiralTitle = answer.title || answer.text;
      }
      await session.save();
      break;

    case 'breathing':
    case 'grounding_5_4_3_2_1':
      // Body regulation complete - update phase if needed
      await updatePhaseProgress(session, step);
      break;

    case 'choice_buttons':
    case 'sleep_or_action_choice':
      // Store path choice for Phase 5
      if (answer.choice_id === 'sleep' || answer.choice_id === 'action') {
        session.pathChoice = answer.choice_id;
        await session.save();
      }
      logger.info(`User chose: ${answer.choice_id}`, {
        sessionId: session._id,
      });
      break;

    case 'cbt_question':
    case 'defusion':
    case 'acceptance':
    case 'reframe_review':
      // Cognitive work steps - phase will auto-advance
      await updatePhaseProgress(session, step);
      break;

    case 'self_compassion_script':
      // Store any custom compassion line they added
      if (answer.customLine) {
        session.metadata = session.metadata || {};
        session.metadata.customCompassionLine = answer.customLine;
        await session.save();
      }
      await updatePhaseProgress(session, step);
      break;

    case 'action_plan':
      // Store the action plan
      if (answer.plan || answer.text) {
        session.actionPlan = answer.plan || answer.text;
        await session.save();
      }
      await updatePhaseProgress(session, step);
      break;

    case 'sleep_wind_down':
      await updatePhaseProgress(session, step);
      break;

    case 'summary':
      // Mark session as ended
      session.endedAt = new Date();
      // Determine outcome based on intensity change
      if (session.initialIntensity && session.finalIntensity) {
        const improvement = session.initialIntensity - session.finalIntensity;
        if (improvement >= 2) {
          session.outcome = 'calmer';
        } else if (improvement >= 0) {
          session.outcome = 'same';
        } else {
          session.outcome = 'worse';
        }
      } else {
        session.outcome = 'calmer'; // Default
      }
      await session.save();
      break;

    default:
      // For any other step type, just update phase progress
      await updatePhaseProgress(session, step);
      break;
  }
}

/**
 * Update phase progress tracking
 */
async function updatePhaseProgress(session, step) {
  if (step.phaseNumber === undefined) return;
  
  // Initialize phase history if needed
  if (!session.phaseHistory) {
    session.phaseHistory = [];
  }
  
  // Find or create phase entry
  let phaseEntry = session.phaseHistory.find(p => p.phaseNumber === step.phaseNumber);
  if (!phaseEntry) {
    phaseEntry = {
      phaseNumber: step.phaseNumber,
      phaseName: step.phaseName,
      startedAt: new Date(),
      completed: false,
      stepsCompleted: [],
    };
    session.phaseHistory.push(phaseEntry);
  }
  
  // Add step to completed steps
  if (!phaseEntry.stepsCompleted.includes(step.stepId)) {
    phaseEntry.stepsCompleted.push(step.stepId);
  }
  
  await session.save();
}
