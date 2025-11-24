const OpenAI = require('openai');
const logger = require('../config/logger');

// Initialize OpenAI client
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Classify a spiral session across multiple dimensions
 * @param {string} userText - User's vent text or transcript
 * @param {object} userProfile - User's onboarding + learned preferences
 * @param {object} sessionContext - Current session context (time, sleep, intensity)
 * @returns {Promise<object>} SessionClassification
 */
async function classifySpiral(userText, userProfile, sessionContext) {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const prompt = buildClassificationPrompt(userText, userProfile, sessionContext);

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: CLASSIFICATION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temp for more consistent classification
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const classification = JSON.parse(response.choices[0].message.content);

    // Validate and normalize
    const normalized = normalizeClassification(classification, sessionContext);

    logger.info('Spiral classified', {
      thoughtForm: normalized.thoughtForm,
      topics: Object.keys(normalized.topics).filter(k => normalized.topics[k] > 0.3),
      emotions: normalized.primaryEmotions,
    });

    return normalized;
  } catch (error) {
    logger.error('Error classifying spiral:', error);
    
    // Fallback classification if AI fails
    return getFallbackClassification(sessionContext);
  }
}

const CLASSIFICATION_SYSTEM_PROMPT = `You are a clinical psychology classifier for night-time spirals.

Your job is to analyze user text and classify the spiral across multiple dimensions.

Output a JSON object with this exact structure:

{
  "topics": {
    "work": 0.0-1.0,
    "relationships": 0.0-1.0,
    "money": 0.0-1.0,
    "health": 0.0-1.0,
    "family": 0.0-1.0,
    "self_worth": 0.0-1.0,
    "life_direction": 0.0-1.0,
    "other": 0.0-1.0
  },
  "thoughtForm": "worry" | "rumination" | "self_criticism" | "anger" | "grief" | "existential" | "mixed",
  "primaryEmotions": ["anxiety", "shame", "sadness", "anger", "guilt"],
  "intensity": 1-10,
  "cognitiveCapacity": "low" | "medium" | "high",
  "acuteTrigger": "string or null",
  "recommendedStrategies": ["breathing", "grounding", "expressive_release", "brief_cbt", "deep_cbt", "defusion", "self_compassion", "behavioral_micro_plan", "sleep_wind_down", "acceptance_values"]
}

Definitions:
- **worry**: future-oriented, "what if" thinking
- **rumination**: past-oriented, replaying events/conversations
- **self_criticism**: harsh judgment of self, "I'm worthless/failure"
- **anger**: directed at others or situations
- **grief**: loss, sadness about what's gone
- **existential**: meaning, purpose, life direction questions

Topics: Assign weights 0-1 based on how much each topic appears. Multiple topics can have high weights.

Emotions: List 1-3 primary emotions (don't list all).

Intensity: 1-10 based on language intensity, catastrophizing, urgency.

Cognitive capacity:
- **low**: exhausted, late night, overwhelmed, hard to think
- **medium**: stressed but can engage
- **high**: clear thinking, daytime, ready for deeper work

Recommended strategies: Based on thought form + capacity + context, recommend 2-5 methods:
- breathing/grounding: for high arousal
- expressive_release: always good after initial grounding
- brief_cbt: for worry, mild-moderate intensity
- deep_cbt: for moderate self-criticism when capacity is medium+
- defusion: for rumination, stuck thoughts
- self_compassion: for harsh self-criticism
- behavioral_micro_plan: for worry when NOT late at night
- sleep_wind_down: for late night + low capacity
- acceptance_values: for existential concerns

Output ONLY the JSON, no explanations.`;

function buildClassificationPrompt(userText, userProfile, sessionContext) {
  const lines = [];

  lines.push('Classify this user\'s spiral:\n');
  lines.push(`USER TEXT:\n"${userText}"\n`);

  // Add user background
  lines.push('USER BACKGROUND:');
  if (userProfile.onboarding) {
    const onb = userProfile.onboarding;
    if (onb.spiralPatterns && onb.spiralPatterns.length > 0) {
      lines.push(`Typical patterns: ${onb.spiralPatterns.join(', ')}`);
    }
    if (onb.spiralTopics && onb.spiralTopics.length > 0) {
      lines.push(`Known topics: ${onb.spiralTopics.join(', ')}`);
    }
    if (onb.emotionalFlavors && onb.emotionalFlavors.length > 0) {
      lines.push(`Emotional tendencies: ${onb.emotionalFlavors.join(', ')}`);
    }
  }

  // Add session context
  lines.push('\nSESSION CONTEXT:');
  lines.push(`Time: ${sessionContext.timeOfDay || 'unknown'}`);
  lines.push(`Sleep-related: ${sessionContext.sleepRelated ? 'Yes' : 'No'}`);
  if (sessionContext.initialIntensity) {
    lines.push(`User-rated intensity: ${sessionContext.initialIntensity}/10`);
  }

  lines.push('\nProvide classification JSON:');

  return lines.join('\n');
}

function normalizeClassification(classification, sessionContext) {
  // Ensure all required fields exist with defaults
  const normalized = {
    topics: classification.topics || {},
    thoughtForm: classification.thoughtForm || 'mixed',
    primaryEmotions: classification.primaryEmotions || ['anxiety'],
    intensity: classification.intensity || sessionContext.initialIntensity || 5,
    context: {
      timeOfDay: sessionContext.timeOfDay || 'evening',
      sleepRelated: sessionContext.sleepRelated || false,
      acuteTrigger: classification.acuteTrigger || null,
    },
    cognitiveCapacity: classification.cognitiveCapacity || 'medium',
    recommendedStrategies: classification.recommendedStrategies || ['brief_cbt', 'self_compassion'],
    classifiedAt: new Date(),
  };

  return normalized;
}

function getFallbackClassification(sessionContext) {
  // Simple fallback if AI classification fails
  return {
    topics: { other: 1.0 },
    thoughtForm: 'mixed',
    primaryEmotions: ['anxiety'],
    intensity: sessionContext.initialIntensity || 5,
    context: {
      timeOfDay: sessionContext.timeOfDay || 'evening',
      sleepRelated: sessionContext.sleepRelated || false,
      acuteTrigger: null,
    },
    cognitiveCapacity: sessionContext.sleepRelated ? 'low' : 'medium',
    recommendedStrategies: ['breathing', 'expressive_release', 'brief_cbt', 'summary'],
    classifiedAt: new Date(),
  };
}

module.exports = {
  classifySpiral,
};
