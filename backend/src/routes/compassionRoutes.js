const express = require('express');
const router = express.Router();
const {
  createExercise,
  getHistory,
  getRandomLine,
  getMostHelpful,
  updateRating,
} = require('../controllers/compassionController');
const { protect } = require('../middleware/auth');
const { compassionValidators, validate } = require('../utils/validators');

// All routes require authentication
router.post('/exercise', protect, compassionValidators.create, validate, createExercise);
router.get('/history', protect, getHistory);
router.get('/random', protect, getRandomLine);
router.get('/helpful', protect, getMostHelpful);
router.put('/:id/rating', protect, updateRating);

module.exports = router;
