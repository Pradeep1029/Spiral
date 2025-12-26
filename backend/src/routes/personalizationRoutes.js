const express = require('express');
const router = express.Router();
const personalizationService = require('../services/personalizationService');
const logger = require('../config/logger');
const { requireAuth } = require('../middleware/auth');

router.get('/recommendations', requireAuth, async (req, res, next) => {
  try {
    const recommendations = await personalizationService.getPersonalizedRecommendations(req.user?._id);
    
    res.status(200).json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    logger.error('Error fetching personalization recommendations:', error);
    next(error);
  }
});

module.exports = router;
