const SpiralArchetype = require('../models/SpiralArchetype');
const Session = require('../models/Session');
const logger = require('../config/logger');
const { getUserArchetypes, ARCHETYPE_TEMPLATES } = require('../services/archetypeService');

/**
 * Get user's spiral archetypes
 * GET /archetypes
 */
exports.getArchetypes = async (req, res, next) => {
  try {
    const archetypes = await getUserArchetypes(req.user.id);
    
    res.status(200).json({
      success: true,
      data: {
        archetypes: archetypes.map(a => ({
          id: a._id,
          name: a.name,
          shortLabel: a.shortLabel,
          category: a.category,
          typicalEmotions: a.typicalEmotions,
          typicalTimeWindows: a.typicalTimeWindows,
          stats: {
            totalOccurrences: a.stats.totalOccurrences,
            averageIntensityBefore: Math.round(a.stats.averageIntensityBefore * 10) / 10,
            averageIntensityAfter: Math.round(a.stats.averageIntensityAfter * 10) / 10,
            averageReduction: a.averageIntensityReduction ? Math.round(a.averageIntensityReduction * 10) / 10 : null,
            lastOccurredAt: a.stats.lastOccurredAt,
          },
          effectiveMethods: a.effectiveMethods
            .sort((x, y) => y.effectivenessScore - x.effectivenessScore)
            .slice(0, 5)
            .map(m => ({
              method: m.method,
              effectivenessScore: Math.round(m.effectivenessScore * 100),
            })),
          bestMethodSequence: a.bestMethodSequence,
        })),
      },
    });
  } catch (error) {
    logger.error('Error getting archetypes:', error);
    next(error);
  }
};

/**
 * Get single archetype details
 * GET /archetypes/:id
 */
exports.getArchetype = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const archetype = await SpiralArchetype.findById(id);
    if (!archetype) {
      return res.status(404).json({
        success: false,
        message: 'Archetype not found',
      });
    }
    
    // Check ownership
    if (archetype.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }
    
    // Get related sessions
    const recentSessions = await Session.find({
      archetypeId: archetype._id,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('startedAt initialIntensity finalIntensity outcomeData');
    
    res.status(200).json({
      success: true,
      data: {
        archetype,
        recentSessions,
      },
    });
  } catch (error) {
    logger.error('Error getting archetype:', error);
    next(error);
  }
};

/**
 * Get archetype templates (for selection UI)
 * GET /archetypes/templates
 */
exports.getArchetypeTemplates = async (req, res, next) => {
  try {
    const templates = Object.entries(ARCHETYPE_TEMPLATES).map(([key, template]) => ({
      id: key,
      name: template.name,
      shortLabel: template.shortLabel,
      category: template.category,
      typicalEmotions: template.typicalEmotions,
    }));
    
    res.status(200).json({
      success: true,
      data: { templates },
    });
  } catch (error) {
    logger.error('Error getting archetype templates:', error);
    next(error);
  }
};

/**
 * User manually selects an archetype for current session
 * POST /archetypes/:id/select
 */
exports.selectArchetype = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { sessionId } = req.body;
    
    const archetype = await SpiralArchetype.findById(id);
    if (!archetype) {
      return res.status(404).json({
        success: false,
        message: 'Archetype not found',
      });
    }
    
    // Check ownership
    if (archetype.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }
    
    // Update session with archetype
    if (sessionId) {
      const session = await Session.findById(sessionId);
      if (session && session.user.toString() === req.user.id) {
        session.archetypeId = archetype._id;
        session.archetypeConfidence = 1.0; // User-selected = high confidence
        session.archetypeMatchedAt = new Date();
        await session.save();
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        archetype: {
          id: archetype._id,
          name: archetype.name,
          bestMethodSequence: archetype.bestMethodSequence,
        },
      },
    });
  } catch (error) {
    logger.error('Error selecting archetype:', error);
    next(error);
  }
};

/**
 * Rename an archetype (user customization)
 * PATCH /archetypes/:id
 */
exports.updateArchetype = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, shortLabel } = req.body;
    
    const archetype = await SpiralArchetype.findById(id);
    if (!archetype) {
      return res.status(404).json({
        success: false,
        message: 'Archetype not found',
      });
    }
    
    // Check ownership
    if (archetype.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }
    
    if (name) archetype.name = name;
    if (shortLabel) archetype.shortLabel = shortLabel;
    await archetype.save();
    
    res.status(200).json({
      success: true,
      data: { archetype },
    });
  } catch (error) {
    logger.error('Error updating archetype:', error);
    next(error);
  }
};

/**
 * Hide/deactivate an archetype
 * DELETE /archetypes/:id
 */
exports.deactivateArchetype = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const archetype = await SpiralArchetype.findById(id);
    if (!archetype) {
      return res.status(404).json({
        success: false,
        message: 'Archetype not found',
      });
    }
    
    // Check ownership
    if (archetype.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }
    
    archetype.isActive = false;
    await archetype.save();
    
    res.status(200).json({
      success: true,
      message: 'Archetype hidden',
    });
  } catch (error) {
    logger.error('Error deactivating archetype:', error);
    next(error);
  }
};
