# 🚀 Unspiral Architecture Upgrade - COMPLETE

## What Changed

### ❌ OLD SYSTEM
- Topic-only classification ("this is about money")
- Templated flow based on topic
- AI generated steps randomly
- Step 6 and 7 asked same question
- Generic, not truly personalized

### ✅ NEW SYSTEM
- **Multi-dimensional classification**: topics, thought_form, emotions, intensity, context, capacity
- **Method-based micro-plan**: AI decides sequence of evidence-based methods
- **Step realization from methods**: Each step generated from a method context
- **No more repetition**: Methods complete before advancing
- **True personalization**: Uses user's actual patterns and words

---

## New Architecture (3-Stage)

### Stage 1: Classification
**File**: `backend/src/services/spiralClassifier.js`

After user vents (dump_text), the system calls `classifySpiral()` which uses AI to analyze:

```javascript
{
  topics: { work: 0.3, relationships: 0.8, self_worth: 0.9 },  // Multi-topic weights
  thoughtForm: "self_criticism",  // worry, rumination, anger, grief, existential
  primaryEmotions: ["shame", "anxiety"],
  intensity: 8,
  context: {
    timeOfDay: "late_night",
    sleepRelated: true,
    acuteTrigger: "recent conflict with partner"
  },
  cognitiveCapacity: "low",  // low, medium, high
  recommendedStrategies: ["breathing", "self_compassion", "sleep_wind_down"]
}
```

**Saved to**: `session.classification`

### Stage 2: Micro Plan Generation
**File**: `backend/src/services/microPlanGenerator.js`

Rule-based function `generateMicroPlan()` decides sequence of methods:

**Example for self_criticism + late_night + low_capacity**:
```javascript
[
  "breathing",           // Calm body first
  "expressive_release",  // Vent
  "brief_cbt",           // 2-3 questions + reframe
  "self_compassion",     // Kind self-talk
  "sleep_wind_down",     // Let go for sleep
  "summary"              // Wrap up
]
```

**Rules**:
- If late_night + sleep → start with breathing/grounding
- thought_form === "self_criticism" → brief_cbt + self_compassion
- thought_form === "worry" → brief_cbt + (action_plan if not late_night)
- thought_form === "rumination" → defusion + maybe brief_cbt
- thought_form === "anger" → defusion + self_compassion
- thought_form === "grief" → acceptance_values + self_compassion
- thought_form === "existential" → acceptance_values
- If effortTolerance === "keep_it_short_at_night" → trim to essentials

**Saved to**: `session.microPlan`, `session.currentMethodIndex`

### Stage 3: Step Realization
**File**: `backend/src/services/stepGenerator_v2.js`

For each method, AI generates specific steps:

**Method → Step Mapping**:
- `breathing` → 1x `breathing` step
- `grounding` → 1x `grounding_5_4_3_2_1` step
- `expressive_release` → 1x `dump_text` step
- `brief_cbt` → 2-3x `cbt_question` + 1x `reframe_review`
- `defusion` → 1x `cbt_question` (defusion-focused)
- `self_compassion` → 1x `self_compassion_script`
- `behavioral_micro_plan` → 1x `action_plan`
- `sleep_wind_down` → 1x `sleep_wind_down`
- `acceptance_values` → 1x `cbt_question` or `self_compassion_script` (values-focused)
- `summary` → 1x `summary`

**AI receives**:
- Full user profile (patterns, topics, emotions, preferences, effort tolerance)
- Current session classification (topics, thought_form, emotions, intensity, capacity, trigger)
- Session history (all previous steps + answers)
- Current method label
- Method stage (e.g., brief_cbt stage 2 = second question)

**AI generates**:
```javascript
{
  step_type: "cbt_question",
  title: "What evidence do you ACTUALLY have that your partner thinks you're worthless?",
  // ^ SPECIFIC to their words, not generic
  subtitle: "Your 'I'm a failure' pattern is showing up here",
  // ^ Acknowledges their pattern
  ui: { component: "CBTQuestion", props: {} },
  // ...
}
```

---

## Key Files Created/Modified

### Created:
- `backend/src/services/spiralClassifier.js` - Multi-dimensional classification
- `backend/src/services/microPlanGenerator.js` - Method sequence generation
- `backend/src/services/stepGenerator_v2.js` - New step realization engine

### Modified:
- `backend/src/models/User.js` - Added emotionalFlavors, helpPreference, effortTolerance
- `backend/src/models/Session.js` - Added classification object, microPlan array, currentMethodIndex
- `backend/src/controllers/stepController.js` - Uses new stepGenerator_v2, advances methods properly

---

## How It Works End-to-End

### 1. User starts flow:
```
Frontend → GET /sessions/:id/next_step
```

### 2. Backend checks step count:

**Steps 0-2 (Fixed)**:
- Step 1: intro (welcome)
- Step 2: intensity_scale (rate 1-10)
- Step 3: dump_text (vent)

### 3. After step 3, classification runs:
```javascript
// In stepGenerator_v2.js
if (!session.classification) {
  const userText = dumpStep.answer.text;
  const classification = await classifySpiral(userText, userProfile, sessionContext);
  session.classification = classification;
  await session.save();
}
```

### 4. Micro plan generated:
```javascript
if (!session.microPlan) {
  const microPlan = generateMicroPlan(session.classification, userProfile);
  session.microPlan = microPlan;
  session.currentMethodIndex = 0;
  await session.save();
}
```

**Example microPlan**:
```javascript
["breathing", "expressive_release", "brief_cbt", "self_compassion", "sleep_wind_down", "summary"]
```

