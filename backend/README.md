# Unspiral Backend API

Backend server for Unspiral - A mental health support app for managing nighttime spirals.

## Features

- **User Authentication**: Secure JWT-based authentication
- **Spiral Rescue Flow**: Complete 4-step guided rescue sessions
- **Self-Compassion**: Quick self-compassion exercises
- **History & Progress**: Track spiral sessions and progress over time
- **Notifications**: Nightly check-in reminders
- **OTA Updates Support**: Built for Expo's over-the-air updates

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT + bcrypt
- **Security**: Helmet, rate limiting, input sanitization
- **Notifications**: Expo Push Notifications

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- MongoDB Atlas account (or local MongoDB)
- npm >= 9.0.0

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration

### Running the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication Endpoints

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user profile

### Onboarding Endpoints

- `POST /onboarding/complete` - Save onboarding responses
- `GET /onboarding/status` - Check onboarding completion status

### Spiral Session Endpoints

- `POST /spirals/start` - Start a new spiral rescue session
- `PUT /spirals/:id/step` - Update current step in session
- `PUT /spirals/:id/complete` - Complete spiral session
- `GET /spirals/history` - Get user's spiral history
- `GET /spirals/:id` - Get specific spiral session

### Check-in Endpoints

- `POST /checkins` - Create a quick check-in
- `GET /checkins/history` - Get check-in history
- `GET /checkins/latest` - Get most recent check-in

### Self-Compassion Endpoints

- `POST /compassion/exercise` - Save self-compassion exercise
- `GET /compassion/history` - Get past exercises
- `GET /compassion/random` - Get a random past self-compassion line

### Progress & Analytics Endpoints

- `GET /progress/stats` - Get overall progress statistics
- `GET /progress/chart` - Get intensity before/after data for charts
- `GET /progress/insights` - Get personalized insights

### Notification Endpoints

- `POST /notifications/token` - Register device push token
- `PUT /notifications/preferences` - Update notification preferences
- `GET /notifications/preferences` - Get notification preferences

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── models/          # Mongoose models
│   ├── routes/          # Express routes
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   ├── validators/      # Input validation
│   └── server.js        # Entry point
├── .env                 # Environment variables
├── .env.example         # Environment template
├── package.json         # Dependencies
└── README.md           # This file
```

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on all endpoints
- Input sanitization
- MongoDB injection protection
- Helmet security headers
- CORS configuration
- HPP protection

## Environment Variables

See `.env.example` for all available configuration options.

## Support for Expo OTA Updates

This backend is designed to work seamlessly with Expo's OTA update system:
- Stateless JWT authentication
- Version-agnostic API endpoints
- Backward-compatible response formats
- Graceful degradation for missing features

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT
