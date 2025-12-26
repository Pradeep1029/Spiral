const ResetSession = require('../models/ResetSession');
const logger = require('../config/logger');

async function getUserSessionHistory(userId, limit = 10) {
  try {
    const sessions = await ResetSession.find({
      user: userId,
      endedAt: { $exists: true },
      intensityPre: { $exists: true },
      intensityPost: { $exists: true },
      cbtPath: { $exists: true },
    })
      .sort({ endedAt: -1 })
      .limit(limit)
      .lean();

    return sessions.map((s) => ({
      path: s.cbtPath,
      intensityPre: s.intensityPre,
      intensityPost: s.intensityPost,
      intensityDrop: s.intensityPre - s.intensityPost,
      worked: (s.intensityPre - s.intensityPost) >= 2,
      durationSec: s.durationSec,
      quickFinish: s.quickFinish,
      endedAt: s.endedAt,
    }));
  } catch (error) {
    logger.error('Error fetching user session history:', error);
    return [];
  }
}

async function getAnonymousSessionHistory(limit = 5) {
  try {
    const sessions = await ResetSession.find({
      user: { $exists: false },
      endedAt: { $exists: true },
      intensityPre: { $exists: true },
      intensityPost: { $exists: true },
      cbtPath: { $exists: true },
    })
      .sort({ endedAt: -1 })
      .limit(limit)
      .lean();

    return sessions.map((s) => ({
      path: s.cbtPath,
      intensityPre: s.intensityPre,
      intensityPost: s.intensityPost,
      intensityDrop: s.intensityPre - s.intensityPost,
      worked: (s.intensityPre - s.intensityPost) >= 2,
    }));
  } catch (error) {
    logger.error('Error fetching anonymous session history:', error);
    return [];
  }
}

function analyzePathEffectiveness(sessions) {
  if (!sessions || sessions.length === 0) {
    return {
      mostEffective: null,
      pathStats: {},
      totalSessions: 0,
    };
  }

  const pathStats = {};

  sessions.forEach((session) => {
    const { path, intensityDrop, worked } = session;
    
    if (!pathStats[path]) {
      pathStats[path] = {
        count: 0,
        totalDrop: 0,
        avgDrop: 0,
        successCount: 0,
        successRate: 0,
      };
    }

    pathStats[path].count += 1;
    pathStats[path].totalDrop += intensityDrop;
    if (worked) pathStats[path].successCount += 1;
  });

  Object.keys(pathStats).forEach((path) => {
    const stats = pathStats[path];
    stats.avgDrop = stats.totalDrop / stats.count;
    stats.successRate = stats.successCount / stats.count;
  });

  const rankedPaths = Object.entries(pathStats)
    .sort((a, b) => {
      const scoreA = a[1].avgDrop * 0.6 + a[1].successRate * 10 * 0.4;
      const scoreB = b[1].avgDrop * 0.6 + b[1].successRate * 10 * 0.4;
      return scoreB - scoreA;
    });

  const mostEffective = rankedPaths.length > 0 ? rankedPaths[0][0] : null;

  return {
    mostEffective,
    pathStats,
    totalSessions: sessions.length,
  };
}

function getRegulationPreference(sessions) {
  if (!sessions || sessions.length === 0) {
    return {
      preferred: null,
      stats: {},
    };
  }

  const objectStats = {};

  sessions.forEach((session) => {
    const object = session.object || 'breathing_orb';
    const intensityDrop = session.intensityDrop || 0;

    if (!objectStats[object]) {
      objectStats[object] = {
        count: 0,
        totalDrop: 0,
        avgDrop: 0,
      };
    }

    objectStats[object].count += 1;
    objectStats[object].totalDrop += intensityDrop;
  });

  Object.keys(objectStats).forEach((object) => {
    const stats = objectStats[object];
    stats.avgDrop = stats.totalDrop / stats.count;
  });

  const rankedObjects = Object.entries(objectStats)
    .sort((a, b) => b[1].avgDrop - a[1].avgDrop);

  const preferred = rankedObjects.length > 0 ? rankedObjects[0][0] : null;

  return {
    preferred,
    stats: objectStats,
  };
}

async function getPersonalizedRecommendations(userId) {
  const sessions = userId
    ? await getUserSessionHistory(userId, 10)
    : await getAnonymousSessionHistory(5);

  const pathAnalysis = analyzePathEffectiveness(sessions);
  const regulationAnalysis = getRegulationPreference(sessions);

  return {
    pathRecommendation: pathAnalysis.mostEffective,
    pathStats: pathAnalysis.pathStats,
    regulationPreference: regulationAnalysis.preferred,
    regulationStats: regulationAnalysis.stats,
    totalSessions: pathAnalysis.totalSessions,
    hasEnoughData: sessions.length >= 3,
  };
}

function shouldUseAdaptiveRegulation({ intensityPre, userHistory = [] }) {
  if (intensityPre >= 8) {
    return 'grounding_tap';
  }

  if (userHistory.length >= 3) {
    const recentSessions = userHistory.slice(0, 5);
    const breathingSuccess = recentSessions.filter(
      (s) => s.object === 'breathing_orb' && s.worked
    ).length;
    const breathingTotal = recentSessions.filter(
      (s) => s.object === 'breathing_orb'
    ).length;

    if (breathingTotal >= 2 && breathingSuccess / breathingTotal < 0.4) {
      return 'grounding_tap';
    }
  }

  return 'breathing_orb';
}

module.exports = {
  getUserSessionHistory,
  getAnonymousSessionHistory,
  analyzePathEffectiveness,
  getRegulationPreference,
  getPersonalizedRecommendations,
  shouldUseAdaptiveRegulation,
};
