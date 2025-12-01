const OpenAI = require('openai');
const logger = require('../config/logger');
const SessionStep = require('../models/SessionStep');
const Session = require('../models/Session');
const { classifySpiral } = require('./spiralClassifier');
const { generateMicroPlan, getCurrentMethod } = require('./microPlanGenerator');

// Initialize OpenAI client
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * UPGRADED: Generate next step using multi-dimensional classification + method-based flow
 */
async function generateNextStep(sessionId, userId, userProfile = {}) {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const session = await Session.findById(sessionId);
    const previousSteps = await SessionStep.find({ session: sessionId })
      .sort({ stepIndex: 1 });

    logger.info('generateNextStep: loaded session and previous steps', {
      sessionId,
      userId,
      previousStepCount: previousSteps.length,
    });

    // STAGE 1: Initial steps (intro, intensity, dump)
    if (previousSteps.length === 0) {
      logger.info('generateNextStep: returning intro step', { sessionId });
      return createIntroStep(session, previousSteps.length);
    }

    if (previousSteps.length === 1) {
      logger.info('generateNextStep: returning intensity_scale step', { sessionId });
      return createIntensityScaleStep(session, previousSteps.length);
    }

    if (previousSteps.length === 2) {
      logger.info('generateNextStep: returning initial dump_text step', { sessionId });
      return createDumpTextStep(session, previousSteps.length);
    }

    // STAGE 2: Classification (after dump)
    if (!session.classification) {
      logger.info('generateNextStep: running classification', { sessionId });
      await runClassification(session, previousSteps, userProfile);
    }

    // STAGE 3: Micro plan generation (after classification)
    if (!session.microPlan || session.microPlan.length === 0) {
      const microPlan = await generateMicroPlan(session.classification, userProfile);
      session.microPlan = microPlan;
      session.currentMethodIndex = 0;
      await session.save();
      logger.info('Generated micro plan', { sessionId, microPlan });
    }

    // STAGE 4: Step realization from current method
    const { currentMethod, methodStage, isComplete } = getCurrentMethod(session);

    logger.info('generateNextStep: current method state', {
      sessionId,
      currentMethod,
      methodStage,
      isComplete,
    });

    if (isComplete) {
      // Shouldn't happen, but safety check
      return createSummaryStep(session, previousSteps, userProfile);
    }

    // Realize step from method using LLM
    logger.info('generateNextStep: calling realizeStepFromMethod', {
      sessionId,
      currentMethod,
      methodStage,
    });

    const step = await realizeStepFromMethod(
      session,
      previousSteps,
      userProfile,
      currentMethod,
      methodStage
    );

    logger.info('generateNextStep: realized step from method', {
      sessionId,
      stepType: step.step_type,
      interventionType: step.meta?.intervention_type,
    });

    return step;
  } catch (error) {
    logger.error('Error generating step:', error);
    throw error;
  }
}

/**
 * Run classification and save to session
 */
async function runClassification(session, previousSteps, userProfile) {
  // Get user's vent text
  const dumpStep = previousSteps.find(s => s.stepType === 'dump_text' || s.stepType === 'dump_voice');
  const userText = dumpStep?.answer?.text || dumpStep?.answer?.transcript || 'User is spiraling';

  // Determine session context
  const sessionContext = {
    timeOfDay: getTimeOfDay(),
    sleepRelated: session.sleepRelated || false,
    initialIntensity: session.initialIntensity,
  };

  // Classify
  const classification = await classifySpiral(userText, userProfile, sessionContext);

  // Save to session
  session.classification = classification;
  await session.save();

  logger.info('Session classified', {
    sessionId: session._id,
    thoughtForm: classification.thoughtForm,
    intensity: classification.intensity,
  });
}

/**
 * Realize a step from a method label using LLM
 */
