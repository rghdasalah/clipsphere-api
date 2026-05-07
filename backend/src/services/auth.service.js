const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AppError } = require('../middleware/errorHandler');
const { getAccountStateError } = require('../utils/accountState');
const emailService = require('./email.service');

const TOKEN_TTL = '24h';

function publicUser(user) {
  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    active: user.active,
    accountStatus: user.accountStatus,
    notificationPreferences: user.notificationPreferences,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

exports.register = async (data) => {
  const username = String(data.username || '').trim();
  const email = String(data.email || '').trim().toLowerCase();
  const password = data.password;

  // Check for duplicates AFTER normalizing — schema has lowercase:true so
  // stored emails are lowercase, but we must match the same way at lookup.
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    if (existingUser.email === email) throw new AppError('Email already in use', 409);
    throw new AppError('Username already in use', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    username,
    email,
    password: hashedPassword,
  });

  // Fire-and-forget. NEVER await: must not block the response.
  emailService
    .sendWelcomeEmail(user)
    .catch((err) =>
      console.warn('[auth] welcome email failed:', err.message)
    );

  return { token: signToken(user), user: publicUser(user) };
};

exports.login = async (data) => {
  const email = String(data.email || '').trim().toLowerCase();
  const password = data.password;

  const user = await User.findOne({ email }).select('+password');
  if (!user) throw new AppError('Invalid email or password', 401);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new AppError('Invalid email or password', 401);

  const accountStateError = getAccountStateError(user);
  if (accountStateError) throw accountStateError;

  return { token: signToken(user), user: publicUser(user) };
};