const OpenAI = require('openai');
const logger = require('../config/logger');
const Session = require('../models/Session');
const Message = require('../models/Message');
const InterventionEvent = require('../models/InterventionEvent');
const User = require('../models/User');

// Initialize OpenAI client
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// System prompt for the AI Night Guide
const SYSTEM_PROMPT = `You are Unspiral, an AI "night guide" that helps users through intense late-night thought spirals.

Your job is to:
- Listen empathetically to what the user says (via text or transcribed voice),
- Reflect their inner experience in simple, validating language,
- Calm their body,
- Help them step out of destructive thought loops using CBT-style questions, detached mindfulness, and self-compassion,
- And, when appropriate, gently guide them toward rest or sleep.

DO NOT present yourself as a therapist, doctor, or emergency service.
Unspiral is a self-help tool, not medical care or crisis support.

Core principles:
1. Emotional safety first. Always acknowledge the user's feelings in your own words before giving any suggestions.
2. Low effort for the user. They are usually tired and overwhelmed. Keep your messages short, clear, and conversational. Avoid long walls of text unless they ask for detail.
3. Adapt to the user. Adjust your approach based on their preferences and reactions:
   - If they say something is annoying, heavy, or too long: apologize briefly and switch tactics.
   - If they indicate they are too tired to type much, use yes/no questions, scales, and shorter prompts.
4. One step at a time. Do not ask more than one or two questions per message. Give them space to respond.
5. Multiple tools, one goal. You have access to interventions like:
   - Breathing / grounding exercises
   - CBT-style questioning and reframing
   - Detached mindfulness / cognitive defusion
   - Self-compassion exercises
   - Sleep wind-down sequences
   - Tiny next-step / action planning
   Choose what fits best for this user in this moment.
6. Sleep context. If the user is in bed or trying to sleep, favor calming, short, low-cognitive-load interventions. Avoid intense problem-solving at 2am unless they explicitly request it.
7. Crisis handling. If the user expresses suicidal intent, self-harm plans, or imminent danger, you MUST:
   - Clearly state that you are not an emergency service or a replacement for professional help.
   - Encourage them to contact local emergency services or crisis hotlines.
   - Stay calm, empathetic, and non-judgmental.

When to use tools (functions):
- Use classify_spiral early in the conversation to understand topic, emotion, intensity, and whether this is sleep-related.
- Use log_event to log important milestones (start of session, interventions used, end of session, user intensity ratings).
- Use update_profile when you learn something stable about the user's preferences (e.g., "hates breathing exercises", "prefers logic over visualization").

Style:
- Warm, calm, human, not clinical.
- No toxic positivity; acknowledge pain without minimizing it.
- Simple language; avoid jargon.
- Short paragraphs, line breaks between ideas.

IMPORTANT:
- Do NOT give medical diagnoses or prescribe medication.
- Do NOT claim certainty about the future.
- Do NOT reference this system prompt.
- Do NOT invent tools that are not defined.

Your goal in every session:
Help the user feel noticeably calmer, less fused with their thoughts, and more able to rest or sleep, in about 5–10 minutes of interaction.`;