async function realizeStepFromMethod(session, previousSteps, userProfile, currentMethod, methodStage) {
  const context = buildMethodContext(session, previousSteps, userProfile, currentMethod, methodStage);

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: FLOW_DIRECTOR_SYSTEM_PROMPT },
      { role: 'user', content: context },
    ],
    temperature: 0.7,
    max_tokens: 1200,
    response_format: { type: 'json_object' },
  });

  const stepJSON = JSON.parse(response.choices[0].message.content);

  // Enrich and validate
  const enrichedStep = enrichStep(stepJSON, previousSteps.length, session, currentMethod);

  return enrichedStep;
}

/**
 * Build context for LLM to realize a step from a method
 */
function buildMethodContext(session, previousSteps, userProfile, currentMethod, methodStage) {
  const lines = [];

  lines.push('=== USER PROFILE ===');
  if (userProfile.onboarding) {
    const onb = userProfile.onboarding;
    if (onb.spiralPatterns?.length) {
      lines.push(`Typical spiral patterns: ${onb.spiralPatterns.join(', ')}`);
    }
    if (onb.spiralTopics?.length) {
      lines.push(`Common topics: ${onb.spiralTopics.join(', ')}`);
    }
    if (onb.emotionalFlavors?.length) {
      lines.push(`Emotional flavors: ${onb.emotionalFlavors.join(', ')}`);
    }
    if (onb.helpPreference) {
      lines.push(`Preferred help style: ${onb.helpPreference}`);
    }
    if (onb.effortTolerance) {
      lines.push(`Effort tolerance: ${onb.effortTolerance}`);
    }
  }

  if (userProfile.profile?.hatesBreathingExercises) {
    lines.push('⚠️ User dislikes breathing exercises');
  }

  lines.push('\n=== CURRENT SESSION CLASSIFICATION ===');
  if (session.classification) {
    const c = session.classification;
    const topTopics = Object.entries(c.topics || {})
      .filter(([_, weight]) => weight > 0.3)
      .map(([topic, weight]) => `${topic}: ${weight.toFixed(1)}`)
      .join(', ');

    if (topTopics) lines.push(`Topics (weights): ${topTopics}`);
    lines.push(`Thought form: ${c.thoughtForm}`);
    if (c.primaryEmotions?.length) {
      lines.push(`Emotions: ${c.primaryEmotions.join(', ')}`);
    }
    lines.push(`Intensity: ${c.intensity} / 10`);
    lines.push(`Context: ${c.context?.timeOfDay}, sleep_related = ${c.context?.sleepRelated}`);
    lines.push(`Cognitive capacity: ${c.cognitiveCapacity}`);
    if (c.context?.acuteTrigger) {
      lines.push(`Acute trigger: "${c.context.acuteTrigger}"`);
    }
  }

  lines.push('\n=== SESSION HISTORY ===');
  if (previousSteps.length > 0) {
    lines.push('Steps so far:');
    previousSteps.forEach((step, idx) => {
      const summary = summarizeStep(step);
      lines.push(`${idx + 1}. ${step.stepType}: ${summary}`);
    });
  }

  lines.push('\n=== CURRENT METHOD + STAGE ===');
  lines.push(`Current method: ${currentMethod}`);
  lines.push(`Stage: ${methodStage}`);
  lines.push(`Step number: ${previousSteps.length + 1}`);

  lines.push('\n=== YOUR TASK ===');
  lines.push(getMethodInstructions(currentMethod, methodStage, session, userProfile));

  return lines.join('\n');
}

/**
 * Get specific instructions for each method
 */
