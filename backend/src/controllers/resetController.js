const logger = require('../config/logger');
const ResetSession = require('../models/ResetSession');
const mongoose = require('mongoose');
const aiRouter = require('../services/aiRouter');
const personalizationService = require('../services/personalizationService');
const { AppError } = require('../middleware/errorHandler');

const EMOTIONS = ['worry', 'panic', 'shame', 'anger', 'overwhelm'];
const OBJECTS = ['breathing_orb', 'grounding_tap', 'hum_hold'];
const CBT_PATHS = ['SOLVE', 'REFRAME', 'PARK', 'CONNECT', 'CRISIS_ROUTE'];
const REFRAME_DISTORTIONS = ['catastrophizing', 'mind_reading', 'self_attack', 'all_or_nothing', 'fortune_telling'];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function safeWordLimit(text, maxWords) {
  const words = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  return words.slice(0, maxWords).join(' ');
}

function chooseObject({ emotion, intensityPre }) {
  const intensity = clamp(Number(intensityPre ?? 7), 0, 10);

  if (intensity >= 9) return 'hum_hold';
  if (emotion === 'panic' && intensity >= 7) return 'grounding_tap';
  if (intensity >= 8) return 'hum_hold';
  if (emotion === 'panic') return 'grounding_tap';
  return 'breathing_orb';
}

function detectCrisis(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return false;
  return (
    t.includes('kill myself') ||
    t.includes('suicide') ||
    t.includes('end it') ||
    t.includes('self harm') ||
    t.includes('self-harm') ||
    t.includes('hurt myself') ||
    t.includes('overdose')
  );
}

function isConnectSpiral(text) {
  const t = String(text || '').toLowerCase();
  return (
    t.includes('he ') ||
    t.includes('she ') ||
    t.includes('they ') ||
    t.includes('partner') ||
    t.includes('boyfriend') ||
    t.includes('girlfriend') ||
    t.includes('husband') ||
    t.includes('wife') ||
    t.includes('friend') ||
    t.includes('boss') ||
    t.includes('texted') ||
    t.includes('message') ||
    t.includes('ignore') ||
    t.includes('rejected') ||
    t.includes('boundary') ||
    t.includes('fight') ||
    t.includes('argument')
  );
}

function isParkSpiral(text) {
  const t = String(text || '').toLowerCase();
  return (
    t.includes('what if') ||
    t.includes('maybe') ||
    t.includes('might') ||
    t.includes('could') ||
    t.includes('worst case') ||
    t.includes('i don\'t know') ||
    t.includes('uncertain')
  );
}

function isSolveSpiral(text) {
  const t = String(text || '').toLowerCase();
  return (
    t.includes('need to') ||
    t.includes('have to') ||
    t.includes('should') ||
    t.includes('deadline') ||
    t.includes('tomorrow') ||
    t.includes('email') ||
    t.includes('call') ||
    t.includes('apply') ||
    t.includes('submit') ||
    t.includes('pay') ||
    t.includes('finish')
  );
}

function chooseDistortion(text) {
  const t = String(text || '').toLowerCase();
  if (t.includes('always') || t.includes('never') || t.includes('ruined')) return 'all_or_nothing';
  if (t.includes('they think') || t.includes('everyone thinks')) return 'mind_reading';
  if (t.includes('i\'m stupid') || t.includes('i\'m worthless') || t.includes('i hate myself')) return 'self_attack';
  if (t.includes('going to happen') || t.includes('will happen')) return 'fortune_telling';
  return 'catastrophizing';
}

function closureLineFor(path) {
  if (path === 'SOLVE') return 'You’re back in control of the next step.';
  if (path === 'REFRAME') return 'You don’t have to believe every thought to move forward.';
  if (path === 'PARK') return 'You can handle not knowing for now.';
  if (path === 'CONNECT') return 'Clarity beats rumination—one honest sentence is enough.';
  return 'Pause. Get support now.';
}

