const { z } = require('zod');

const createCheckoutSchema = z.object({
  creatorId: z
    .string({ required_error: 'Creator ID is required' })
    .min(1, 'Creator ID is required'),
  amount: z
    .number({ required_error: 'Amount is required', invalid_type_error: 'Amount must be a number' })
    .int('Amount must be a whole number of cents')
    .min(100, 'Minimum tip is $1.00')
    .max(100000, 'Maximum tip is $1,000.00')
});

module.exports = { createCheckoutSchema };