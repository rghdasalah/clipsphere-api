const { z } = require('zod');

const registerSchema = z.object({
  username: z
    .string({ error: 'Username is required' })
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters'),
  email: z
    .string({ error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Invalid email address'),
  password: z
    .string({ error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z
    .string({ error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Invalid email address'),
  password: z
    .string({ error: 'Password is required' })
    .min(1, 'Password is required'),
});

module.exports = { registerSchema, loginSchema };