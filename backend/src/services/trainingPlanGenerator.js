const logger = require('../config/logger');

/**
 * Training Mode Plan Generator
 * Generates short, educational flows for skill-building when user is calm
 * Duration: 2-5 minutes, 2-4 steps
 */

// Training skill definitions with their step sequences
const TRAINING_SKILLS = {
  defusion: {
    name: 'Thought Defusion',
    description: 'Learn to unhook from sticky thoughts',
    duration: '3 min',
    steps: [
      { type: 'training_intro', skill: 'defusion' },
      { type: 'training_concept', skill: 'defusion' },
      { type: 'training_practice', skill: 'defusion' },
      { type: 'training_summary', skill: 'defusion' },
    ],
  },
  self_compassion: {
    name: 'Self-Compassion',
    description: 'Practice talking to yourself with kindness',
    duration: '3 min',
    steps: [
      { type: 'training_intro', skill: 'self_compassion' },
      { type: 'training_concept', skill: 'self_compassion' },
      { type: 'training_practice', skill: 'self_compassion' },
      { type: 'training_summary', skill: 'self_compassion' },
    ],
  },
  sleep_beliefs: {
    name: 'Sleep Beliefs',
    description: 'Challenge unhelpful thoughts about sleep',
    duration: '4 min',
    steps: [
      { type: 'training_intro', skill: 'sleep_beliefs' },
      { type: 'training_concept', skill: 'sleep_beliefs' },
      { type: 'training_practice', skill: 'sleep_beliefs' },
      { type: 'training_summary', skill: 'sleep_beliefs' },
    ],
  },
  cognitive_reframe: {
    name: 'Cognitive Reframing',
    description: 'See situations from a different angle',
    duration: '4 min',
    steps: [
      { type: 'training_intro', skill: 'cognitive_reframe' },
      { type: 'training_concept', skill: 'cognitive_reframe' },
      { type: 'training_practice', skill: 'cognitive_reframe' },
      { type: 'training_summary', skill: 'cognitive_reframe' },
    ],
  },
  grounding: {
    name: 'Grounding Techniques',
    description: 'Quick ways to anchor yourself when anxious',
    duration: '2 min',
    steps: [
      { type: 'training_intro', skill: 'grounding' },
      { type: 'training_practice', skill: 'grounding' },
      { type: 'training_summary', skill: 'grounding' },
    ],
  },
  acceptance: {
    name: 'Acceptance & Values',
    description: 'Connect with what matters when you can\'t fix things',
    duration: '4 min',
    steps: [
      { type: 'training_intro', skill: 'acceptance' },
      { type: 'training_concept', skill: 'acceptance' },
      { type: 'training_practice', skill: 'acceptance' },
      { type: 'training_summary', skill: 'acceptance' },
    ],
  },
};

