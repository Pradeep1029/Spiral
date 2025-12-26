# Implementation Guide: Aligning Unspiral with Product Spec

## What Was Built

### ✅ **Core Infrastructure (Completed)**

1. **AI Router Service** (`/backend/src/services/aiRouter.js`)
   - OpenAI-powered path selection (SOLVE/REFRAME/PARK/CONNECT)
   - AI-generated CBT steps personalized to spiral text
   - Crisis detection with keyword filtering
   - JSON schema validation for all AI outputs
   - Fallback templates when AI fails

2. **Personalization Service** (`/backend/src/services/personalizationService.js`)
   - Tracks which paths work best per user
   - Analyzes last 10 sessions for effectiveness
   - Adaptive regulation mode selection
   - Path recommendation based on historical success

3. **Updated Reset Controller** (`/backend/src/controllers/resetController.js`)
   - Integrated AI router for `/reset/plan` endpoint
   - Personalization-aware path selection
   - AI reasoning tracking in session data

4. **New API Endpoints**
   - `POST /api/v1/reset/plan` - AI-powered intervention generation
   - `GET /api/v1/personalization/recommendations/:userId?` - Get user's best paths

5. **Enhanced Data Model** (`/backend/src/models/ResetSession.js`)
   - Added `aiReasoning` field to track AI's path selection logic
   - Added `aiGenerated` boolean to distinguish AI vs template content

---

## What Already Existed (Good Foundation)

### ✅ **Session Flow Structure**
The current `ResetSessionScreen.js` already implements:
- **Step 0 (Prime):** Implementation intention, quick finish option
- **Step 1 (Intensity):** Pre-session intensity check
- **Step 2 (Regulate):** Adaptive breathing/grounding/humming with timers
- **Step 3 (Capture):** Spiral text capture (text input)
- **Step 4 (CBT):** Dynamic path execution with 3-step structure
- **Step 5 (Closure):** Breathing ritual + post-intensity check
- **Summary:** Optional reflection step

### ✅ **Completion Priming**
- Progress bar with percentage and steps left
- Session resumability with draft persistence
- Implementation intention message
- Quick finish mode (2-minute compressed version)

### ✅ **Event Tracking**
- Comprehensive event logging infrastructure
- Events synced to backend after each step

---

## Gaps Addressed

### 🔧 **1. AI Router Integration**

**Before:** Simple keyword matching for path selection
```javascript
// Old approach
if (isConnectSpiral(spiralText)) path = 'CONNECT';
else if (isSolveSpiral(spiralText)) path = 'SOLVE';
```

**After:** AI-powered analysis with user history
```javascript
// New approach
plan = await aiRouter.routeAndGenerate({
  spiralText,
  intensityPre,
  userHistory,  // Last 5 sessions
  quickFinish,
});
```

**Impact:**
- More accurate path selection
- Personalized based on what worked before
- AI generates custom CBT steps instead of templates

---

### 🔧 **2. Personalization Engine**

**Before:** Same experience for everyone

**After:** Learns from user history
```javascript
// Adaptive regulation
const recommendedObject = personalizationService.shouldUseAdaptiveRegulation({
  intensityPre,
  userHistory,
});

// If breathing hasn't worked in last 5 sessions → Switch to grounding
```

**Impact:**
- Users get regulation modes that work for them
- Path selection considers past effectiveness
- Better outcomes over time

---

### 🔧 **3. AI Guardrails**

**Before:** No constraints on AI output

**After:** Strict validation and crisis detection
```javascript
// Crisis detection
if (detectCrisis(spiralText)) {
  return { path: 'CRISIS_ROUTE', ... };
}

// JSON schema validation
if (!validatePathOutput(parsed)) {
  return getFallbackPlan({ path, spiralText });
}
```

**Impact:**
- Safe AI outputs (no diagnosis, medical advice, false promises)
- Crisis situations handled immediately
- Reliable fallbacks when AI fails

---

## What Still Needs to Be Done

### 🚧 **1. Voice Input for Spiral Capture**

**Current:** Text-only input
**Required:** Voice-first with text fallback

