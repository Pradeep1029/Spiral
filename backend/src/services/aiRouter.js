const OpenAI = require('openai');
const logger = require('../config/logger');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getChatModelPrimary() {
  return process.env.OPENAI_CHAT_MODEL || 'gpt-5.2';
}

function getChatModelFallback() {
  return process.env.OPENAI_CHAT_FALLBACK_MODEL || 'gpt-4o-mini';
}

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

const PATH_SCHEMA = {
  type: 'object',
  required: ['path', 'label', 'steps'],
  properties: {
    path: {
      type: 'string',
      enum: ['SOLVE', 'REFRAME', 'PARK', 'CONNECT'],
    },
    label: {
      type: 'string',
      maxLength: 50,
    },
    distortion: {
      type: 'string',
      enum: ['catastrophizing', 'mind_reading', 'self_attack', 'all_or_nothing', 'fortune_telling'],
    },
    steps: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        required: ['type', 'text'],
        properties: {
          type: {
            type: 'string',
            enum: ['prompt', 'choice', 'action', 'timer_action'],
          },
          text: {
            type: 'string',
            maxLength: 200,
          },
          options: {
            type: 'array',
            items: { type: 'string' },
          },
          seconds: {
            type: 'number',
          },
          button: {
            type: 'string',
          },
        },
      },
    },
  },
};

function detectCrisis(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return false;
  return CRISIS_KEYWORDS.some((keyword) => t.includes(keyword));
}

function validatePathOutput(data) {
  if (!data || typeof data !== 'object') return false;
  if (!['SOLVE', 'REFRAME', 'PARK', 'CONNECT'].includes(data.path)) return false;
  if (!data.label || typeof data.label !== 'string') return false;
  if (!Array.isArray(data.steps) || data.steps.length !== 3) return false;

  for (const step of data.steps) {
    if (!step.type || !step.text) return false;
    if (!['prompt', 'choice', 'action', 'timer_action'].includes(step.type)) return false;
    if (step.type === 'choice' && (!Array.isArray(step.options) || step.options.length < 2)) return false;
  }

  return true;
}

async function selectPathWithAI({ spiralText, intensityPre, userHistory = [] }) {
  const systemPrompt = `You are a CBT intervention router for Unspiral, an app that helps people with nighttime anxiety spirals.

Your job: Analyze the user's spiral and choose ONE of these 4 intervention paths:

1. SOLVE - For actionable problems with clear next steps
   - Use when: spiral mentions tasks, deadlines, emails, calls, things to do
   - Examples: "I need to finish this report", "I have to call them tomorrow"

2. REFRAME - For thinking traps and cognitive distortions
   - Use when: catastrophizing, mind-reading, all-or-nothing thinking, fortune-telling
   - Examples: "I'm going to fail", "Everyone thinks I'm stupid", "It's ruined"

3. PARK - For uncertain/hypothetical worries with no clear action
   - Use when: "what if", uncertainty, hypothetical scenarios
   - Examples: "What if they don't like me", "Maybe I made a mistake"

4. CONNECT - For relationship spirals needing communication
   - Use when: mentions people, relationships, conflicts, boundaries
   - Examples: "They ignored my text", "I need to set a boundary"

CRITICAL RULES:
- NEVER diagnose or give medical advice
- NEVER promise certainty ("you'll be fine", "it will work out")
- NEVER be overly reassuring
- Keep interventions practical and grounded
- Focus on what the user CAN control right now

Output ONLY valid JSON matching this exact structure:
{
  "path": "SOLVE|REFRAME|PARK|CONNECT",
  "reasoning": "One sentence explaining why this path fits"
}`;

  const userHistorySummary = userHistory.length > 0
    ? `\n\nUser's recent session history (last 5 sessions):\n${userHistory.map((s) => `- Path: ${s.path}, Intensity drop: ${s.intensityDrop}, Worked: ${s.worked ? 'Yes' : 'No'}`).join('\n')}`
    : '';

  const userPrompt = `Spiral text: "${spiralText}"
Intensity (0-10): ${intensityPre}${userHistorySummary}

Choose the best intervention path and explain why in one sentence.`;

  const modelPrimary = getChatModelPrimary();
  const modelFallback = getChatModelFallback();

  const request = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 150,
    response_format: { type: 'json_object' },
  };

  try {
    let response;
    try {
      response = await openai.chat.completions.create({
        model: modelPrimary,
        ...request,
      });
    } catch (err) {
      logger.warn('Primary chat model failed for routing, trying fallback', {
        modelPrimary,
        modelFallback,
        error: err?.message,
      });
      response = await openai.chat.completions.create({
        model: modelFallback,
        ...request,
      });
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
      logger.warn('AI router returned empty response');
      return null;
    }

    const parsed = JSON.parse(content);
    if (!parsed.path || !['SOLVE', 'REFRAME', 'PARK', 'CONNECT'].includes(parsed.path)) {
      logger.warn('AI router returned invalid path', { parsed });
      return null;
    }

    return {
      path: parsed.path,
      reasoning: parsed.reasoning || '',
    };
  } catch (error) {
    logger.error('AI router error:', error);
    return null;
  }
}

