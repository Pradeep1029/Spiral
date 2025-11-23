# Getting Started with Unspiral Backend

Welcome! This guide will help you get the Unspiral backend up and running in minutes.

## Quick Start

### 1. Prerequisites

Make sure you have:
- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **MongoDB** connection (MongoDB Atlas or local)

Check your versions:
```bash
node --version
npm --version
```

### 2. Installation

Dependencies are already installed. If you need to reinstall:
```bash
cd backend
npm install
```

### 3. Environment Configuration

Your `.env` file is already configured with the MongoDB connection. Review and update if needed:

```bash
# View current configuration
cat .env

# Edit if needed
nano .env
```

**Important:** Change these values before deploying to production:
- `JWT_SECRET` - Use a strong random string
- `SESSION_SECRET` - Use a different strong random string
- `NODE_ENV` - Set to `production` when deploying

### 4. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

You should see:
```
╔═══════════════════════════════════════╗
║                                       ║
║   🌀 Unspiral API Server Started     ║
║                                       ║
║   Environment: development            ║
║   Port: 3000                          ║
║   API Version: v1                     ║
║                                       ║
╚═══════════════════════════════════════╝
```

### 5. Test the Server

Open a new terminal and test:

```bash
# Health check
curl http://localhost:3000/health

# Welcome endpoint
curl http://localhost:3000

# Create anonymous user (test API)
curl -X POST http://localhost:3000/api/v1/auth/anonymous \
  -H "Content-Type: application/json"
```

## Project Structure

```
backend/
├── src/
│   ├── config/              # Database & logger configuration
│   │   ├── database.js
│   │   └── logger.js
│   │
│   ├── models/              # MongoDB schemas
│   │   ├── User.js
│   │   ├── SpiralSession.js
│   │   ├── CheckIn.js
│   │   └── SelfCompassionExercise.js
│   │
│   ├── controllers/         # Request handlers
│   │   ├── authController.js
│   │   ├── onboardingController.js
│   │   ├── spiralController.js
│   │   ├── checkInController.js
│   │   ├── compassionController.js
│   │   ├── progressController.js
│   │   └── notificationController.js
│   │
│   ├── routes/              # API routes
│   │   ├── authRoutes.js
│   │   ├── onboardingRoutes.js
│   │   ├── spiralRoutes.js
│   │   ├── checkInRoutes.js
│   │   ├── compassionRoutes.js
│   │   ├── progressRoutes.js
│   │   └── notificationRoutes.js
│   │
│   ├── middleware/          # Custom middleware
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   │
│   ├── services/            # Business logic
│   │   ├── aiService.js
│   │   └── schedulerService.js
│   │
│   ├── utils/               # Utility functions
│   │   ├── response.js
│   │   └── validators.js
│   │
│   └── server.js            # Entry point
│
├── .env                     # Environment variables (DO NOT COMMIT)
├── .env.example             # Environment template
├── package.json             # Dependencies
├── README.md               # Main documentation
├── API_EXAMPLES.md         # API usage examples
├── DEPLOYMENT.md           # Deployment guide
└── GETTING_STARTED.md      # This file
```

## API Overview

### Base URL
```
http://localhost:3000/api/v1
```

### Main Endpoints

#### Authentication
- `POST /auth/anonymous` - Create anonymous user
- `POST /auth/register` - Register with email/password
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user

#### Onboarding
- `POST /onboarding/complete` - Save onboarding data
- `GET /onboarding/status` - Check completion status

#### Spiral Rescue
- `POST /spirals/start` - Start rescue session
- `PUT /spirals/:id/step` - Update session step
- `PUT /spirals/:id/complete` - Complete session
- `GET /spirals/history` - Get history

#### Check-ins
- `POST /checkins` - Create check-in
- `GET /checkins/history` - Get history

#### Self-Compassion
- `POST /compassion/exercise` - Save exercise
- `GET /compassion/random` - Get random line

#### Progress
- `GET /progress/stats` - Get statistics
- `GET /progress/insights` - Get insights

#### Notifications
- `POST /notifications/token` - Register push token
- `PUT /notifications/preferences` - Update preferences

