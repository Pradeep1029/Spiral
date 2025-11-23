const SpiralSession = require('../models/SpiralSession');
const CheckIn = require('../models/CheckIn');
const SelfCompassionExercise = require('../models/SelfCompassionExercise');
const { sendSuccess } = require('../utils/response');
const { asyncHandler } = require('../middleware/errorHandler');
const { startOfDay, subDays, format } = require('date-fns');

/**
 * @desc    Get overall progress statistics
 * @route   GET /api/v1/progress/stats
 * @access  Private
 */
exports.getStats = asyncHandler(async (req, res) => {
  const { days = 14 } = req.query;

  const dateThreshold = subDays(new Date(), parseInt(days));

  // Get recent completed spirals
  const recentSpirals = await SpiralSession.find({
    user: req.user._id,
    status: 'completed',
    completedAt: { $gte: dateThreshold },
  }).lean();

  // Calculate stats
  const totalSpirals = recentSpirals.length;
  
  let avgIntensityBefore = 0;
  let avgIntensityAfter = 0;
  let avgImprovement = 0;

  if (totalSpirals > 0) {
    avgIntensityBefore = recentSpirals.reduce((sum, s) => sum + (s.intensityBefore || 0), 0) / totalSpirals;
    avgIntensityAfter = recentSpirals.reduce((sum, s) => sum + (s.intensityAfter || 0), 0) / totalSpirals;
    avgImprovement = avgIntensityBefore - avgIntensityAfter;
  }

  // Path preference
  const pathCounts = {
    think_through: 0,
    let_go: 0,
  };

  recentSpirals.forEach(spiral => {
    const path = spiral.step3_exit?.pathChosen;
    if (path) {
      pathCounts[path]++;
    }
  });

  // Topic breakdown
  const topicCounts = {};
  recentSpirals.forEach(spiral => {
    if (spiral.primaryTopic) {
      topicCounts[spiral.primaryTopic] = (topicCounts[spiral.primaryTopic] || 0) + 1;
    }
  });

  // Most common spiral time
  const timeDistribution = {
    evening: 0,   // 18:00 - 22:00
    night: 0,     // 22:00 - 02:00
    lateNight: 0, // 02:00 - 06:00
    other: 0,
  };

  recentSpirals.forEach(spiral => {
    const hour = new Date(spiral.startedAt).getHours();
    if (hour >= 18 && hour < 22) {
      timeDistribution.evening++;
    } else if (hour >= 22 || hour < 2) {
      timeDistribution.night++;
    } else if (hour >= 2 && hour < 6) {
      timeDistribution.lateNight++;
    } else {
      timeDistribution.other++;
    }
  });

  sendSuccess(res, {
    period: `${days} days`,
    totalSpirals,
    averageIntensityBefore: parseFloat(avgIntensityBefore.toFixed(2)),
    averageIntensityAfter: parseFloat(avgIntensityAfter.toFixed(2)),
    averageImprovement: parseFloat(avgImprovement.toFixed(2)),
    improvementPercentage: avgIntensityBefore > 0 
      ? parseFloat(((avgImprovement / avgIntensityBefore) * 100).toFixed(1))
      : 0,
    pathPreference: pathCounts,
    topicBreakdown: topicCounts,
    timeDistribution,
  }, 'Progress statistics retrieved');
});

/**
 * @desc    Get chart data for intensity before/after
 * @route   GET /api/v1/progress/chart
 * @access  Private
 */
exports.getChartData = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const dateThreshold = subDays(new Date(), parseInt(days));

  const spirals = await SpiralSession.find({
    user: req.user._id,
    status: 'completed',
    completedAt: { $gte: dateThreshold },
  })
    .sort({ completedAt: 1 })
    .lean();

  // Format for chart
  const chartData = spirals.map(spiral => ({
    date: format(new Date(spiral.completedAt), 'MMM dd'),
    intensityBefore: spiral.intensityBefore,
    intensityAfter: spiral.intensityAfter,
    improvement: spiral.intensityBefore - spiral.intensityAfter,
    primaryTopic: spiral.primaryTopic,
  }));

  sendSuccess(res, {
    chartData,
    period: `${days} days`,
  }, 'Chart data retrieved');
});

/**
 * @desc    Get personalized insights
 * @route   GET /api/v1/progress/insights
 * @access  Private
 */
