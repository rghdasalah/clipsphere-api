const rateLimit = require('express-rate-limit');

const isProd = process.env.NODE_ENV === 'production';

const createLimiter = (windowMinutes, max, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message },
    skip: () => !isProd
  });

const apiLimiter = createLimiter(
  15,
  2000,
  'Too many requests, please try again later.'
);

const authLimiter = createLimiter(
  15,
  20,
  'Too many authentication attempts, please try again later.'
);

const uploadLimiter = createLimiter(
  60,
  30,
  'Upload limit reached, please try again in an hour.'
);

module.exports = { apiLimiter, authLimiter, uploadLimiter };