function buildPlan({ path, spiralText }) {
  const cleanText = safeWordLimit(spiralText || '', 28);

  if (path === 'CRISIS_ROUTE') {
    return {
      label: 'Crisis support',
      distortion: null,
      steps: [
        {
          type: 'action',
          text: 'If you might hurt yourself or someone else, stop this session and get immediate support from local emergency services or a trusted person right now.',
          button: 'Exit session',
        },
      ],
    };
  }

  if (path === 'SOLVE') {
    return {
      label: 'Actionable spiral',
      distortion: null,
      steps: [
        {
          type: 'prompt',
          text: 'Shrink it to the smallest solvable version (10 words).',
          default: cleanText || 'Smallest solvable version: ______',
        },
        {
          type: 'choice',
          text: 'Pick one next physical step:',
          options: [
            'Open the doc and write the first 2 sentences.',
            'Draft a 3-line email asking for what you need.',
            'Put one task on a 10-minute timer and begin.',
          ],
        },
        {
          type: 'timer_action',
          text: '2 minutes: do the smallest next physical step.',
          seconds: 120,
        },
      ],
    };
  }

  if (path === 'PARK') {
    return {
      label: 'Uncertainty spiral',
      distortion: null,
      steps: [
        {
          type: 'action',
          text: 'Park this worry for now.',
          button: 'Put it in the Worry Jar',
        },
        {
          type: 'choice',
          text: 'Pick an uncertainty line (no promises):',
          options: [
            'I can’t solve this right now; I can handle not knowing for a while.',
            'This is uncertainty, not danger. I can wait before reacting.',
            'I don’t know yet. I’ll return to this later—on purpose.',
          ],
        },
        {
          type: 'timer_action',
          text: '2 minutes: return-to-life action (tiny, physical).',
          seconds: 120,
        },
      ],
    };
  }

  if (path === 'CONNECT') {
    return {
      label: 'Relationship spiral',
      distortion: null,
      steps: [
        {
          type: 'choice',
          text: 'What’s the goal?',
          options: ['Clarity', 'Repair', 'Boundary', 'Reassurance request'],
        },
        {
          type: 'prompt',
          text: 'Use this 2-sentence script (edit if needed):',
          default:
            'When X happened, I felt Y. What I need next is Z (one clear request).',
        },
        {
          type: 'timer_action',
          text: '2 minutes: send it, or write it in Notes.',
          seconds: 120,
        },
      ],
    };
  }

  const distortion = chooseDistortion(spiralText);
  const safeDistortion = REFRAME_DISTORTIONS.includes(distortion) ? distortion : 'catastrophizing';

  return {
    label: 'Thinking-trap spiral',
    distortion: safeDistortion,
    steps: [
      {
        type: 'prompt',
        text: 'Tap 1 fact that supports the fear (one bullet).',
      },
      {
        type: 'prompt',
        text: 'Tap 1 fact that doesn’t support it (one bullet).',
      },
      {
        type: 'choice',
        text: 'Pick a balanced thought:',
        options: [
          'This is hard, not doomed.',
          'I don’t know yet—I’ll handle it step by step.',
          'Even if it goes badly, I can take the next right action.',
        ],
      },
      {
        type: 'timer_action',
        text: '2 minutes: do the smallest next physical step.',
        seconds: 120,
      },
    ],
  };
}

function actionTemplate({ emotion }) {
  if (emotion === 'worry') {
    return 'Set 2 minutes: write the first physical next step. Do only that.';
  }
  if (emotion === 'overwhelm') {
    return 'Set 2 minutes: pick the smallest task and start badly.';
  }
  if (emotion === 'shame') {
    return 'Set 2 minutes: write one honest sentence in Notes. Stop there.';
  }
  if (emotion === 'anger') {
    return 'Set 2 minutes: write the boundary you want. Then step away.';
  }
  // panic
  return 'Set 2 minutes: feet on floor. Name 5 things you see.';
}

/**
 * POST /api/v1/reset/plan
 * AI-powered router: analyzes spiral and returns personalized CBT intervention.
 */
