const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const { sendSuccess, sendError } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * @desc    Create anonymous user
 * @route   POST /api/v1/auth/anonymous
 * @access  Public
 */
exports.createAnonymousUser = asyncHandler(async (req, res) => {
  // Generate unique anonymous ID
  const anonymousId = `anon_${crypto.randomBytes(16).toString('hex')}`;

  const user = await User.create({
    anonymousId,
    isAnonymous: true,
  });

  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  logger.info(`Anonymous user created: ${user._id}`);

  sendSuccess(res, {
    token,
    refreshToken,
    user: user.toPublicJSON(),
  }, 'Anonymous account created successfully', 201);
});

/**
 * @desc    Register user with email/password
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
exports.register = asyncHandler(async (req, res) => {
  logger.info('Register request received', {
    body: req.body,
  });
  const { email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return sendError(res, 'User already exists with this email', 400);
  }

  // Create user
  const user = await User.create({
    email,
    password,
    isAnonymous: false,
  });

  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  logger.info(`New user registered: ${user._id}`);

  sendSuccess(res, {
    token,
    refreshToken,
    user: user.toPublicJSON(),
  }, 'User registered successfully', 201);
});

/**
 * @desc    Convert anonymous user to registered user
 * @route   POST /api/v1/auth/convert
 * @access  Private (Anonymous)
 */
exports.convertAnonymousToRegistered = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!req.user.isAnonymous) {
    return sendError(res, 'User is already registered', 400);
  }

  // Check if email is already taken
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return sendError(res, 'Email already in use', 400);
  }

  // Convert user
  await req.user.convertToRegistered(email, password);

  const token = generateToken(req.user._id);
  const refreshToken = generateRefreshToken(req.user._id);

  logger.info(`Anonymous user converted to registered: ${req.user._id}`);

  sendSuccess(res, {
    token,
    refreshToken,
    user: req.user.toPublicJSON(),
  }, 'Account converted successfully');
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res) => {
  logger.info('Login request received', {
    body: req.body,
  });
  const { email, password, anonymousId } = req.body;

  let user;

  // Login with email/password or anonymousId
  if (email && password) {
    user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.comparePassword(password))) {
      return sendError(res, 'Invalid credentials', 401);
    }
  } else if (anonymousId) {
    user = await User.findOne({ anonymousId, isAnonymous: true });
    
    if (!user) {
      return sendError(res, 'Anonymous user not found', 404);
    }
  } else {
    return sendError(res, 'Please provide email/password or anonymous ID', 400);
  }

  // Update last login
  user.lastLoginAt = new Date();
  await user.save();

  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  logger.info(`User logged in: ${user._id}`);

  sendSuccess(res, {
    token,
    refreshToken,
    user: user.toPublicJSON(),
  }, 'Login successful');
});

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh
 * @access  Public
 */
exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return sendError(res, 'Refresh token is required', 400);
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return sendError(res, 'Invalid refresh token', 401);
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    sendSuccess(res, {
      token: newToken,
      refreshToken: newRefreshToken,
    }, 'Token refreshed successfully');
  } catch (error) {
    return sendError(res, 'Invalid or expired refresh token', 401);
  }
});

/**
 * @desc    Get current user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
exports.getCurrentUser = asyncHandler(async (req, res) => {
  sendSuccess(res, {
    user: req.user.toPublicJSON(),
  }, 'User retrieved successfully');
});

/**
 * @desc    Update user profile
 * @route   PUT /api/v1/auth/profile
 * @access  Private
 */
exports.updateProfile = asyncHandler(async (req, res) => {
  const { preferences } = req.body;

  if (preferences) {
    req.user.preferences = {
      ...req.user.preferences,
      ...preferences,
    };
  }

  await req.user.save();

  sendSuccess(res, {
    user: req.user.toPublicJSON(),
  }, 'Profile updated successfully');
});

/**
 * @desc    Delete user account
 * @route   DELETE /api/v1/auth/account
 * @access  Private
 */
exports.deleteAccount = asyncHandler(async (req, res) => {
  // Soft delete - deactivate account
  req.user.isActive = false;
  await req.user.save();

  logger.info(`User account deleted: ${req.user._id}`);

  sendSuccess(res, null, 'Account deleted successfully');
});