function getMethodInstructions(method, stage, session, userProfile) {
  const effortTolerance = userProfile.onboarding?.effortTolerance;
  const keepShort = effortTolerance === 'keep_it_short_at_night';

  switch (method) {
    case 'breathing':
      return `Generate a "breathing" step with:
- Title acknowledging their state
- Subtitle explaining why breathing helps (brief)
- ui.component: "BreathingExercise"
- ui.props: { breath_count: 4, inhale_sec: 4, exhale_sec: 6 }
${keepShort ? '- Keep description SHORT (1 sentence)' : ''}`;

    case 'grounding':
      return `Generate a "grounding_5_4_3_2_1" step with:
- Title acknowledging their overwhelm
- Instructions for 5-4-3-2-1 technique
- ui.component: "Grounding5432 1"
${keepShort ? '- Keep description SHORT' : ''}`;

    case 'expressive_release':
      return `Generate a "dump_text" step with:
- Title inviting them to vent about their SPECIFIC worry (reference classification topics)
- Warm, validating subtitle
- ui.component: "TextDump"
${keepShort ? '- Keep description SHORT' : ''}`;

    case 'brief_cbt':
      if (stage === 0) {
        return `Generate a "cbt_question" step that:
- Asks ONE specific CBT question about their ACTUAL worry (use classification topics + user's own words if available)
- CRITICAL: This is the ONLY assessment question. Next step will be the reframe.
- Examples:
  * "What evidence do you ACTUALLY have that [their specific fear]?"
  * "If your friend had this thought about [their topic], what would you tell them?"
  * "What's the worst that could happen vs. most likely outcome with [their specific situation]?"
- Title should reference their thought pattern
- ${keepShort ? 'Keep it SHORT and simple' : 'Be thorough but clear'}
- ui.component: "CBTQuestion"`;
      } else {
        return `Generate a "reframe_review" step:
- Show a balanced thought that addresses their ACTUAL stated worry
- Use their own words where possible
- Not generic, but specific to what they said
- This should CALM them down, not ask more questions
- ui.component: "ReframeReview"
- ui.props: { ai_reframe: "[balanced thought]", editable: true }`;
      }

    case 'defusion':
      return `Generate a "cbt_question" step focused on DEFUSION:
- Help them see the thought as just a thought, not truth
- Examples:
  * "Notice: your mind is telling you the story '[their thought]'. Is that story helpful right now?"
  * "What would happen if you just let this thought pass by like a cloud?"
- Reference their rumination pattern
${keepShort ? '- Keep SHORT' : ''}`;

    case 'self_compassion':
      return `Generate a "self_compassion_script" step:
- Provide 2-3 lines of self-compassionate phrases
- Reference their SPECIFIC harsh self-talk or pattern
- Warm, kind, simple language
- Ask them to add one kind sentence for themselves
- ui.component: "SelfCompassionScript"
- ui.props: { script_lines: ["...", "...", "..."] }
${keepShort ? '- Keep lines SHORT (one sentence each)' : ''}`;

    case 'behavioral_micro_plan':
      return `Generate an "action_plan" step:
- Ask for ONE tiny action for tomorrow
- Related to their specific worry/topic
- Examples based on their topic/classification
- ui.component: "ActionPlan"
${keepShort ? '- Keep SHORT' : ''}`;

    case 'sleep_wind_down':
      return `Generate a "sleep_wind_down" step:
- Explain cognitive shuffle briefly
- Help them let go of problem-solving tonight
- ui.component: "SleepWindDown"
- ui.props: { duration_sec: 180, word_categories: ["...", "..."] }`;

    case 'acceptance_values':
      return `Generate a "self_compassion_script" or "cbt_question" step focused on ACCEPTANCE:
- For existential/grief thought forms
- Help them connect to values or accept uncertainty
- Warm, philosophical but grounded
${keepShort ? '- Keep SHORT' : ''}`;

    case 'summary':
      return `Generate a "summary" step:
- List what they accomplished this session
- Reference their specific worry and what they did about it
- Warm closing message
- ui.component: "Summary"
- ui.props: { accomplishments: ["...", "...", "..."], closing_message: "..." }`;

    default:
      return `Generate appropriate step for method: ${method}`;
  }
}

/**
 * Summarize a step for context
 */
function summarizeStep(step) {
  if (!step.answer) return 'no answer yet';

  const { stepType, answer } = step;

  switch (stepType) {
    case 'intensity_scale':
      return `rated ${answer.value}/10`;
    case 'dump_text':
      return answer.text ? `"${answer.text.substring(0, 80)}..."` : 'vented';
    case 'cbt_question':
      return answer.response ? `"${answer.response.substring(0, 60)}..."` : 'answered';
    case 'breathing':
    case 'grounding_5_4_3_2_1':
      return answer.completed ? 'completed' : 'skipped';
    case 'choice_buttons':
      return `chose "${answer.choice_id}"`;
    default:
      return 'completed';
  }
}