**Implementation:**
```javascript
// Add to ResetSessionScreen.js
import * as Audio from 'expo-av';

const recordVoice = async () => {
  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  // ... handle recording
};
```

**Files to modify:**
- `/mobile/src/screens/ResetSessionScreen.js` - Add voice recording UI
- Add Expo Audio dependency to `package.json`

---

### 🚧 **2. Mobile App Integration with New API**

**Current:** Mobile calls `/reset/plan` but doesn't send `user_id` or handle `ai_reasoning`

**Required changes to `ResetSessionScreen.js`:**

```javascript
// In fetchPlanAndCreateSession()
const payload = {
  emotion: 'worry',
  intensity_pre: intensityPre,
  intensity_mid: intensityMid,
  spiral_text: spiralText?.trim() || null,
  user_id: userId,  // ADD THIS (from auth context)
  quick_finish: quickFinish,  // ADD THIS
};

const res = await api.post('/reset/plan', payload);
const plan = res.data?.data;

// Store AI reasoning for analytics
if (plan.ai_reasoning) {
  logEvent('path_chosen', { 
    path: plan.path, 
    ai_reasoning: plan.ai_reasoning 
  });
}
```

---

### 🚧 **3. Enhanced Event Tracking**

**Missing events:**
- `path_chosen` (with ai_reasoning)
- More granular CBT step tracking

**Add to ResetSessionScreen.js:**
```javascript
// After plan is fetched
logEvent('path_chosen', { 
  path: plan.path, 
  ai_reasoning: plan.ai_reasoning,
  ai_generated: true 
});

// In CBT step completion
logEvent('cbt_step_completed', { 
  index: cbtIndex, 
  type: current.type, 
  path: plan.path,
  answer_length: answerValue?.length || 0
});
```

---

### 🚧 **4. User Authentication (Optional but Recommended)**

**Current:** Anonymous sessions only

**For personalization to work best:**
- Add user authentication (Firebase, Auth0, or custom)
- Pass `user_id` to all API calls
- Track sessions per user for better recommendations

