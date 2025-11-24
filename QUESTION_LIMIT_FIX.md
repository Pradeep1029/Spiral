# ✅ Fixed: Too Many Assessment Questions

## Problem You Reported

The app was asking endless exploratory questions like:
> "Let's dive deeper into your worries about money. What specific thoughts or feelings come up when you think about the possibility of never getting rich? Let's explore that together."

**This is NOT helpful at night.** Users need to calm down, not explore endlessly.

---

## What I Fixed

### 1. **Limited brief_cbt to 1 Question Max**

**Before**:
- Stage 0: First CBT question
- Stage 1: Second CBT question  
- Stage 2: Reframe review

**After**:
- Stage 0: ONE CBT question
- Stage 1: Reframe review (solution)

**Change in `stepGenerator_v2.js`**:
```javascript
case 'brief_cbt':
  if (stage === 0) {
    return `Generate a "cbt_question" step that:
    - Asks ONE specific CBT question about their ACTUAL worry
    - CRITICAL: This is the ONLY assessment question. Next step will be the reframe.
    - Examples:
      * "What evidence do you ACTUALLY have that [their specific fear]?"
      * "If your friend had this thought about [their topic], what would you tell them?"
    - ui.component: "CBTQuestion"`;
  } else {
    return `Generate a "reframe_review" step:
    - Show a balanced thought that addresses their ACTUAL stated worry
    - This should CALM them down, not ask more questions
    - ui.component: "ReframeReview"`;
  }
```

### 2. **Updated System Prompt with Critical Rules**

Added explicit instructions to stop endless assessment:

```
🚨 CRITICAL RULES:
- ASSESSMENT PHASE IS OVER after dump_text. You already know what they're worried about.
- DO NOT ask endless exploratory questions like "What specific thoughts come up?" or "Let's dive deeper"
- MOVE TO SOLUTIONS: reframes, self-compassion, calming interventions
- For brief_cbt: Ask ONE evidence-based question, then immediately give reframe
- For defusion: ONE question about unhooking, then move on
- The goal is to CALM them down, not to explore endlessly
- Keep total session to 5-7 steps MAX
```

---

## New Flow Structure

### Total Steps: 5-7 (Not 10+)

**Example for money worry at night**:

1. **Intro** - "You're not alone with this spiral"
2. **Intensity Scale** - Rate 1-10
3. **Dump Text** - Vent about money worry
   - ✅ **Classification happens here** (automatic)
   - ✅ **Micro plan generated** (automatic)
4. **Breathing** - 4 breaths to calm body
5. **CBT Question** - "What evidence do you ACTUALLY have that you'll run out of money?"
   - ⚠️ **ONLY 1 QUESTION** (not 3+)
6. **Reframe Review** - "You're stressed about money right now, but worrying at night doesn't change your situation. You've paid rent before. Tomorrow you can look at your budget with a clear head."
   - ✅ **SOLUTION, not more questions**
7. **Summary** - What you accomplished

**Total: 7 steps. Quick, focused, calming.**

---

## What Changed in Practice

### ❌ Old Way (Too Many Questions):
```
Step 4: "Let's dive deeper into your worries about money."
Step 5: "What specific thoughts come up when you think about never getting rich?"
Step 6: "How does that make you feel?"
Step 7: "Let's explore that together."
Step 8: "What evidence do you have?"
Step 9: Finally... a reframe
```

**Problem**: 6 assessment questions before any solution!

### ✅ New Way (Fast to Solution):
```
Step 4: Breathing (calm body)
Step 5: "What evidence do you ACTUALLY have that you'll run out of money?"
Step 6: Reframe - "You're stressed about money, but worrying at night doesn't change your bank account. You've handled this before."
Step 7: Summary
```

**Result**: 1 assessment question, immediate solution!

---

## Why This Works Better

### Clinically:
- **Late night + low cognitive capacity** = Can't do deep exploration
- **High anxiety** = Need calming interventions, not more thinking
- **CBT at night** = Quick evidence check → reframe → done

### User Experience:
- **Faster** = 5-7 steps instead of 10+
- **More helpful** = Solutions, not endless questions
- **Less frustrating** = Doesn't feel like therapy homework

---

## Method Breakdown (Max Questions)

| Method | Max Questions | Then What |
|--------|---------------|-----------|
| `brief_cbt` | **1** | → Reframe review |
| `defusion` | **1** | → Next method |
| `acceptance_values` | **1** | → Next method |
| `breathing` | **0** | Just breathe |
| `grounding` | **0** | Just ground |
| `self_compassion` | **0** | Just read script |
| `sleep_wind_down` | **0** | Just wind down |
| `summary` | **0** | Just reflect |

**Total assessment questions per session: 1-2 MAX**

---

## Backend Status

✅ **Auto-reloaded with nodemon**  
✅ **New prompt active**  
✅ **brief_cbt limited to 1 question**  
✅ **Moves to solutions immediately**

---

## Test It Now

1. **Clear app cache** (delete from Expo Go, rescan)
2. **Create new account**
3. **Complete onboarding**
4. **Start flow, vent about money**

**You should see**:
- Intro
- Intensity
- Vent
- Breathing
- **ONE CBT question** (e.g., "What evidence you'll run out of money?")
- **Reframe** (balanced thought, calming)
- Summary

**NO MORE**:
- ❌ "Let's dive deeper"
- ❌ "What specific thoughts come up?"
- ❌ "Let's explore that together"
- ❌ Endless assessment questions

---

## Summary

✅ **Limited to 1 CBT question** before reframe  
✅ **Added critical rules** to system prompt  
✅ **Total session: 5-7 steps** (not 10+)  
✅ **Focus: CALM DOWN**, not explore endlessly  

**The app now moves to solutions fast!** 🎯
