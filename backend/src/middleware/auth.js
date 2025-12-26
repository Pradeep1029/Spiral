const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');
const User = require('../models/User');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

function signToken({ userId }) {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '30d';
  return jwt.sign({ sub: userId }, secret, { expiresIn });
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [type, token] = header.split(' ');
    if (type !== 'Bearer' || !token) {
      return next(new AppError('Missing token', 401));
    }

    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);
    const userId = decoded?.sub;
    if (!userId) {
      return next(new AppError('Invalid token', 401));
    }

    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('Invalid token', 401));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header) return next();
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) return next();

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);
    const userId = decoded?.sub;
    if (!userId) return next();

    const user = await User.findById(userId);
    if (!user) return next();

    req.user = user;
    next();
  } catch {
    next();
  }
}

module.exports = {
  signToken,
  requireAuth,
  optionalAuth,
};
