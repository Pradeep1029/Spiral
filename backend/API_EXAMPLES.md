# Unspiral API Examples

This document provides example requests for all API endpoints.

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication

### 1. Create Anonymous User
```bash
curl -X POST http://localhost:3000/api/v1/auth/anonymous \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "Anonymous account created successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "isAnonymous": true,
      "onboarding": {...},
      "preferences": {...},
      "stats": {...}
    }
  }
}
```

### 2. Register with Email/Password
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

### 4. Get Current User
```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Onboarding

### Complete Onboarding
```bash
curl -X POST http://localhost:3000/api/v1/onboarding/complete \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "spiralPatterns": ["replay_conversations", "worry_tomorrow"],
    "spiralTiming": "before_sleep",
    "spiralTopics": ["work_study", "relationships"]
  }'
```

## Spiral Rescue Sessions

### 1. Start Spiral Session
```bash
curl -X POST http://localhost:3000/api/v1/spirals/start \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "intensityBefore": 4,
    "primaryTopic": "work_study",
    "deviceInfo": {
      "platform": "ios",
      "appVersion": "1.0.0",
      "os": "iOS 17.0"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Spiral session started",
  "data": {
    "session": {
      "_id": "507f1f77bcf86cd799439011",
      "user": "507f1f77bcf86cd799439012",
      "status": "in_progress",
      "intensityBefore": 4,
      "primaryTopic": "work_study",
      "startedAt": "2024-01-15T22:30:00.000Z"
    }
  }
}
```

### 2. Update Step 1 (Breathing)
```bash
curl -X PUT http://localhost:3000/api/v1/spirals/SESSION_ID/step \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "stepNumber": 1,
    "stepData": {
      "completed": true,
      "skipped": false,
      "duration": 60
    }
  }'
```

### 3. Update Step 2 (Dump)
```bash
curl -X PUT http://localhost:3000/api/v1/spirals/SESSION_ID/step \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "stepNumber": 2,
    "stepData": {
      "completed": true,
      "text": "I keep replaying the meeting in my head. I feel like I said something stupid and now everyone thinks I am incompetent...",
      "duration": 120
    }
  }'
```

### 4. Update Step 3 (Exit Path - Think Through)
```bash
curl -X PUT http://localhost:3000/api/v1/spirals/SESSION_ID/step \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "stepNumber": 3,
    "stepData": {
      "completed": true,
      "pathChosen": "think_through",
      "thinkThrough": {
        "fearQuestion": "I am afraid everyone will think I am incompetent and I will lose my job",
        "evidenceFor": "I stumbled over my words during the presentation",
        "evidenceAgainst": "My manager said I did well. No one has mentioned anything negative. I have gotten positive feedback on my work in the past.",
        "reframe": "I care deeply about my work and sometimes get nervous. One awkward moment does not erase all my good work. I can improve my presentation skills over time.",
        "reframeAccepted": true,
        "selfCompassionLine": "It is okay to be nervous sometimes. You are learning and growing, and that is what matters."
      }
    }
  }'
```

### 5. Update Step 3 (Exit Path - Let Go)
```bash
curl -X PUT http://localhost:3000/api/v1/spirals/SESSION_ID/step \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "stepNumber": 3,
    "stepData": {
      "completed": true,
      "pathChosen": "let_go",
      "letGo": {
        "metaphorUsed": "cloud",
        "groundingCompleted": true,
        "groundingAnswers": {
          "see": ["lamp", "wall", "phone", "pillow", "ceiling"],
          "feel": ["soft blanket", "cool air", "bed", "clothes"],
          "hear": ["fan", "distant traffic", "breathing"],
          "smell": ["clean sheets", "faint lavender"],
          "taste": ["mint toothpaste"]
        }
      }
    }
  }'
```

### 6. Complete Session
```bash
curl -X PUT http://localhost:3000/api/v1/spirals/SESSION_ID/complete \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "intensityAfter": 2,
    "nextAction": "try_sleep",
    "sleepWindDownCompleted": true
  }'
```

### 7. Get History
```bash
curl -X GET "http://localhost:3000/api/v1/spirals/history?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Check-ins

### 1. Create Check-in
```bash
curl -X POST http://localhost:3000/api/v1/checkins \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "mentalState": "bit_loud",
    "intensity": 3,
    "notes": "Feeling a bit anxious about tomorrow",
    "type": "nightly"
  }'
```

### 2. Get Check-in History
```bash
curl -X GET "http://localhost:3000/api/v1/checkins/history?page=1&limit=30" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Get Check-in Stats
```bash
curl -X GET "http://localhost:3000/api/v1/checkins/stats?days=30" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Self-Compassion

### 1. Create Self-Compassion Exercise
```bash
curl -X POST http://localhost:3000/api/v1/compassion/exercise \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "standalone",
    "trigger": "being_harsh",
    "feeling": "ashamed",
    "customCompassionLine": "I am human and humans make mistakes. This is how I learn and grow.",
    "helpfulnessRating": 4
  }'
```

### 2. Get Random Compassion Line
```bash
curl -X GET http://localhost:3000/api/v1/compassion/random \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Get Most Helpful Lines
```bash
curl -X GET "http://localhost:3000/api/v1/compassion/helpful?limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Progress & Analytics

### 1. Get Progress Stats
```bash
curl -X GET "http://localhost:3000/api/v1/progress/stats?days=14" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "14 days",
    "totalSpirals": 7,
    "averageIntensityBefore": 4.14,
    "averageIntensityAfter": 2.29,
    "averageImprovement": 1.86,
    "improvementPercentage": 44.9,
    "pathPreference": {
      "think_through": 5,
      "let_go": 2
    },
    "topicBreakdown": {
      "work_study": 3,
      "relationships": 2,
      "myself": 2
    }
  }
}
```

### 2. Get Chart Data
```bash
curl -X GET "http://localhost:3000/api/v1/progress/chart?days=30" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Get Personalized Insights
```bash
curl -X GET http://localhost:3000/api/v1/progress/insights \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Get Streak Information
```bash
curl -X GET http://localhost:3000/api/v1/progress/streak \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Notifications

### 1. Register Push Token
```bash
curl -X POST http://localhost:3000/api/v1/notifications/token \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "platform": "ios"
  }'
```

### 2. Update Notification Preferences
```bash
curl -X PUT http://localhost:3000/api/v1/notifications/preferences \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "enableNotifications": true,
    "checkInTime": "22:30",
    "timezone": "America/New_York"
  }'
```

### 3. Send Test Notification
```bash
curl -X POST http://localhost:3000/api/v1/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message here",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email"
    }
  ]
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
