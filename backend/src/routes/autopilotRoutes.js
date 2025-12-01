const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getSettings,
  updateSettings,
  toggleAutopilot,
  checkTriggers,
  recordPromptSeen,
  disableNotificationType,
  getNotificationTemplates,
} = require('../controllers/autopilotController');

// All routes require authentication
router.use(protect);

// Settings endpoints
router.get('/settings', getSettings);
router.patch('/settings', updateSettings);
router.post('/toggle', toggleAutopilot);

// Trigger check endpoints
router.post('/check', checkTriggers);
router.post('/prompt-seen', recordPromptSeen);
router.post('/disable-type', disableNotificationType);

// Info endpoints
router.get('/templates', getNotificationTemplates);

module.exports = router;
