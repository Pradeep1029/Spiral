const SpiralArchetype = require('../models/SpiralArchetype');
const Session = require('../models/Session');
const logger = require('../config/logger');

/**
 * Archetype Service - Manages spiral archetype detection, clustering, and matching
 */

// Predefined archetype templates based on PRD personas
const ARCHETYPE_TEMPLATES = {
  work_shame: {
    name: 'Work – I\'m a fraud',
    shortLabel: 'fraud spiral',
    category: 'work_shame',
    coreThemes: ['fraud', 'imposter', 'not good enough', 'fired', 'stupid', 'incompetent'],
    typicalEmotions: ['shame', 'anxiety', 'fear'],
    typicalThoughtForms: ['self_criticism', 'catastrophizing'],
  },
  relationship_fear: {
    name: 'Relationships – they\'ll leave me',
    shortLabel: 'abandonment spiral',
    category: 'relationship_fear',
    coreThemes: ['leave', 'abandon', 'alone', 'unlovable', 'reject', 'hate me'],
    typicalEmotions: ['anxiety', 'fear', 'sadness'],
    typicalThoughtForms: ['worry', 'catastrophizing'],
  },
  health_worry: {
    name: 'Health – something is seriously wrong',
    shortLabel: 'health spiral',
    category: 'health_worry',
    coreThemes: ['sick', 'disease', 'cancer', 'heart', 'dying', 'symptoms', 'doctor'],
    typicalEmotions: ['anxiety', 'fear'],
    typicalThoughtForms: ['worry', 'catastrophizing'],
  },
  self_worth: {
    name: 'Self – I\'m fundamentally broken',
    shortLabel: 'broken spiral',
    category: 'self_worth',
    coreThemes: ['broken', 'worthless', 'failure', 'hate myself', 'wrong with me', 'defective'],
    typicalEmotions: ['shame', 'sadness', 'hopelessness'],
    typicalThoughtForms: ['self_criticism', 'rumination'],
  },
  existential: {
    name: 'Life – what\'s the point',
    shortLabel: 'meaning spiral',
    category: 'existential',
    coreThemes: ['meaning', 'pointless', 'purpose', 'wasting', 'death', 'matter', 'nothing'],
    typicalEmotions: ['sadness', 'anxiety', 'hopelessness'],
    typicalThoughtForms: ['rumination', 'all_or_nothing'],
  },
  life_direction: {
    name: 'Direction – am I wasting my life',
    shortLabel: 'direction spiral',
    category: 'life_direction',
    coreThemes: ['stuck', 'wasting time', 'wrong path', 'behind', 'should be', 'lost'],
    typicalEmotions: ['anxiety', 'sadness', 'guilt'],
    typicalThoughtForms: ['rumination', 'worry'],
  },
  social: {
    name: 'Social – they think I\'m weird',
    shortLabel: 'social spiral',
    category: 'social',
    coreThemes: ['embarrassed', 'stupid thing', 'judging', 'weird', 'awkward', 'cringe'],
    typicalEmotions: ['shame', 'anxiety'],
    typicalThoughtForms: ['rumination', 'self_criticism'],
  },
  performance: {
    name: 'Performance – I\'m going to fail',
    shortLabel: 'failure spiral',
    category: 'performance',
    coreThemes: ['fail', 'test', 'exam', 'presentation', 'mess up', 'not ready'],
    typicalEmotions: ['anxiety', 'fear'],
    typicalThoughtForms: ['worry', 'catastrophizing'],
  },
};

/**
 * Match dump text to existing archetypes or create new one
 * @param {string} userId - User ID
 * @param {string} dumpText - Raw text from user's dump/vent
 * @param {object} classification - Session classification data
 * @returns {object} { archetype, confidence, isNew }
 */
