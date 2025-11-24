# 🎯 Unspiral Complete Architecture Upgrade

## Executive Summary

**Problem**: Step 6 and 7 asked the same question. The app didn't use onboarding data scientifically. It was templated and generic.

**Solution**: Complete architectural overhaul from topic-based templates to multi-dimensional classification with method-based flow generation.

---

## What Changed in One Sentence

**Before**: "AI picks random CBT steps based on topic"  
**After**: "AI classifies spiral across 6 dimensions → Rule-based method selection → AI fills content for each method using user's exact patterns and words"

---

## The 3-Stage Architecture

### Stage 1: Multi-Dimensional Classification
**When**: After user vents (dump_text step)  
**How**: AI analyzes vent text with user profile context  
**Output**:
```javascript
{
  topics: { work: 0.3, relationships: 0.8, self_worth: 0.9 },  // Can be multi-topic
  thoughtForm: "self_criticism",  // worry | rumination | self_criticism | anger | grief | existential
  primaryEmotions: ["shame", "anxiety"],  // Up to 3
  intensity: 8,  // 1-10
  context: {
    timeOfDay: "late_night",
    sleepRelated: true,
    acuteTrigger: "recent conflict with partner"  // Extracted if present
  },
  cognitiveCapacity: "low",  // low | medium | high
  recommendedStrategies: ["breathing", "self_compassion", "sleep_wind_down"]
}
```

**Stored in**: `session.classification`

### Stage 2: Micro Plan Generation (Rule-Based)
**When**: Immediately after classification  
**How**: `generateMicroPlan()` function uses rules, not AI  
**Logic**:

```javascript
// Self-criticism at night with low capacity:
["breathing", "expressive_release", "brief_cbt", "self_compassion", "sleep_wind_down", "summary"]

// Worry during day with medium capacity:
["expressive_release", "brief_cbt", "behavioral_micro_plan", "summary"]

// Rumination at night:
["grounding", "expressive_release", "defusion", "sleep_wind_down", "summary"]

// Anger:
["expressive_release", "defusion", "self_compassion", "summary"]

// Grief:
["expressive_release", "acceptance_values", "self_compassion", "summary"]

// Existential:
["expressive_release", "acceptance_values", "summary"]
```

**Considers**:
- Thought form (worry vs rumination vs self-criticism, etc.)
- Context (late_night? sleepRelated?)
- Cognitive capacity (low = skip heavy CBT)
- User preferences (hatesBreathing? helpPreference? effortTolerance?)

**Stored in**: `session.microPlan`, `session.currentMethodIndex`

### Stage 3: Step Realization from Methods
**When**: Each time frontend requests next step  
**How**: AI generates ONE step for current method  
**Key**: AI doesn't choose flow, only fills content

**Method → Steps Mapping**:
- `breathing` → 1 breathing step
- `grounding` → 1 grounding_5_4_3_2_1 step
- `expressive_release` → 1 dump_text step
- `brief_cbt` → 2-3 cbt_question steps + 1 reframe_review step
- `defusion` → 1 cbt_question (defusion-focused)
- `self_compassion` → 1 self_compassion_script step
- `behavioral_micro_plan` → 1 action_plan step
- `sleep_wind_down` → 1 sleep_wind_down step
- `acceptance_values` → 1-2 steps (cbt_question or self_compassion with values focus)
- `summary` → 1 summary step

