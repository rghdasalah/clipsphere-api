const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
      comment: 'Amount in cents'
    },
    currency: {
      type: String,
      required: true,
      default: 'usd',
      lowercase: true
    },
    stripeSessionId: {
      type: String,
      unique: true,
      sparse: true
    },
    stripePaymentIntentId: {
      type: String
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    }
  },
  { timestamps: true }
);

transactionSchema.index({ recipient: 1, createdAt: -1 });
transactionSchema.index({ sender: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);