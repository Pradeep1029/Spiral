# Unspiral Rebuild Status

**Product Pivot**: From rigid 4-step wizard → AI-first conversational night guide

## ✅ Completed (Backend Milestone 1-2)

### New Data Models
- **Session**: Chat-based sessions with AI classification (topic, emotion, intensity, thinking style)
- **Message**: Individual messages in conversation (user, AI, system)
- **InterventionEvent**: Structured logging of interventions used
- **Feedback**: Post-session ratings and comments
- **Updated User model**: AI-driven profile with learned preferences

### LLM Orchestration Service
- Full OpenAI integration with function calling
- **System prompt**: 60+ line AI night guide personality and behavior rules
- **Functions**:
  - `classify_spiral`: Topic, emotion, intensity, thinking style, recommended paths
  - `log_event`: Session milestones, interventions, intensity ratings
  - `update_profile`: Learn user preferences (hates breathing, prefers logic, etc.)
- Conversation history management (last 20 messages)
- User context injection (profile preferences fed to AI)

### New API Endpoints
- `POST /api/v1/sessions` - Create new session with context (spiral/checkin/self_compassion)
- `POST /api/v1/sessions/:id/messages` - Send message, get AI response with function calling
- `GET /api/v1/sessions` - List user's sessions
- `GET /api/v1/sessions/:id` - Get session details + messages
- `POST /api/v1/sessions/:id/feedback` - Submit 1-5 star rating + comment
- `GET /api/v1/insights` - Brain Map data (topics, time patterns, intensity change, interventions)

### Server Updates
- New routes wired into `server.js`
- Backend now listening on `0.0.0.0:3000` (LAN accessible)
- Legacy routes kept for backward compatibility

---

## 🚧 In Progress

### Frontend Chat UI (Milestone 3)
- Needs rebuild from wizard screens → chat interface
- Real-time message streaming
- Voice input (speech-to-text)
- One-button home screen ("I'm spiraling")

---

## 📋 TODO

### Crisis Detection (Milestone 2.5)
- Content filtering for self-harm/suicidal language
- Auto-trigger safety protocol in AI responses
- Emergency contact info display

### Insights Screen (Milestone 3)
- "Brain Map" visualization
- Topic/time distribution charts
- Intervention effectiveness display
- Intensity before/after trends

### Testing & Refinement (Milestone 4)
- End-to-end conversation flow testing
- System prompt tuning based on real conversations
- Crisis scenario testing
- UX polish (dark mode, animations, copy tweaks)

---

## How to Test Current Backend

### 1. Start backend
```bash
cd backend
npm run dev
# Listening on 0.0.0.0:3000
```

### 2. Create session
```bash
curl -X POST http://192.168.1.87:3000/api/v1/sessions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"context": "spiral"}'
```

Response includes `session.id` and initial AI greeting.

### 3. Send message
```bash
curl -X POST http://192.168.1.87:3000/api/v1/sessions/SESSION_ID/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "I keep thinking I screwed up that meeting and everyone thinks I am useless"}'
```

AI will:
- Call `classify_spiral` (work, shame, 7/10, self-critical)
- Respond with empathy + next step
- Potentially call `log_event` if starting an intervention

### 4. Get insights
```bash
curl http://192.168.1.87:3000/api/v1/insights?days=30 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Returns topic distribution, peak hours, intensity changes, top interventions.

---

## Next Steps

1. **Frontend chat UI** - Replace wizard screens with chat bubbles
2. **Crisis guardrails** - Add content filtering + safety protocol
3. **Voice input** - Integrate Expo speech-to-text
4. **Test conversations** - Run through full spiral rescue flows
5. **Refine prompts** - Adjust based on real user feedback

---

## Key Files Created/Modified

### Backend
- `src/models/Session.js` ✨ NEW
- `src/models/Message.js` ✨ NEW
- `src/models/InterventionEvent.js` ✨ NEW
- `src/models/Feedback.js` ✨ NEW
- `src/models/User.js` ✏️ UPDATED (new profile structure)
- `src/services/llmOrchestrator.js` ✨ NEW (core AI logic)
- `src/controllers/sessionController.js` ✨ NEW
- `src/controllers/insightsController.js` ✨ NEW
- `src/routes/sessionRoutes.js` ✨ NEW
- `src/routes/insightsRoutes.js` ✨ NEW
- `src/server.js` ✏️ UPDATED (wired new routes, listening on 0.0.0.0)

### Frontend
- TBD (chat UI rebuild pending)