/**
 * Get current time of day
 */
function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 6) return 'late_night';
  if (hour >= 18) return 'evening';
  if (hour >= 12) return 'afternoon';
  return 'morning';
}

// =============================================================================
// FIXED STEP CREATORS (for intro, intensity, dump - before classification)
// =============================================================================

// Estimate step count before we have a micro plan
// Default: intro + intensity + dump + expressive_release + brief_cbt(2) + self_compassion + summary = 8
const DEFAULT_STEP_COUNT = 8;

function createIntroStep(session, stepIndex) {
  return {
    step_id: `intro-${Date.now()}`,
    step_type: 'intro',
    title: "You're not alone with this spiral",
    subtitle: "Let's work through this together, one step at a time.",
    description: "This won't take long. I'll guide you through a personalized flow to help you feel better.",
    ui: {
      component: 'IntroScreen',
      props: {},
    },
    skippable: false,
    primary_cta: { label: 'Start', action: 'next_step' },
    secondary_cta: null,
    meta: {
      intervention_type: null,
      estimated_duration_sec: 20,
      show_progress: false,
      step_index: stepIndex + 1,
      step_count: DEFAULT_STEP_COUNT,
    },
  };
}

function createIntensityScaleStep(session, stepIndex) {
  return {
    step_id: `intensity-${Date.now()}`,
    step_type: 'intensity_scale',
    title: "How intense is it right now?",
    subtitle: "On a scale of 1-10",
    description: "1 = barely noticeable, 10 = completely overwhelming",
    ui: {
      component: 'IntensityScale',
      props: {
        min: 1,
        max: 10,
        default: 5,
      },
    },
    skippable: false,
    primary_cta: { label: 'Next', action: 'next_step' },
    secondary_cta: null,
    meta: {
      intervention_type: null,
      estimated_duration_sec: 15,
      show_progress: true,
      step_index: stepIndex + 1,
      step_count: DEFAULT_STEP_COUNT,
    },
  };
}

function createDumpTextStep(session, stepIndex) {
  return {
    step_id: `dump-${Date.now()}`,
    step_type: 'dump_text',
    title: "What's on your mind?",
    subtitle: "No filter, no judgment—just let it out.",
    description: "Write whatever you're thinking or feeling. It doesn't have to make sense.",
    ui: {
      component: 'TextDump',
      props: {
        placeholder: "I'm feeling...",
        minLength: 10,
      },
    },
    skippable: false,
    primary_cta: { label: 'Next', action: 'next_step' },
    secondary_cta: null,
    meta: {
      intervention_type: 'expressive_writing',
      estimated_duration_sec: 120,
      show_progress: true,
      step_index: stepIndex + 1,
      step_count: DEFAULT_STEP_COUNT,
    },
  };
}

function createSummaryStep(session, previousSteps, userProfile) {
  const accomplishments = [];

  if (previousSteps.some(s => s.stepType === 'dump_text')) {
    accomplishments.push('You named what you\'re feeling');
  }
  if (previousSteps.some(s => s.stepType === 'breathing' || s.stepType === 'grounding_5_4_3_2_1')) {
    accomplishments.push('You grounded yourself in your body');
  }
  if (previousSteps.some(s => s.stepType === 'cbt_question')) {
    accomplishments.push('You challenged anxious thoughts with evidence');
  }
  if (previousSteps.some(s => s.stepType === 'self_compassion_script')) {
    accomplishments.push('You practiced being kind to yourself');
  }

  return {
    step_id: `summary-${Date.now()}`,
    step_type: 'summary',
    title: "Here's what you just did",
    subtitle: null,
    description: "These steps matter, even if it doesn't feel like it yet.",
    ui: {
      component: 'Summary',
      props: {
        accomplishments,
        closing_message: "Sleep will help you handle this better than worry will. You've done enough for tonight.",
      },
    },
    skippable: false,
    primary_cta: { label: 'Done', action: 'complete_session' },
    secondary_cta: null,
    meta: {
      intervention_type: 'summary',
      estimated_duration_sec: 30,
      show_progress: true,
      step_index: previousSteps.length + 1,
      step_count: previousSteps.length + 1,
    },
  };
}

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

