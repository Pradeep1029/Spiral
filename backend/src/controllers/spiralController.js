const mongoose = require('mongoose');
const logger = require('../config/logger');
const SpiralSession = require('../models/SpiralSession');
const spiralAiService = require('../services/spiralAiService');
const { AppError } = require('../middleware/errorHandler');

const BODY_LOCATIONS = ['head', 'chest', 'belly', 'hands'];
const PATHS = ['REFRAME', 'COMPASSION', 'ACT', 'PARK', 'CLARITY', 'CRISIS'];

const CRISIS_KEYWORDS = [
  'kill myself',
  'suicide',
  'end it',
  'self harm',
  'self-harm',
  'hurt myself',
  'overdose',
  'want to die',
  'better off dead',
];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function detectCrisis(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return false;
  return CRISIS_KEYWORDS.some((k) => t.includes(k));
}

async function loadSessionForOptionalAuth({ sessionId, req }) {
  if (!mongoose.isValidObjectId(sessionId)) {
    throw new AppError('Invalid session id', 400);
  }

  const session = await SpiralSession.findById(sessionId);
  if (!session) {
    throw new AppError('Session not found', 404);
  }

  if (session.user && !req.user?._id) {
    throw new AppError('Unauthorized', 401);
  }

  if (req.user?._id && session.user && session.user.toString() !== req.user._id.toString()) {
    throw new AppError('Forbidden', 403);
  }

  return session;
}

