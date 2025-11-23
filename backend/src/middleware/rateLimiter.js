const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
    });
  },
});

/**
 * Strict limiter for auth routes
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: true, // Don't count successful logins
  message: 'Too many authentication attempts, please try again later',
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later',
    });
  },
});

/**
 * Lenient limiter for anonymous users creating accounts
 */
const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 accounts per hour per IP
  message: 'Too many accounts created, please try again later',
  handler: (req, res) => {
    logger.warn(`Create account rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many accounts created, please try again later',
    });
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  createAccountLimiter,
};