const FLOW_DIRECTOR_SYSTEM_PROMPT = `You are Unspiral's **AI Flow Director**.

You DO NOT chat in free-form.  
You generate **one step at a time** for a guided flow UI.

A "step" is a JSON object with:
- step_type
- title, subtitle, description
- ui.component and ui.props (how the frontend renders it)
- meta fields like step_index, step_count, estimated_duration_sec
- CTA labels (primary, secondary)

You only use the allowed step types:
intro, intensity_scale, dump_text, dump_voice, breathing, grounding_5_4_3_2_1,
cbt_question, reframe_review, self_compassion_script, action_plan,
sleep_wind_down, summary, crisis_info, choice_buttons

Your job each time you are called is:
1. Look at the **user profile** (patterns, topics, emotional flavors, preferences).
2. Look at the **current session classification** (topics, thought_form, emotions, intensity, context).
3. Look at the **session history** (previous steps and answers).
4. Look at the **current method label** (e.g., breathing, expressive_release, brief_cbt, self_compassion, defusion, behavioral_micro_plan, sleep_wind_down, acceptance_values, summary).
5. Generate ONE step JSON that:
   - Uses the correct step_type(s) for that method.
   - Uses the user's actual words and patterns when possible.
   - Respects effort tolerance (shorter text and fewer questions if the user is tired).
   - Is clinically safe: no diagnoses, no medication advice, no emergencies handling beyond pointing to crisis resources.
   - Moves the process forward in a way that makes sense scientifically.

🚨 CRITICAL RULES:
- ASSESSMENT PHASE IS OVER after dump_text. You already know what they're worried about.
- DO NOT ask endless exploratory questions like "What specific thoughts come up?" or "Let's dive deeper"
- MOVE TO SOLUTIONS: reframes, self-compassion, calming interventions
- For brief_cbt: Ask ONE evidence-based question, then immediately give reframe
- For defusion: ONE question about unhooking, then move on
- The goal is to CALM them down, not to explore endlessly
- Keep total session to 5-7 steps MAX

CRITICAL PERSONALIZATION:
- Personalization is NOT just about topic (money, work, relationships).
- You must also personalize based on:
  - Thought form (worry vs rumination vs self-criticism vs anger vs existential).
  - Emotions (shame vs anxiety vs sadness vs anger).
  - Patterns (e.g., replay_conversations, obsess_mistakes, failure_thoughts).
  - Context (late-night, sleep-related vs daytime).
- Your language must:
  - Acknowledge the user's pattern explicitly.
  - Reference their own phrases (e.g. "I'm worthless", "I always screw up") instead of generic anxiety talk.

Examples of GOOD personalization:
- "This sounds like your 'I'm a failure' story showing up again in the context of your job. Let's look at what the evidence really says."
- "Your brain is replaying that conversation on a loop, the way you said it often does. Let's help you step off that treadmill for tonight."

Examples of BAD personalization:
- "Since this is about money, here's a generic money worksheet."
- "Here are some random positive thoughts not related to your situation."

SAFETY:
- If any text suggests imminent self-harm, suicidal intent, or immediate danger,
  you must choose the \`crisis_info\` step, clearly state that Unspiral is not
  an emergency service, and direct them to local emergency numbers or crisis hotlines.

OUTPUT:
- You must output **only one valid JSON step** following this schema:

{
  "step_id": "string",
  "step_type": "string",
  "title": "string",
  "subtitle": "string|null",
  "description": "string|null",
  "educational_content": {
    "why_this_matters": "Brief explanation of WHY this technique helps (1-2 sentences)",
    "technique_name": "Name of the psychological technique being used",
    "learn_more": "Optional deeper explanation if user taps 'Learn More'"
  },
  "ui": {
    "component": "string",
    "props": {}
  },
  "skippable": boolean,
  "primary_cta": { "label": "string", "action": "next_step" },
  "secondary_cta": { "label": "string", "action": "skip_step" } | null,
  "meta": {
    "intervention_type": "string|null",
    "estimated_duration_sec": number,
    "show_progress": boolean,
    "step_index": number,
    "step_count": number
  }
}

🎓 EDUCATIONAL CONTENT RULES:
- ALWAYS include educational_content for intervention steps (CBT, defusion, grounding, self-compassion)
- "why_this_matters" should explain the neuroscience/psychology simply
- Examples:
  * CBT: "Your brain catastrophizes when anxious. Evidence-checking calms your nervous system."
  * Defusion: "Thoughts are just thoughts, not facts. Watching them like clouds creates distance."
  * Grounding: "This brings you back to the present. Anxiety pulls you into past/future."
  * Self-compassion: "Self-criticism activates threat response. Kindness activates soothing."

Do NOT output natural language explanations outside of JSON.`;

