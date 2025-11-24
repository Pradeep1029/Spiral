# ✨ AI-Orchestrated Step Flow Complete

**Complete rebuild from chat → beautiful step-by-step wizard guided by AI**

---

## What Changed

### Old System (Chat)
- Free-form chat interface
- User types messages, AI responds
- No clear progress or structure
- Looks like a messaging app

### New System (Step-Based Flow)
- **Wizard-style UI** - one focused task per screen
- **AI as director** - decides which step comes next, what questions to ask
- **Beautiful components** - sliders, cards, progress bars, animations
- **Clear progress** - "Step 2 of 5" with visual progress bar
- **Personalized flow** - 5 steps for one person, 8 for another, based on AI's judgment

---

## Backend Architecture

### New Models
- **SessionStep** - Each step in a flow (type, data, answer, timing)

### New Services
- **stepGenerator.js** - AI Flow Director
  - Returns step JSON objects (not chat messages)
  - Decides next step based on previous answers
  - Personalizes based on user profile
  - Handles crisis detection
  - Adaptive flow (5-7 steps typically)

### New Endpoints
- `GET /sessions/:id/next_step` - Get next step in flow
- `POST /sessions/:id/steps/:stepId/answer` - Submit step answer

### Step Types (15 total)
1. **intro** - Welcome & orientation
2. **intensity_scale** - Rate 1-10 with slider
3. **breathing** - Guided breathing animation
4. **grounding_5_4_3_2_1** - Sensory grounding
5. **dump_text** - Vent in text
6. **dump_voice** - Voice vent
7. **choice_buttons** - Branch ("Calm body" vs "Unpack thought")
8. **cbt_question** - One targeted CBT question
9. **reframe_review** - Show balanced thought, let them tweak
10. **self_compassion_script** - Practice kind phrase
11. **sleep_choice** - Sleep vs action plan
12. **sleep_wind_down** - Cognitive shuffle + breathing
13. **action_plan** - One tiny next step
14. **summary** - What they did, emotional close
15. **crisis_info** - Safety message

---

## Frontend Architecture

### New Components

**Step Components** (`src/components/steps/`)
- `IntroStep.js` - Info card with title/subtitle/description
- `IntensityScaleStep.js` - Slider 1-10 with labels
- `DumpTextStep.js` - Large textarea for venting
- More to be added: breathing, CBT questions, etc.

**Main Screen**
- `FlowScreen.js` - The step orchestrator
  - Fetches next step from API
  - Renders appropriate step component
  - Shows progress bar
  - Handles answer submission
  - Manages flow state

### FlowScreen Features
- **Progress bar** - "Step 2 of 5" with visual fill
- **Close button** - Exit flow anytime
- **Skip button** - For skippable steps (breathing, grounding)
- **Primary CTA** - Changes label based on step ("Next", "I did this", "Continue")
- **Loading states** - Spinner while fetching next step
- **Crisis handling** - Special UI for crisis_info steps
- **Smooth transitions** - Crossfade between steps

---

## How AI Decides Next Step

The AI sees:
1. **Session context** - spiral/checkin/self_compassion
2. **Previous steps** - What user has done already
3. **Previous answers** - User's responses (intensity, vent text, choices)
4. **User profile** - Preferences learned over time
5. **Current step index** - How far along they are

Then outputs:
```json
{
  "step_id": "intro-1",
  "step_type": "intro",
  "title": "You're not alone with this spiral.",
  "subtitle": "We'll take a few minutes...",
  "ui": { "component": "info_card", "props": {} },
  "primary_cta": { "label": "Start", "action": "next_step" },
  "meta": {
    "step_index": 1,
    "step_count": 5,
    "show_progress": true
  }
}
```

---

## Example Flow

**User taps "I'm spiraling"**

### Step 1: intro
- Title: "You're not alone with this spiral."
- Subtitle: "We'll take a few minutes to calm your body..."
- Button: "Start"

### Step 2: intensity_scale
- Title: "How intense does it feel right now?"
- Slider: 1-10
- User selects: 8
- Button: "Next"

### Step 3: dump_text
- Title: "What's your brain yelling at you?"
- Large textarea
- User types: "I keep thinking I screwed up that meeting..."
- Button: "Next"

**[AI classifies: work, shame, 8/10, self-critical]**

### Step 4: breathing
- Title: "Let's calm your body for a minute"
- Breathing animation (inhale 4, exhale 6)
- Button: "I did this" (or "Skip")

### Step 5: cbt_question
- Title: "What exactly are you afraid will happen?"
- Textarea
- User types: "Everyone thinks I'm incompetent now"
- Button: "Next"

### Step 6: reframe_review
- Title: "Here's a more balanced thought:"
- Pre-filled text: "I had a bad moment, but it doesn't erase..."
- User can edit
- Button: "This feels okay"