// Training content templates
const TRAINING_CONTENT = {
  defusion: {
    intro: {
      title: "Let's practice unhooking from thoughts",
      subtitle: "Defusion is a technique that helps you see thoughts as just thoughts – not facts you have to believe or obey.",
      description: "This 3-minute drill will teach you a quick way to create distance from sticky thoughts.",
    },
    concept: {
      title: "Thoughts are not commands",
      content: [
        "Your brain generates thousands of thoughts daily. Not all of them are true or helpful.",
        "When you're spiraling, your brain serves up scary thoughts and you believe them instantly.",
        "Defusion means stepping back and saying: 'I notice I'm having the thought that...' instead of 'I am...'",
      ],
      example: "Instead of 'I'm a failure' → 'I notice I'm having the thought that I'm a failure'",
    },
    practice: {
      title: "Try it now",
      prompt: "Think of a thought that often bothers you at night. Write it down, then we'll practice defusing it.",
      followUp: "Now say it to yourself with the prefix: 'I notice I'm having the thought that...'",
    },
    summary: {
      title: "You've got a new tool",
      points: [
        "Defusion creates space between you and your thoughts",
        "You don't have to believe every thought your brain offers",
        "The prefix 'I notice...' helps break the automatic fusion",
      ],
      nextStep: "Try this tonight if a thought won't leave you alone",
    },
  },
  self_compassion: {
    intro: {
      title: "Building your self-compassion muscle",
      subtitle: "Self-compassion isn't about letting yourself off the hook – it's about not making hard moments worse.",
      description: "This drill helps you practice talking to yourself like you'd talk to a good friend.",
    },
    concept: {
      title: "Three parts of self-compassion",
      content: [
        "1. Mindfulness: Acknowledging the pain without drowning in it ('This is a hard moment')",
        "2. Common humanity: Remembering you're not alone ('Everyone struggles sometimes')",
        "3. Self-kindness: Offering yourself warmth ('May I be kind to myself')",
      ],
      example: "When you make a mistake, instead of attacking yourself, you might say: 'This hurts. Others mess up too. What do I need right now?'",
    },
    practice: {
      title: "Write your own script",
      prompt: "Think of something you've been hard on yourself about recently. Write one kind sentence you could say to yourself about it.",
    },
    summary: {
      title: "Kindness is a skill",
      points: [
        "Self-compassion isn't weakness – research shows it builds resilience",
        "You can acknowledge mistakes and still be kind to yourself",
        "The phrases you practiced can become your go-to at night",
      ],
      nextStep: "Tonight, if you're harsh on yourself, try one of these phrases",
    },
  },
  sleep_beliefs: {
    intro: {
      title: "Challenging sleep catastrophes",
      subtitle: "When you can't sleep, your brain often makes it worse with scary predictions.",
      description: "This drill helps you question those thoughts so they have less power.",
    },
    concept: {
      title: "Common sleep myths",
      content: [
        "❌ 'If I don't sleep 8 hours, tomorrow is ruined' → Most people function okay on less occasionally",
        "❌ 'I have to fall asleep RIGHT NOW' → Pressure makes it harder; your body will eventually sleep",
        "❌ 'I've been awake for hours' → We usually overestimate; even light rest helps",
      ],
      example: "Ask yourself: 'What's the most realistic outcome if I sleep less tonight?' Usually it's 'tired but functional'.",
    },
    practice: {
      title: "Reframe your sleep thought",
      prompt: "What's a scary thought you have when you can't sleep? Write it down.",
      followUp: "Now write a more balanced version – not falsely positive, just more realistic.",
    },
    summary: {
      title: "Sleep comes easier when you stop fighting",
      points: [
        "Catastrophizing about sleep keeps you awake",
        "Realistic thinking reduces the pressure",
        "Even rest without sleep is helpful for your body",
      ],
      nextStep: "Tonight, if you catch a sleep catastrophe, remind yourself of the more balanced version",
    },
  },
  cognitive_reframe: {
    intro: {
      title: "Looking at things differently",
      subtitle: "Cognitive reframing helps you find alternative perspectives on difficult situations.",
      description: "This skill is core to CBT and can help you interrupt spiral thinking.",
    },
    concept: {
      title: "The reframe process",
      content: [
        "1. Notice the thought: What's your brain telling you?",
        "2. Check the evidence: What supports or contradicts this thought?",
        "3. Find the balance: What's a more complete picture?",
      ],
      example: "'I always mess up presentations' → Evidence: Last one got good feedback → Balanced: 'I sometimes struggle with presentations, and I've also done well'",
    },
    practice: {
      title: "Try a reframe",
      prompt: "Think of a negative thought you've had recently. What evidence might contradict it?",
    },
    summary: {
      title: "You can question your thoughts",
      points: [
        "First reactions aren't always accurate",
        "Looking for counter-evidence isn't denial – it's balance",
        "With practice, reframing becomes faster",
      ],
      nextStep: "Tonight, pick one spiral thought and ask: 'What's the other side?'",
    },
  },
  grounding: {
    intro: {
      title: "Quick grounding practice",
      subtitle: "When your mind is racing, your body can help anchor you to the present.",
      description: "This 2-minute drill practices a technique you can use anywhere.",
    },
    practice: {
      title: "5-4-3-2-1 Grounding",
      instructions: [
        "Name 5 things you can see",
        "Name 4 things you can touch",
        "Name 3 things you can hear",
        "Name 2 things you can smell",
        "Name 1 thing you can taste",
      ],
      tip: "You can do this in your head in bed – it pulls your attention out of spiraling thoughts.",
    },
    summary: {
      title: "Your senses can save you",
      points: [
        "Grounding works by occupying the part of your brain that spirals",
        "It doesn't solve the problem – it interrupts the loop",
        "Even a 30-second version helps",
      ],
      nextStep: "Tonight, if thoughts get loud, try naming 3 things you can feel",
    },
  },
  acceptance: {
    intro: {
      title: "When you can't fix it tonight",
      subtitle: "Some problems can't be solved at 2am. Acceptance helps you put them down temporarily.",
      description: "This drill practices accepting what you can't control while staying connected to what matters.",
    },
    concept: {
      title: "Acceptance isn't giving up",
      content: [
        "Acceptance means: 'This is hard, and I can't solve it right now'",
        "It's not: 'I don't care' or 'I give up forever'",
        "Acceptance frees up energy wasted on fighting reality",
      ],
      example: "Instead of fighting: 'I can't believe this is happening, it shouldn't be this way' → 'This is happening. It's painful. What can I do right now?'",
    },
    practice: {
      title: "Find one thing that matters",
      prompt: "Even in your current worry, what's one thing you care about? A person, a value, something you want to protect?",
    },
    summary: {
      title: "Rest is doing something",
      points: [
        "You don't have to solve everything tonight",
        "Accepting hard feelings doesn't mean they win",
        "Connecting to values gives direction without requiring action",
      ],
      nextStep: "Tonight, if you're stuck on an unsolvable problem, try: 'This is hard. I'll deal with it tomorrow. Right now, my job is rest.'",
    },
  },
};

