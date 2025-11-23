const express = require('express');
const router = express.Router();
const {
  createCheckIn,
  getHistory,
  getLatest,
  linkToSession,
  getStats,
} = require('../controllers/checkInController');
const { protect } = require('../middleware/auth');
const { checkInValidators, validate } = require('../utils/validators');

// All routes require authentication
router.post('/', protect, checkInValidators.create, validate, createCheckIn);
router.get('/history', protect, getHistory);
router.get('/latest', protect, getLatest);
router.get('/stats', protect, getStats);
router.put('/:id/link', protect, linkToSession);

module.exports = router;
