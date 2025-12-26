const OpenAI = require('openai');
const logger = require('../config/logger');
const SpiralSession = require('../models/SpiralSession');

const MODEL = 'gpt-5-mini-2025-08-07';
const MAX_COMPLETION_TOKENS_TEXT = 220;
const MAX_COMPLETION_TOKENS_JSON = 420;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function getRecentSessionSummaries({ userId, limit = 5 }) {
  if (!userId) return [];

  const sessions = await SpiralSession.find({
    user: userId,
    endedAt: { $exists: true },
  })
    .sort({ endedAt: -1 })
    .limit(limit)
    .lean();

  return sessions.map((s) => ({
    endedAt: s.endedAt,
    intensityPre: s.intensityPre,
    intensityPost: s.intensityPost,
    bodyLocationPre: s.bodyLocationPre,
    path: s.path,
  }));
}

function summarizeSessions(summaries) {
  if (!summaries || summaries.length === 0) return 'No prior sessions.';

  return summaries
    .map((s) => {
      const drop =
        typeof s.intensityPre === 'number' && typeof s.intensityPost === 'number'
          ? s.intensityPre - s.intensityPost
          : null;
      const dropText = drop === null ? 'unknown' : String(drop);
      return `- Path: ${s.path || 'unknown'}, Body: ${s.bodyLocationPre || 'unknown'}, Drop: ${dropText}`;
    })
    .join('\n');
}

async function chatJson({ system, user }) {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      max_completion_tokens: MAX_COMPLETION_TOKENS_JSON,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) return null;
    return safeJsonParse(content);
  } catch (err) {
    logger.warn('chatJson failed', { error: err?.message });
    return null;
  }
}

async function chatText({ system, user }) {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      max_completion_tokens: MAX_COMPLETION_TOKENS_TEXT,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    const content = response.choices?.[0]?.message?.content;
    return typeof content === 'string' ? content.trim() : '';
  } catch (err) {
    logger.warn('chatText failed', { error: err?.message });
    return '';
  }
}

function safeOneOrTwoSentences(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  return t.replace(/\s+/g, ' ').trim();
}

async function homeSuggestion({ userId, now = new Date() }) {
  try {
    const summaries = await getRecentSessionSummaries({ userId, limit: 5 });
    const history = summarizeSessions(summaries);

    const system =
      'You are Unspiral, a trauma-informed anxiety support assistant. Based on the user patterns, suggest ONE proactive micro-action. Max 15 words. No emojis.';

    const user = `Time: ${now.toISOString()}\nRecent sessions:\n${history}`;

    const text = await chatText({ system, user });
    return safeOneOrTwoSentences(text);
  } catch (err) {
    logger.warn('homeSuggestion failed', { error: err?.message });
    return '';
  }
}

async function arrivalGreeting({ userId, now = new Date() }) {
  try {
    const summaries = await getRecentSessionSummaries({ userId, limit: 3 });
    const history = summarizeSessions(summaries);

    const system =
      'You are Unspiral, a trauma-informed anxiety support assistant. Generate ONE warm, validating greeting. Max 2 sentences. No emojis. No diagnosis.';

    const user = `Time: ${now.toISOString()}\nRecent sessions:\n${history}`;

    const text = await chatText({ system, user });
    return safeOneOrTwoSentences(text);
  } catch (err) {
    logger.warn('arrivalGreeting failed', { error: err?.message });
    return '';
  }
}

async function bodyScanResponse({ userId, locationTapped, now = new Date() }) {
  try {
    const summaries = await getRecentSessionSummaries({ userId, limit: 5 });
    const history = summarizeSessions(summaries);

    const system =
      'You are Unspiral, a trauma-informed anxiety support assistant. Generate a validating body sensation explanation (1-2 sentences). Keep it grounded and non-clinical. No emojis.';

    const user = `Tapped location: ${locationTapped}\nTime: ${now.toISOString()}\nRecent sessions:\n${history}`;

    const text = await chatText({ system, user });
    return safeOneOrTwoSentences(text);
  } catch (err) {
    logger.warn('bodyScanResponse failed', { error: err?.message });
    return '';
  }
}

