const Session = require('../models/Session');
const User = require('../models/User');
const logger = require('../config/logger');
const { generateTrainingPlan, getTrainingContent, recommendTrainingSkill, getAvailableTrainingSkills } = require('../services/trainingPlanGenerator');

/**
 * Get available training skills
 * GET /training/skills
 */
exports.getTrainingSkills = async (req, res, next) => {
  try {
    const skills = getAvailableTrainingSkills();
    
    // Get user's recent training sessions to mark completed skills
    const recentSessions = await Session.find({
      user: req.user.id,
      mode: 'training',
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
    }).select('trainingSkill');
    
    const completedSkills = recentSessions.map(s => s.trainingSkill);
    
    const skillsWithStatus = skills.map(skill => ({
      ...skill,
      completedRecently: completedSkills.includes(skill.id),
    }));
    
    res.status(200).json({
      success: true,
      data: { skills: skillsWithStatus },
    });
  } catch (error) {
    logger.error('Error getting training skills:', error);
    next(error);
  }
};

/**
 * Get recommended training skill for user
 * GET /training/recommend
 */
exports.getRecommendedSkill = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Get recent training sessions
    const recentSessions = await Session.find({
      user: req.user.id,
      mode: 'training',
      createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }, // Last 14 days
    }).select('trainingSkill');
    
    const recommendedSkill = recommendTrainingSkill(user, recentSessions);
    const skills = getAvailableTrainingSkills();
    const skillDetails = skills.find(s => s.id === recommendedSkill);
    
    res.status(200).json({
      success: true,
      data: {
        recommendedSkill,
        details: skillDetails,
      },
    });
  } catch (error) {
    logger.error('Error getting recommended skill:', error);
    next(error);
  }
};

/**
 * Start a training session
 * POST /training/start
 */
exports.startTrainingSession = async (req, res, next) => {
  try {
    const { skill } = req.body;
    
    if (!skill) {
      return res.status(400).json({
        success: false,
        message: 'Skill is required',
      });
    }
    
    // Generate training plan
    const plan = generateTrainingPlan(skill);
    
    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'Invalid training skill',
      });
    }
    
    // Create training session
    const session = await Session.create({
      user: req.user.id,
      context: 'training',
      mode: 'training',
      trainingSkill: skill,
      startedAt: new Date(),
      microPlan: plan.steps.map(s => s.type),
      totalSteps: plan.totalSteps,
      currentStepIndex: 0,
    });
    
    res.status(201).json({
      success: true,
      data: {
        session: {
          id: session._id,
          skill: plan.skill,
          name: plan.name,
          description: plan.description,
          duration: plan.duration,
          totalSteps: plan.totalSteps,
        },
      },
    });
  } catch (error) {
    logger.error('Error starting training session:', error);
    next(error);
  }
};

/**
 * Get next step in training session
 * GET /training/:sessionId/next_step
 */
exports.getTrainingStep = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    
    const session = await Session.findById(sessionId);
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
    
    // Check if session is complete
    if (session.currentStepIndex >= session.totalSteps) {
      // Mark session as complete
      session.endedAt = new Date();
      await session.save();
      
      return res.status(200).json({
        success: true,
        flow_complete: true,
        data: {
          message: 'Training complete!',
        },
      });
    }
    
    // Get current step type
    const stepType = session.microPlan[session.currentStepIndex];
    const content = getTrainingContent(session.trainingSkill, stepType);
    
    // Build step response
    const step = {
      step_id: `${session._id}_step_${session.currentStepIndex}`,
      step_type: stepType,
      skill: session.trainingSkill,
      ...content,
      meta: {
        step_index: session.currentStepIndex + 1,
        step_count: session.totalSteps,
        show_progress: true,
      },
    };
    
    res.status(200).json({
      success: true,
      data: { step },
    });
  } catch (error) {
    logger.error('Error getting training step:', error);
    next(error);
  }
};

/**
 * Submit answer for training step
 * POST /training/:sessionId/steps/:stepId/answer
 */
exports.submitTrainingAnswer = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { answer } = req.body;
    
    const session = await Session.findById(sessionId);
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
    
    // Advance to next step
    session.currentStepIndex += 1;
    
    // Store any practice answers
    if (answer?.practiceResponse) {
      session.metadata = session.metadata || {};
      session.metadata.practiceResponses = session.metadata.practiceResponses || [];
      session.metadata.practiceResponses.push({
        stepIndex: session.currentStepIndex - 1,
        response: answer.practiceResponse,
      });
    }
    
    await session.save();
    
    res.status(200).json({
      success: true,
      data: {
        nextStepIndex: session.currentStepIndex,
        isComplete: session.currentStepIndex >= session.totalSteps,
      },
    });
  } catch (error) {
    logger.error('Error submitting training answer:', error);
    next(error);
  }
};

/**
 * Complete training session
 * POST /training/:sessionId/complete
 */
exports.completeTrainingSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { helpfulnessRating } = req.body;
    
    const session = await Session.findById(sessionId);
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
    
    // Update session
    session.endedAt = new Date();
    session.outcomeData = session.outcomeData || {};
    session.outcomeData.helpfulnessRating = helpfulnessRating;
    await session.save();
    
    res.status(200).json({
      success: true,
      message: 'Training session completed',
      data: {
        skill: session.trainingSkill,
        duration: session.endedAt - session.startedAt,
      },
    });
  } catch (error) {
    logger.error('Error completing training session:', error);
    next(error);
  }
};

/**
 * Get user's training history
 * GET /training/history
 */
exports.getTrainingHistory = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    
    const sessions = await Session.find({
      user: req.user.id,
      mode: 'training',
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('trainingSkill startedAt endedAt outcomeData');
    
    // Group by skill
    const skillCounts = {};
    sessions.forEach(s => {
      skillCounts[s.trainingSkill] = (skillCounts[s.trainingSkill] || 0) + 1;
    });
    
    res.status(200).json({
      success: true,
      data: {
        sessions,
        skillCounts,
        totalTrainingSessions: sessions.length,
      },
    });
  } catch (error) {
    logger.error('Error getting training history:', error);
    next(error);
  }
};
