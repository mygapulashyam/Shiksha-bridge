require('dotenv').config();
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

app.use(helmet());
app.use(mongoSanitize());

// ── Rate limiters (after CORS so 429 responses still have CORS headers)
const isDev = process.env.NODE_ENV === 'development';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 2000 : 300,          // Relaxed in dev to avoid false 429s
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
  message: { success: false, message: 'Too many requests. Try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 20,            // Relaxed in dev
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', rateLimit({ windowMs: 60 * 60 * 1000, max: isDev ? 50 : 5 }));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));

if (isDev) app.use(morgan('dev'));

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
