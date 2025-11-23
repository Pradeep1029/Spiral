const SpiralSession = require('../models/SpiralSession');
const User = require('../models/User');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * @desc    Start a new spiral rescue session
 * @route   POST /api/v1/spirals/start
 * @access  Private
 */
exports.startSession = asyncHandler(async (req, res) => {
  const { intensityBefore, primaryTopic, deviceInfo } = req.body;

  // Check if there's an active session
  const activeSession = await SpiralSession.findOne({
    user: req.user._id,
    status: 'in_progress',
  });

  if (activeSession) {
    return sendSuccess(res, {
      session: activeSession,
    }, 'Active session already exists');
  }

  // Create new session
  const session = await SpiralSession.create({
    user: req.user._id,
    intensityBefore,
    primaryTopic,
    deviceInfo,
    status: 'in_progress',
  });

  logger.info(`Spiral session started: ${session._id} by user ${req.user._id}`);

  sendSuccess(res, {
    session,
  }, 'Spiral session started', 201);
});

/**
 * @desc    Update a step in the spiral session
 * @route   PUT /api/v1/spirals/:id/step
 * @access  Private
 */
exports.updateStep = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { stepNumber, stepData } = req.body;

  const session = await SpiralSession.findOne({
    _id: id,
    user: req.user._id,
  });

  if (!session) {
    return sendError(res, 'Session not found', 404);
  }

  if (session.status !== 'in_progress') {
    return sendError(res, 'Session is not in progress', 400);
  }

  // Update the specific step
  const stepFields = ['breathing', 'dump', 'exit', 'close'];
  const stepField = `step${stepNumber}_${stepFields[stepNumber - 1]}`;

  if (!session[stepField]) {
    session[stepField] = {};
  }

  // Merge step data
  session[stepField] = {
    ...session[stepField],
    ...stepData,
    completed: stepData.completed !== undefined ? stepData.completed : true,
    completedAt: new Date(),
  };

  await session.save();

  logger.info(`Step ${stepNumber} updated for session ${session._id}`);

  sendSuccess(res, {
    session,
  }, `Step ${stepNumber} updated successfully`);
});

/**
 * @desc    Complete spiral session
 * @route   PUT /api/v1/spirals/:id/complete
 * @access  Private
 */
exports.completeSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { intensityAfter, nextAction, sleepWindDownCompleted } = req.body;

  const session = await SpiralSession.findOne({
    _id: id,
    user: req.user._id,
  });

  if (!session) {
    return sendError(res, 'Session not found', 404);
  }

  if (session.status !== 'in_progress') {
    return sendError(res, 'Session is not in progress', 400);
  }

  // Complete the session
  session.status = 'completed';
  session.completedAt = new Date();
  session.intensityAfter = intensityAfter;
  
  if (!session.step4_close) {
    session.step4_close = {};
  }
  
  session.step4_close = {
    ...session.step4_close,
    completed: true,
    feelingAfter: intensityAfter,
    nextAction,
    sleepWindDownCompleted: sleepWindDownCompleted || false,
    completedAt: new Date(),
  };

  await session.save();

  // Update user stats
  req.user.stats.totalSpirals += 1;
  req.user.stats.lastSpiralAt = new Date();
  
  // Update average intensities
  const allSessions = await SpiralSession.find({
    user: req.user._id,
    status: 'completed',
    intensityBefore: { $exists: true },
    intensityAfter: { $exists: true },
  });

  if (allSessions.length > 0) {
    const avgBefore = allSessions.reduce((sum, s) => sum + s.intensityBefore, 0) / allSessions.length;
    const avgAfter = allSessions.reduce((sum, s) => sum + s.intensityAfter, 0) / allSessions.length;
    
    req.user.stats.averageIntensityBefore = avgBefore;
    req.user.stats.averageIntensityAfter = avgAfter;
  }

  await req.user.save();

  logger.info(`Spiral session completed: ${session._id}`);

  sendSuccess(res, {
    session: session.getSummary(),
    improvement: session.intensityBefore - session.intensityAfter,
  }, 'Spiral session completed successfully');
});

/**
 * @desc    Get spiral session history
 * @route   GET /api/v1/spirals/history
 * @access  Private
 */
exports.getHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;

  const query = { user: req.user._id };
  if (status) {
    query.status = status;
  }

  const sessions = await SpiralSession.find(query)
    .sort({ startedAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const count = await SpiralSession.countDocuments(query);

  const formattedSessions = sessions.map(session => ({
    id: session._id,
    status: session.status,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    duration: session.duration,
    intensityBefore: session.intensityBefore,
    intensityAfter: session.intensityAfter,
    primaryTopic: session.primaryTopic,
    pathChosen: session.step3_exit?.pathChosen,
    improvement: session.intensityBefore && session.intensityAfter 
      ? session.intensityBefore - session.intensityAfter 
      : null,
  }));

  sendPaginated(res, formattedSessions, page, limit, count, 'History retrieved successfully');
});

/**
 * @desc    Get specific spiral session
 * @route   GET /api/v1/spirals/:id
 * @access  Private
 */
exports.getSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await SpiralSession.findOne({
    _id: id,
    user: req.user._id,
  });

  if (!session) {
    return sendError(res, 'Session not found', 404);
  }

  sendSuccess(res, {
    session,
  }, 'Session retrieved successfully');
});

/**
 * @desc    Abandon current session
 * @route   PUT /api/v1/spirals/:id/abandon
 * @access  Private
 */
exports.abandonSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const session = await SpiralSession.findOne({
    _id: id,
    user: req.user._id,
    status: 'in_progress',
  });

  if (!session) {
    return sendError(res, 'Active session not found', 404);
  }

  session.status = 'abandoned';
  await session.save();

  logger.info(`Session abandoned: ${session._id}`);

  sendSuccess(res, {
    session: session.getSummary(),
  }, 'Session abandoned');
});
