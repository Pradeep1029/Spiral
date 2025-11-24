const OpenAI = require('openai');
const logger = require('../config/logger');
const SessionStep = require('../models/SessionStep');
const Session = require('../models/Session');

// Initialize OpenAI client
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// System prompt for step-based flow
const STEP_SYSTEM_PROMPT = `You are Unspiral's AI Flow Director. Your job is to guide users through a personalized, step-by-step rescue flow when they're spiraling at night.

CRITICAL: You output JSON step objects, NOT conversational messages.

Core Principles:
1. One step at a time - Each step is a single, focused task
2. Adaptive flow - Choose steps based on: user profile, previous answers, intensity, time, sleep context
3. Efficient - Aim for 5-7 steps total per session (not 20)
4. Empathetic copy - All titles/descriptions are warm, validating, and simple
5. Safety first - If user mentions crisis/self-harm, immediately return a crisis_info step

Flow Strategy:
- START: intro → intensity_scale → dump_text/dump_voice
- AFTER DUMP: Classify their spiral, then choose intervention path:
  - High anxiety + sleep context → breathing → self_compassion_script → sleep_wind_down
  - Self-critical + not sleepy → cbt_question (2-3) → reframe_review → action_plan
  - Mixed/overwhelmed → grounding_5_4_3_2_1 → choice_buttons → branch accordingly
- END: Always finish with summary

🎯 CRITICAL PERSONALIZATION RULES:
1. In CBT questions: Reference user's SPECIFIC worry topics (money, relationships, work, etc.)
   - BAD: "What evidence do you have for that thought?"
   - GOOD: "What actual evidence do you have that you'll run out of money?" (if their topic is money)
2. In titles/descriptions: Acknowledge their specific patterns
   - If they obsess over mistakes: "Let's look at that mistake differently"
   - If they worry about tomorrow: "Ground yourself in this moment"
3. In reframes: Address their ACTUAL stated worry, not generic anxiety
4. Keep language conversational, specific, and validating

Available Step Types:
- intro: Welcome, orientation
- intensity_scale: 1-10 slider
- breathing: Guided breathing animation
- grounding_5_4_3_2_1: Sensory grounding
- dump_text: Vent in text
- dump_voice: Voice vent
- choice_buttons: Let user steer ("Calm body" vs "Unpack thought")
  REQUIRED: Must include "choices" array in ui.props with format: [{id: "choice_1", label: "Label", description?: "optional"}]
- cbt_question: One targeted CBT question
- reframe_review: Show balanced thought, let them tweak
- self_compassion_script: Practice kind phrase
- sleep_choice: Sleep vs action plan
- sleep_wind_down: Cognitive shuffle + breathing for sleep
- action_plan: One tiny next step
- summary: What they did, emotional close
- crisis_info: Safety message (only if crisis detected)

Personalization:
- If user hates breathing (from profile), use grounding instead
- If user prefers logic, lean into CBT questions
- If user responds well to self-compassion, use more of it
- Adjust step count based on intensity (lower intensity = fewer steps)

Output Format:
Always return valid JSON matching this schema:
{
  "step_id": "unique-id",
  "step_type": "string",
  "title": "string",
  "subtitle": "string|null",
  "description": "string|null",
  "ui": {
    "component": "string",
    "props": {}
  },
  "skippable": boolean,
  "primary_cta": {
    "label": "string",
    "action": "next_step"
  },
  "secondary_cta": {
    "label": "string",
    "action": "skip_step"
  } | null,
  "meta": {
    "intervention_type": "string|null",
    "estimated_duration_sec": number,
    "show_progress": boolean,
    "step_index": number,
    "step_count": number
  }
}

IMPORTANT: Respond ONLY with the JSON step object. No explanations, no markdown code blocks, just raw JSON.`;

/**
 * Generate next step in the flow
 */
async function generateNextStep(sessionId, userId, userProfile = {}) {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    // Get session and previous steps
    const session = await Session.findById(sessionId);
    const previousSteps = await SessionStep.find({ session: sessionId })
      .sort({ stepIndex: 1 });

    // Build context for AI
    const context = buildStepContext(session, previousSteps, userProfile);

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: STEP_SYSTEM_PROMPT },
        { role: 'user', content: context },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const stepJSON = JSON.parse(response.choices[0].message.content);

    // Validate and enrich step
    const enrichedStep = enrichStep(stepJSON, previousSteps.length, session);

    return enrichedStep;
  } catch (error) {
    logger.error('Error generating step:', error);
    throw error;
  }
}

