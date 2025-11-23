const express = require('express');
const router = express.Router();
const {
  getStats,
  getChartData,
  getInsights,
  getStreak,
} = require('../controllers/progressController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.get('/stats', protect, getStats);
router.get('/chart', protect, getChartData);
router.get('/insights', protect, getInsights);
router.get('/streak', protect, getStreak);

module.exports = router;
