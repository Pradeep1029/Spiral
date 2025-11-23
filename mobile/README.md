# Unspiral Mobile (Expo)

Premium, dark, minimal frontend for the Unspiral backend.

## Stack

- Expo SDK 50 (React Native)
- React Navigation (stack + bottom tabs)
- Axios for API calls
- AsyncStorage for auth token
- Expo Notifications for push

## API Base URLs

- **Development (Expo dev)**: `http://localhost:3000/api/v1`
- **Production (builds)**: `https://spiral.railway.internal/api/v1`

The base URL is selected automatically in `src/services/api.js` using `__DEV__`.

## Running the App

### 1. Start the backend

In a separate terminal:

```bash
cd backend
npm run dev
```

### 2. Install mobile dependencies

```bash
cd mobile
npm install
```

### 3. Start Expo

```bash
npx expo start
```

- Use **Expo Go** on your iOS device.
- Make sure your phone and Mac are on the **same Wi-Fi network**.
- If the device cannot reach `localhost`, switch the dev base URL in `src/services/api.js` to your Mac’s LAN IP (for example `http://192.168.1.50:3000/api/v1`).

## Main Flows Implemented

### Onboarding (3 screens)

- Patterns: replay conversations, obsess mistakes, worry tomorrow, failure thoughts.
- Timing: before sleep, middle of night, random.
- Topics: work/study, relationships, money, health, myself.

### Home Screen

- Big primary button: **“I’m spiraling”** → full Spiral Rescue flow.
- Secondary: **“I’m okay, just checking in”** → Quick check-in flow.
- Secondary: **“I’m being harsh on myself”** → self-compassion shortcut.
- Safety link at bottom → crisis info screen.

### Spiral Rescue Flow

1. **Step 0**: Ask for starting intensity (1–5), start session via `/spirals/start`.
2. **Step 1 – Ground**: Breathing guidance and skip option, saved via `/spirals/:id/step`.
3. **Step 2 – Dump**: Free-text spiral dump saved to step 2.
4. **Step 3 – Exit path**:
   - **Think it through**: 3 questions, template reframe, self-kindness line.
   - **Let it float by**: metaphor chips + 5–4–3–2–1 grounding.
5. **Step 4 – Close**: intensity after, choose `try_sleep` vs `calm_more`, optional wind-down flag, complete via `/spirals/:id/complete`.

### Self-Compassion Shortcut

- Feeling picker (ashamed, stupid, anxious, angry, sad, guilty, worthless, other).
- Optional custom feeling.
- One custom compassion line.
- Saved via `POST /compassion/exercise`.

### Quick Check-in

- Options: **Calm**, **A bit loud**, **Spiraling**.
- Saves via `POST /checkins`.
- If “Spiraling” → deep-links straight into Spiral Rescue.

### History & Progress

- **History tab**: calls `/spirals/history`, shows recent sessions with intensity before/after and topic.
- **Progress tab**: calls `/progress/stats`, `/progress/insights`, `/progress/streak` and displays:
  - Total rescues and average before/after.
  - Simple before/after bar visualization.
  - Insight cards and streak summary.

### Settings & Notifications

- Reads preferences from `/notifications/preferences`.
- Requests push permission and registers Expo token via `/notifications/token` when enabling notifications.
- Toggles `enableNotifications` via `/notifications/preferences`.
- Shows clear safety and “recommend to a friend” copy.

## Notes

- Fonts: using system fonts with carefully chosen sizes and weights for a premium feel.
- Theme: dark navy background, soft gradients, warm yellow accent (`#F9E66A`).
- All flows are designed to be short, focused, and easy to use from bed.
