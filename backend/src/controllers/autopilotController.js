const logger = require('../config/logger');
const {
  getAutopilotSettings,
  updateAutopilotSettings,
  checkAutopilotTriggers,
  recordPromptSent,
  NOTIFICATION_TEMPLATES,
} = require('../services/autopilotService');

/**
 * Get user's autopilot settings
 * GET /autopilot/settings
 */
exports.getSettings = async (req, res, next) => {
  try {
    const settings = await getAutopilotSettings(req.user.id);
    
    res.status(200).json({
      success: true,
      data: { settings },
    });
  } catch (error) {
    logger.error('Error getting autopilot settings:', error);
    next(error);
  }
};

/**
 * Update user's autopilot settings
 * PATCH /autopilot/settings
 */
exports.updateSettings = async (req, res, next) => {
  try {
    const settings = await updateAutopilotSettings(req.user.id, req.body);
    
    res.status(200).json({
      success: true,
      message: 'Autopilot settings updated',
      data: { settings },
    });
  } catch (error) {
    logger.error('Error updating autopilot settings:', error);
    next(error);
  }
};

/**
 * Enable/disable autopilot
 * POST /autopilot/toggle
 */
exports.toggleAutopilot = async (req, res, next) => {
  try {
    const { enabled } = req.body;
    
    const settings = await updateAutopilotSettings(req.user.id, { enabled });
    
    res.status(200).json({
      success: true,
      message: enabled ? 'Autopilot enabled' : 'Autopilot disabled',
      data: { settings },
    });
  } catch (error) {
    logger.error('Error toggling autopilot:', error);
    next(error);
  }
};

/**
 * Check for autopilot triggers (called when app opens or screen unlocks)
 * POST /autopilot/check
 */
exports.checkTriggers = async (req, res, next) => {
  try {
    const { context } = req.body; // e.g., 'screen_unlock', 'app_open'
    
    const trigger = await checkAutopilotTriggers(req.user.id);
    
    if (!trigger) {
      return res.status(200).json({
        success: true,
        data: { trigger: null },
      });
    }
    
    // Don't record as sent yet - wait until user actually sees it
    res.status(200).json({
      success: true,
      data: {
        trigger: {
          type: trigger.type,
          notification: trigger.notification,
        },
      },
    });
  } catch (error) {
    logger.error('Error checking autopilot triggers:', error);
    next(error);
  }
};

/**
 * Record that user saw/dismissed a prompt
 * POST /autopilot/prompt-seen
 */
exports.recordPromptSeen = async (req, res, next) => {
  try {
    const { type, action } = req.body; // action: 'seen', 'dismissed', 'accepted'
    
    await recordPromptSent(req.user.id);
    
    logger.info('Autopilot prompt recorded', {
      userId: req.user.id,
      type,
      action,
    });
    
    res.status(200).json({
      success: true,
      message: 'Prompt recorded',
    });
  } catch (error) {
    logger.error('Error recording prompt:', error);
    next(error);
  }
};

/**
 * Disable a specific notification type
 * POST /autopilot/disable-type
 */
exports.disableNotificationType = async (req, res, next) => {
  try {
    const { type } = req.body;
    
    const settingsUpdate = {};
    switch (type) {
      case 'evening_checkin':
        settingsUpdate.preSpiraleveningEnabled = false;
        break;
      case 'night_unlock':
        settingsUpdate.nightUnlockEnabled = false;
        break;
      case 'daytime_followup':
        settingsUpdate.nextDayFollowupEnabled = false;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid notification type',
        });
    }
    
    const settings = await updateAutopilotSettings(req.user.id, settingsUpdate);
    
    res.status(200).json({
      success: true,
      message: `${type} notifications disabled`,
      data: { settings },
    });
  } catch (error) {
    logger.error('Error disabling notification type:', error);
    next(error);
  }
};

/**
 * Get notification templates (for preview in settings)
 * GET /autopilot/templates
 */
exports.getNotificationTemplates = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: { templates: NOTIFICATION_TEMPLATES },
    });
  } catch (error) {
    logger.error('Error getting templates:', error);
    next(error);
  }
};
