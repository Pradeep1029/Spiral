const express = require('express');
const router = express.Router();

const {
  getPlan,
  createSession,
  updateProgress,
  endSession,
  endSessionNoId,
} = require('../controllers/resetController');

const { optionalAuth, requireAuth } = require('../middleware/auth');

router.post('/plan', optionalAuth, getPlan);
router.post('/sessions', optionalAuth, createSession);
router.patch('/sessions/:id/progress', requireAuth, updateProgress);
router.patch('/sessions/:id/end', requireAuth, endSession);
router.post('/sessions/end', endSessionNoId);

module.exports = router;
