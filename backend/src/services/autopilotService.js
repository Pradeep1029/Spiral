const User = require('../models/User');
const Session = require('../models/Session');
const logger = require('../config/logger');

/**
 * Autopilot Service - Manages JIT (Just-In-Time) adaptive interventions
 * Handles notification scheduling and triggering based on user patterns
 */

// Notification types as per PRD
const NOTIFICATION_TYPES = {
  EVENING_CHECKIN: 'evening_checkin',
  NIGHT_UNLOCK: 'night_unlock',
  DAYTIME_FOLLOWUP: 'daytime_followup',
};

// Notification templates
const NOTIFICATION_TEMPLATES = {
  evening_checkin: {
    title: 'Evening buffer',
    body: "This is usually when your brain starts spinning. Want a 2-minute buffer before bed?",
    actions: [
      { id: 'start_buffer', label: 'Yes, do a 2-min buffer', primary: true },
      { id: 'dismiss', label: 'Not tonight', primary: false },
    ],
    data: {
      type: 'evening_checkin',
      action: 'start_buffer_session',
    },
  },
  night_unlock: {
    title: 'Awake in your tough window',
    body: "You're awake in your tough window. Want a quick rescue to get out of your head?",
    actions: [
      { id: 'start_rescue', label: 'Start quick rescue', primary: true },
      { id: 'dismiss', label: 'Just browsing', primary: false },
    ],
    data: {
      type: 'night_unlock',
      action: 'start_quick_rescue',
    },
  },
  daytime_followup: {
    title: 'After last night',
    body: "Last night's spiral felt heavy. Want a 3-minute drill to make tonight easier?",
    actions: [
      { id: 'start_training', label: 'Yes', primary: true },
      { id: 'later', label: 'Maybe later', primary: false },
    ],
    data: {
      type: 'daytime_followup',
      action: 'start_training_session',
    },
  },
};

/**
 * Check if user should receive an autopilot notification
 * Called by scheduler or on app open
 */
async function checkAutopilotTriggers(userId) {
  const user = await User.findById(userId);
  if (!user || !user.autopilot?.enabled) {
    return null;
  }

  const now = new Date();
  const userTime = getUserLocalTime(now, user.profile?.timezone || 'UTC');
  const hour = userTime.getHours();
  const minute = userTime.getMinutes();

  // Check if we've hit max prompts today
  if (!canSendPrompt(user)) {
    return null;
  }

  // Determine which notification type might apply
  const trigger = await determineApplicableTrigger(user, hour, minute);
  if (!trigger) {
    return null;
  }

  return {
    type: trigger,
    notification: NOTIFICATION_TEMPLATES[trigger],
    userId: user._id,
  };
}

/**
 * Determine which trigger is applicable based on time and user settings
 */
async function determineApplicableTrigger(user, hour, minute) {
  const autopilot = user.autopilot;
  const sleepStart = parseTime(autopilot.sleepWindowStart || '22:00');
  const sleepEnd = parseTime(autopilot.sleepWindowEnd || '07:00');

  // Evening check-in: 1-2 hours before typical sleep
  const eveningCheckInHour = sleepStart.hour - 1;
  if (
    autopilot.eveningCheckinsEnabled &&
    autopilot.preSpiraleveningEnabled &&
    hour === eveningCheckInHour &&
    minute >= 0 && minute <= 30
  ) {
    return NOTIFICATION_TYPES.EVENING_CHECKIN;
  }

  // Night unlock: During sleep window (late night hours)
  const isInSleepWindow = isTimeInSleepWindow(hour, sleepStart, sleepEnd);
  if (
    autopilot.lateNightPromptsEnabled &&
    autopilot.nightUnlockEnabled &&
    isInSleepWindow &&
    hour >= 1 && hour <= 5 // Specifically 1am-5am
  ) {
    return NOTIFICATION_TYPES.NIGHT_UNLOCK;
  }

  // Daytime followup: Mid-morning after intense night session
  if (
    autopilot.daytimeFollowupsEnabled &&
    autopilot.nextDayFollowupEnabled &&
    hour >= 10 && hour <= 14
  ) {
    // Check if there was an intense session last night
    const hadIntenseNight = await checkForIntenseNightSession(user._id);
    if (hadIntenseNight) {
      return NOTIFICATION_TYPES.DAYTIME_FOLLOWUP;
    }
  }

  return null;
}

/**
 * Check if user had an intense session last night
 */
async function checkForIntenseNightSession(userId) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(21, 0, 0, 0); // 9pm yesterday

  const today = new Date();
  today.setHours(6, 0, 0, 0); // 6am today

  const session = await Session.findOne({
    user: userId,
    context: { $in: ['spiral', 'autopilot_rescue'] },
    startedAt: { $gte: yesterday, $lte: today },
    initialIntensity: { $gte: 7 },
  });

  return !!session;
}

/**
 * Check if we can send another prompt today
 */
function canSendPrompt(user) {
  const autopilot = user.autopilot;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Reset counter if it's a new day
  if (!autopilot.lastPromptResetDate || autopilot.lastPromptResetDate < today) {
    return true;
  }

  // Check against max
  return (autopilot.promptsSentToday || 0) < (autopilot.maxPromptsPerDay || 2);
}

/**
 * Record that a prompt was sent
 */