async function matchOrCreateArchetype(userId, dumpText, classification) {
  if (!dumpText || dumpText.length < 10) {
    return { archetype: null, confidence: 0, isNew: false };
  }

  const textLower = dumpText.toLowerCase();
  
  // Get user's existing archetypes
  const existingArchetypes = await SpiralArchetype.find({ user: userId, isActive: true });
  
  // Score against existing archetypes
  let bestMatch = null;
  let bestScore = 0;
  
  for (const archetype of existingArchetypes) {
    const score = calculateArchetypeScore(textLower, archetype);
    if (score > bestScore && score >= 0.3) {
      bestScore = score;
      bestMatch = archetype;
    }
  }
  
  // If good match found, return it
  if (bestMatch && bestScore >= 0.5) {
    return { archetype: bestMatch, confidence: bestScore, isNew: false };
  }
  
  // Try to match against templates
  let templateMatch = null;
  let templateScore = 0;
  
  for (const [key, template] of Object.entries(ARCHETYPE_TEMPLATES)) {
    const score = calculateTemplateScore(textLower, template);
    if (score > templateScore && score >= 0.3) {
      templateScore = score;
      templateMatch = { key, template };
    }
  }
  
  // If template match is better than existing, create new archetype from template
  if (templateMatch && templateScore > bestScore) {
    // Check if user already has this category
    const existingCategory = existingArchetypes.find(a => a.category === templateMatch.template.category);
    if (existingCategory) {
      // Update existing
      await updateArchetypeWithNewSession(existingCategory, dumpText, classification);
      return { archetype: existingCategory, confidence: templateScore, isNew: false };
    }
    
    // Create new archetype from template
    const newArchetype = await SpiralArchetype.create({
      user: userId,
      ...templateMatch.template,
      typicalTimeWindows: classification.context?.timeOfDay ? [classification.context.timeOfDay] : [],
      stats: {
        totalOccurrences: 1,
        firstOccurredAt: new Date(),
        lastOccurredAt: new Date(),
      },
      commonPhrases: extractPhrases(dumpText),
      confidence: templateScore,
    });
    
    return { archetype: newArchetype, confidence: templateScore, isNew: true };
  }
  
  // If we have a weak existing match, use it
  if (bestMatch) {
    await updateArchetypeWithNewSession(bestMatch, dumpText, classification);
    return { archetype: bestMatch, confidence: bestScore, isNew: false };
  }
  
  // No match - could create generic archetype or return null
  return { archetype: null, confidence: 0, isNew: false };
}

/**
 * Calculate how well text matches an archetype
 */
function calculateArchetypeScore(textLower, archetype) {
  let score = 0;
  let matches = 0;
  
  // Check core themes
  for (const theme of archetype.coreThemes || []) {
    if (textLower.includes(theme.toLowerCase())) {
      matches++;
    }
  }
  
  // Check common phrases
  for (const phraseObj of archetype.commonPhrases || []) {
    if (textLower.includes(phraseObj.phrase?.toLowerCase() || '')) {
      matches += 0.5;
    }
  }
  
  const totalPossible = (archetype.coreThemes?.length || 0) + (archetype.commonPhrases?.length || 0) * 0.5;
  if (totalPossible > 0) {
    score = matches / totalPossible;
  }
  
  return Math.min(score, 1);
}

/**
 * Calculate how well text matches a template
 */
function calculateTemplateScore(textLower, template) {
  let matches = 0;
  
  for (const theme of template.coreThemes || []) {
    if (textLower.includes(theme.toLowerCase())) {
      matches++;
    }
  }
  
  const totalPossible = template.coreThemes?.length || 1;
  return matches / totalPossible;
}

/**
 * Extract key phrases from dump text
 */
function extractPhrases(text) {
  const phrases = [];
  const words = text.toLowerCase().split(/\s+/);
  
  // Extract 2-3 word phrases that might be meaningful
  for (let i = 0; i < words.length - 1; i++) {
    const twoWord = `${words[i]} ${words[i + 1]}`;
    if (twoWord.length > 5 && !isCommonPhrase(twoWord)) {
      phrases.push({ phrase: twoWord, frequency: 1 });
    }
  }
  
  return phrases.slice(0, 10); // Limit to 10 phrases
}

/**
 * Check if phrase is too common to be useful
 */
function isCommonPhrase(phrase) {
  const commonPhrases = ['i am', 'i feel', 'i think', 'i know', 'i have', 'i can', 'i will', 
    'the same', 'this is', 'that is', 'it is', 'they are', 'we are'];
  return commonPhrases.includes(phrase);
}

/**
 * Update archetype with data from new session
 */