### 5. Step realization begins:
```javascript
const { currentMethod, methodStage } = getCurrentMethod(session);
// currentMethod = "breathing", methodStage = 0

const step = await realizeStepFromMethod(session, previousSteps, userProfile, currentMethod, methodStage);
// Returns: breathing step JSON
```

### 6. User completes step:
```
Frontend → POST /sessions/:id/steps/:stepId/answer
Backend → Saves answer, checks if method complete
If complete → advanceToNextMethod(session)
```

### 7. Next step request:
```
currentMethodIndex is now 1
currentMethod = "expressive_release"
Returns: expressive_release step (another dump_text)
```

**This continues through all methods in microPlan.**

---

## Personalization Improvements

### Old Way:
```javascript
// Generic
title: "What evidence do you have for that thought?"
description: "Try to think logically about your worry."
```

### New Way:
```javascript
// Context sent to AI:
User profile: obsess_mistakes, failure_thoughts
Classification: self_criticism, emotions: shame
Previous dump: "I sounded stupid in front of my partner and now I feel like they're realizing I'm worthless."
Current method: brief_cbt, stage: 0

// AI generates:
title: "What actual evidence is there that your partner thinks you're worthless?"
subtitle: "This sounds like your 'I'm a failure' story showing up again."
description: "Let's separate what you feel from what's actually true."
```

**Result**: Specific, validates pattern, uses their exact words.

---

## No More Repeated Questions

### Old Problem:
- Step 6: "What evidence do you have?"
- Step 7: "What evidence do you have?" (SAME QUESTION, prefilled answer)

### New Solution:
```javascript
// brief_cbt method has stages
stage 0: First CBT question
stage 1: Second CBT question (different angle)
stage 2: Reframe review

// After reframe_review completes:
await checkAndAdvanceMethod(session, 'reframe_review');
// Advances to next method (e.g., self_compassion)
```

**Methods can't repeat because they're tracked and completed.**

---

## Effort Tolerance

If `user.onboarding.effortTolerance === "keep_it_short_at_night"`:

```javascript
function trimForShortSession(methods, context) {
  // Keeps:
  // - breathing/grounding
  // - expressive_release
  // - ONE core method (brief_cbt OR self_compassion, not both)
  // - sleep_wind_down (if late night)
  // - summary
  
  // Result: 4-5 steps total instead of 7-8
}
```

---

## System Prompt Changes

### Old Prompt:
```
"Choose steps based on topic. If money, ask about money.
If self-critical, use CBT. Aim for 5-7 steps."
```

### New Prompt (Flow Director):
```
"You do NOT choose flow. You realize ONE step from the given method.

Current method: brief_cbt
Stage: 0
User's classification: self_criticism, topics: { relationships: 0.8, self_worth: 0.9 }
User's dump: 'I sounded stupid in front of my partner...'

Generate ONE cbt_question step that:
- References their ACTUAL words ('sounded stupid', 'partner')
- Acknowledges their pattern (obsess_mistakes, failure_thoughts)
- Asks specific evidence-based question
- Keeps it SHORT if effortTolerance is 'keep_it_short_at_night'

Output ONLY JSON."
```

**AI can't hallucinate flow, only fill in content for the method.**

---

## Testing the New System

### 1. Clear cache, create new account

### 2. Onboarding:
```
Patterns: obsess_mistakes, worry_tomorrow
Topics: money
Emotions: anxiety, shame
Help preference: help_me_be_kinder_to_myself
Effort tolerance: keep_it_short_at_night
```

### 3. Start flow, vent:
```
"I'm not making enough money. What if I can't pay rent next month? 
I keep thinking about how I messed up that project at work."
```

### 4. Expected classification:
```javascript
{
  topics: { money: 0.8, work: 0.5, self_worth: 0.6 },
  thoughtForm: "worry",  // future-oriented
  primaryEmotions: ["anxiety", "shame"],
  intensity: 7,
  cognitiveCapacity: "low",
  acuteTrigger: "messed up that project"
}
```

### 5. Expected microPlan:
```javascript
[
  "breathing",           // Late night + anxiety
  "expressive_release",  // Already done (dump_text)
  "brief_cbt",           // Challenge catastrophic money thoughts
  "self_compassion",     // User wants to be kinder (helpPreference)
  "sleep_wind_down",     // Late night + low capacity
  "summary"
]
```

BUT with `effortTolerance: "keep_it_short_at_night"`, trimmed to:
```javascript
[
  "breathing",
  "expressive_release",
  "self_compassion",  // Only one core method (user preference)
  "sleep_wind_down",
  "summary"
]
```

### 6. Steps you'll see:
1. intro
2. intensity_scale
3. dump_text
4. **breathing** - "Let's ground you before we go further"
5. **self_compassion_script** - "Here's what you might say to a friend worrying about money: [specific kind phrases about money stress, not generic]"
6. **sleep_wind_down** - "Let's help you stop problem-solving for tonight"
7. **summary** - "You named your money worry, you practiced self-compassion, you're ready to rest"

**NO REPEATED QUESTIONS. Each step different and purposeful.**

---

## Summary

✅ Multi-dimensional classification (topics, thought_form, emotions, capacity)  
✅ Method-based micro-planning (scientific, rule-based)  
✅ Step realization from methods (AI fills content, not flow)  
✅ No more repeated questions (methods tracked and completed)  
✅ True personalization (uses patterns, actual words, preferences)  
✅ Effort tolerance (short sessions at night)  
✅ Smart method selection (worry → CBT, rumination → defusion, self-criticism → compassion)  

**The app is now scientifically grounded, truly personalized, and won't repeat itself.**

Restart backend to apply changes! 🚀
