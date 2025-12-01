const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getTrainingSkills,
  getRecommendedSkill,
  startTrainingSession,
  getTrainingStep,
  submitTrainingAnswer,
  completeTrainingSession,
  getTrainingHistory,
} = require('../controllers/trainingController');

// All routes require authentication
router.use(protect);

// Training skill endpoints
router.get('/skills', getTrainingSkills);
router.get('/recommend', getRecommendedSkill);
router.get('/history', getTrainingHistory);

// Training session endpoints
router.post('/start', startTrainingSession);
router.get('/:sessionId/next_step', getTrainingStep);
router.post('/:sessionId/steps/:stepId/answer', submitTrainingAnswer);
router.post('/:sessionId/complete', completeTrainingSession);

module.exports = router;