### Step 7: summary
- Title: "Here's what you just did:"
- Bullets: "You calmed your body", "You challenged the thought"
- Button: "Finish"

**[Flow ends, returns to home]**

---

## Testing the New Flow

### 1. Restart Backend
```bash
cd backend
# Kill any existing processes
lsof -ti:3000 | xargs kill -9
# Start fresh
npm run dev
```

### 2. Start Frontend
```bash
cd mobile
npx expo start
```

### 3. Test on Phone
1. Open app in Expo Go
2. Complete onboarding (if needed)
3. Tap **"I'm spiraling"**
4. **See intro step** with progress bar
5. **Tap "Start"**
6. **See intensity slider**
7. **Slide to 7**, tap "Next"
8. **See text vent screen**
9. Type something, tap "Next"
10. **AI generates next step** (might be breathing, CBT question, etc.)
11. Continue through flow
12. **Finish** → back to home

---

## Design Highlights

### Visual Language
- **Dark gradients** - 0f0c29 → 302b63 → 24243e
- **Glass morphism** - Subtle borders, low opacity backgrounds
- **Large type** - 72px for intensity number, 28px for titles
- **Minimal motion** - Smooth crossfades, no jarring transitions
- **Clear hierarchy** - One main action per screen

### UX Principles
- **One task at a time** - Never overwhelm
- **Clear progress** - Always know where you are
- **Empathetic copy** - "You're not alone", "That sounds heavy"
- **Low cognitive load** - Sliders, not typing (when possible)
- **Skippable exercises** - Breathing can be skipped if they hate it

---

## What's Implemented vs TODO

### ✅ Implemented
- Backend: Step generation service
- Backend: API endpoints for step flow
- Frontend: FlowScreen orchestrator
- Frontend: 3 step components (intro, intensity_scale, dump_text)
- Navigation: Wired to use Flow instead of Chat
- Crisis detection in answers

### ⏳ TODO (for full V1)
Frontend step components:
- [ ] BreathingStep (animated circle)
- [ ] GroundingStep (5-4-3-2-1 inputs)
- [ ] ChoiceButtonsStep (big button options)
- [ ] CBTQuestionStep (targeted question + textarea)
- [ ] ReframeReviewStep (editable pre-filled text)
- [ ] SelfCompassionStep (script display)
- [ ] ActionPlanStep (one tiny action input)
- [ ] SummaryStep (bullets of what they did)

Backend improvements:
- [ ] Better AI prompt tuning (test different flows)
- [ ] Add `classify_spiral` tool call after dump_text
- [ ] Update session topic/emotion based on classification
- [ ] More sophisticated crisis keyword detection

Testing:
- [ ] Test full spiral rescue flow end-to-end
- [ ] Test crisis detection triggers crisis_info step
- [ ] Verify insights still work with step-based sessions

---

## Files Created/Modified

### Backend (New)
- `src/models/SessionStep.js` - Step data model
- `src/services/stepGenerator.js` - AI Flow Director ⭐
- `src/controllers/stepController.js` - Step endpoints

### Backend (Modified)
- `src/routes/sessionRoutes.js` - Added step endpoints

### Frontend (New)
- `src/screens/FlowScreen.js` - Step orchestrator ⭐
- `src/components/steps/IntroStep.js`
- `src/components/steps/IntensityScaleStep.js`
- `src/components/steps/DumpTextStep.js`

### Frontend (Modified)
- `src/navigation/RootNavigator.js` - Use FlowScreen instead of ChatScreen
- `src/screens/NewHomeScreen.js` - Navigate to Flow instead of Chat

---

## Key Differences from Chat Version

| Aspect | Chat | Step Flow |
|--------|------|-----------|
| **UI** | Message bubbles | Full-screen cards |
| **Progress** | Scrolling history | Progress bar (Step 2 of 5) |
| **AI Output** | Text messages | Structured JSON steps |
| **User Input** | Freeform text | Guided (sliders, buttons, specific prompts) |
| **Flow Control** | User decides what to say | AI decides next step |
| **Visual Hierarchy** | Chat timeline | One focused task |
| **Skipping** | N/A | Can skip breathing/grounding |
| **Feel** | Conversational | Guided meditation/therapy |

---

## Success Metrics

The step flow is successful if:
- ✅ User taps "I'm spiraling" and sees a beautiful intro
- ✅ Progress bar updates correctly
- ✅ AI generates logical next steps (intro → intensity → vent → intervention)
- ✅ Flow completes in 5-7 steps (not 20)
- ✅ Each step is visually distinct and clear
- ✅ User never feels lost or overwhelmed
- ✅ Crisis detection works and shows safety info

---

**Status: Core implementation complete, ready for testing!** 🚀

Next: Restart backend, load app, tap "I'm spiraling", and experience the new guided flow!
