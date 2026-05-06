const rateLimit = require('express-rate-limit');

const createLimiter = (windowMinutes, max, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message }
  });

// 100 requests per 15 minutes for general API routes
const apiLimiter = createLimiter(
  15,
  100,
  'Too many requests, please try again later.'
);

// 20 requests per 15 minutes for auth routes
const authLimiter = createLimiter(
  15,
  20,
  'Too many authentication attempts, please try again later.'
);

// 10 uploads per hour
const uploadLimiter = createLimiter(
  60,
  10,
  'Upload limit reached, please try again in an hour.'
);

module.exports = { apiLimiter, authLimiter, uploadLimiter };