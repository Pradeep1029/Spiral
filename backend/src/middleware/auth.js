const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendError } = require('../utils/response');
const logger = require('../config/logger');

/**
 * Middleware to protect routes - requires valid JWT token
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return sendError(res, 'Not authorized to access this route', 401);
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id);

      if (!req.user) {
        return sendError(res, 'User not found', 404);
      }

      if (!req.user.isActive) {
        return sendError(res, 'User account is deactivated', 403);
      }

      next();
    } catch (error) {
      logger.error('Token verification failed:', error);
      return sendError(res, 'Invalid or expired token', 401);
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return sendError(res, 'Authentication error', 500);
  }
};

/**
 * Optional auth - doesn't fail if no token, but sets req.user if valid token
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);
      } catch (error) {
        // Token invalid but that's okay for optional auth
        logger.debug('Optional auth: Invalid token');
      }
    }

    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next();
  }
};

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

/**
 * Generate refresh token (longer expiry)
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: '90d' }
  );
};

module.exports = {
  protect,
  optionalAuth,
  generateToken,
  generateRefreshToken,
};
