const Stripe = require('stripe');

let stripeInstance = null;
let warned = false;

function getStripe() {
  if (stripeInstance) return stripeInstance;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key === 'sk_test_placeholder') {
    if (!warned) {
      console.warn(
        '[stripe] STRIPE_SECRET_KEY is not configured. Tip endpoints will return 503 until set.'
      );
      warned = true;
    }
    return null;
  }

  stripeInstance = new Stripe(key);
  return stripeInstance;
}

// Proxy: every property access lazily resolves the real Stripe client.
// If unconfigured, throws an operational error that the global error
// handler turns into a 503 — instead of crashing the process at boot.
const stripe = new Proxy(
  {},
  {
    get(_target, prop) {
      const real = getStripe();
      if (!real) {
        const err = new Error(
          'Payment processing is not configured on this server.'
        );
        err.statusCode = 503;
        err.isOperational = true;
        throw err;
      }
      const value = real[prop];
      return typeof value === 'function' ? value.bind(real) : value;
    },
  }
);

module.exports = stripe;