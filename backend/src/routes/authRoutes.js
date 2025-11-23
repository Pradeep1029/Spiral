const express = require('express');
const router = express.Router();
const {
  createAnonymousUser,
  register,
  convertAnonymousToRegistered,
  login,
  refreshToken,
  getCurrentUser,
  updateProfile,
  deleteAccount,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authValidators, validate } = require('../utils/validators');
const { authLimiter, createAccountLimiter } = require('../middleware/rateLimiter');

// Public routes
router.post('/anonymous', createAccountLimiter, createAnonymousUser);
router.post('/register', authLimiter, authValidators.register, validate, register);
router.post('/login', authLimiter, authValidators.login, validate, login);
router.post('/refresh', refreshToken);

// Protected routes
router.post('/convert', protect, authValidators.register, validate, convertAnonymousToRegistered);
router.get('/me', protect, getCurrentUser);
router.put('/profile', protect, updateProfile);
router.delete('/account', protect, deleteAccount);

module.exports = router;
