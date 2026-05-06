const express = require('express');
const router = express.Router();
const tipController = require('../controllers/tip.controller');
const protect = require('../middleware/protect');
const validate = require('../middleware/validate');
const { createCheckoutSchema } = require('../validators/tip.validators');

/**
 * @swagger
 * tags:
 *   name: Tips
 *   description: Creator tipping via Stripe
 */

/**
 * @swagger
 * /tips/webhook:
 *   post:
 *     tags: [Tips]
 *     summary: Stripe webhook receiver (raw body)
 *     description: Called by Stripe CLI or Stripe dashboard. Requires raw body — do not send JSON.
 *     responses:
 *       200:
 *         description: Webhook received
 *       400:
 *         description: Signature verification failed
 */
router.post('/webhook', tipController.handleWebhook);

/**
 * @swagger
 * /tips/checkout:
 *   post:
 *     tags: [Tips]
 *     summary: Create a Stripe Checkout session to tip a creator
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [creatorId, amount]
 *             properties:
 *               creatorId:
 *                 type: string
 *                 description: The recipient creator's user ID
 *               amount:
 *                 type: integer
 *                 description: Amount in cents (e.g. 500 = $5.00)
 *                 minimum: 100
 *                 maximum: 100000
 *     responses:
 *       201:
 *         description: Checkout session created
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
 *                     url:
 *                       type: string
 *                       description: Stripe Checkout redirect URL
 *                     sessionId:
 *                       type: string
 *       400:
 *         description: Validation error or cannot tip yourself
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Creator not found
 */
router.post('/checkout', protect, validate(createCheckoutSchema), tipController.createCheckout);

/**
 * @swagger
 * /tips/balance:
 *   get:
 *     tags: [Tips]
 *     summary: Get creator's wallet balance
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet balance
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
 *                     balanceCents:
 *                       type: integer
 *                       example: 500
 *                     balanceFormatted:
 *                       type: string
 *                       example: "$5.00"
 *       401:
 *         description: Unauthorized
 */
router.get('/balance', protect, tipController.getBalance);

/**
 * @swagger
 * /tips/transactions:
 *   get:
 *     tags: [Tips]
 *     summary: Get paginated transaction history (sent and received)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated transaction list
 *       401:
 *         description: Unauthorized
 */
router.get('/transactions', protect, tipController.getTransactions);

module.exports = router;