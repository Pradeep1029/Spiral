const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');
const { Expo } = require('expo-server-sdk');

// Create Expo SDK client
const expo = new Expo();

/**
 * @desc    Register device push notification token
 * @route   POST /api/v1/notifications/token
 * @access  Private
 */
exports.registerToken = asyncHandler(async (req, res) => {
  const { token, platform } = req.body;

  // Validate Expo push token
  if (!Expo.isExpoPushToken(token)) {
    return sendError(res, 'Invalid Expo push token', 400);
  }

  // Check if token already exists
  const existingToken = req.user.pushTokens.find(t => t.token === token);

  if (!existingToken) {
    req.user.pushTokens.push({
      token,
      platform,
      addedAt: new Date(),
    });

    await req.user.save();

    logger.info(`Push token registered for user ${req.user._id}`);
  }

  sendSuccess(res, {
    message: 'Push token registered successfully',
  }, 'Token registered');
});

/**
 * @desc    Remove device push notification token
 * @route   DELETE /api/v1/notifications/token
 * @access  Private
 */
exports.removeToken = asyncHandler(async (req, res) => {
  const { token } = req.body;

  req.user.pushTokens = req.user.pushTokens.filter(t => t.token !== token);
  await req.user.save();

  logger.info(`Push token removed for user ${req.user._id}`);

  sendSuccess(res, {
    message: 'Push token removed successfully',
  }, 'Token removed');
});

/**
 * @desc    Update notification preferences
 * @route   PUT /api/v1/notifications/preferences
 * @access  Private
 */
exports.updatePreferences = asyncHandler(async (req, res) => {
  const { enableNotifications, checkInTime, timezone } = req.body;

  if (enableNotifications !== undefined) {
    req.user.preferences.enableNotifications = enableNotifications;
  }

  if (checkInTime) {
    req.user.preferences.checkInTime = checkInTime;
  }

  if (timezone) {
    req.user.preferences.timezone = timezone;
  }

  await req.user.save();

  logger.info(`Notification preferences updated for user ${req.user._id}`);

  sendSuccess(res, {
    preferences: req.user.preferences,
  }, 'Preferences updated successfully');
});

/**
 * @desc    Get notification preferences
 * @route   GET /api/v1/notifications/preferences
 * @access  Private
 */
exports.getPreferences = asyncHandler(async (req, res) => {
  // Handle case where preferences or profile might not exist
  const preferences = req.user.preferences || {};
  const profile = req.user.profile || {};
  
  sendSuccess(res, {
    preferences: {
      enableNotifications: preferences.enableNotifications || profile.nightlyCheckinEnabled || true,
      checkInTime: preferences.checkInTime || profile.nightlyCheckinTime || '22:30',
      timezone: preferences.timezone || profile.timezone || 'UTC',
    },
    hasTokens: req.user.pushTokens?.length > 0 || false,
  }, 'Preferences retrieved');
});

/**
 * @desc    Send test notification
 * @route   POST /api/v1/notifications/test
 * @access  Private
 */
exports.sendTestNotification = asyncHandler(async (req, res) => {
  if (req.user.pushTokens.length === 0) {
    return sendError(res, 'No push tokens registered', 400);
  }

  const messages = req.user.pushTokens
    .filter(t => Expo.isExpoPushToken(t.token))
    .map(t => ({
      to: t.token,
      sound: 'default',
      title: 'Unspiral Test',
      body: 'This is a test notification from Unspiral!',
      data: { type: 'test' },
    }));

  try {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }

    logger.info(`Test notification sent to user ${req.user._id}`);

    sendSuccess(res, {
      sent: messages.length,
      tickets,
    }, 'Test notification sent');
  } catch (error) {
    logger.error('Error sending test notification:', error);
    return sendError(res, 'Failed to send test notification', 500);
  }
});

/**
 * Helper function to send check-in notification
 * This would typically be called by a scheduled job
 */
exports.sendCheckInNotification = async (userId) => {
  try {
    const user = await User.findById(userId);
    
    if (!user || !user.preferences.enableNotifications || user.pushTokens.length === 0) {
      return;
    }

    const messages = user.pushTokens
      .filter(t => Expo.isExpoPushToken(t.token))
      .map(t => ({
        to: t.token,
        sound: 'default',
        title: "Hey, it's your check-in",
        body: "How's your mind tonight?",
        data: { 
          type: 'checkin',
          userId: user._id.toString(),
        },
        categoryId: 'checkin',
      }));

    const chunks = expo.chunkPushNotifications(messages);
    
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }

    logger.info(`Check-in notification sent to user ${user._id}`);
  } catch (error) {
    logger.error('Error sending check-in notification:', error);
  }
};

/**
 * Helper function to send encouragement notification after successful spirals
 */
exports.sendEncouragementNotification = async (userId, spiralsCount) => {
  try {
    const user = await User.findById(userId);
    
    if (!user || !user.preferences.enableNotifications || user.pushTokens.length === 0) {
      return;
    }

    let message = '';
    
    if (spiralsCount === 3) {
      message = "You've pulled yourself out of 3 spirals. That's real progress! 🌟";
    } else if (spiralsCount === 7) {
      message = "7 times you've rescued yourself. You're building a powerful habit! ⭐";
    } else if (spiralsCount === 14) {
      message = "14 spiral rescues! You're really getting good at this. 💪";
    } else {
      return; // Only send at milestones
    }

    const messages = user.pushTokens
      .filter(t => Expo.isExpoPushToken(t.token))
      .map(t => ({
        to: t.token,
        sound: 'default',
        title: 'You\'re making progress!',
        body: message,
        data: { 
          type: 'encouragement',
          spiralsCount,
        },
      }));

    const chunks = expo.chunkPushNotifications(messages);
    
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }

    logger.info(`Encouragement notification sent to user ${user._id}`);
  } catch (error) {
    logger.error('Error sending encouragement notification:', error);
  }
};

module.exports = exports;
