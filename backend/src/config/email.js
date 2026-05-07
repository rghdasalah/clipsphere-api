const nodemailer = require('nodemailer');

const EMAIL_FROM =
  process.env.EMAIL_FROM || 'ClipSphere <noreply@clipsphere.local>';

async function createTransporter() {
  // Production / explicitly configured SMTP
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Don't let a bad SMTP server hang request lifecycles forever.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }

  // Dev fallback: Ethereal test account. Bounded so we don't hang requests
  // if ethereal.email is unreachable from the dev machine.
  const testAccountPromise = Promise.race([
    nodemailer.createTestAccount(),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Ethereal account creation timed out')),
        8_000
      )
    ),
  ]);

  const testAccount = await testAccountPromise;
  console.info('[email] Ethereal test account ready (user:', testAccount.user, ')');

  return nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
    connectionTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

let transporterPromise;

function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = createTransporter().catch((err) => {
      // Reset so a later send can retry instead of being permanently broken.
      transporterPromise = undefined;
      throw err;
    });
  }
  return transporterPromise;
}

module.exports = { getTransporter, EMAIL_FROM };