/**
 * Build context string for AI to generate next step
 */
function buildStepContext(session, previousSteps, userProfile) {
  const lines = [];

  // Session context
  lines.push(`Session Context: ${session.context}`);
  if (session.topic) lines.push(`Topic: ${session.topic}`);
  if (session.emotion) lines.push(`Emotion: ${session.emotion}`);
  if (session.initialIntensity) lines.push(`Initial Intensity: ${session.initialIntensity}/10`);
  if (session.sleepRelated) lines.push(`Sleep context: User is trying to sleep`);

  // User onboarding data - CRITICAL CONTEXT
  if (userProfile.onboarding) {
    const onb = userProfile.onboarding;
    lines.push(`\n=== USER'S SPIRAL PATTERNS ===`);
    
    if (onb.spiralPatterns && onb.spiralPatterns.length > 0) {
      lines.push(`Common patterns: ${onb.spiralPatterns.join(', ')}`);
      // Add specific advice based on patterns
      if (onb.spiralPatterns.includes('replay_conversations')) {
        lines.push(`⚠️ User replays conversations - address rumination`);
      }
      if (onb.spiralPatterns.includes('obsess_mistakes')) {
        lines.push(`⚠️ User obsesses over mistakes - use CBT reframe`);
      }
      if (onb.spiralPatterns.includes('worry_tomorrow')) {
        lines.push(`⚠️ User worries about tomorrow - ground in present`);
      }
      if (onb.spiralPatterns.includes('failure_thoughts')) {
        lines.push(`⚠️ User has failure thoughts - counter with self-compassion`);
      }
    }
    
    if (onb.spiralTopics && onb.spiralTopics.length > 0) {
      lines.push(`\n=== USER'S WORRY TOPICS ===`);
      lines.push(`Main worries: ${onb.spiralTopics.join(', ')}`);
      lines.push(`🎯 IMPORTANT: Reference these topics specifically in your interventions!`);
      
      // Give specific guidance
      if (onb.spiralTopics.includes('money')) {
        lines.push(`- Money stress: Ask about specific financial worry, validate stress, help separate catastrophic thoughts from reality`);
      }
      if (onb.spiralTopics.includes('relationships')) {
        lines.push(`- Relationship concerns: Address fear of conflict/rejection, validate feelings`);
      }
      if (onb.spiralTopics.includes('work')) {
        lines.push(`- Work stress: Address perfectionism, fear of failure, validation of effort`);
      }
      if (onb.spiralTopics.includes('health')) {
        lines.push(`- Health anxiety: Ground catastrophic thinking, differentiate worry from facts`);
      }
    }
    
    if (onb.spiralTiming) {
      lines.push(`\nSpiral timing: ${onb.spiralTiming}`);
    }
  }

  // User preferences
  lines.push(`\n=== USER PREFERENCES ===`);
  if (userProfile.hatesBreathingExercises) {
    lines.push(`- Dislikes breathing exercises → use grounding instead`);
  }
  if (userProfile.prefersLogicOverVisualization) {
    lines.push(`- Prefers logical/CBT approach → more questions, less imagery`);
  }
  if (userProfile.likesSelfCompassion) {
    lines.push(`- Responds well to self-compassion → include kind phrases`);
  }

  // Previous steps
  if (previousSteps.length === 0) {
    lines.push(`\nThis is the FIRST step. Start with an intro step.`);
  } else {
    lines.push(`\nPrevious steps (${previousSteps.length}):`);
    previousSteps.forEach((step, idx) => {
      lines.push(`${idx + 1}. ${step.stepType}${step.answer ? `: ${summarizeAnswer(step)}` : ''}`);
    });

    lines.push(`\nGenerate the NEXT step (step ${previousSteps.length + 1}).`);
    
    // Give hints based on where we are
    if (previousSteps.length === 1) {
      lines.push(`Hint: After intro, get a baseline intensity rating.`);
    } else if (previousSteps.length === 2) {
      lines.push(`Hint: Let them vent (dump_text or dump_voice).`);
    } else if (previousSteps.length === 3) {
      lines.push(`Hint: Classify their spiral and choose intervention path.`);
    } else if (previousSteps.length >= 6) {
      lines.push(`Hint: Consider wrapping up soon with a summary step.`);
    }
  }

  return lines.join('\n');
}

/**
 * Summarize step answer for AI context
 */
