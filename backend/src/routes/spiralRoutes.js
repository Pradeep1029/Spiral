const express = require('express');
const router = express.Router();

const {
  createSession,
  updateProgress,
  endSession,
  arrivalGreeting,
  bodyScan,
  pathDecision,
  pathPrompts,
  closureValidation,
  anchorRecommendation,
} = require('../controllers/spiralController');

const { optionalAuth } = require('../middleware/auth');

router.post('/sessions', optionalAuth, createSession);
router.patch('/sessions/:id/progress', optionalAuth, updateProgress);
router.patch('/sessions/:id/end', optionalAuth, endSession);

router.post('/arrival-greeting', optionalAuth, arrivalGreeting);
router.post('/body-scan', optionalAuth, bodyScan);
router.post('/path-decision', optionalAuth, pathDecision);
router.post('/path-prompts', optionalAuth, pathPrompts);
router.post('/closure-validation', optionalAuth, closureValidation);
router.post('/anchor-recommendation', optionalAuth, anchorRecommendation);

module.exports = router;
