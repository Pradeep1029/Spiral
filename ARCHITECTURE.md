# Unspiral Architecture - AI-Powered 5-Step State Machine

## Overview

Unspiral is a **tightly-choreographed 5-minute intervention engine** designed to help users break out of nighttime anxiety spirals. The system follows a precise 5-step state machine with behavioral science baked into every interaction.

## Core Philosophy

- **Not a journaling app** - It's a structured intervention with exact timing
- **AI-constrained, not AI-creative** - AI operates within strict templates and guardrails
- **Personalized through data** - Learns which interventions work best per user
- **Completion-focused** - Every design decision optimizes for session completion

---

## 5-Step State Machine

### **Step 0: Priming/Commitment (15 seconds)**
**Purpose:** Create implementation intention to prevent dropout

**Flow:**
- Display: "Give me 4 minutes. We'll end with a calm reset."
- Implementation intention: "If I feel like quitting, I'll do the next 20 seconds."
- Choice: "Start (I'm in)" or "Quick finish (2 min)"
- Progress bar shows: 0%, 7 steps left

**Events tracked:**
- `prime_shown`
- `commit_tapped`
- `quick_finish_selected`

---

### **Step 1: Intensity Check (5 seconds)**
**Purpose:** Baseline measurement for personalization

**Flow:**
- Question: "How intense is it? Right now."
- Slider: 0-10
- No explanation, just the number

**Events tracked:**
- `intensity_pre` (value)

**Adaptive logic:**
- If intensity ≥ 8 → Force grounding_tap for regulation
- If intensity < 8 → Use personalized regulation preference

---

### **Step 2: Regulation (60-90 seconds)**
**Purpose:** Physiological downshift before cognitive work

**Modes (adaptive):**
1. **Breathing Orb** (default)
   - Animated orb: inhale 4s, exhale 6s
   - "Follow the orb. Exhale a little longer."
   - Duration: 75s (60s if quick_finish)

