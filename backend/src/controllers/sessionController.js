const Session = require('../models/Session');
const Message = require('../models/Message');
const Feedback = require('../models/Feedback');
const { generateResponse } = require('../services/llmOrchestrator');
const logger = require('../config/logger');

/**
 * Create a new session
 * POST /sessions
 * 
 * For rescue mode, this creates a session that will use the 7-phase flow
 * controlled by rescueFlowGenerator.js
 */
exports.createSession = async (req, res, next) => {
  try {
    const { 
      context = 'spiral', 
      mode = 'rescue', // rescue | quick_rescue | buffer | training
      sleepRelated = false,
    } = req.body;

    // Determine mode based on context if not explicitly provided
    let effectiveMode = mode;
    if (context === 'spiral' || context === 'self_compassion') {
      effectiveMode = mode || 'rescue';
    } else if (context === 'autopilot_rescue') {
      effectiveMode = 'quick_rescue';
    } else if (context === 'autopilot_buffer') {
      effectiveMode = 'buffer';
    }

    const session = await Session.create({
      user: req.user.id,
      context,
      mode: effectiveMode,
      sleepRelated,
      startedAt: new Date(),
      currentPhase: 0, // Start at Phase 0: Arrival
      phaseHistory: [],
    });

    logger.info('Session created', {
      sessionId: session._id,
      userId: req.user.id,
      mode: effectiveMode,
      context,
      sleepRelated,
    });

    res.status(201).json({
      success: true,
      message: 'Session created',
      data: {
        session: {
          id: session._id,
          _id: session._id,
          context: session.context,
          mode: session.mode,
          startedAt: session.startedAt,
        },
      },
    });
  } catch (error) {
    logger.error('Error creating session:', error);
    next(error);
  }
};

/**
 * Send a message and get AI response
 * POST /sessions/:id/messages
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, audioUrl, audioTranscript } = req.body;

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

    // Save user message
    const userMessage = await Message.create({
      session: session._id,
      user: req.user.id,
      sender: 'user',
      role: 'user',
      content: content || audioTranscript,
      audioUrl,
      audioTranscript,
    });

    // Get conversation history
    const messages = await Message.find({ session: session._id })
      .sort({ createdAt: 1 })
      .limit(20) // Keep last 20 messages for context
      .select('role content');

    const conversationHistory = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Get user profile for personalization
    const user = await req.user.populate('profile');
    const userProfile = user.profile || {};

    // Generate AI response
    const aiResponse = await generateResponse(
      session._id,
      req.user.id,
      conversationHistory,
      userProfile
    );

    // Save AI message
    const aiMessage = await Message.create({
      session: session._id,
      user: req.user.id,
      sender: 'ai',
      role: 'assistant',
      content: aiResponse.content,
      metadata: aiResponse.functionCall || {},
    });

    res.status(200).json({
      success: true,
      data: {
        userMessage: {
          id: userMessage._id,
          content: userMessage.content,
          createdAt: userMessage.createdAt,
        },
        aiMessage: {
          id: aiMessage._id,
          content: aiMessage.content,
          createdAt: aiMessage.createdAt,
        },
        functionCall: aiResponse.functionCall,
      },
    });
  } catch (error) {
    logger.error('Error sending message:', error);
    next(error);
  }
};

/**
 * Get user's sessions
 * GET /sessions
 */
exports.getSessions = async (req, res, next) => {
  try {
    const { limit = 20, skip = 0 } = req.query;

    const sessions = await Session.find({ user: req.user.id })
      .sort({ startedAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('context topic emotion startedAt endedAt initialIntensity finalIntensity outcome interventionsUsed');

    const total = await Session.countDocuments({ user: req.user.id });

    res.status(200).json({
      success: true,
      data: {
        sessions,
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching sessions:', error);
    next(error);
  }
};

/**
 * Get session details with messages
 * GET /sessions/:id
 */
exports.getSession = async (req, res, next) => {
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

    // Get messages
    const messages = await Message.find({ session: session._id })
      .sort({ createdAt: 1 })
      .select('sender content audioUrl createdAt');

    res.status(200).json({
      success: true,
      data: {
        session,
        messages,
      },
    });
  } catch (error) {
    logger.error('Error fetching session:', error);
    next(error);
  }
};

/**
 * Submit feedback for session
 * POST /sessions/:id/feedback
 */
exports.submitFeedback = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

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

    // Create or update feedback
    const feedback = await Feedback.findOneAndUpdate(
      { session: session._id, user: req.user.id },
      { rating, comment },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Feedback submitted',
      data: { feedback },
    });
  } catch (error) {
    logger.error('Error submitting feedback:', error);
    next(error);
  }
};