See `API_EXAMPLES.md` for detailed request/response examples.

## Development Workflow

### 1. Make Changes
Edit files in the `src/` directory. If using `npm run dev`, the server will auto-reload.

### 2. Check Logs
Logs are printed to console. Check for errors or warnings.

### 3. Test Endpoints
Use curl, Postman, or your frontend app to test changes.

### 4. Commit Changes
```bash
git add .
git commit -m "Description of changes"
```

## Common Tasks

### View Logs
```bash
# In development (terminal where server is running)
# Logs print directly to console

# In production (if using PM2)
pm2 logs unspiral-api
```

### Check Database
Use MongoDB Compass or mongo shell:
```bash
# If using MongoDB Atlas, use connection string
mongosh "mongodb+srv://your-cluster-url"

# Show databases
show dbs

# Use your database
use unspiral

# Show collections
show collections

# Query users
db.users.find().pretty()
```

### Add New Endpoint

1. **Create controller function** in appropriate controller file
2. **Add validation** in `utils/validators.js` if needed
3. **Add route** in appropriate routes file
4. **Test** with curl or Postman

Example:
```javascript
// 1. In controllers/spiralController.js
exports.getStats = asyncHandler(async (req, res) => {
  // Your logic here
  sendSuccess(res, { stats: {...} });
});

// 2. In routes/spiralRoutes.js
router.get('/stats', protect, getStats);

// 3. Test
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/v1/spirals/stats
```

### Update Dependencies
```bash
# Check outdated packages
npm outdated

# Update all (carefully)
npm update

# Update specific package
npm install package-name@latest
```

## Security Notes

### Before Production

1. **Change secrets** in `.env`:
   - Generate strong `JWT_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - Generate strong `SESSION_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

2. **Update CORS origins**:
   - Add your production domain
   - Remove development URLs

3. **Set NODE_ENV**:
   ```env
   NODE_ENV=production
   ```

4. **Review rate limits** in `middleware/rateLimiter.js`

5. **Enable HTTPS** (see DEPLOYMENT.md)

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process (replace PID with actual process ID)
kill -9 PID

# Or change port in .env
PORT=3001
```

### MongoDB Connection Error
- Check connection string in `.env`
- Verify MongoDB Atlas IP whitelist (if using Atlas)
- Check database user permissions
- Ensure database cluster is running

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### JWT Errors
- Ensure `JWT_SECRET` is set in `.env`
- Check token format (should be `Bearer TOKEN`)
- Token may be expired (valid for 30 days)

## Testing

### Manual Testing
Use the examples in `API_EXAMPLES.md` with curl or Postman.

### Automated Testing (Future)
```bash
# Run tests (when implemented)
npm test

# With coverage
npm test -- --coverage
```

## Next Steps

1. **Read API_EXAMPLES.md** - Learn all available endpoints
2. **Review models** in `src/models/` - Understand data structure
3. **Explore controllers** - See business logic
4. **Check DEPLOYMENT.md** - When ready to deploy
5. **Build frontend** - Connect your Expo app to this backend

## Support

### Documentation
- `README.md` - Project overview
- `API_EXAMPLES.md` - Detailed API examples
- `DEPLOYMENT.md` - Production deployment
- This file - Getting started

### Logs
All application logs are handled by Winston:
- **Development**: Pretty-printed to console
- **Production**: Saved to `logs/` directory

### MongoDB Data
Check MongoDB Atlas dashboard for:
- Database size
- Connection status
- Performance metrics
- Backups

## Useful Commands

```bash
# Development
npm run dev          # Start with auto-reload

# Production
npm start            # Start server
npm test            # Run tests (when implemented)
npm run lint        # Check code style (when configured)

# Database
mongosh "your-connection-string"  # Connect to MongoDB

# Logs (if using PM2)
pm2 logs unspiral-api    # View logs
pm2 restart unspiral-api # Restart
pm2 stop unspiral-api    # Stop
```

---

**You're all set!** 🎉

The backend is ready for development. Start building your Expo frontend and connect it to these APIs.

For questions or issues, check the documentation files or review the code comments.