exports.getPlan = async (req, res, next) => {
  try {
    const { emotion, intensity_pre, intensity_mid, free_text, spiral_text, quick_finish } = req.body || {};

    const safeEmotion = EMOTIONS.includes(emotion) ? emotion : 'worry';
    const safeIntensity = clamp(Number(intensity_pre ?? 7), 0, 10);
    const safeIntensityMid = intensity_mid === undefined || intensity_mid === null ? null : clamp(Number(intensity_mid), 0, 10);

    const spiralText = (spiral_text || free_text || '').toString().trim();
    const quickFinish = !!quick_finish;

    let userHistory = [];
    try {
      if (req.user?._id) {
        userHistory = await personalizationService.getUserSessionHistory(req.user._id, 5);
      }
    } catch (error) {
      logger.warn('Failed to fetch user history for personalization', error);
    }

    let plan;
    try {
      plan = await aiRouter.routeAndGenerate({
        spiralText,
        intensityPre: safeIntensity,
        userHistory,
        quickFinish,
      });
    } catch (error) {
      logger.error('AI router failed, using fallback', error);
      plan = aiRouter.getFallbackPlan({ path: 'REFRAME', spiralText, quickFinish });
      plan.path = 'REFRAME';
      plan.closure_line = 'You don\'t have to believe every thought to move forward.';
    }

    const recommendedObject = personalizationService.shouldUseAdaptiveRegulation({
      intensityPre: safeIntensity,
      userHistory,
    });

    const object = safeIntensity >= 8 || safeEmotion === 'panic' 
      ? 'grounding_tap' 
      : recommendedObject;

    const labelSummary = spiralText ? safeWordLimit(spiralText, 12) : '';

    res.status(200).json({
      success: true,
      data: {
        object,
        path: plan.path,
        label: plan.label,
        distortion: plan.distortion,
        steps: plan.steps,
        closure_line: plan.closure_line,
        label_summary: labelSummary,
        intensity_mid: safeIntensityMid,
        ai_reasoning: plan.ai_reasoning || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/reset/sessions
 */
exports.createSession = async (req, res, next) => {
  try {
    const {
      emotion,
      intensity_pre,
      intensity_mid,
      free_text,
      spiral_text,
      object,
      label_summary,
      next_action,
      quick_finish,
      path,
      label,
      distortion,
      steps,
      closure_line,
      events,
      cbt_answers,
      current_step,
    } = req.body || {};

    const safeEmotion = EMOTIONS.includes(emotion) ? emotion : 'worry';
    const intensityPre =
      intensity_pre === undefined || intensity_pre === null
        ? undefined
        : clamp(Number(intensity_pre), 0, 10);

    const pickedObject = OBJECTS.includes(object)
      ? object
      : chooseObject({ emotion: safeEmotion, intensityPre: intensityPre ?? 7 });

    const session = await ResetSession.create({
      user: req.user?._id,
      emotion: safeEmotion,
      intensityPre,
      intensityMid: intensity_mid !== undefined && intensity_mid !== null ? clamp(Number(intensity_mid), 0, 10) : undefined,
      freeText: free_text || null,
      spiralText: spiral_text || null,
      object: pickedObject,
      labelSummary: label_summary || null,
      nextAction: next_action || null,
      quickFinish: !!quick_finish,
      cbtPath: CBT_PATHS.includes(path) ? path : undefined,
      cbtLabel: label || null,
      cbtDistortion: distortion || null,
      cbtSteps: Array.isArray(steps) ? steps : undefined,
      cbtAnswers: cbt_answers && typeof cbt_answers === 'object' ? cbt_answers : undefined,
      closureLine: closure_line || null,
      currentStep: current_step || null,
      lastProgressAt: new Date(),
      events: Array.isArray(events) ? events : undefined,
      aiReasoning: req.body.ai_reasoning || null,
      aiGenerated: !!req.body.ai_generated,
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
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/reset/sessions/:id/progress
 * Persist partial state + append events continuously (captures drop-offs).
 */
exports.updateProgress = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid session id' });
    }

    const {
      intensity_pre,
      intensity_mid,
      intensity_post,
      confidence_post,
      action_done,
      duration_sec,
      object,
      fallback_used,
      spiral_text,
      quick_finish,
      path,
      label,
      distortion,
      steps,
      cbt_answers,
      closure_line,
      dropoff_step,
      current_step,
      summary_what_helped,
      summary_next_line,
      summary_skipped,
      events,
    } = req.body || {};

    const updates = {
      lastProgressAt: new Date(),
      durationSec: duration_sec !== undefined ? Number(duration_sec) : undefined,
      intensityPre: intensity_pre !== undefined ? clamp(Number(intensity_pre), 0, 10) : undefined,
      intensityMid: intensity_mid !== undefined ? clamp(Number(intensity_mid), 0, 10) : undefined,
      intensityPost: intensity_post !== undefined ? clamp(Number(intensity_post), 0, 10) : undefined,
      confidencePost: confidence_post !== undefined ? clamp(Number(confidence_post), 0, 10) : undefined,
      actionDone: action_done !== undefined ? !!action_done : undefined,
      fallbackUsed: fallback_used !== undefined ? !!fallback_used : undefined,
      object: OBJECTS.includes(object) ? object : undefined,
      spiralText: spiral_text !== undefined ? spiral_text : undefined,
      quickFinish: quick_finish !== undefined ? !!quick_finish : undefined,
      cbtPath: CBT_PATHS.includes(path) ? path : undefined,
      cbtLabel: label !== undefined ? label : undefined,
      cbtDistortion: distortion !== undefined ? distortion : undefined,
      cbtSteps: Array.isArray(steps) ? steps : undefined,
      cbtAnswers: cbt_answers && typeof cbt_answers === 'object' ? cbt_answers : undefined,
      closureLine: closure_line !== undefined ? closure_line : undefined,
      dropoffStep: dropoff_step !== undefined ? dropoff_step : undefined,
      currentStep: current_step !== undefined ? current_step : undefined,
      summaryWhatHelped: Array.isArray(summary_what_helped) ? summary_what_helped : undefined,
      summaryNextLine: summary_next_line !== undefined ? summary_next_line : undefined,
      summarySkipped: summary_skipped !== undefined ? !!summary_skipped : undefined,
    };

    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const updateDoc = { $set: updates };
    if (Array.isArray(events) && events.length > 0) {
      updateDoc.$push = { events: { $each: events } };
    }

    const session = await ResetSession.findById(id);

    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (session.user && !req.user?._id) {
      throw new AppError('Unauthorized', 401);
    }

    if (req.user?._id && session.user && session.user.toString() !== req.user._id.toString()) {
      throw new AppError('Forbidden', 403);
    }

    const updated = await ResetSession.findByIdAndUpdate(id, updateDoc, { new: true });

    res.status(200).json({
      success: true,
      data: {
        session: {
          id: updated._id,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/reset/sessions/:id/end
 */
exports.endSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      intensity_mid,
      intensity_post,
      confidence_post,
      action_done,
      duration_sec,
      object,
      fallback_used,
      label_summary,
      next_action,
      spiral_text,
      quick_finish,
      path,
      label,
      distortion,
      steps,
      closure_line,
      dropoff_step,
      events,
      cbt_answers,
      current_step,
      summary_what_helped,
      summary_next_line,
      summary_skipped,
    } = req.body || {};

    const updates = {
      endedAt: new Date(),
      durationSec: duration_sec !== undefined ? Number(duration_sec) : undefined,
      intensityMid: intensity_mid !== undefined ? clamp(Number(intensity_mid), 0, 10) : undefined,
      intensityPost: intensity_post !== undefined ? clamp(Number(intensity_post), 0, 10) : undefined,
      confidencePost: confidence_post !== undefined ? clamp(Number(confidence_post), 0, 10) : undefined,
      actionDone: action_done !== undefined ? !!action_done : undefined,
      fallbackUsed: fallback_used !== undefined ? !!fallback_used : undefined,
      object: OBJECTS.includes(object) ? object : undefined,
      labelSummary: label_summary !== undefined ? label_summary : undefined,
      nextAction: next_action !== undefined ? next_action : undefined,
      spiralText: spiral_text !== undefined ? spiral_text : undefined,
      quickFinish: quick_finish !== undefined ? !!quick_finish : undefined,
      cbtPath: CBT_PATHS.includes(path) ? path : undefined,
      cbtLabel: label !== undefined ? label : undefined,
      cbtDistortion: distortion !== undefined ? distortion : undefined,
      cbtSteps: Array.isArray(steps) ? steps : undefined,
      cbtAnswers: cbt_answers && typeof cbt_answers === 'object' ? cbt_answers : undefined,
      closureLine: closure_line !== undefined ? closure_line : undefined,
      dropoffStep: dropoff_step !== undefined ? dropoff_step : undefined,
      currentStep: current_step !== undefined ? current_step : undefined,
      summaryWhatHelped: Array.isArray(summary_what_helped) ? summary_what_helped : undefined,
      summaryNextLine: summary_next_line !== undefined ? summary_next_line : undefined,
      summarySkipped: summary_skipped !== undefined ? !!summary_skipped : undefined,
      lastProgressAt: new Date(),
    };

    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const updateDoc = { $set: updates };
    if (Array.isArray(events) && events.length > 0) {
      updateDoc.$push = { events: { $each: events } };
    }

    const existing = await ResetSession.findById(id);

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }

    if (existing.user && !req.user?._id) {
      throw new AppError('Unauthorized', 401);
    }

    if (req.user?._id && existing.user && existing.user.toString() !== req.user._id.toString()) {
      throw new AppError('Forbidden', 403);
    }

    const session = await ResetSession.findByIdAndUpdate(id, updateDoc, { new: true });

    res.status(200).json({
      success: true,
      data: {
        session: {
          id: session._id,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/reset/sessions/end
 * Fallback end event when client couldn't create a session id.
 */
exports.endSessionNoId = async (req, res, next) => {
  try {
    const {
      emotion,
      intensity_pre,
      intensity_mid,
      intensity_post,
      confidence_post,
      action_done,
      duration_sec,
      object,
      fallback_used,
      spiral_text,
      quick_finish,
      path,
      label,
      distortion,
      steps,
      cbt_answers,
      closure_line,
      dropoff_step,
      current_step,
      summary_what_helped,
      summary_next_line,
      summary_skipped,
      events,
    } = req.body || {};

    const safeEmotion = EMOTIONS.includes(emotion) ? emotion : 'worry';

    const session = await ResetSession.create({
      emotion: safeEmotion,
      intensityPre: intensity_pre !== undefined ? clamp(Number(intensity_pre), 0, 10) : undefined,
      intensityMid: intensity_mid !== undefined ? clamp(Number(intensity_mid), 0, 10) : undefined,
      intensityPost: intensity_post !== undefined ? clamp(Number(intensity_post), 0, 10) : undefined,
      confidencePost: confidence_post !== undefined ? clamp(Number(confidence_post), 0, 10) : undefined,
      durationSec: duration_sec !== undefined ? Number(duration_sec) : undefined,
      actionDone: action_done !== undefined ? !!action_done : undefined,
      fallbackUsed: fallback_used !== undefined ? !!fallback_used : undefined,
      object: OBJECTS.includes(object) ? object : undefined,
      spiralText: spiral_text || null,
      quickFinish: quick_finish !== undefined ? !!quick_finish : false,
      cbtPath: CBT_PATHS.includes(path) ? path : undefined,
      cbtLabel: label || null,
      cbtDistortion: distortion || null,
      cbtSteps: Array.isArray(steps) ? steps : undefined,
      cbtAnswers: cbt_answers && typeof cbt_answers === 'object' ? cbt_answers : undefined,
      closureLine: closure_line || null,
      dropoffStep: dropoff_step || null,
      currentStep: current_step || null,
      summaryWhatHelped: Array.isArray(summary_what_helped) ? summary_what_helped : undefined,
      summaryNextLine: summary_next_line || null,
      summarySkipped: summary_skipped !== undefined ? !!summary_skipped : undefined,
      events: Array.isArray(events) ? events : undefined,
      lastProgressAt: new Date(),
      startedAt: new Date(),
      endedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      data: {
        session: {
          id: session._id,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