async function generateCBTSteps({ path, spiralText, intensityPre, quickFinish = false }) {
  const pathPrompts = {
    SOLVE: `Generate a 3-step SOLVE intervention for this actionable spiral.

Step 1: Prompt user to shrink the problem to 10 words or less
Step 2: Offer 3 specific physical actions they can take (choice)
Step 3: 2-minute timer to do the smallest action (timer_action)

Keep it practical, specific, and grounded. No vague advice.`,

    REFRAME: `Generate a 3-step REFRAME intervention for this thinking trap.

Step 1: Prompt for one fact that SUPPORTS the fear (prompt)
Step 2: Prompt for one fact that DOESN'T support it (prompt)
Step 3: Offer 3 balanced thought options (choice)

Identify the cognitive distortion (catastrophizing, mind_reading, self_attack, all_or_nothing, fortune_telling).
Keep it evidence-based, not reassuring.`,

    PARK: `Generate a 3-step PARK intervention for this uncertain worry.

Step 1: Action to "park" the worry (action with button text)
Step 2: Offer 3 uncertainty acceptance lines (choice)
Step 3: 2-minute timer for a return-to-life action (timer_action)

Focus on accepting uncertainty, not solving it.`,

    CONNECT: `Generate a 3-step CONNECT intervention for this relationship spiral.

Step 1: Choice of communication goal (Clarity, Repair, Boundary, Reassurance)
Step 2: Prompt for a 2-sentence communication script (prompt)
Step 3: 2-minute timer to send it or save to notes (timer_action)

Keep it about clear communication, not mind-reading or assumptions.`,
  };

  const systemPrompt = `You are a CBT intervention generator for Unspiral.

${pathPrompts[path]}

Output ONLY valid JSON matching this structure:
{
  "label": "Short label for this spiral type (max 50 chars)",
  "distortion": "catastrophizing|mind_reading|self_attack|all_or_nothing|fortune_telling" (ONLY for REFRAME path),
  "steps": [
    {
      "type": "prompt|choice|action|timer_action",
      "text": "The instruction or question (max 200 chars)",
      "options": ["option1", "option2", "option3"] (ONLY for choice type),
      "seconds": 120 (ONLY for timer_action type),
      "button": "Button text" (ONLY for action type)
    }
  ]
}

CRITICAL RULES:
- NEVER diagnose or give medical advice
- NEVER promise outcomes or certainty
- NEVER be overly reassuring
- Keep language direct and grounded
- Focus on what user can control NOW
- Timer actions are always 120 seconds (or 60 if quick_finish)
- Exactly 3 steps, no more, no less`;

  const userPrompt = `Spiral: "${spiralText}"
Intensity: ${intensityPre}/10
Quick finish mode: ${quickFinish ? 'Yes (use 60s timers)' : 'No (use 120s timers)'}

Generate the ${path} intervention.`;

  const modelPrimary = getChatModelPrimary();
  const modelFallback = getChatModelFallback();

  const request = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.4,
    max_tokens: 500,
    response_format: { type: 'json_object' },
  };

  try {
    let response;
    try {
      response = await openai.chat.completions.create({
        model: modelPrimary,
        ...request,
      });
    } catch (err) {
      logger.warn('Primary chat model failed for CBT generation, trying fallback', {
        modelPrimary,
        modelFallback,
        error: err?.message,
      });
      response = await openai.chat.completions.create({
        model: modelFallback,
        ...request,
      });
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
      logger.warn('AI CBT generator returned empty response');
      return null;
    }

    const parsed = JSON.parse(content);

    if (!validatePathOutput({ ...parsed, path })) {
      logger.warn('AI CBT generator returned invalid structure', { parsed });
      return null;
    }

    if (quickFinish && parsed.steps) {
      parsed.steps = parsed.steps.map((step) => {
        if (step.type === 'timer_action') {
          return { ...step, seconds: 60 };
        }
        return step;
      });
    }

    return parsed;
  } catch (error) {
    logger.error('AI CBT generator error:', error);
    return null;
  }
}

