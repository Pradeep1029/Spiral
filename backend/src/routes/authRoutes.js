const express = require('express');
const router = express.Router();

const { deviceAuth, me } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { createAccountLimiter, authLimiter } = require('../middleware/rateLimiter');

router.post('/device', createAccountLimiter, deviceAuth);
router.get('/me', authLimiter, requireAuth, me);

module.exports = router;
