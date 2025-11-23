const SelfCompassionExercise = require('../models/SelfCompassionExercise');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * @desc    Create/complete self-compassion exercise
 * @route   POST /api/v1/compassion/exercise
 * @access  Private
 */
exports.createExercise = asyncHandler(async (req, res) => {
  const { 
    type = 'standalone',
    trigger,
    feeling,
    customFeeling,
    customCompassionLine,
    linkedSpiralSession,
    helpfulnessRating,
  } = req.body;

  const exercise = await SelfCompassionExercise.create({
    user: req.user._id,
    type,
    trigger,
    feeling,
    customFeeling,
    customCompassionLine,
    linkedSpiralSession,
    helpfulnessRating,
    completedAt: new Date(),
  });

  // Update user stats
  req.user.stats.totalCompassionExercises += 1;
  await req.user.save();

  logger.info(`Self-compassion exercise created: ${exercise._id} by user ${req.user._id}`);

  sendSuccess(res, {
    exercise,
  }, 'Self-compassion exercise completed', 201);
});

/**
 * @desc    Get self-compassion exercise history
 * @route   GET /api/v1/compassion/history
 * @access  Private
 */
exports.getHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const exercises = await SelfCompassionExercise.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  const count = await SelfCompassionExercise.countDocuments({ user: req.user._id });

  sendPaginated(res, exercises, page, limit, count, 'Exercise history retrieved');
});

/**
 * @desc    Get random past self-compassion line for inspiration
 * @route   GET /api/v1/compassion/random
 * @access  Private
 */
exports.getRandomLine = asyncHandler(async (req, res) => {
  const exercises = await SelfCompassionExercise.find({
    user: req.user._id,
    customCompassionLine: { $exists: true, $ne: '' },
  }).lean();

  if (exercises.length === 0) {
    return sendSuccess(res, {
      line: null,
    }, 'No compassion lines found yet');
  }

  // Get random exercise
  const randomExercise = exercises[Math.floor(Math.random() * exercises.length)];

  sendSuccess(res, {
    line: randomExercise.customCompassionLine,
    feeling: randomExercise.feeling || randomExercise.customFeeling,
    createdAt: randomExercise.createdAt,
  }, 'Random compassion line retrieved');
});

/**
 * @desc    Get most helpful compassion lines
 * @route   GET /api/v1/compassion/helpful
 * @access  Private
 */
exports.getMostHelpful = asyncHandler(async (req, res) => {
  const { limit = 5 } = req.query;

  const exercises = await SelfCompassionExercise.find({
    user: req.user._id,
    helpfulnessRating: { $gte: 4 },
    customCompassionLine: { $exists: true, $ne: '' },
  })
    .sort({ helpfulnessRating: -1, createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

  sendSuccess(res, {
    exercises: exercises.map(e => e.toShareable ? e.toShareable() : {
      id: e._id,
      feeling: e.feeling || e.customFeeling,
      customCompassionLine: e.customCompassionLine,
      helpfulnessRating: e.helpfulnessRating,
      createdAt: e.createdAt,
    }),
  }, 'Most helpful lines retrieved');
});

/**
 * @desc    Update exercise helpfulness rating
 * @route   PUT /api/v1/compassion/:id/rating
 * @access  Private
 */
exports.updateRating = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { helpfulnessRating } = req.body;

  const exercise = await SelfCompassionExercise.findOne({
    _id: id,
    user: req.user._id,
  });

  if (!exercise) {
    return sendError(res, 'Exercise not found', 404);
  }

  exercise.helpfulnessRating = helpfulnessRating;
  await exercise.save();

  sendSuccess(res, {
    exercise,
  }, 'Rating updated successfully');
});