async function decidePath({ spiralText }) {
  const system =
    "You are a CBT-trained analyzer. Read this anxiety spiral. Identify the primary cognitive pattern and choose a path. Return ONLY JSON with keys: path (REFRAME|COMPASSION|ACT|PARK|CLARITY|CRISIS), confidence (0-100), reasoning (one sentence).";

  const user = `Spiral text: ${JSON.stringify(String(spiralText || ''))}`;

  const parsed = await chatJson({ system, user });
  if (!parsed) return null;

  const path = String(parsed.path || '').toUpperCase();
  const allowed = ['REFRAME', 'COMPASSION', 'ACT', 'PARK', 'CLARITY', 'CRISIS'];
  if (!allowed.includes(path)) return null;

  const confidence = Number(parsed.confidence);
  const safeConfidence = Number.isFinite(confidence) ? Math.max(0, Math.min(100, confidence)) : 0;

  return {
    path,
    confidence: safeConfidence,
    reasoning: safeOneOrTwoSentences(parsed.reasoning || ''),
  };
}

async function generatePrompts({ path, spiralText }) {
  const baseRules =
    'Use the user\'s exact words when possible. Be warm, not clinical. Max 20 words per prompt. Return ONLY JSON: {"prompts":["...","...","..."]}';

  const system =
    path === 'REFRAME'
      ? `Generate 3 Socratic questions for cognitive reframe. ${baseRules}`
      : path === 'COMPASSION'
        ? `Generate 3 self-compassion prompts that interrupt self-attack. ${baseRules}`
        : path === 'ACT'
          ? `Generate 3 prompts that identify ONE tiny next action and reduce avoidance. ${baseRules}`
          : path === 'PARK'
            ? `Generate 3 prompts that help park rumination and choose a return-to-life action. ${baseRules}`
            : path === 'CLARITY'
              ? `Generate 3 Socratic prompts to make a vague feeling concrete (what, where, what\'s the story). ${baseRules}`
              : `Generate 3 prompts that support immediate safety and reaching out. ${baseRules}`;

  const user = `User spiral: ${JSON.stringify(String(spiralText || ''))}`;

  const parsed = await chatJson({ system, user });
  const prompts = Array.isArray(parsed?.prompts) ? parsed.prompts : null;
  if (!prompts || prompts.length !== 3) return null;

  return prompts.map((p) => safeOneOrTwoSentences(p)).filter(Boolean).slice(0, 3);
}

async function closureValidation({
  intensityPre,
  intensityPost,
  pathUsed,
  bodyLocationBefore,
  bodyLocationAfter,
}) {
  try {
    const system =
      'Generate a concise validation message based on actual change. Not generic praise. 1-2 sentences. No emojis.';

    const user = `Intensity pre: ${intensityPre}\nIntensity post: ${intensityPost}\nPath: ${pathUsed}\nBody before: ${bodyLocationBefore}\nBody after: ${bodyLocationAfter}`;

    const text = await chatText({ system, user });
    return safeOneOrTwoSentences(text);
  } catch (err) {
    logger.warn('closureValidation failed', { error: err?.message });
    return '';
  }
}

async function anchorRecommendation({ userId, pathUsed, intensityPre, intensityPost }) {
  try {
    const summaries = await getRecentSessionSummaries({ userId, limit: 5 });
    const history = summarizeSessions(summaries);

    const system =
      'Recommend which technique to save as first-response. Return ONLY JSON: {"recommended": 0|1|2|3}. 0=Three physiological sighs, 1=Name the body feeling, 2=Reframe the worst-case, 3=Do one tiny action.';

    const user = `Path used: ${pathUsed}\nIntensity pre: ${intensityPre}\nIntensity post: ${intensityPost}\nRecent sessions:\n${history}`;

    const parsed = await chatJson({ system, user });
    const rec = Number(parsed?.recommended);
    if (![0, 1, 2, 3].includes(rec)) return null;
    return rec;
  } catch (err) {
    logger.warn('anchorRecommendation failed', { error: err?.message });
    return null;
  }
}

module.exports = {
  MODEL,
  homeSuggestion,
  arrivalGreeting,
  bodyScanResponse,
  decidePath,
  generatePrompts,
  closureValidation,
  anchorRecommendation,
};
