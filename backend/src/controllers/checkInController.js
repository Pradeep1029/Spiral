const CheckIn = require('../models/CheckIn');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * @desc    Create a check-in
 * @route   POST /api/v1/checkins
 * @access  Private
 */
exports.createCheckIn = asyncHandler(async (req, res) => {
  const { 
    mentalState, 
    intensity, 
    notes, 
    type = 'quick',
    scheduledTime,
    deviceInfo 
  } = req.body;

  const checkIn = await CheckIn.create({
    user: req.user._id,
    mentalState,
    intensity,
    notes,
    type,
    scheduledTime,
    deviceInfo,
  });

  // Update user stats
  req.user.stats.totalCheckIns += 1;
  req.user.stats.lastCheckInAt = new Date();
  await req.user.save();

  logger.info(`Check-in created: ${checkIn._id} by user ${req.user._id}`);

  // Determine follow-up action
  const followUp = await checkIn.createFollowUpAction();

  sendSuccess(res, {
    checkIn,
    followUp,
  }, 'Check-in recorded successfully', 201);
});

/**
 * @desc    Get check-in history
 * @route   GET /api/v1/checkins/history
 * @access  Private
 */
exports.getHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 30, type } = req.query;

  const query = { user: req.user._id };
  if (type) {
    query.type = type;
  }

  const checkIns = await CheckIn.find(query)
    .sort({ checkInTime: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('linkedSpiralSession', 'status intensityBefore intensityAfter')
    .lean();

  const count = await CheckIn.countDocuments(query);

  sendPaginated(res, checkIns, page, limit, count, 'Check-in history retrieved');
});

/**
 * @desc    Get latest check-in
 * @route   GET /api/v1/checkins/latest
 * @access  Private
 */
exports.getLatest = asyncHandler(async (req, res) => {
  const checkIn = await CheckIn.findOne({ user: req.user._id })
    .sort({ checkInTime: -1 })
    .populate('linkedSpiralSession', 'status intensityBefore intensityAfter');

  if (!checkIn) {
    return sendError(res, 'No check-ins found', 404);
  }

  sendSuccess(res, {
    checkIn,
  }, 'Latest check-in retrieved');
});

/**
 * @desc    Link check-in to spiral session
 * @route   PUT /api/v1/checkins/:id/link
 * @access  Private
 */
exports.linkToSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { sessionId } = req.body;

  const checkIn = await CheckIn.findOne({
    _id: id,
    user: req.user._id,
  });

  if (!checkIn) {
    return sendError(res, 'Check-in not found', 404);
  }

  checkIn.linkedSpiralSession = sessionId;
  checkIn.actionTaken = 'started_spiral_rescue';
  await checkIn.save();

  sendSuccess(res, {
    checkIn,
  }, 'Check-in linked to session');
});

/**
 * @desc    Get check-in statistics
 * @route   GET /api/v1/checkins/stats
 * @access  Private
 */
exports.getStats = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - parseInt(days));

  const checkIns = await CheckIn.find({
    user: req.user._id,
    checkInTime: { $gte: dateThreshold },
  }).lean();

  // Count by mental state
  const stateCounts = {
    calm: 0,
    bit_loud: 0,
    spiraling: 0,
  };

  checkIns.forEach(checkIn => {
    stateCounts[checkIn.mentalState]++;
  });

  // Calculate percentages
  const total = checkIns.length;
  const statePercentages = {
    calm: total > 0 ? (stateCounts.calm / total * 100).toFixed(1) : 0,
    bit_loud: total > 0 ? (stateCounts.bit_loud / total * 100).toFixed(1) : 0,
    spiraling: total > 0 ? (stateCounts.spiraling / total * 100).toFixed(1) : 0,
  };

  sendSuccess(res, {
    period: `${days} days`,
    total,
    stateCounts,
    statePercentages,
  }, 'Check-in statistics retrieved');
});
