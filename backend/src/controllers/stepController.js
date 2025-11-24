const Session = require('../models/Session');
const SessionStep = require('../models/SessionStep');
const { generateNextStep, detectCrisis, generateCrisisStep } = require('../services/stepGenerator');
const logger = require('../config/logger');

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

    // Generate next step
    const stepData = await generateNextStep(session._id, req.user.id, userProfile);

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
      // This is where we might trigger classification
      // For now, just log
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

    case 'summary':
      // Mark session as ended
      session.endedAt = new Date();
      session.outcome = 'calmer'; // Default, could be determined by final intensity
      await session.save();
      break;
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
