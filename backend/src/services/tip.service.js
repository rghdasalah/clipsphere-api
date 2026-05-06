const stripe = require('../config/stripe');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

exports.createCheckoutSession = async (senderId, creatorId, amountCents) => {
  if (senderId.toString() === creatorId.toString()) {
    throw new AppError('Cannot tip yourself', 400);
  }

  const creator = await User.findById(creatorId);
  if (!creator) throw new AppError('Creator not found', 404);
  if (creator.accountStatus !== 'active') {
    throw new AppError('Creator account is not available', 400);
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Tip for ${creator.username} on ClipSphere`
          },
          unit_amount: amountCents
        },
        quantity: 1
      }
    ],
    metadata: {
      senderId: senderId.toString(),
      recipientId: creatorId.toString()
    },
    success_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/tip/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/tip/cancel`
  });

  return { url: session.url, sessionId: session.id };
};

exports.handleWebhookEvent = async (payload, sig) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    throw new AppError(`Webhook signature verification failed: ${err.message}`, 400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { senderId, recipientId } = session.metadata;
    const amountCents = session.amount_total;

    // Idempotency: skip if already processed
    const exists = await Transaction.findOne({ stripeSessionId: session.id });
    if (exists) return;

    await Transaction.create({
      amount: amountCents,
      currency: session.currency || 'usd',
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
      sender: senderId,
      recipient: recipientId,
      status: 'completed'
    });

    await User.findByIdAndUpdate(recipientId, {
      $inc: { walletBalance: amountCents }
    });
  }
};

exports.getBalance = async (userId) => {
  const user = await User.findById(userId).select('walletBalance username');
  if (!user) throw new AppError('User not found', 404);

  const balanceCents = user.walletBalance || 0;
  return {
    balanceCents,
    balanceFormatted: `$${(balanceCents / 100).toFixed(2)}`
  };
};

exports.getTransactions = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const filter = { $or: [{ sender: userId }, { recipient: userId }] };

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate('sender', 'username avatarKey')
      .populate('recipient', 'username avatarKey')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(filter)
  ]);

  return { transactions, page, totalPages: Math.ceil(total / limit) };
};