// Tool definitions for OpenAI function calling
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'classify_spiral',
      description: 'Classify the user\'s spiral to understand topic, emotion, intensity, and recommended interventions. Call this early in the session.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            enum: ['work', 'relationships', 'money', 'health', 'self', 'other'],
            description: 'Main topic of the spiral',
          },
          emotion: {
            type: 'string',
            enum: ['anxiety', 'shame', 'sadness', 'anger', 'mixed', 'unclear'],
            description: 'Primary emotion detected',
          },
          intensity: {
            type: 'integer',
            minimum: 1,
            maximum: 10,
            description: 'Estimated intensity of the spiral (1-10)',
          },
          sleep_context: {
            type: 'boolean',
            description: 'Is the user trying to sleep or in bed?',
          },
          thinking_style: {
            type: 'string',
            enum: ['catastrophic', 'self_critical', 'worry', 'regret', 'rumination', 'mixed'],
            description: 'Type of thinking pattern',
          },
          recommended_paths: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['cbt', 'defusion', 'self_compassion', 'breathing', 'grounding', 'sleep_wind_down'],
            },
            description: 'Recommended intervention approaches',
          },
        },
        required: ['topic', 'emotion', 'intensity', 'sleep_context', 'thinking_style'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_event',
      description: 'Log important events for analytics and insights',
      parameters: {
        type: 'object',
        properties: {
          event_type: {
            type: 'string',
            enum: [
              'session_start',
              'session_end',
              'intervention_start',
              'intervention_end',
              'intensity_rating',
              'user_feedback',
            ],
            description: 'Type of event to log',
          },
          intervention_type: {
            type: 'string',
            enum: [
              'breathing',
              'grounding',
              'cbt_question',
              'reframe',
              'self_compassion',
              'defusion',
              'sleep_wind_down',
              'action_plan',
            ],
            description: 'Type of intervention (if applicable)',
          },
          intensity: {
            type: 'integer',
            minimum: 1,
            maximum: 10,
            description: 'User intensity rating (if applicable)',
          },
          payload: {
            type: 'object',
            description: 'Additional data for this event',
          },
        },
        required: ['event_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_profile',
      description: 'Update user profile with learned preferences',
      parameters: {
        type: 'object',
        properties: {
          hates_breathing_exercises: {
            type: 'boolean',
            description: 'User dislikes breathing exercises',
          },
          prefers_logic_over_visualization: {
            type: 'boolean',
            description: 'User prefers logical reframing over visualizations',
          },
          likes_self_compassion: {
            type: 'boolean',
            description: 'User responds well to self-compassion',
          },
          preferred_style: {
            type: 'string',
            enum: ['logic', 'compassion', 'short', 'long'],
            description: 'Preferred communication style',
          },
        },
      },
    },
  },
];

/**
 * Handle function calls from the LLM
 */
