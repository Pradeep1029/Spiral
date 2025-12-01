require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

const connectDB = require('./config/database');
const logger = require('./config/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { initializeScheduler } = require('./services/schedulerService');

// Import routes
const authRoutes = require('./routes/authRoutes');
const onboardingRoutes = require('./routes/onboardingRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const insightsRoutes = require('./routes/insightsRoutes');
const checkInRoutes = require('./routes/checkInRoutes');
const compassionRoutes = require('./routes/compassionRoutes');
const progressRoutes = require('./routes/progressRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
// v2 Routes
const trainingRoutes = require('./routes/trainingRoutes');
const archetypeRoutes = require('./routes/archetypeRoutes');
const autopilotRoutes = require('./routes/autopilotRoutes');

// Initialize express app
const app = express();

// Connect to database
connectDB();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGINS.split(',');
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin starts with any allowed origin (for Expo URLs)
    const isAllowed = allowedOrigins.some(allowedOrigin => 
      origin.startsWith(allowedOrigin)
    );
    
    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Protect against HTTP Parameter Pollution
app.use(hpp());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
const API_VERSION = '/api/v1';

app.use(`${API_VERSION}/auth`, authRoutes);
app.use(`${API_VERSION}/onboarding`, apiLimiter, onboardingRoutes);

// New AI-first routes
app.use(`${API_VERSION}/sessions`, apiLimiter, sessionRoutes);
app.use(`${API_VERSION}/insights`, apiLimiter, insightsRoutes);

// v2 Routes - Training Mode, Archetypes & Autopilot
app.use(`${API_VERSION}/training`, apiLimiter, trainingRoutes);
app.use(`${API_VERSION}/archetypes`, apiLimiter, archetypeRoutes);
app.use(`${API_VERSION}/autopilot`, apiLimiter, autopilotRoutes);

// Legacy routes (keep for backward compatibility)
app.use(`${API_VERSION}/checkins`, apiLimiter, checkInRoutes);
app.use(`${API_VERSION}/compassion`, apiLimiter, compassionRoutes);
app.use(`${API_VERSION}/progress`, apiLimiter, progressRoutes);
app.use(`${API_VERSION}/notifications`, apiLimiter, notificationRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Unspiral API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: API_VERSION,
      docs: `${API_VERSION}/docs`,
    },
  });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`
    ╔═══════════════════════════════════════╗
    ║                                       ║
    ║   🌀 Unspiral API Server Started     ║
    ║                                       ║
    ║   Environment: ${process.env.NODE_ENV?.padEnd(23)}║
    ║   Port: ${PORT.toString().padEnd(30)}║
    ║   API Version: v1                     ║
    ║                                       ║
    ╚═══════════════════════════════════════╝
  `);
  
  // Initialize scheduler for notifications
  initializeScheduler();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

module.exports = app;
