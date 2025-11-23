const cron = require('node-cron');
const User = require('../models/User');
const { sendCheckInNotification } = require('../controllers/notificationController');
const logger = require('../config/logger');

/**
 * Initialize all scheduled tasks
 */
function initializeScheduler() {
  if (process.env.ENABLE_NOTIFICATIONS !== 'true') {
    logger.info('Notifications disabled, scheduler not started');
    return;
  }

  // Run every hour to check for users needing check-in notifications
  cron.schedule('0 * * * *', async () => {
    logger.info('Running scheduled check-in notification task');
    await sendScheduledCheckIns();
  });

  logger.info('Scheduler initialized - check-in notifications enabled');
}

/**
 * Send check-in notifications to users based on their preferred time
 */
async function sendScheduledCheckIns() {
  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    // Find users whose check-in time matches current time (within the hour)
    const users = await User.find({
      'preferences.enableNotifications': true,
      pushTokens: { $exists: true, $not: { $size: 0 } },
    });

    logger.info(`Found ${users.length} users with notifications enabled`);

    let notificationsSent = 0;

    for (const user of users) {
      const userCheckInTime = user.preferences.checkInTime || '22:30';
      const [checkInHour, checkInMinute] = userCheckInTime.split(':').map(Number);

      // Check if current time matches user's check-in time (within same hour)
      if (checkInHour === currentHour && Math.abs(checkInMinute - currentMinute) < 15) {
        await sendCheckInNotification(user._id);
        notificationsSent++;
      }
    }

    logger.info(`Sent ${notificationsSent} check-in notifications`);
  } catch (error) {
    logger.error('Error in scheduled check-in task:', error);
  }
}

/**
 * Schedule a one-time notification for a specific user
 */
function scheduleOneTimeNotification(userId, delay, title, body) {
  setTimeout(async () => {
    try {
      const user = await User.findById(userId);
      
      if (!user || !user.preferences.enableNotifications) {
        return;
      }

      // Send notification logic here
      logger.info(`Sending scheduled notification to user ${userId}`);
    } catch (error) {
      logger.error('Error sending scheduled notification:', error);
    }
  }, delay);
}

module.exports = {
  initializeScheduler,
  sendScheduledCheckIns,
  scheduleOneTimeNotification,
};