**AI Context Includes**:
- User profile (patterns, topics, emotions, preferences, effort tolerance)
- Session classification (all 6 dimensions)
- Session history (previous steps + user's answers)
- Current method + stage (e.g., "brief_cbt, stage 1")
- Method-specific instructions

**Example AI Prompt**:
```
=== USER PROFILE ===
Typical spiral patterns: obsess_mistakes, failure_thoughts
Common topics: money
Emotional flavors: anxiety, shame
Preferred help style: help_me_be_kinder_to_myself
Effort tolerance: keep_it_short_at_night

=== CURRENT SESSION CLASSIFICATION ===
Topics (weights): money: 0.8, self_worth: 0.7
Thought form: self_criticism
Emotions: shame, anxiety
Intensity: 8 / 10
Context: late_night, sleep_related = true
Cognitive capacity: low
Acute trigger: "messed up that project"

=== SESSION HISTORY ===
Steps so far:
1. intro: completed
2. intensity_scale: rated 8/10
3. dump_text: "I'm not making enough money. What if I can't pay rent? I messed up that project at work and now I feel like a failure."

=== CURRENT METHOD + STAGE ===
Current method: self_compassion
Stage: 0
Step number: 4

=== YOUR TASK ===
Generate a "self_compassion_script" step:
- Provide 2-3 lines of self-compassionate phrases
- Reference their SPECIFIC harsh self-talk ("I'm a failure", "messed up")
- Warm, kind, simple language
- Ask them to add one kind sentence for themselves
- Keep lines SHORT (user's effort tolerance is 'keep_it_short_at_night')
```

**AI Output**:
```javascript
{
  step_type: "self_compassion_script",
  title: "What would you say to a friend?",
  subtitle: "Your 'I'm a failure' story is loud right now. Let's talk back to it.",
  description: "Read these slowly. Then add one kind thing you'd say to a friend in your situation.",
  ui: {
    component: "SelfCompassionScript",
    props: {
      script_lines: [
        "Messing up one project doesn't make you a failure—it makes you human.",
        "You're worried about money because you care, not because you're incapable.",
        "Tomorrow you can problem-solve. Tonight, you need rest."
      ]
    }
  },
  // ...
}
```

---

## Why This Fixes Repeated Questions

### Old Way:
```
Step 6: AI generates → "What evidence do you have?"
Step 7: AI generates → "What evidence do you have?" (SAME!)
```

**Problem**: AI had no memory of what it already asked. Each step was independent.

### New Way:
```
Micro plan: ["brief_cbt", "self_compassion", "summary"]

Step 4: brief_cbt, stage 0 → "What evidence do you have that you'll run out of money?"
Step 5: brief_cbt, stage 1 → "If your friend worried about money, what would you tell them?"
Step 6: brief_cbt, stage 2 → reframe_review (balanced thought)
→ brief_cbt complete, advance to next method
Step 7: self_compassion, stage 0 → self_compassion_script
→ self_compassion complete, advance to next method
Step 8: summary → summary step
```

**Solution**: 
1. Methods are tracked in `session.microPlan`
2. Each method has stages (e.g., brief_cbt has 3 stages)
3. After method completes, `advanceToNextMethod()` is called
4. Can't repeat because methods are consumed

---

## New User Model Fields

```javascript
onboarding: {
  spiralPatterns: [
    'replay_conversations',
    'obsess_mistakes',
    'worry_tomorrow',
    'failure_thoughts',
    'anger_at_others',        // NEW
    'health_anxiety',         // NEW
    'existential_thinking'    // NEW
  ],
  spiralTopics: [
    'work', 'relationships', 'money', 'health',
    'family',         // NEW
    'self_worth',     // NEW
    'life_direction', // NEW
    'other'
  ],
  emotionalFlavors: [         // NEW
    'anxiety', 'shame', 'sadness', 'anger', 'guilt', 'mixed'
  ],
  helpPreference: [           // NEW
    'help_me_think_more_clearly',
    'help_me_be_kinder_to_myself',
    'help_me_calm_my_body',
    'not_sure'
  ],
  effortTolerance: [          // NEW
    'dont_mind_questions',
    'keep_it_short_at_night'
  ]
}
```

---

## New Session Model Fields

```javascript
classification: {
  topics: Object,              // { work: 0.3, money: 0.8 }
  thoughtForm: String,         // worry | rumination | self_criticism | anger | grief | existential
  primaryEmotions: [String],
  intensity: Number,
  context: {
    timeOfDay: String,
    sleepRelated: Boolean,
    acuteTrigger: String
  },
  cognitiveCapacity: String,   // low | medium | high
  recommendedStrategies: [String],
  classifiedAt: Date
},
microPlan: [String],           // ["breathing", "brief_cbt", "self_compassion", "summary"]
currentMethodIndex: Number     // Track which method we're on
```

---

## Example Flow: Money Worry at Night

### Input:
**Onboarding**:
- Patterns: obsess_mistakes, worry_tomorrow
- Topics: money
- Emotions: anxiety, shame
- Help preference: help_me_be_kinder_to_myself
- Effort tolerance: keep_it_short_at_night

**Vent** (step 3):
> "I'm not making enough money. What if I can't pay rent next month? I keep thinking about how I messed up that project at work."

### Processing:

**1. Classification**:
```javascript
{
  topics: { money: 0.9, work: 0.5, self_worth: 0.6 },
  thoughtForm: "worry",  // Future-oriented "what if"
  primaryEmotions: ["anxiety", "shame"],
  intensity: 7,
  context: {
    timeOfDay: "late_night",
    sleepRelated: true,
    acuteTrigger: "messed up that project"
  },
  cognitiveCapacity: "low"  // Late night + exhausted
}
```

**2. Micro Plan**:
```javascript
// Rules applied:
// - late_night + sleepRelated → start with breathing
// - thoughtForm = worry → brief_cbt
// - helpPreference = be_kinder → add self_compassion
// - effortTolerance = keep_short → trim to essentials
// - late_night + sleepRelated → end with sleep_wind_down

microPlan = [
  "breathing",           // Body first
  "expressive_release",  // Already done
  "self_compassion",     // User prefers this (only 1 core method due to short preference)
  "sleep_wind_down",     // Late night
  "summary"
]
```

**3. Steps Generated**:

**Step 4 - Breathing**:
```
Title: "Let's calm your body first"
Subtitle: "Money worries hit hard at night. Start with 4 slow breaths."
Component: BreathingExercise
Props: { breath_count: 4, inhale_sec: 4, exhale_sec: 6 }
```

**Step 5 - Self-Compassion**:
```
Title: "What would you tell a friend?"
Subtitle: "Your 'I'm a failure' story is showing up with this money worry."
Script lines:
- "Messing up one project doesn't mean you can't pay rent."
- "You're worried because you care, not because you're incapable."
- "Tomorrow you can look at your budget. Tonight, rest."
(User adds their own kind sentence)
```

**Step 6 - Sleep Wind-Down**:
```
Title: "Let's help you stop problem-solving for tonight"
Subtitle: "You can't fix money worries at 2am. Let's get you to sleep."
Component: SleepWindDown
Duration: 180 sec
```

**Step 7 - Summary**:
```
Title: "Here's what you just did"
Accomplishments:
- You named your money worry
- You grounded yourself with breathing
- You practiced self-compassion about the project
- You're ready to let go for tonight

Closing: "Sleep will help you think more clearly about money tomorrow. You've done enough."
```

### Output: 7 steps total, each different, each specific to their money worry, no repetition.

---

## Files Created

1. `backend/src/services/spiralClassifier.js` - Multi-dimensional classification with AI
2. `backend/src/services/microPlanGenerator.js` - Rule-based method sequencing
3. `backend/src/services/stepGenerator_v2.js` - New step realization engine
4. `ARCHITECTURE_UPGRADE_COMPLETE.md` - Full technical documentation
5. `UPGRADE_SUMMARY.md` - This file

## Files Modified

1. `backend/src/models/User.js` - Added emotionalFlavors, helpPreference, effortTolerance
2. `backend/src/models/Session.js` - Added classification object, microPlan, currentMethodIndex
3. `backend/src/controllers/stepController.js` - Uses stepGenerator_v2, tracks method completion

---

## Backend Status

✅ **Running on port 3000**  
✅ **MongoDB connected**  
✅ **New architecture active**

---

## Next Steps to Test

### 1. Clear App Cache
```
Delete Unspiral from Expo Go
Rescan QR code
```

### 2. Create New Account
```
Email: test@example.com
Password: password123
```

### 3. Complete Onboarding
```
Patterns: ✓ Obsess over mistakes
         ✓ Worry about tomorrow
         
Topics: ✓ Money

Emotions: ✓ Anxiety
         ✓ Shame

Help: "Help me be kinder to myself"

Effort: "Keep it short at night"
```

### 4. Start Flow
```
Tap "I'm spiraling"
Rate intensity: 7/10
Vent about money: "I'm not making enough. What if I can't pay rent?"
```

### 5. Watch For:

**✅ You should see**:
- Step 4: Breathing exercise
- Step 5: Self-compassion specifically about money worry
- Step 6: Sleep wind-down
- Step 7: Summary acknowledging your money worry
- **NO REPEATED QUESTIONS**
- Each step references your specific worry

**❌ You should NOT see**:
- Generic "What evidence do you have?"
- Same question twice
- Steps that don't mention money
- Long CBT sequences (because effortTolerance = short)

### 6. Check Console Logs
```
LOG Spiral classified: { thoughtForm: 'worry', topics: {...}, intensity: 7 }
LOG Generated micro plan: ['breathing', 'self_compassion', 'sleep_wind_down', 'summary']
LOG Advanced to next method: self_compassion
```

---

## What Makes This Scientific

### 1. Evidence-Based Method Selection
- **Worry** (future-focused) → CBT (challenge catastrophic predictions)
- **Rumination** (past-focused) → Defusion (unhook from stuck thoughts)
- **Self-criticism** → Self-compassion + CBT reframe
- **Anger** → Expressive release + Defusion
- **Grief** → Acceptance + Self-compassion
- **High arousal** → Body regulation first (breathing/grounding)
- **Low capacity** → Skip heavy cognitive work

### 2. Personalization Hierarchy
1. **Context** (time, sleep, capacity) → Choose methods
2. **Thought form** → Select core intervention
3. **User patterns** → Frame language ("your 'I'm a failure' story")
4. **User topics** → Specific content ("money worry" not "stress")
5. **User words** → Direct quotes ("messed up that project")
6. **Preferences** → Method selection + tone

### 3. Dose-Response
- `effortTolerance: "keep_it_short_at_night"` → 4-5 steps
- `effortTolerance: "dont_mind_questions"` → 7-8 steps
- `cognitiveCapacity: "low"` → Skip deep CBT
- `cognitiveCapacity: "high"` → More challenging questions

---

## Troubleshooting

### If you still see repeated questions:
1. Check `session.microPlan` in MongoDB - should be array
2. Check `session.currentMethodIndex` - should increment
3. Check logs for "Advanced to next method"
4. Verify `checkAndAdvanceMethod()` is being called

### If classification seems off:
1. Check logs for "Spiral classified"
2. Look at `session.classification` in MongoDB
3. Verify user's onboarding data is saved
4. Check spiralClassifier prompt quality

### If methods don't match thought form:
1. Review `generateMicroPlan()` logic in `microPlanGenerator.js`
2. Check classification.thoughtForm value
3. Verify switch statement is working

---

## Summary

🚀 **Unspiral is now a multi-dimensional, method-based, scientifically-grounded spiral engine.**

Instead of:
- "This is about money, here's a generic CBT worksheet"

You get:
- "Your 'I'm a failure' story is showing up with your money worry about the project you think you messed up. Here's what the evidence actually says..."

**No more repeated questions. No more generic advice. True personalization.**

Test it now! 🎯