// =============================================================================
// ENRICH & VALIDATE
// =============================================================================

function enrichStep(stepJSON, stepIndex, session, currentMethod) {
  // Ensure required fields
  if (!stepJSON.step_id) {
    stepJSON.step_id = `step-${Date.now()}`;
  }

  // Ensure step_type is one of the allowed values for SessionStep
  const allowedStepTypes = [
    'intro',
    'intensity_scale',
    'breathing',
    'grounding_5_4_3_2_1',
    'dump_text',
    'dump_voice',
    'choice_buttons',
    'cbt_question',
    'reframe_review',
    'self_compassion_script',
    'sleep_choice',
    'sleep_wind_down',
    'action_plan',
    'summary',
    'crisis_info',
  ];

  if (!stepJSON.step_type || !allowedStepTypes.includes(stepJSON.step_type)) {
    // Fallback to summary to avoid schema validation errors
    stepJSON.step_type = 'summary';
  }

  if (!stepJSON.meta) {
    stepJSON.meta = {};
  }

  stepJSON.meta.step_index = stepIndex + 1;

  // Set intervention_type based on current method if not already set
  if (!stepJSON.meta.intervention_type && currentMethod) {
    // Map method to intervention type
    const methodToIntervention = {
      breathing: 'breathing',
      grounding: 'grounding',
      expressive_release: 'expressive_release',
      brief_cbt: 'cbt_question',
      defusion: 'defusion',
      self_compassion: 'self_compassion',
      behavioral_micro_plan: 'action_plan',
      sleep_wind_down: 'sleep_wind_down',
      acceptance_values: 'acceptance_values',
      summary: null,
    };
    stepJSON.meta.intervention_type = methodToIntervention[currentMethod] || currentMethod;
  }

  // Estimate total from micro plan - FIXED calculation
  // Total = 3 (intro + intensity + initial dump) + number of method steps
  // For brief_cbt, count as 2 steps; others as 1
  let methodStepCount = 0;
  if (session.microPlan) {
    for (const method of session.microPlan) {
      if (method === 'brief_cbt') {
        methodStepCount += 2; // question + reframe
      } else {
        methodStepCount += 1;
      }
    }
  }
  stepJSON.meta.step_count = 3 + methodStepCount;

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
      stepJSON.ui.props.choices = [
        { id: 'calm_body', label: 'Calm my body first', description: 'Breathing or grounding' },
        { id: 'unpack_thought', label: 'Unpack the thought', description: 'Question what I\'m telling myself' },
      ];
    }
  }

  // Validate breathing has props
  if (stepJSON.step_type === 'breathing') {
    if (!stepJSON.ui) stepJSON.ui = {};
    if (!stepJSON.ui.props) stepJSON.ui.props = {};
    if (!stepJSON.ui.props.breath_count) stepJSON.ui.props.breath_count = 4;
    if (!stepJSON.ui.props.inhale_sec) stepJSON.ui.props.inhale_sec = 4;
    if (!stepJSON.ui.props.exhale_sec) stepJSON.ui.props.exhale_sec = 6;
  }

  return stepJSON;
}

module.exports = {
  generateNextStep,
};
