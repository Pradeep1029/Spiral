# Unspiral - Project Overview

## 🌀 What is Unspiral?

Unspiral is a mental health support application designed to help people manage nighttime spirals—those moments when anxious thoughts won't stop and sleep feels impossible. The app provides a structured, compassionate rescue process combining CBT techniques, mindfulness, and self-compassion practices.

## 📱 Platform Support

- **iOS** (Primary - using Expo Go for testing)
- **Android** (Future)
- **Web** (Future)

All platforms share a common backend API.

## 🎯 V1 Core Features

### 1. **Spiral Rescue Flow** (Main Feature)
A 4-step guided process when users are spiraling:
- **Step 1**: Ground the body (breathing exercises)
- **Step 2**: Dump the spiral (write out thoughts)
- **Step 3**: Choose exit path (Think Through vs Let Go)
- **Step 4**: Sleep mode & close

### 2. **Onboarding**
Quick 3-screen setup to understand user patterns:
- Spiral patterns (replay conversations, obsess over mistakes, etc.)
- When spirals happen (before sleep, middle of night, etc.)
- What they spiral about (work, relationships, self-worth, etc.)

### 3. **Quick Check-ins**
Nightly mood check with follow-up actions based on mental state.

### 4. **Self-Compassion Exercises**
Standalone 2-minute exercises for self-kindness.

### 5. **Progress Tracking**
- History of spiral sessions
- Before/after intensity tracking
- Personalized insights
- Streak tracking

### 6. **Notifications**
Optional nightly check-in reminders and milestone encouragements.

## 🏗️ Architecture

### Backend (Node.js + Express + MongoDB)

```
┌─────────────────────────────────────────────────┐
│                 Mobile Apps                      │
│         (iOS, Android, Web via Expo)             │
└───────────────┬─────────────────────────────────┘
                │
                │ HTTP/REST API
                │
┌───────────────▼─────────────────────────────────┐
│              Express Backend                     │
│  ┌──────────────────────────────────────────┐  │
│  │  Authentication & Authorization (JWT)     │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │  Controllers (Business Logic)             │  │
│  │  - Auth, Onboarding, Spirals, CheckIns   │  │
│  │  - Compassion, Progress, Notifications    │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │  Services                                 │  │
│  │  - AI Service (OpenAI reframing)         │  │
│  │  - Scheduler (Notifications)              │  │
│  └──────────────────────────────────────────┘  │
└───────────────┬─────────────────────────────────┘
                │
                │ Mongoose ODM
                │
┌───────────────▼─────────────────────────────────┐
│              MongoDB Atlas                       │
│  ┌──────────────────────────────────────────┐  │
│  │  Collections:                             │  │
│  │  - users                                  │  │
│  │  - spiralsessions                         │  │
│  │  - checkins                               │  │
│  │  - selfcompassionexercises                │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Technology Stack

**Backend:**
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose ODM)
- **Authentication**: JWT + bcrypt
- **Validation**: express-validator
- **Security**: Helmet, rate limiting, sanitization
- **Logging**: Winston
- **Notifications**: Expo Push Notifications
- **Scheduling**: node-cron
- **AI (Optional)**: OpenAI API

**Frontend** (To be built):
- **Framework**: React Native (Expo)
- **State Management**: TBD (Context API, Redux, Zustand)
- **Navigation**: React Navigation
- **UI**: Custom components with modern design
- **Notifications**: Expo Notifications

## 📊 Data Models

### User
- Basic info (email, password or anonymous)
- Onboarding data (patterns, timing, topics)
- Preferences (notifications, check-in time)
- Statistics (total spirals, averages, etc.)
- Push notification tokens

### SpiralSession
- User reference
- Status (in_progress, completed, abandoned)
- Step data (breathing, dump, exit path, close)
- Intensity tracking (before/after)
- Primary topic
- Timestamps and duration

### CheckIn
- User reference
- Mental state (calm, bit_loud, spiraling)
- Optional intensity and notes
- Action taken
- Link to spiral session (if started)

### SelfCompassionExercise
- User reference
- Trigger and feeling
- Custom compassion line
- Helpfulness rating

## 🔐 Security Features

- JWT-based authentication (30-day tokens)
- Password hashing with bcrypt
- Rate limiting on all endpoints
- Input validation and sanitization
- MongoDB injection protection
- Security headers via Helmet
- CORS configuration
- Secure session management

## 🚀 OTA (Over-The-Air) Updates

The backend is designed to support Expo's OTA update system:
- Stateless authentication (JWT)
- Version-agnostic endpoints
- Backward compatibility
- Graceful degradation

This means you can push updates to the Expo app without requiring users to update through app stores (except for major native changes).

## 📱 API Endpoints

### Authentication
- `POST /api/v1/auth/anonymous` - Create anonymous user
- `POST /api/v1/auth/register` - Register with email
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/convert` - Convert anonymous to registered
- `GET /api/v1/auth/me` - Get current user

### Onboarding
- `POST /api/v1/onboarding/complete` - Complete onboarding
- `GET /api/v1/onboarding/status` - Check status

### Spiral Rescue
- `POST /api/v1/spirals/start` - Start session
- `PUT /api/v1/spirals/:id/step` - Update step
- `PUT /api/v1/spirals/:id/complete` - Complete session
- `GET /api/v1/spirals/history` - Get history

### Check-ins
- `POST /api/v1/checkins` - Create check-in
- `GET /api/v1/checkins/history` - Get history
- `GET /api/v1/checkins/stats` - Get statistics

