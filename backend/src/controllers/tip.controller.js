const tipService = require('../services/tip.service');
const { asyncWrapper } = require('../middleware/errorHandler');

exports.createCheckout = asyncWrapper(async (req, res) => {
  const { creatorId, amount } = req.body;
  const result = await tipService.createCheckoutSession(req.user.id, creatorId, amount);
  res.status(201).json({ status: 'success', data: result });
});

// Webhook: not wrapped in asyncWrapper — Stripe needs a plain 400 on error.
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const io = req.app.get('io');
  try {
    await tipService.handleWebhookEvent(req.body, sig, io);
    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err.message);
    res.status(400).json({ status: 'error', message: err.message });
  }
};

exports.getBalance = asyncWrapper(async (req, res) => {
  const result = await tipService.getBalance(req.user.id);
  res.json({ status: 'success', data: result });
});

exports.getTransactions = asyncWrapper(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const result = await tipService.getTransactions(req.user.id, Number(page), Number(limit));
  res.json({ status: 'success', data: result });
});