function getFallbackPlan({ path, spiralText, quickFinish = false }) {
  const timerSeconds = quickFinish ? 60 : 120;

  const fallbacks = {
    SOLVE: {
      label: 'Actionable spiral',
      distortion: null,
      steps: [
        {
          type: 'prompt',
          text: 'Shrink it to the smallest solvable version (10 words).',
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
          text: `${timerSeconds / 60} minutes: do the smallest next physical step.`,
          seconds: timerSeconds,
        },
      ],
    },
    REFRAME: {
      label: 'Thinking-trap spiral',
      distortion: 'catastrophizing',
      steps: [
        {
          type: 'prompt',
          text: 'Tap 1 fact that supports the fear (one bullet).',
        },
        {
          type: 'prompt',
          text: 'Tap 1 fact that doesn\'t support it (one bullet).',
        },
        {
          type: 'choice',
          text: 'Pick a balanced thought:',
          options: [
            'This is hard, not doomed.',
            'I don\'t know yet—I\'ll handle it step by step.',
            'Even if it goes badly, I can take the next right action.',
          ],
        },
      ],
    },
    PARK: {
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
            'I can\'t solve this right now; I can handle not knowing for a while.',
            'This is uncertainty, not danger. I can wait before reacting.',
            'I don\'t know yet. I\'ll return to this later—on purpose.',
          ],
        },
        {
          type: 'timer_action',
          text: `${timerSeconds / 60} minutes: return-to-life action (tiny, physical).`,
          seconds: timerSeconds,
        },
      ],
    },
    CONNECT: {
      label: 'Relationship spiral',
      distortion: null,
      steps: [
        {
          type: 'choice',
          text: 'What\'s the goal?',
          options: ['Clarity', 'Repair', 'Boundary', 'Reassurance request'],
        },
        {
          type: 'prompt',
          text: 'Use this 2-sentence script (edit if needed): "When X happened, I felt Y. What I need next is Z."',
        },
        {
          type: 'timer_action',
          text: `${timerSeconds / 60} minutes: send it, or write it in Notes.`,
          seconds: timerSeconds,
        },
      ],
    },
  };

  return fallbacks[path] || fallbacks.REFRAME;
}

async function routeAndGenerate({ spiralText, intensityPre, userHistory = [], quickFinish = false }) {
  if (detectCrisis(spiralText)) {
    return {
      path: 'CRISIS_ROUTE',
      label: 'Crisis support',
      distortion: null,
      steps: [
        {
          type: 'action',
          text: 'If you might hurt yourself or someone else, stop this session and get immediate support from local emergency services or a trusted person right now.',
          button: 'Exit session',
        },
      ],
      closure_line: 'Pause. Get support now.',
    };
  }

  let selectedPath = null;
  try {
    selectedPath = await selectPathWithAI({ spiralText, intensityPre, userHistory });
  } catch (error) {
    logger.error('Path selection failed, using fallback', error);
  }

  const path = selectedPath?.path || 'REFRAME';

  let generatedSteps = null;
  try {
    generatedSteps = await generateCBTSteps({ path, spiralText, intensityPre, quickFinish });
  } catch (error) {
    logger.error('CBT step generation failed, using fallback', error);
  }

  const plan = generatedSteps || getFallbackPlan({ path, spiralText, quickFinish });

  const closureLines = {
    SOLVE: 'You\'re back in control of the next step.',
    REFRAME: 'You don\'t have to believe every thought to move forward.',
    PARK: 'You can handle not knowing for now.',
    CONNECT: 'Clarity beats rumination—one honest sentence is enough.',
  };

  return {
    path,
    label: plan.label,
    distortion: plan.distortion || null,
    steps: plan.steps,
    closure_line: closureLines[path] || 'You did something for yourself.',
    ai_reasoning: selectedPath?.reasoning || null,
  };
}

module.exports = {
  detectCrisis,
  selectPathWithAI,
  generateCBTSteps,
  getFallbackPlan,
  routeAndGenerate,
  validatePathOutput,
};