exports.getInsights = asyncHandler(async (req, res) => {
  const insights = [];

  // Get last 30 days of data
  const dateThreshold = subDays(new Date(), 30);

  const spirals = await SpiralSession.find({
    user: req.user._id,
    status: 'completed',
    completedAt: { $gte: dateThreshold },
  }).lean();

  // Insight 1: Progress trend
  if (spirals.length >= 3) {
    const avgImprovement = spirals.reduce((sum, s) => 
      sum + ((s.intensityBefore || 0) - (s.intensityAfter || 0)), 0
    ) / spirals.length;

    insights.push({
      type: 'progress',
      title: 'Your Spiral Rescue Success',
      message: `You've rescued yourself ${spirals.length} times in the last month. On average, you're reducing spiral intensity by ${avgImprovement.toFixed(1)} points.`,
      icon: '📈',
    });
  }

  // Insight 2: Best path
  const pathCounts = {
    think_through: 0,
    let_go: 0,
  };

  spirals.forEach(spiral => {
    const path = spiral.step3_exit?.pathChosen;
    if (path) {
      pathCounts[path]++;
    }
  });

  if (pathCounts.think_through > pathCounts.let_go) {
    insights.push({
      type: 'preference',
      title: 'Your Go-To Strategy',
      message: `You tend to prefer "Think it through" (${pathCounts.think_through} times). This shows you like to actively work through your thoughts.`,
      icon: '🧠',
    });
  } else if (pathCounts.let_go > pathCounts.think_through) {
    insights.push({
      type: 'preference',
      title: 'Your Go-To Strategy',
      message: `You tend to prefer "Let it go" (${pathCounts.let_go} times). This shows you're learning to not engage with every thought.`,
      icon: '🌊',
    });
  }

  // Insight 3: Most common spiral time
  const nightSpirals = spirals.filter(s => {
    const hour = new Date(s.startedAt).getHours();
    return hour >= 22 || hour < 6;
  }).length;

  if (nightSpirals > spirals.length * 0.7) {
    insights.push({
      type: 'timing',
      title: 'Night-Time Spirals',
      message: `Most of your spirals (${nightSpirals}/${spirals.length}) happen late at night. Consider setting your check-in reminder earlier.`,
      icon: '🌙',
    });
  }

  // Insight 4: Most common topic
  const topicCounts = {};
  spirals.forEach(spiral => {
    if (spiral.primaryTopic) {
      topicCounts[spiral.primaryTopic] = (topicCounts[spiral.primaryTopic] || 0) + 1;
    }
  });

  const mostCommonTopic = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)[0];

  if (mostCommonTopic) {
    const topicLabels = {
      work_study: 'work/study',
      relationships: 'relationships',
      money: 'money',
      health: 'health',
      myself: 'self-worth',
    };

    insights.push({
      type: 'topic',
      title: 'Common Spiral Theme',
      message: `Your spirals often involve ${topicLabels[mostCommonTopic[0]] || mostCommonTopic[0]} (${mostCommonTopic[1]} times). This is a pattern worth noticing.`,
      icon: '🎯',
    });
  }

  // Insight 5: Consistency
  if (spirals.length >= 7) {
    insights.push({
      type: 'consistency',
      title: 'Building a Habit',
      message: `You've used Unspiral ${spirals.length} times this month. You're building a strong self-rescue habit!`,
      icon: '⭐',
    });
  }

  sendSuccess(res, {
    insights,
    dataPoints: spirals.length,
  }, 'Insights retrieved');
});

/**
 * @desc    Get streak information
 * @route   GET /api/v1/progress/streak
 * @access  Private
 */
exports.getStreak = asyncHandler(async (req, res) => {
  // Get all check-ins and spirals
  const checkIns = await CheckIn.find({ user: req.user._id })
    .sort({ checkInTime: -1 })
    .lean();

  const spirals = await SpiralSession.find({ 
    user: req.user._id,
    status: 'completed',
  })
    .sort({ completedAt: -1 })
    .lean();

  // Combine activities
  const activities = [
    ...checkIns.map(c => ({ date: c.checkInTime, type: 'checkin' })),
    ...spirals.map(s => ({ date: s.completedAt, type: 'spiral' })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Calculate current streak (consecutive days with activity)
  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;
  let lastDate = null;

  activities.forEach(activity => {
    const activityDate = startOfDay(new Date(activity.date));
    
    if (!lastDate) {
      tempStreak = 1;
      currentStreak = 1;
    } else {
      const daysDiff = Math.floor((lastDate - activityDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 0) {
        // Same day, don't increment
      } else if (daysDiff === 1) {
        // Consecutive day
        tempStreak++;
        if (activityDate.getTime() === startOfDay(new Date()).getTime() || 
            activityDate.getTime() === startOfDay(subDays(new Date(), 1)).getTime()) {
          currentStreak = tempStreak;
        }
      } else {
        // Streak broken
        tempStreak = 1;
      }
      
      maxStreak = Math.max(maxStreak, tempStreak);
    }
    
    lastDate = activityDate;
  });

  sendSuccess(res, {
    currentStreak,
    maxStreak,
    totalActivities: activities.length,
  }, 'Streak information retrieved');
});