2. **Grounding Tap** (high intensity or breathing doesn't work)
   - 4-corner tapping sequence
   - "Tap the lit corner. Feel your fingers."
   - Duration: 70s (55s if quick_finish)

3. **Hum Hold** (fallback if first mode fails)
   - Press and hum, feel vibration
   - Duration: 70s (55s if quick_finish)

**Adaptive fallback logic:**
- After regulation, check intensity_mid
- If improvement < 1 point AND not already using fallback → Switch to next mode
- Track which mode worked in user history

**Events tracked:**
- `regulation_started` (mode, fallback)
- `regulation_done` (mode, skipped)
- `intensity_mid` (value)

---

### **Step 3: Spiral Capture (20-30 seconds)**
**Purpose:** Externalize the thought in one sentence

**Flow:**
- Prompt: "Say it in one sentence."
- Subtext: "Short. Honest. One line is enough."
- Voice button (primary) or text input (fallback)
- Max length: ~100 characters

**Events tracked:**
- `spiral_text_captured` (length, voice_or_text)

**Critical:** This text feeds the AI router for path selection

---

### **Step 4: CBT Core (2-3 minutes)**
**Purpose:** Execute personalized intervention based on AI-selected path

#### **AI Router Logic**

The AI router analyzes:
1. Spiral text content
2. Current intensity
3. User's last 5 sessions (which paths worked)

Then selects ONE of 4 paths:

---

#### **Path A: SOLVE** (Actionable Problems)
**When to use:** Spiral mentions tasks, deadlines, emails, concrete actions

**3-Step Structure:**
1. **Shrink** (prompt)
   - "Shrink it to the smallest solvable version (10 words)."
   - User types condensed version

2. **Choose Action** (choice)
   - "Pick one next physical step:"
   - 3 AI-generated options (e.g., "Open the doc and write first 2 sentences")

3. **Do It** (timer_action)
   - "2 minutes: do the smallest next physical step."
   - Timer starts, user takes action

**Closure line:** "You're back in control of the next step."

---

#### **Path B: REFRAME** (Thinking Traps)
**When to use:** Catastrophizing, mind-reading, all-or-nothing, fortune-telling

**3-Step Structure:**
1. **Evidence For** (prompt)
   - "Tap 1 fact that supports the fear (one bullet)."
   - User writes one supporting fact

2. **Evidence Against** (prompt)
   - "Tap 1 fact that doesn't support it (one bullet)."
   - User writes one contradicting fact

3. **Balanced Thought** (choice)
   - "Pick a balanced thought:"
   - 3 AI-generated options (e.g., "This is hard, not doomed.")

**Distortion labeling:** AI identifies the specific cognitive distortion

**Closure line:** "You don't have to believe every thought to move forward."

---

#### **Path C: PARK** (Uncertainty/Hypothetical)
**When to use:** "What if", uncertainty, no clear action possible

**3-Step Structure:**
1. **Park It** (action)
   - "Park this worry for now."
   - Button: "Put it in the Worry Jar"
   - Animation of worry being contained

2. **Acceptance Line** (choice)
   - "Pick an uncertainty line (no promises):"
   - 3 options (e.g., "I can handle not knowing for a while.")

3. **Return to Life** (timer_action)
   - "2 minutes: return-to-life action (tiny, physical)."
   - User does something grounding

**Closure line:** "You can handle not knowing for now."

---

#### **Path D: CONNECT** (Relationship Spirals)
**When to use:** Mentions people, relationships, conflicts, communication needs

**3-Step Structure:**
1. **Communication Goal** (choice)
   - "What's the goal?"
   - Options: Clarity, Repair, Boundary, Reassurance request

2. **Script It** (prompt)
   - "Use this 2-sentence script (edit if needed):"
   - Template: "When X happened, I felt Y. What I need next is Z."

3. **Send or Save** (timer_action)
   - "2 minutes: send it, or write it in Notes."
   - User takes action

**Closure line:** "Clarity beats rumination—one honest sentence is enough."

---

#### **CRISIS_ROUTE** (Crisis Detection)
**Triggered by keywords:** kill myself, suicide, self harm, overdose, etc.

**Flow:**
- Immediate exit from normal flow
- Display crisis resources
- Button: "Exit session"
- No CBT intervention

**Events tracked:**
- `crisis_route_triggered`
- `crisis_route_exit`

---

### **Step 5: Closure (30-45 seconds)**
**Purpose:** Calm landing, final intensity check, reflection

**Flow:**
1. **Closing ritual**
   - "3 slow breaths. Feel the exhale."
   - 30-second timer (20s if quick_finish)

2. **Intensity post** (slider 0-10)
   - "Intensity now?"

3. **Confidence check** (slider 0-10)
   - "Confidence to cope?"

**Events tracked:**
- `closure_started`
- `intensity_post` (value)
- `confidence_post` (value)

---

## AI Router Implementation

### **Path Selection Prompt**

```
System: You are a CBT intervention router for Unspiral.

Analyze the spiral and choose ONE path:
- SOLVE: Actionable problems
- REFRAME: Thinking traps
- PARK: Uncertainty
- CONNECT: Relationship issues

Rules:
- NEVER diagnose
- NEVER promise certainty
- Focus on what user can control NOW

Output JSON: { "path": "...", "reasoning": "..." }
```

### **CBT Step Generation Prompt**

```
System: Generate 3-step [PATH] intervention.

Step structure for [PATH]:
[Path-specific instructions]

Output JSON:
{
  "label": "...",
  "distortion": "..." (REFRAME only),
  "steps": [
    { "type": "...", "text": "...", ... }
  ]
}

Rules:
- NEVER diagnose or give medical advice
- NEVER promise outcomes
- Keep language direct and grounded
- Exactly 3 steps
```

### **JSON Schema Validation**

All AI outputs are validated against strict schemas:
- Path must be one of: SOLVE, REFRAME, PARK, CONNECT
- Steps array must have exactly 3 items
- Each step must have valid type: prompt, choice, action, timer_action
- Choice steps must have 2+ options
- Timer steps must have seconds value

**Fallback:** If AI fails or returns invalid JSON, use hardcoded templates

---

## Personalization Engine

### **Data Tracked Per Session**
- Path used (SOLVE/REFRAME/PARK/CONNECT)
- Intensity drop (pre - post)
- Session completed (boolean)
- Regulation mode used
- Duration
- Quick finish mode

### **Learning Algorithm**

For each user, track last 10 sessions:

1. **Path Effectiveness Score**
   - `score = (avg_intensity_drop * 0.6) + (success_rate * 10 * 0.4)`
   - Rank paths by score
   - Feed top-performing path to AI router as context

2. **Regulation Preference**
   - Track which mode (breathing/grounding/humming) correlates with best intensity drops
   - If breathing_orb success rate < 40% over 5 sessions → Default to grounding_tap

3. **Adaptive Routing**
   - AI router receives user history: `[{path, intensityDrop, worked}, ...]`
   - AI considers past effectiveness when selecting path

---

## Completion Priming Mechanisms

### **1. Implementation Intention**
- Shown at Step 0: "If I feel like quitting, I'll do the next 20 seconds."
- Reduces dropout by creating pre-commitment

### **2. Progress Bar**
- Always visible: "X steps left | Y%"
- Creates sunk cost effect

### **3. Session Resumability**
- Draft saved after every step
- On return: "Finish the last 90 seconds."
- Button: "Resume" or "Discard"

### **4. Quick Finish Option**
- 2-minute compressed version
- Same 5 steps, shorter timers
- Reduces barrier to entry

---

## Event Tracking (Comprehensive)

### **Session Lifecycle**
- `prime_shown`
- `commit_tapped`
- `quick_finish_selected`

### **Intensity Checks**
- `intensity_pre` (value)
- `intensity_mid` (value)
- `intensity_post` (value)
- `confidence_post` (value)

### **Regulation**
- `regulation_started` (mode, fallback, quick)
- `regulation_done` (mode, skipped)

### **Spiral Capture**
- `spiral_text_captured` (length, voice_or_text)

### **CBT Core**
- `path_chosen` (path, ai_reasoning)
- `cbt_step_completed` (index, type, path)
- `cbt_action` (index, path)
- `timer_action_done` (path)
- `timer_action_skipped` (path)

### **Closure**
- `closure_started`

### **Session End**
- `session_completed`
- `session_resumed`
- `dropoff_step` (if quit mid-session)
- `crisis_route_triggered`
- `exit` (crisis)

---

## API Endpoints

### **POST /api/v1/reset/plan**
**Purpose:** AI-powered path selection and CBT step generation

**Request:**
```json
{
  "spiral_text": "I'm going to fail this presentation",
  "intensity_pre": 8,
  "user_id": "optional",
  "quick_finish": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "path": "REFRAME",
    "label": "Thinking-trap spiral",
    "distortion": "catastrophizing",
    "steps": [
      { "type": "prompt", "text": "..." },
      { "type": "prompt", "text": "..." },
      { "type": "choice", "text": "...", "options": [...] }
    ],
    "closure_line": "You don't have to believe every thought to move forward.",
    "object": "breathing_orb",
    "ai_reasoning": "User is catastrophizing about future event"
  }
}
```

### **POST /api/v1/reset/sessions**
**Purpose:** Create new session

### **PATCH /api/v1/reset/sessions/:id/progress**
**Purpose:** Update session state (called after each step)

### **PATCH /api/v1/reset/sessions/:id/end**
**Purpose:** Mark session complete

### **GET /api/v1/personalization/recommendations/:userId?**
**Purpose:** Get personalized recommendations

**Response:**
```json
{
  "success": true,
  "data": {
    "pathRecommendation": "REFRAME",
    "pathStats": {
      "REFRAME": { "count": 5, "avgDrop": 3.2, "successRate": 0.8 },
      "SOLVE": { "count": 2, "avgDrop": 2.5, "successRate": 0.5 }
    },
    "regulationPreference": "breathing_orb",
    "totalSessions": 7,
    "hasEnoughData": true
  }
}
```

---

## AI Guardrails

### **Hard Blocks**
1. **No diagnosis:** "You have anxiety disorder" → BLOCKED
2. **No medical advice:** "You should take medication" → BLOCKED
3. **No certainty promises:** "You'll be fine" → BLOCKED
4. **No overly reassuring:** "Everything will work out" → BLOCKED

### **Crisis Detection**
- Keyword scanning: kill myself, suicide, self harm, overdose
- Immediate route to CRISIS_ROUTE
- No CBT intervention, just resources

### **JSON Schema Enforcement**
- All AI outputs validated against strict schemas
- Invalid outputs → Fallback to templates
- Logged for monitoring

---

## Mobile Integration

### **State Management**
- Local draft persistence (AsyncStorage)
- Resume flow on app reopen
- Progress synced to backend after each step

### **Voice Input**
- Primary input method for spiral capture
- Text as fallback
- Audio transcription via Expo Audio

### **Timing Enforcement**
- Timers run client-side
- Can skip, but not extend
- Auto-advance when timer completes

---

## Success Metrics

### **Completion Rate**
- Target: >70% of started sessions complete
- Track dropoff_step to identify friction points

### **Intensity Drop**
- Target: Avg 2+ point drop (pre → post)
- Segment by path to identify most effective

### **Path Effectiveness**
- Which paths have highest intensity drops?
- Which paths have highest completion rates?

### **Personalization Impact**
- Do users with 5+ sessions have better outcomes?
- Does AI router improve over keyword matching?

---

## Future Enhancements

1. **Voice-guided sessions** - Audio instructions throughout
2. **Autopilot mode** - Proactive notifications at 2-4am
3. **Dream Trails integration** - Sleep game for PARK path
4. **Multi-language support** - Localized prompts and AI
5. **Therapist dashboard** - Aggregate anonymized data

---

## Technical Stack

**Backend:**
- Node.js + Express
- MongoDB (Mongoose)
- OpenAI GPT-4o-mini
- Winston logging

**Mobile:**
- React Native (Expo)
- AsyncStorage (local persistence)
- Expo Audio (voice input)
- Axios (API client)

**AI:**
- GPT-4o-mini for path selection and step generation
- JSON mode for structured outputs
- Temperature 0.3-0.4 for consistency
- Fallback templates for reliability