**Without auth:**
- Personalization still works using device-local session history
- Less accurate over time (can't track across devices)

---

## Testing the New System

### **1. Test AI Router**

```bash
# Start backend with OpenAI API key
cd backend
echo "OPENAI_API_KEY=sk-..." >> .env
npm run dev
```

**Test path selection:**
```bash
curl -X POST http://localhost:3000/api/v1/reset/plan \
  -H "Content-Type: application/json" \
  -d '{
    "spiral_text": "I have to finish this report by tomorrow and I have no idea how",
    "intensity_pre": 7,
    "quick_finish": false
  }'

# Expected: path = "SOLVE" with 3 actionable steps
```

```bash
curl -X POST http://localhost:3000/api/v1/reset/plan \
  -H "Content-Type: application/json" \
  -d '{
    "spiral_text": "Everyone thinks I am stupid and I am going to fail",
    "intensity_pre": 8,
    "quick_finish": false
  }'

# Expected: path = "REFRAME" with distortion = "mind_reading" or "catastrophizing"
```

---

### **2. Test Personalization**

**Create some sessions:**
```bash
# Session 1: REFRAME path
curl -X POST http://localhost:3000/api/v1/reset/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "emotion": "worry",
    "intensity_pre": 8,
    "intensity_post": 4,
    "cbt_path": "REFRAME",
    "spiral_text": "Test spiral"
  }'

# Session 2: SOLVE path
curl -X POST http://localhost:3000/api/v1/reset/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "emotion": "worry",
    "intensity_pre": 7,
    "intensity_post": 3,
    "cbt_path": "SOLVE",
    "spiral_text": "Test spiral 2"
  }'
```

**Get recommendations:**
```bash
curl http://localhost:3000/api/v1/personalization/recommendations

# Expected: pathRecommendation based on which had better intensity drop
```

---

### **3. Test Crisis Detection**

```bash
curl -X POST http://localhost:3000/api/v1/reset/plan \
  -H "Content-Type: application/json" \
  -d '{
    "spiral_text": "I want to kill myself",
    "intensity_pre": 10
  }'

# Expected: path = "CRISIS_ROUTE" with exit button
```

---

## Environment Variables Required

Add to `/backend/.env`:

```bash
# OpenAI API Key (REQUIRED for AI router)
OPENAI_API_KEY=sk-proj-...

# MongoDB connection
MONGODB_URI=mongodb://localhost:27017/unspiral

# Server config
PORT=3000
NODE_ENV=development

# CORS (for mobile app)
CORS_ORIGINS=http://localhost:19006,exp://
```

---

## Mobile App Changes Summary

### **Files to Modify:**

1. **`/mobile/src/screens/ResetSessionScreen.js`**
   - Add `user_id` to `/reset/plan` request
   - Add `quick_finish` to request payload
   - Handle `ai_reasoning` in response
   - Add `path_chosen` event logging
   - (Optional) Add voice recording for spiral capture

2. **`/mobile/src/services/api.js`**
   - No changes needed (already configured)

3. **`/mobile/package.json`**
   - Add `expo-av` for voice recording (if implementing voice)

---

## Deployment Checklist

### **Backend:**
- [ ] Set `OPENAI_API_KEY` environment variable
- [ ] Verify MongoDB connection
- [ ] Test `/reset/plan` endpoint with various spiral texts
- [ ] Monitor AI costs (GPT-4o-mini is ~$0.15 per 1M tokens)
- [ ] Set up error logging for AI failures

### **Mobile:**
- [ ] Update API calls to include `user_id` and `quick_finish`
- [ ] Test with real spiral texts
- [ ] Verify event tracking is working
- [ ] Test session resumability
- [ ] (Optional) Implement voice input

### **Monitoring:**
- [ ] Track AI router success rate (% of valid JSON outputs)
- [ ] Monitor path distribution (are all 4 paths being used?)
- [ ] Track intensity drops by path
- [ ] Monitor session completion rates

---

## Cost Estimates

### **OpenAI API (GPT-4o-mini):**
- Per session: ~500 tokens (input) + 200 tokens (output) = 700 tokens
- Cost: ~$0.0001 per session
- 10,000 sessions/month = ~$1/month

**Very affordable for this use case.**

---

## Next Steps

1. **Set up OpenAI API key** in backend `.env`
2. **Test AI router** with various spiral texts
3. **Update mobile app** to send `user_id` and `quick_finish`
4. **Monitor AI outputs** for quality and adjust prompts if needed
5. **Implement voice input** (optional but recommended)
6. **Add user authentication** for better personalization
7. **Deploy and monitor** session completion rates and intensity drops

---

## Key Differences from Old System

| Aspect | Old System | New System |
|--------|-----------|------------|
| **Path Selection** | Keyword matching | AI analysis + user history |
| **CBT Steps** | Hardcoded templates | AI-generated, personalized |
| **Personalization** | None | Learns from last 10 sessions |
| **Regulation** | Fixed by intensity | Adaptive based on history |
| **Crisis Handling** | Keyword detection | Keyword + AI guardrails |
| **Fallbacks** | Generic templates | Path-specific templates |
| **Cost** | $0 | ~$0.0001 per session |

---

## Troubleshooting

### **AI Router Returns Invalid JSON**
- Check OpenAI API key is set
- Verify internet connection
- Check logs for AI response
- System will fallback to templates automatically

### **Personalization Not Working**
- Ensure sessions have `intensityPre` and `intensityPost`
- Check that `cbtPath` is being saved
- Verify user has at least 3 completed sessions

### **Crisis Route Not Triggering**
- Check spiral text contains crisis keywords
- Verify `detectCrisis()` function is working
- Test with: "I want to kill myself"

---

## Success Metrics to Track

1. **AI Router Accuracy**
   - % of sessions where AI returns valid JSON
   - % of sessions using AI vs fallback templates

2. **Path Effectiveness**
   - Avg intensity drop by path (SOLVE vs REFRAME vs PARK vs CONNECT)
   - Completion rate by path

3. **Personalization Impact**
   - Do users with 5+ sessions have better outcomes?
   - Does adaptive regulation improve intensity drops?

4. **Overall Outcomes**
   - Session completion rate (target: >70%)
   - Avg intensity drop (target: 2+ points)
   - Time to completion (target: 4-5 minutes)
