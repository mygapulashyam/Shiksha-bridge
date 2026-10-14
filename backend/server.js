require('dotenv').config();

// Safe defaults for required environment variables
if (!process.env.JWT_EXPIRE) process.env.JWT_EXPIRE = '1h';
if (!process.env.JWT_REFRESH_SECRET && process.env.JWT_SECRET) {
  process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET + '_refresh';
}
if (!process.env.CORS_ORIGIN) process.env.CORS_ORIGIN = 'http://localhost:3000';

const REQUIRED_ENV_VARS = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'JWT_EXPIRE', 'CORS_ORIGIN', 'MONGO_URI'];
for (const varName of REQUIRED_ENV_VARS) {
  if (!process.env[varName]) {
    console.error(`FATAL ERROR: Environment variable "${varName}" is missing.`);
    process.exit(1);
  }
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes     = require('./routes/auth');
const adminRoutes    = require('./routes/admin');
const teacherRoutes  = require('./routes/teacher');
const studentRoutes  = require('./routes/student');
const featuresRoutes = require('./routes/features');

const app = express();

// Trust reverse proxy (Vercel, Heroku, Cloudflare) so per-user client IP rate limiting works accurately
app.set('trust proxy', 1);

// ── CORS must come FIRST so that even rate-limited (429) responses
//    include the Access-Control-Allow-Origin header the browser needs.
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
// Handle preflight OPTIONS requests immediately
app.options('*', cors(corsOptions));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", process.env.CORS_ORIGIN || 'http://localhost:3000'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: 'deny',
    },
  })
);
app.use(mongoSanitize());

// ── Rate limiters (after CORS so 429 responses still have CORS headers)
const isDev = process.env.NODE_ENV === 'development';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 2000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
  message: { success: false, message: 'Too many requests. Try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 20,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 50 : 15,
  message: { success: false, message: 'Too many verification attempts. Please try again later.' },
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', rateLimit({ windowMs: 60 * 60 * 1000, max: isDev ? 50 : 5 }));
app.use('/api/auth/verify-otp', otpLimiter);
app.use('/api/auth/reset-password', otpLimiter);

// 10mb limit prevents 413s on 20-question AI quizzes or large content uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

if (isDev) app.use(morgan('dev'));

// Middleware to guarantee DB is connected before handling any API request (prevents Vercel cold-start errors)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection failed:', err);
    res.status(503).json({ success: false, message: 'Database connection failed. Please try again in a few moments.' });
  }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'ShikshaBridge API v1.1', timestamp: new Date().toISOString() }));

app.use('/api/auth',     authRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/teacher',  teacherRoutes);
app.use('/api/student',  studentRoutes);
app.use('/api/features', featuresRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
if (process.env.VERCEL) {
  connectDB().catch(err => console.error("Database connection failed", err));
} else {
  connectDB().then(() => {
    app.listen(PORT, () => console.log(`🚀  ShikshaBridge API v1.1 running on port ${PORT} [${process.env.NODE_ENV}]`));
  });
}

module.exports = app;