/**
 * Generate training plan for a specific skill
 * @param {string} skill - Skill to train
 * @returns {object} Training plan with steps
 */
function generateTrainingPlan(skill) {
  const skillConfig = TRAINING_SKILLS[skill];
  if (!skillConfig) {
    logger.warn('Unknown training skill requested', { skill });
    return generateTrainingPlan('defusion'); // Default fallback
  }
  
  return {
    skill,
    name: skillConfig.name,
    description: skillConfig.description,
    duration: skillConfig.duration,
    steps: skillConfig.steps,
    totalSteps: skillConfig.steps.length,
  };
}

/**
 * Get training content for a specific step
 * @param {string} skill - Skill being trained
 * @param {string} stepType - Type of step (intro, concept, practice, summary)
 * @returns {object} Content for that step
 */
function getTrainingContent(skill, stepType) {
  const skillContent = TRAINING_CONTENT[skill];
  if (!skillContent) {
    return null;
  }
  
  // Map step types to content keys
  const contentKey = stepType.replace('training_', '');
  return skillContent[contentKey] || null;
}

/**
 * Recommend next training skill based on user profile and history
 * @param {object} userProfile - User's onboarding and preference data
 * @param {array} recentTrainingSessions - Recent training sessions
 * @returns {string} Recommended skill
 */
function recommendTrainingSkill(userProfile, recentTrainingSessions = []) {
  const completedSkills = recentTrainingSessions.map(s => s.trainingSkill);
  
  // Priority based on user's help preference
  const helpPreference = userProfile.onboarding?.helpStylePreference || userProfile.onboarding?.helpPreference;
  
  let priorityOrder;
  switch (helpPreference) {
    case 'think_clearly':
    case 'help_me_think_more_clearly':
      priorityOrder = ['cognitive_reframe', 'defusion', 'sleep_beliefs', 'self_compassion', 'grounding', 'acceptance'];
      break;
    case 'be_kinder':
    case 'help_me_be_kinder_to_myself':
      priorityOrder = ['self_compassion', 'acceptance', 'defusion', 'cognitive_reframe', 'grounding', 'sleep_beliefs'];
      break;
    case 'calm_body':
    case 'help_me_calm_my_body':
      priorityOrder = ['grounding', 'sleep_beliefs', 'acceptance', 'defusion', 'self_compassion', 'cognitive_reframe'];
      break;
    default:
      priorityOrder = ['defusion', 'self_compassion', 'grounding', 'cognitive_reframe', 'sleep_beliefs', 'acceptance'];
  }
  
  // Find first skill not recently completed
  for (const skill of priorityOrder) {
    if (!completedSkills.includes(skill)) {
      return skill;
    }
  }
  
  // All completed, cycle back
  return priorityOrder[0];
}

/**
 * Get all available training skills
 * @returns {array} List of skill objects
 */
function getAvailableTrainingSkills() {
  return Object.entries(TRAINING_SKILLS).map(([key, config]) => ({
    id: key,
    name: config.name,
    description: config.description,
    duration: config.duration,
  }));
}

module.exports = {
  generateTrainingPlan,
  getTrainingContent,
  recommendTrainingSkill,
  getAvailableTrainingSkills,
  TRAINING_SKILLS,
  TRAINING_CONTENT,
};