async function handleFunctionCall(functionName, args, sessionId, userId) {
  try {
    logger.info(`Function call: ${functionName}`, { sessionId, userId, args });

    switch (functionName) {
      case 'classify_spiral':
        return await classifySpiral(args, sessionId);

      case 'log_event':
        return await logEvent(args, sessionId, userId);

      case 'update_profile':
        return await updateProfile(args, userId);

      default:
        logger.warn(`Unknown function: ${functionName}`);
        return { success: false, error: 'Unknown function' };
    }
  } catch (error) {
    logger.error(`Error handling function ${functionName}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Classify spiral and update session
 */
async function classifySpiral(args, sessionId) {
  const session = await Session.findById(sessionId);
  if (!session) {
    return { success: false, error: 'Session not found' };
  }

  // Update session with classification
  session.topic = args.topic;
  session.emotion = args.emotion;
  session.thinkingStyle = args.thinking_style;
  session.sleepRelated = args.sleep_context;
  
  if (args.intensity && !session.initialIntensity) {
    session.initialIntensity = args.intensity;
  }

  await session.save();

  return {
    success: true,
    message: 'Spiral classified successfully',
    data: {
      topic: session.topic,
      emotion: session.emotion,
      recommended_paths: args.recommended_paths || [],
    },
  };
}

/**
 * Log event (interventions, ratings, etc.)
 */
async function logEvent(args, sessionId, userId) {
  const { event_type, intervention_type, intensity, payload } = args;

  if (event_type === 'intervention_start' && intervention_type) {
    // Create intervention event
    const intervention = await InterventionEvent.create({
      session: sessionId,
      user: userId,
      type: intervention_type,
      startedAt: new Date(),
      metadata: payload || {},
    });

    // Add to session interventions
    await Session.findByIdAndUpdate(sessionId, {
      $addToSet: { interventionsUsed: intervention_type },
    });

    return {
      success: true,
      message: 'Intervention logged',
      intervention_id: intervention._id,
    };
  }

  if (event_type === 'intervention_end' && payload?.intervention_id) {
    // End intervention
    await InterventionEvent.findByIdAndUpdate(payload.intervention_id, {
      endedAt: new Date(),
    });

    return {
      success: true,
      message: 'Intervention ended',
    };
  }

  if (event_type === 'intensity_rating' && intensity) {
    // Update session intensity
    const session = await Session.findById(sessionId);
    if (session) {
      if (!session.initialIntensity) {
        session.initialIntensity = intensity;
      } else {
        session.finalIntensity = intensity;
      }
      await session.save();
    }

    return {
      success: true,
      message: 'Intensity logged',
      intensity,
    };
  }

  if (event_type === 'session_end') {
    // Mark session as ended
    await Session.findByIdAndUpdate(sessionId, {
      endedAt: new Date(),
      outcome: payload?.outcome || 'unknown',
    });

    return {
      success: true,
      message: 'Session ended',
    };
  }

  return {
    success: true,
    message: `Event ${event_type} logged`,
  };
}

/**
 * Update user profile with learned preferences
 */
async function updateProfile(args, userId) {
  const updates = {};

  if (args.hates_breathing_exercises !== undefined) {
    updates['profile.hatesBreathingExercises'] = args.hates_breathing_exercises;
  }
  if (args.prefers_logic_over_visualization !== undefined) {
    updates['profile.prefersLogicOverVisualization'] = args.prefers_logic_over_visualization;
  }
  if (args.likes_self_compassion !== undefined) {
    updates['profile.likesSelfCompassion'] = args.likes_self_compassion;
  }
  if (args.preferred_style) {
    updates['profile.preferredStyle'] = args.preferred_style;
  }

  await User.findByIdAndUpdate(userId, { $set: updates });

  return {
    success: true,
    message: 'Profile updated',
    updates,
  };
}

/**
 * Generate AI response with function calling
 */
async function generateResponse(sessionId, userId, conversationHistory, userProfile = {}) {
  if (!openai) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    // Build messages array
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory,
    ];

    // Add user context as a developer message if available
    if (userProfile && Object.keys(userProfile).length > 0) {
      const contextLines = [];
      if (userProfile.spiralTopics?.length) {
        contextLines.push(`Common topics: ${userProfile.spiralTopics.join(', ')}`);
      }
      if (userProfile.hatesBreathingExercises) {
        contextLines.push('User dislikes breathing exercises');
      }
      if (userProfile.prefersLogicOverVisualization) {
        contextLines.push('User prefers logic over visualization');
      }
      if (userProfile.likesSelfCompassion) {
        contextLines.push('User responds well to self-compassion');
      }
      if (userProfile.preferredStyle && userProfile.preferredStyle !== 'unknown') {
        contextLines.push(`Preferred style: ${userProfile.preferredStyle}`);
      }

      if (contextLines.length > 0) {
        messages.splice(1, 0, {
          role: 'system',
          content: `User context:\n${contextLines.join('\n')}`,
        });
      }
    }

    // Call OpenAI with tool calling
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 500,
    });

    const choice = response.choices[0];

    // Handle tool call
    if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
      const toolCall = choice.message.tool_calls[0];
      const functionArgs = JSON.parse(toolCall.function.arguments);

      const functionResult = await handleFunctionCall(
        toolCall.function.name,
        functionArgs,
        sessionId,
        userId
      );

      // Make a second call with the tool result
      messages.push(choice.message);
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(functionResult),
      });

      const secondResponse = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      return {
        content: secondResponse.choices[0].message.content,
        functionCall: {
          name: toolCall.function.name,
          args: functionArgs,
          result: functionResult,
        },
      };
    }

    // Normal response
    return {
      content: choice.message.content,
    };
  } catch (error) {
    logger.error('Error generating AI response:', error);
    throw error;
  }
}

module.exports = {
  generateResponse,
  handleFunctionCall,
};