exports.createSession = async (req, res, next) => {
  try {
    const { entry_point } = req.body || {};

    const session = await SpiralSession.create({
      user: req.user?._id,
      entryPoint: entry_point || 'home',
      currentStep: 'arrival',
      events: [],
      startedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      data: {
        session: {
          id: session._id,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProgress = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid session id' });
    }

    const {
      current_step,
      body_location_pre,
      body_location_post,
      intensity_pre,
      intensity_post,
      spiral_text,
      path,
      path_confidence,
      path_reasoning,
      path_prompts,
      path_answers,
      closure_validation,
      anchor_recommended,
      anchor_selected,
      arrival_greeting,
      events,
    } = req.body || {};

    const updates = {
      currentStep: current_step !== undefined ? current_step : undefined,
      bodyLocationPre: BODY_LOCATIONS.includes(body_location_pre) ? body_location_pre : undefined,
      bodyLocationPost: BODY_LOCATIONS.includes(body_location_post) ? body_location_post : undefined,
      intensityPre:
        intensity_pre !== undefined && intensity_pre !== null ? clamp(Number(intensity_pre), 0, 10) : undefined,
      intensityPost:
        intensity_post !== undefined && intensity_post !== null ? clamp(Number(intensity_post), 0, 10) : undefined,
      spiralText: spiral_text !== undefined ? spiral_text : undefined,
      path: PATHS.includes(path) ? path : undefined,
      pathConfidence:
        path_confidence !== undefined && path_confidence !== null
          ? clamp(Number(path_confidence), 0, 100)
          : undefined,
      pathReasoning: path_reasoning !== undefined ? path_reasoning : undefined,
      pathPrompts: Array.isArray(path_prompts) ? path_prompts : undefined,
      pathAnswers: Array.isArray(path_answers) ? path_answers : undefined,
      closureValidation: closure_validation !== undefined ? closure_validation : undefined,
      anchorRecommended:
        anchor_recommended !== undefined && anchor_recommended !== null
          ? clamp(Number(anchor_recommended), 0, 3)
          : undefined,
      anchorSelected:
        anchor_selected !== undefined && anchor_selected !== null ? clamp(Number(anchor_selected), 0, 3) : undefined,
      arrivalGreeting: arrival_greeting !== undefined ? arrival_greeting : undefined,
    };

    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const updateDoc = { $set: updates };
    if (Array.isArray(events) && events.length > 0) {
      updateDoc.$push = { events: { $each: events } };
    }

    const existing = await SpiralSession.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (existing.user && !req.user?._id) {
      throw new AppError('Unauthorized', 401);
    }

    if (req.user?._id && existing.user && existing.user.toString() !== req.user._id.toString()) {
      throw new AppError('Forbidden', 403);
    }

    const updated = await SpiralSession.findByIdAndUpdate(id, updateDoc, { new: true });

    res.status(200).json({
      success: true,
      data: {
        session: {
          id: updated._id,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.endSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid session id' });
    }

    const {
      current_step,
      body_location_post,
      intensity_post,
      anchor_selected,
      duration_sec,
      events,
    } = req.body || {};

    const updates = {
      endedAt: new Date(),
      durationSec: duration_sec !== undefined && duration_sec !== null ? Number(duration_sec) : undefined,
      currentStep: current_step !== undefined ? current_step : undefined,
      bodyLocationPost: BODY_LOCATIONS.includes(body_location_post) ? body_location_post : undefined,
      intensityPost:
        intensity_post !== undefined && intensity_post !== null ? clamp(Number(intensity_post), 0, 10) : undefined,
      anchorSelected:
        anchor_selected !== undefined && anchor_selected !== null ? clamp(Number(anchor_selected), 0, 3) : undefined,
    };

    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const updateDoc = { $set: updates };
    if (Array.isArray(events) && events.length > 0) {
      updateDoc.$push = { events: { $each: events } };
    }

    const existing = await SpiralSession.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (existing.user && !req.user?._id) {
      throw new AppError('Unauthorized', 401);
    }

    if (req.user?._id && existing.user && existing.user.toString() !== req.user._id.toString()) {
      throw new AppError('Forbidden', 403);
    }

    const updated = await SpiralSession.findByIdAndUpdate(id, updateDoc, { new: true });

    res.status(200).json({
      success: true,
      data: {
        session: {
          id: updated._id,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.homeSuggestion = async (req, res, next) => {
  try {
    const suggestion = await spiralAiService.homeSuggestion({ userId: req.user?._id || null, now: new Date() });

    res.status(200).json({
      success: true,
      data: {
        suggestion_text:
          suggestion || 'Evening check-in: loosen your jaw and take one slow exhale.',
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.arrivalGreeting = async (req, res, next) => {
  try {
    const { session_id } = req.body || {};

    const text = await spiralAiService.arrivalGreeting({ userId: req.user?._id || null, now: new Date() });
    const greeting =
      text ||
      "Your nervous system is on high alert. In 3 minutes, we’ll calm your body first, then untangle the thought.";

    if (session_id) {
      try {
        const session = await loadSessionForOptionalAuth({ sessionId: session_id, req });
        session.arrivalGreeting = greeting;
        session.currentStep = 'arrival';
        await session.save();
      } catch (e) {
        logger.warn('Failed to attach arrival greeting to session', { error: e?.message });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        greeting_text: greeting,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.bodyScan = async (req, res, next) => {
  try {
    const { session_id, location_tapped } = req.body || {};
    const location = String(location_tapped || '').toLowerCase();

    if (!BODY_LOCATIONS.includes(location)) {
      throw new AppError('Invalid body location', 400);
    }

    const text = await spiralAiService.bodyScanResponse({
      userId: req.user?._id || null,
      locationTapped: location,
      now: new Date(),
    });

    const bodyText =
      text ||
      'That makes sense. Your body is trying to protect you. It can soften as you breathe.';

    if (session_id) {
      try {
        const session = await loadSessionForOptionalAuth({ sessionId: session_id, req });
        session.bodyLocationPre = location;
        session.currentStep = 'body_scan';
        await session.save();
      } catch (e) {
        logger.warn('Failed to attach body scan to session', { error: e?.message });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        body_text: bodyText,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.pathDecision = async (req, res, next) => {
  try {
    const { session_id, spiral_text } = req.body || {};
    const spiralText = String(spiral_text || '').trim();

    if (!spiralText) {
      throw new AppError('Missing spiral_text', 400);
    }

    let decision = null;

    if (detectCrisis(spiralText)) {
      decision = { path: 'CRISIS', confidence: 100, reasoning: 'Self-harm language detected; safety first.' };
    } else {
      decision = await spiralAiService.decidePath({ spiralText });
    }

    if (!decision) {
      decision = {
        path: 'CLARITY',
        confidence: 60,
        reasoning: 'Defaulted to clarity questions when routing was uncertain.',
      };
    }

    if (session_id) {
      try {
        const session = await loadSessionForOptionalAuth({ sessionId: session_id, req });
        session.spiralText = spiralText;
        session.path = decision.path;
        session.pathConfidence = decision.confidence;
        session.pathReasoning = decision.reasoning;
        session.currentStep = 'path_decision';
        await session.save();
      } catch (e) {
        logger.warn('Failed to attach path decision to session', { error: e?.message });
      }
    }

    res.status(200).json({
      success: true,
      data: decision,
    });
  } catch (err) {
    next(err);
  }
};

exports.pathPrompts = async (req, res, next) => {
  try {
    const { session_id, path, spiral_text } = req.body || {};
    const safePath = String(path || '').toUpperCase();
    const spiralText = String(spiral_text || '').trim();

    if (!PATHS.includes(safePath)) {
      throw new AppError('Invalid path', 400);
    }

    if (!spiralText) {
      throw new AppError('Missing spiral_text', 400);
    }

    let prompts = null;

    if (safePath === 'CRISIS') {
      prompts = [
        'Are you safe right now, physically?',
        'Who is one person you can contact immediately?',
        'Would you be willing to call local emergency services or a crisis line now?',
      ];
    } else {
      prompts = await spiralAiService.generatePrompts({ path: safePath, spiralText });
    }

    if (!prompts || prompts.length !== 3) {
      prompts = [
        'What is the simplest version of this thought loop?',
        'What is one fact you know for sure right now?',
        'What is one next step you can take in the next 10 minutes?',
      ];
    }

    if (session_id) {
      try {
        const session = await loadSessionForOptionalAuth({ sessionId: session_id, req });
        session.pathPrompts = prompts;
        session.currentStep = 'path_prompts';
        await session.save();
      } catch (e) {
        logger.warn('Failed to attach path prompts to session', { error: e?.message });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        prompts,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.closureValidation = async (req, res, next) => {
  try {
    const {
      session_id,
      intensity_pre,
      intensity_post,
      path_used,
      body_location_before,
      body_location_after,
    } = req.body || {};

    const intensityPre = clamp(Number(intensity_pre ?? 7), 0, 10);
    const intensityPost = clamp(Number(intensity_post ?? 7), 0, 10);

    const pathUsed = String(path_used || '').toUpperCase();
    const bodyBefore = String(body_location_before || '').toLowerCase();
    const bodyAfter = String(body_location_after || '').toLowerCase();

    const safePathUsed = PATHS.includes(pathUsed) ? pathUsed : 'CLARITY';

    const text = await spiralAiService.closureValidation({
      intensityPre,
      intensityPost,
      pathUsed: safePathUsed,
      bodyLocationBefore: BODY_LOCATIONS.includes(bodyBefore) ? bodyBefore : null,
      bodyLocationAfter: BODY_LOCATIONS.includes(bodyAfter) ? bodyAfter : null,
    });

    const closureText =
      text ||
      (intensityPost < intensityPre
        ? `Your intensity dropped from ${intensityPre} to ${intensityPost}. That’s real regulation.`
        : 'No magic shift, but you stayed with it. That’s the practice.');

    if (session_id) {
      try {
        const session = await loadSessionForOptionalAuth({ sessionId: session_id, req });
        session.intensityPre = intensityPre;
        session.intensityPost = intensityPost;
        if (BODY_LOCATIONS.includes(bodyAfter)) session.bodyLocationPost = bodyAfter;
        session.closureValidation = closureText;
        session.currentStep = 'closure';
        await session.save();
      } catch (e) {
        logger.warn('Failed to attach closure validation to session', { error: e?.message });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        closure_text: closureText,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.anchorRecommendation = async (req, res, next) => {
  try {
    const { session_id, path_used, intensity_pre, intensity_post } = req.body || {};

    const intensityPre = clamp(Number(intensity_pre ?? 7), 0, 10);
    const intensityPost = clamp(Number(intensity_post ?? 7), 0, 10);

    const pathUsed = String(path_used || '').toUpperCase();
    const safePathUsed = PATHS.includes(pathUsed) ? pathUsed : 'CLARITY';

    const rec = await spiralAiService.anchorRecommendation({
      userId: req.user?._id || null,
      pathUsed: safePathUsed,
      intensityPre,
      intensityPost,
    });

    const recommended = rec === null ? 0 : rec;

    if (session_id) {
      try {
        const session = await loadSessionForOptionalAuth({ sessionId: session_id, req });
        session.anchorRecommended = recommended;
        session.currentStep = 'anchor';
        await session.save();
      } catch (e) {
        logger.warn('Failed to attach anchor recommendation to session', { error: e?.message });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        recommended,
      },
    });
  } catch (err) {
    next(err);
  }
};