async function updateArchetypeWithNewSession(archetype, dumpText, classification) {
  archetype.stats.totalOccurrences = (archetype.stats.totalOccurrences || 0) + 1;
  archetype.stats.lastOccurredAt = new Date();
  
  // Add time window if new
  if (classification.context?.timeOfDay && !archetype.typicalTimeWindows.includes(classification.context.timeOfDay)) {
    archetype.typicalTimeWindows.push(classification.context.timeOfDay);
  }
  
  // Update common phrases
  const newPhrases = extractPhrases(dumpText);
  for (const newPhrase of newPhrases) {
    const existing = archetype.commonPhrases.find(p => p.phrase === newPhrase.phrase);
    if (existing) {
      existing.frequency++;
    } else if (archetype.commonPhrases.length < 20) {
      archetype.commonPhrases.push(newPhrase);
    }
  }
  
  archetype.lastUpdatedAt = new Date();
  await archetype.save();
}

/**
 * Update archetype effectiveness scores after session completion
 * @param {string} archetypeId - Archetype ID
 * @param {string} sessionId - Session ID
 * @param {array} methodsUsed - Methods used in session
 * @param {number} intensityBefore - Initial intensity
 * @param {number} intensityAfter - Final intensity
 * @param {number} helpfulnessRating - User helpfulness rating (1-5)
 */
async function updateArchetypeEffectiveness(archetypeId, sessionId, methodsUsed, intensityBefore, intensityAfter, helpfulnessRating) {
  if (!archetypeId) return;
  
  const archetype = await SpiralArchetype.findById(archetypeId);
  if (!archetype) return;
  
  // Calculate effectiveness score for this session
  const intensityReduction = (intensityBefore - intensityAfter) / intensityBefore;
  const normalizedHelpfulness = helpfulnessRating ? (helpfulnessRating - 1) / 4 : 0.5; // Convert 1-5 to 0-1
  const sessionEffectiveness = (intensityReduction * 0.6) + (normalizedHelpfulness * 0.4);
  
  // Update average intensities
  const totalSessions = archetype.stats.totalOccurrences || 1;
  archetype.stats.averageIntensityBefore = 
    ((archetype.stats.averageIntensityBefore || 0) * (totalSessions - 1) + intensityBefore) / totalSessions;
  archetype.stats.averageIntensityAfter = 
    ((archetype.stats.averageIntensityAfter || 0) * (totalSessions - 1) + intensityAfter) / totalSessions;
  
  // Update method effectiveness
  for (const method of methodsUsed) {
    const existingMethod = archetype.effectiveMethods.find(m => m.method === method);
    if (existingMethod) {
      // Rolling average
      existingMethod.usageCount++;
      existingMethod.effectivenessScore = 
        (existingMethod.effectivenessScore * (existingMethod.usageCount - 1) + sessionEffectiveness) / existingMethod.usageCount;
    } else {
      archetype.effectiveMethods.push({
        method,
        effectivenessScore: sessionEffectiveness,
        usageCount: 1,
      });
    }
  }
  
  // Update best method sequence if this was effective
  if (sessionEffectiveness > 0.5) {
    archetype.bestMethodSequence = methodsUsed;
  }
  
  // Add session to list
  if (!archetype.sessionIds.includes(sessionId)) {
    archetype.sessionIds.push(sessionId);
  }
  
  await archetype.save();
  
  logger.info('Updated archetype effectiveness', {
    archetypeId,
    sessionId,
    sessionEffectiveness,
    methodsUsed,
  });
}

/**
 * Get user's archetypes ranked by frequency
 */
async function getUserArchetypes(userId, limit = 5) {
  return await SpiralArchetype.find({ user: userId, isActive: true })
    .sort({ 'stats.totalOccurrences': -1 })
    .limit(limit);
}

/**
 * Get best method sequence for an archetype
 */
async function getBestMethodsForArchetype(archetypeId) {
  const archetype = await SpiralArchetype.findById(archetypeId);
  if (!archetype) return null;
  
  // If we have a proven best sequence, use it
  if (archetype.bestMethodSequence && archetype.bestMethodSequence.length > 0) {
    return archetype.bestMethodSequence;
  }
  
  // Otherwise, rank by effectiveness
  const sortedMethods = archetype.effectiveMethods
    .filter(m => m.usageCount >= 2) // Only use methods with enough data
    .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
    .map(m => m.method);
  
  return sortedMethods.length > 0 ? sortedMethods : null;
}

module.exports = {
  matchOrCreateArchetype,
  updateArchetypeEffectiveness,
  getUserArchetypes,
  getBestMethodsForArchetype,
  ARCHETYPE_TEMPLATES,
};