function summarizeAnswer(step) {
  if (!step.answer) return '';

  const { stepType, answer } = step;

  switch (stepType) {
    case 'intensity_scale':
      return `rated ${answer.value}/10`;
    case 'dump_text':
      return answer.text ? `"${answer.text.substring(0, 100)}..."` : '';
    case 'choice_buttons':
      return `chose "${answer.choice_id}"`;
    case 'cbt_question':
      return answer.response ? `"${answer.response.substring(0, 80)}..."` : '';
    case 'breathing':
    case 'grounding_5_4_3_2_1':
    case 'sleep_wind_down':
      return answer.completed ? 'completed' : 'skipped';
    default:
      return JSON.stringify(answer).substring(0, 50);
  }
}

/**
 * Enrich step with defaults and validation
 */
function enrichStep(stepJSON, stepIndex, session) {
  // Ensure required fields
  if (!stepJSON.step_id) {
    stepJSON.step_id = `step-${Date.now()}`;
  }

  if (!stepJSON.meta) {
    stepJSON.meta = {};
  }

  stepJSON.meta.step_index = stepIndex + 1;
  
  // Default estimated total steps
  if (!stepJSON.meta.step_count) {
    stepJSON.meta.step_count = Math.max(5, stepIndex + 3);
  }

  // Default show_progress
  if (stepJSON.meta.show_progress === undefined) {
    stepJSON.meta.show_progress = stepJSON.step_type !== 'crisis_info';
  }

  // Default CTA
  if (!stepJSON.primary_cta) {
    stepJSON.primary_cta = { label: 'Next', action: 'next_step' };
  }

  // Skippable defaults
  if (stepJSON.skippable === undefined) {
    stepJSON.skippable = ['breathing', 'grounding_5_4_3_2_1'].includes(stepJSON.step_type);
  }

  // Validate choice_buttons has choices
  if (stepJSON.step_type === 'choice_buttons') {
    if (!stepJSON.ui) stepJSON.ui = {};
    if (!stepJSON.ui.props) stepJSON.ui.props = {};
    if (!stepJSON.ui.props.choices || stepJSON.ui.props.choices.length === 0) {
      // Provide default choices
      stepJSON.ui.props.choices = [
        { id: 'calm_body', label: 'Calm my body first', description: 'Breathing or grounding' },
        { id: 'unpack_thought', label: 'Unpack the thought', description: 'Question what I\'m telling myself' },
      ];
    }
  }

  // Validate breathing has breath_count
  if (stepJSON.step_type === 'breathing') {
    if (!stepJSON.ui) stepJSON.ui = {};
    if (!stepJSON.ui.props) stepJSON.ui.props = {};
    if (!stepJSON.ui.props.breath_count) {
      stepJSON.ui.props.breath_count = 4;
    }
    if (!stepJSON.ui.props.inhale_sec) {
      stepJSON.ui.props.inhale_sec = 4;
    }
    if (!stepJSON.ui.props.exhale_sec) {
      stepJSON.ui.props.exhale_sec = 6;
    }
  }

  return stepJSON;
}

/**
 * Detect if answer contains crisis language
 */
function detectCrisis(answer) {
  const text = JSON.stringify(answer).toLowerCase();
  const crisisKeywords = [
    'kill myself',
    'end my life',
    'suicide',
    'suicidal',
    'hurt myself',
    'self harm',
    'self-harm',
    'don\'t want to live',
    'better off dead',
  ];

  return crisisKeywords.some(keyword => text.includes(keyword));
}

/**
 * Generate crisis info step
 */
function generateCrisisStep(stepIndex) {
  return {
    step_id: 'crisis-1',
    step_type: 'crisis_info',
    title: "I'm really glad you said something.",
    subtitle: "But Unspiral can't keep you safe in an emergency.",
    description: "If you are in immediate danger or thinking about acting on these thoughts, please contact your local emergency number (like 911 in the U.S.) or a crisis hotline right now.\n\nYou deserve real, human help for this level of pain.",
    ui: { component: 'info_card', props: {} },
    skippable: false,
    primary_cta: { label: 'Back to home', action: 'end_flow' },
    secondary_cta: null,
    meta: {
      intervention_type: 'crisis',
      estimated_duration_sec: 20,
      show_progress: false,
      step_index: stepIndex + 1,
      step_count: stepIndex + 1,
    },
  };
}

module.exports = {
  generateNextStep,
  detectCrisis,
  generateCrisisStep,
};
