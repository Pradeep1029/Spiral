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

// Import routes
const resetRoutes = require('./routes/resetRoutes');
const personalizationRoutes = require('./routes/personalizationRoutes');
const authRoutes = require('./routes/authRoutes');
const voiceRoutes = require('./routes/voiceRoutes');

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
    const raw = process.env.CORS_ORIGINS;
    if (!raw) {
      return callback(null, true);
    }

    const allowedOrigins = raw.split(',');
    
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

app.use(`${API_VERSION}/reset`, apiLimiter, resetRoutes);
app.use(`${API_VERSION}/personalization`, apiLimiter, personalizationRoutes);
app.use(`${API_VERSION}/auth`, apiLimiter, authRoutes);
app.use(`${API_VERSION}/voice`, apiLimiter, voiceRoutes);

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
const PORT = process.env.PORT || 3011;

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
