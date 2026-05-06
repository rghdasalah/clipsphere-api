const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { AppError, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter, authLimiter, uploadLimiter } = require('./middleware/rateLimiter');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/adminRouter');
const userRoutes = require('./routes/user.routes');
const videoRoutes = require('./routes/video.routes');
const videoUploadRoutes = require('./routes/videoUpload.routes');
const videoStreamRoutes = require('./routes/videoStream.routes');
const avatarRoutes = require('./routes/avatar.routes');
const videoReadRoutes = require('./routes/videoRead.routes');
const userVideosRoutes = require('./routes/userVideos.routes');
const reviewRoutes = require('./routes/review.routes');
const tipRoutes = require('./routes/tip.routes');

const app = express();

const isDev = process.env.NODE_ENV !== 'production';

const defaultCorsOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000'
];

const githubIoOriginPattern = /^https:\/\/[a-z0-9-]+\.github\.io$/i;
const localDevOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
  : defaultCorsOrigins;

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (isDev && (githubIoOriginPattern.test(origin) || localDevOriginPattern.test(origin))) {
      return callback(null, true);
    }
    return callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true
};

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false, // allow video embeds
  contentSecurityPolicy: isDev ? false : undefined
}));
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ── Stripe webhook: must receive raw body BEFORE express.json() ───────────────
app.use('/api/v1/tips/webhook', express.raw({ type: 'application/json' }));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json());

// ── Logging & sanitization ────────────────────────────────────────────────────
app.use(morgan('dev'));
app.use(mongoSanitize());

// ── Docs ──────────────────────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── Rate limiters ─────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authLimiter);
app.use('/api/v1/videos/upload', uploadLimiter);
app.use('/api/v1', apiLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/users', userVideosRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/videos', videoUploadRoutes);
app.use('/api/v1/videos', videoStreamRoutes);
app.use('/api/v1/videos', videoRoutes);
// videoReadRoutes AFTER videoRoutes: GET /:id must not shadow /following, /trending
app.use('/api/v1/videos', videoReadRoutes);
app.use('/api/v1/users', avatarRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/tips', tipRoutes);

/**
 * @swagger
 * tags:
 *   - name: Health
 *     description: Public health check endpoints
 *   - name: Documentation
 *     description: API documentation endpoints
 */

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Public health check
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: ok
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 */
const sendHealth = (req, res) => {
  res.json({
    status: 'success',
    data: {
      status: 'ok',
      timestamp: new Date()
    }
  });
};

app.get('/health', sendHealth);
app.get('/api/v1/health', sendHealth);

// 404
app.use((req, res, next) => {
  next(new AppError('Route not found', 404));
});

app.use(errorHandler);

module.exports = app;