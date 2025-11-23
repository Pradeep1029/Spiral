const Session = require('../models/Session');
const InterventionEvent = require('../models/InterventionEvent');
const logger = require('../config/logger');

/**
 * Get user insights / "Brain Map"
 * GET /insights
 */
exports.getInsights = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    // Get sessions in timeframe
    const sessions = await Session.find({
      user: req.user.id,
      startedAt: { $gte: since },
    }).select('topic emotion startedAt initialIntensity finalIntensity interventionsUsed');

    // Calculate basic stats
    const totalSessions = sessions.length;

    // Topic distribution
    const topicCounts = {};
    sessions.forEach(s => {
      if (s.topic && s.topic !== 'unknown') {
        topicCounts[s.topic] = (topicCounts[s.topic] || 0) + 1;
      }
    });
    const topTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic]) => topic);

    // Time distribution (hour of day)
    const hourCounts = {};
    sessions.forEach(s => {
      const hour = new Date(s.startedAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    // Intensity change
    const sessionsWithIntensity = sessions.filter(
      s => s.initialIntensity && s.finalIntensity
    );
    let avgIntensityBefore = 0;
    let avgIntensityAfter = 0;
    if (sessionsWithIntensity.length > 0) {
      avgIntensityBefore =
        sessionsWithIntensity.reduce((sum, s) => sum + s.initialIntensity, 0) /
        sessionsWithIntensity.length;
      avgIntensityAfter =
        sessionsWithIntensity.reduce((sum, s) => sum + s.finalIntensity, 0) /
        sessionsWithIntensity.length;
    }

    // Intervention effectiveness
    const interventionCounts = {};
    sessions.forEach(s => {
      s.interventionsUsed?.forEach(i => {
        interventionCounts[i] = (interventionCounts[i] || 0) + 1;
      });
    });
    const topInterventions = Object.entries(interventionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([intervention, count]) => ({ intervention, count }));

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalSessions,
          daysAnalyzed: parseInt(days),
          avgIntensityBefore: Math.round(avgIntensityBefore * 10) / 10,
          avgIntensityAfter: Math.round(avgIntensityAfter * 10) / 10,
          avgImprovement:
            avgIntensityBefore > 0
              ? Math.round(
                  ((avgIntensityBefore - avgIntensityAfter) / avgIntensityBefore) * 100
                )
              : 0,
        },
        patterns: {
          topTopics,
          peakHour: peakHour ? `${peakHour}:00` : 'unknown',
          topInterventions,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching insights:', error);
    next(error);
  }
};