async function recordPromptSent(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await User.findByIdAndUpdate(userId, {
    $inc: { 'autopilot.promptsSentToday': 1 },
    'autopilot.lastPromptSentAt': new Date(),
    'autopilot.lastPromptResetDate': today,
  });
}

/**
 * Reset prompt counter (called daily)
 */
async function resetDailyPromptCounters() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await User.updateMany(
    {
      'autopilot.enabled': true,
      'autopilot.lastPromptResetDate': { $lt: today },
    },
    {
      'autopilot.promptsSentToday': 0,
      'autopilot.lastPromptResetDate': today,
    }
  );

  logger.info('Reset daily autopilot prompt counters');
}

/**
 * Get users who should receive evening check-in notification
 * Called by scheduler
 */
async function getUsersForEveningCheckin() {
  // Get users whose evening check-in time is approaching
  const users = await User.find({
    'autopilot.enabled': true,
    'autopilot.eveningCheckinsEnabled': true,
    'autopilot.preSpiraleveningEnabled': true,
  }).select('_id pushTokens profile.timezone autopilot');

  const eligibleUsers = [];

  for (const user of users) {
    const now = new Date();
    const userTime = getUserLocalTime(now, user.profile?.timezone || 'UTC');
    const hour = userTime.getHours();
    const sleepStart = parseTime(user.autopilot.sleepWindowStart || '22:00');
    const targetHour = sleepStart.hour - 1;

    // Check if it's the right time for this user
    if (hour === targetHour && canSendPrompt(user)) {
      eligibleUsers.push(user);
    }
  }

  return eligibleUsers;
}

/**
 * Get users who should receive daytime followup
 * Called by scheduler
 */
async function getUsersForDaytimeFollowup() {
  const users = await User.find({
    'autopilot.enabled': true,
    'autopilot.daytimeFollowupsEnabled': true,
    'autopilot.nextDayFollowupEnabled': true,
  }).select('_id pushTokens profile.timezone autopilot');

  const eligibleUsers = [];

  for (const user of users) {
    const now = new Date();
    const userTime = getUserLocalTime(now, user.profile?.timezone || 'UTC');
    const hour = userTime.getHours();

    // Check if it's mid-morning and user had intense night
    if (hour >= 10 && hour <= 11 && canSendPrompt(user)) {
      const hadIntenseNight = await checkForIntenseNightSession(user._id);
      if (hadIntenseNight) {
        eligibleUsers.push(user);
      }
    }
  }

  return eligibleUsers;
}

/**
 * Helper: Parse time string "HH:MM" to { hour, minute }
 */
function parseTime(timeStr) {
  const [hour, minute] = timeStr.split(':').map(Number);
  return { hour, minute };
}

/**
 * Helper: Check if hour is within sleep window
 */
function isTimeInSleepWindow(hour, sleepStart, sleepEnd) {
  // Handle overnight windows (e.g., 22:00 to 07:00)
  if (sleepStart.hour > sleepEnd.hour) {
    return hour >= sleepStart.hour || hour <= sleepEnd.hour;
  }
  return hour >= sleepStart.hour && hour <= sleepEnd.hour;
}

/**
 * Helper: Get user's local time
 */
function getUserLocalTime(date, timezone) {
  try {
    const options = { timeZone: timezone };
    const localString = date.toLocaleString('en-US', options);
    return new Date(localString);
  } catch {
    return date; // Fallback to UTC
  }
}

/**
 * Update user's autopilot settings
 */
async function updateAutopilotSettings(userId, settings) {
  const updateData = {};

  if (settings.enabled !== undefined) {
    updateData['autopilot.enabled'] = settings.enabled;
  }
  if (settings.lateNightPromptsEnabled !== undefined) {
    updateData['autopilot.lateNightPromptsEnabled'] = settings.lateNightPromptsEnabled;
  }
  if (settings.daytimeFollowupsEnabled !== undefined) {
    updateData['autopilot.daytimeFollowupsEnabled'] = settings.daytimeFollowupsEnabled;
  }
  if (settings.eveningCheckinsEnabled !== undefined) {
    updateData['autopilot.eveningCheckinsEnabled'] = settings.eveningCheckinsEnabled;
  }
  if (settings.maxPromptsPerDay !== undefined) {
    updateData['autopilot.maxPromptsPerDay'] = Math.min(3, Math.max(1, settings.maxPromptsPerDay));
  }
  if (settings.sleepWindowStart !== undefined) {
    updateData['autopilot.sleepWindowStart'] = settings.sleepWindowStart;
  }
  if (settings.sleepWindowEnd !== undefined) {
    updateData['autopilot.sleepWindowEnd'] = settings.sleepWindowEnd;
  }

  const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
  return user.autopilot;
}

/**
 * Get user's autopilot settings
 */
async function getAutopilotSettings(userId) {
  const user = await User.findById(userId).select('autopilot');
  return user?.autopilot || {
    enabled: false,
    lateNightPromptsEnabled: true,
    daytimeFollowupsEnabled: true,
    eveningCheckinsEnabled: true,
    maxPromptsPerDay: 2,
    sleepWindowStart: '22:00',
    sleepWindowEnd: '07:00',
  };
}

module.exports = {
  NOTIFICATION_TYPES,
  NOTIFICATION_TEMPLATES,
  checkAutopilotTriggers,
  recordPromptSent,
  resetDailyPromptCounters,
  getUsersForEveningCheckin,
  getUsersForDaytimeFollowup,
  updateAutopilotSettings,
  getAutopilotSettings,
};
