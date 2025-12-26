const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const { homeSuggestion } = require('../controllers/spiralController');

router.get('/home-suggestion', optionalAuth, homeSuggestion);

module.exports = router;
