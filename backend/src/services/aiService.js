const OpenAI = require('openai');
const logger = require('../config/logger');

// Initialize OpenAI client (optional)
let openai = null;
let defaultModel = 'gpt-4o-mini';

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Allow overriding the model from env for quick experimentation
  if (process.env.OPENAI_REFRAME_MODEL) {
    defaultModel = process.env.OPENAI_REFRAME_MODEL;
  }
}

/**
 * Generate a reframe using AI
 * @param {string} spiralText - The user's spiral dump text
 * @param {object} thinkThroughData - The user's answers to the think-through questions
 * @returns {Promise<string>} - The reframed thought
 */
async function generateReframe(spiralText = '', thinkThroughData = {}) {
  const fallback = () => ({
    text: generateTemplateReframe(spiralText, thinkThroughData),
    source: 'template',
    model: null,
    usage: null,
  });

  if (!openai) {
    // Fallback to template-based reframing
    return fallback();
  }

  try {
    const prompt = `You are a compassionate mental health assistant helping someone reframe anxious thoughts using CBT principles.

User's spiral: "${spiralText}"

Their answers:
- What they're afraid will happen: ${thinkThroughData.fearQuestion}
- Evidence it will happen: ${thinkThroughData.evidenceFor}
- Evidence against it: ${thinkThroughData.evidenceAgainst}

Generate a balanced, compassionate reframe (2-3 sentences max) that:
1. Acknowledges their concern as valid
2. Presents a more balanced perspective
3. Is kind and encouraging
4. Sounds like a friend talking, not a therapist

Keep it conversational and human. Don't use therapy jargon.`;

    const completion = await openai.chat.completions.create({
      model: defaultModel,
      messages: [
        {
          role: 'system',
          content: 'You are a warm, compassionate friend helping someone see their situation more clearly. Speak naturally and kindly.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 200,
      temperature: 0.65,
    });

    return {
      text: completion.choices[0]?.message?.content?.trim() || fallback().text,
      source: 'openai',
      model: defaultModel,
      usage: completion.usage || null,
    };
  } catch (error) {
    logger.error('Error generating AI reframe:', error);
    // Fallback to template-based reframing
    return fallback();
  }
}

/**
 * Template-based reframing (fallback when no AI available)
 */
function generateTemplateReframe(spiralText = '', thinkThroughData = {}) {
  const templates = [
    `I understand I'm worried about this, and that's okay. But looking at the evidence, ${
      (thinkThroughData.evidenceAgainst || 'the story might not be as harsh as it feels').toLowerCase()
    }. One moment doesn't define everything.`,
    
    `This feels overwhelming right now, but ${
      (thinkThroughData.evidenceAgainst || 'there is proof I can survive this').toLowerCase()
    }. I can handle this one step at a time.`,
    
    `I care deeply about this, which is why it feels so intense. But the reality is: ${
      (thinkThroughData.evidenceAgainst || 'there are reasons to believe I am okay').toLowerCase()
    }. I'm doing better than my anxiety suggests.`,
    
    `My brain is trying to protect me by worrying, but ${
      (thinkThroughData.evidenceAgainst || 'there are signals that I can breathe here').toLowerCase()
    }. I have evidence that things might be okay.`,
  ];

  // Choose a random template
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Analyze spiral text for topics and emotions (simple keyword-based)
 */
function analyzeSpiral(text) {
  const lowerText = text.toLowerCase();
  
  // Detect topics
  const topics = [];
  
  if (lowerText.match(/work|job|boss|career|meeting|presentation|project|deadline/)) {
    topics.push('work_study');
  }
  if (lowerText.match(/relationship|friend|partner|boyfriend|girlfriend|family|parent|sibling/)) {
    topics.push('relationships');
  }
  if (lowerText.match(/money|debt|bills|afford|financial|broke|expensive/)) {
    topics.push('money');
  }
  if (lowerText.match(/health|sick|pain|doctor|medical|body|disease/)) {
    topics.push('health');
  }
  if (lowerText.match(/i am|i'm|myself|worthless|failure|stupid|idiot|inadequate/)) {
    topics.push('myself');
  }
  
  // Detect emotions
  const emotions = [];
  
  if (lowerText.match(/anxious|anxiety|worried|nervous|panic|scared|afraid/)) {
    emotions.push('anxious');
  }
  if (lowerText.match(/ashamed|embarrassed|humiliated|shame/)) {
    emotions.push('ashamed');
  }
  if (lowerText.match(/angry|mad|furious|rage|frustrated/)) {
    emotions.push('angry');
  }
  if (lowerText.match(/sad|depressed|hopeless|down|miserable/)) {
    emotions.push('sad');
  }
  if (lowerText.match(/guilty|guilt|regret|sorry/)) {
    emotions.push('guilty');
  }
  
  // Detect cognitive distortions
  const distortions = [];
  
  if (lowerText.match(/always|never|every time|everyone|no one|everything|nothing/)) {
    distortions.push('all-or-nothing thinking');
  }
  if (lowerText.match(/should|must|have to|ought to/)) {
    distortions.push('should statements');
  }
  if (lowerText.match(/what if|going to happen|will definitely|bound to/)) {
    distortions.push('catastrophizing');
  }
  if (lowerText.match(/i know|they think|must think|probably think|surely/)) {
    distortions.push('mind reading');
  }
  
  return {
    detectedTopics: topics,
    detectedEmotions: emotions,
    cognitiveDistortions: distortions,
  };
}

/**
 * Generate self-compassion prompt based on situation
 */
function generateCompassionPrompt(feeling) {
  const prompts = {
    ashamed: "Shame tells me I'm bad, but mistakes are part of being human. What would I say to a friend feeling this way?",
    anxious: "This anxiety is trying to protect me, even if it's overwhelming. I can be kind to myself while I'm scared.",
    angry: "My anger is valid information about what matters to me. I can feel it without being consumed by it.",
    sad: "Sadness is a natural response to loss or disappointment. I don't have to fix it right now, just make space for it.",
    guilty: "I feel guilty because I care about doing right. That's a strength, even if this moment is hard.",
    stupid: "One mistake doesn't make me stupid. Everyone has moments like this. I'm learning and growing.",
    worthless: "My worth isn't determined by this moment or this feeling. I am inherently valuable, even when I can't feel it.",
  };
  
  return prompts[feeling] || "This is a hard moment, and hard moments are part of being human. I can be gentle with myself.";
}

module.exports = {
  generateReframe,
  analyzeSpiral,
  generateCompassionPrompt,
};