### Self-Compassion
- `POST /api/v1/compassion/exercise` - Save exercise
- `GET /api/v1/compassion/random` - Get random line
- `GET /api/v1/compassion/helpful` - Get most helpful

### Progress
- `GET /api/v1/progress/stats` - Get statistics
- `GET /api/v1/progress/chart` - Get chart data
- `GET /api/v1/progress/insights` - Get insights
- `GET /api/v1/progress/streak` - Get streak info

### Notifications
- `POST /api/v1/notifications/token` - Register push token
- `PUT /api/v1/notifications/preferences` - Update preferences

## 🎨 User Experience Flow

### New User Journey
1. **Open App** → Welcome/Splash screen
2. **Onboarding** (3 screens) → Quick pattern identification
3. **Home Screen** → Big "I'm spiraling" button
4. **Ready to use** → Can start rescue immediately

### Spiral Rescue Journey
1. **Tap "I'm spiraling"** → Session starts
2. **Step 1: Breathing** (1-2 min) → Calm nervous system
3. **Step 2: Dump** (2-3 min) → Write thoughts out
4. **Step 3: Choose path** → Think Through OR Let Go
   - **Think Through**: Question thoughts, reframe, self-compassion
   - **Let Go**: Mindfulness metaphor, grounding exercise
5. **Step 4: Close** → Rate feeling, sleep mode option
6. **Done** → Back to home, session saved

### Progress Check Journey
1. **View History** → See past sessions
2. **Check Stats** → Before/after improvements
3. **Read Insights** → Personalized patterns
4. **Feel encouraged** → Share with friends (optional)

## 🎯 Success Metrics (V1)

1. **Primary**: Users complete spiral rescue sessions
2. **Intensity improvement**: Average 2+ point reduction
3. **Retention**: Users return when spiraling again
4. **Session completion**: >70% of started sessions completed
5. **Recommendation**: Users share with friends organically

## 🔮 Future Enhancements (Post-V1)

### V2 Possibilities
- **Community**: Anonymous support groups
- **Therapist Dashboard**: For users in therapy
- **Advanced AI**: Personalized coping strategies
- **Voice Mode**: Audio-guided sessions
- **Journal**: Long-form reflection space
- **Crisis Detection**: Escalation to professional help
- **Integration**: Export data to therapy apps

### Technical Improvements
- **GraphQL API**: More efficient data fetching
- **Redis Caching**: Faster response times
- **WebSocket**: Real-time features
- **Analytics Dashboard**: Admin insights
- **A/B Testing**: Optimize flows
- **i18n**: Multiple languages

## 📂 Repository Structure

```
unspiral/
├── backend/                    # Node.js API (COMPLETED)
│   ├── src/
│   │   ├── config/            # Database, logger
│   │   ├── models/            # Mongoose schemas
│   │   ├── controllers/       # Request handlers
│   │   ├── routes/            # API routes
│   │   ├── middleware/        # Auth, validation, errors
│   │   ├── services/          # Business logic
│   │   ├── utils/             # Helpers
│   │   └── server.js          # Entry point
│   ├── .env                   # Environment config
│   ├── package.json           # Dependencies
│   └── [Documentation]        # README, guides, examples
│
├── mobile/ (TO BE BUILT)      # Expo React Native app
│   ├── src/
│   │   ├── screens/           # App screens
│   │   ├── components/        # Reusable components
│   │   ├── navigation/        # Navigation setup
│   │   ├── services/          # API calls
│   │   ├── hooks/             # Custom hooks
│   │   └── utils/             # Helpers
│   ├── app.json               # Expo config
│   └── package.json           # Dependencies
│
└── PROJECT_OVERVIEW.md        # This file
```

## 🚦 Current Status

### ✅ Completed
- **Backend API**: Fully functional with all V1 features
- **Database Models**: All schemas defined and indexed
- **Authentication**: JWT-based auth with anonymous support
- **Spiral Rescue**: Complete 4-step flow endpoints
- **Progress Tracking**: Stats, charts, insights, streaks
- **Notifications**: Push notification infrastructure
- **Documentation**: Comprehensive guides and examples
- **Security**: Rate limiting, validation, sanitization
- **Deployment Ready**: Can deploy to Heroku, Railway, etc.

### 🔄 In Progress
- **Frontend**: To be built with Expo

### 📋 Pending
- **Testing**: Unit and integration tests
- **Deployment**: Production deployment
- **Frontend Development**: Entire mobile app
- **App Store Submission**: iOS and Android
- **User Testing**: Beta testing with real users

## 🛠️ Development Commands

```bash
# Backend
cd backend
npm run dev          # Start with auto-reload
npm start            # Production start
npm test             # Run tests (when added)

# Frontend (when built)
cd mobile
npm start            # Start Expo
npm run ios          # Run on iOS simulator
npm run android      # Run on Android emulator
```

## 📖 Documentation Files

- **README.md** - Main project documentation
- **GETTING_STARTED.md** - Quick start guide
- **API_EXAMPLES.md** - Detailed API examples
- **DEPLOYMENT.md** - Production deployment guide
- **PROJECT_OVERVIEW.md** - This file

## 🤝 Contributing Guidelines (Future)

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - Open source and free to use.

## 👥 Team

- **Developer**: Pradeep
- **Target Users**: People experiencing nighttime anxiety spirals

## 🎉 Getting Started

### For Backend Development:
```bash
cd backend
npm run dev
```
See `GETTING_STARTED.md` for details.

### For Frontend Development:
Coming soon! Will use Expo Go for testing.

---

**Built with ❤️ to help people sleep better at night.**
