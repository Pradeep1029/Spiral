const express = require('express');
const router = express.Router();
const {
  registerToken,
  removeToken,
  updatePreferences,
  getPreferences,
  sendTestNotification,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');
const { notificationValidators, validate } = require('../utils/validators');

// All routes require authentication
router.post('/token', protect, notificationValidators.registerToken, validate, registerToken);
router.delete('/token', protect, removeToken);
router.put('/preferences', protect, notificationValidators.updatePreferences, validate, updatePreferences);
router.get('/preferences', protect, getPreferences);
router.post('/test', protect, sendTestNotification);

module.exports = router;
