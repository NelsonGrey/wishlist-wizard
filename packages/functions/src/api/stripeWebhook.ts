import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getNormalizedHeader } from '../utils/http-normalization.js';

/**
 * POST /api/stripe/webhook
 * Expects Stripe signature header and raw body. Configure `STRIPE_WEBHOOK_SECRET`.
 * This is a minimal scaffold that verifies the signature and logs events.
 */
export const stripeWebhook = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send({ error: 'Method not allowed' });
    return;
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    res.status(501).send({ error: 'Stripe webhook not configured' });
    return;
  }

  const sig = getNormalizedHeader(req.headers, 'stripe-signature');
  if (!sig) {
    res.status(400).send({ error: 'Missing Stripe signature header' });
    return;
  }

  // Access raw body; firebase-functions may provide rawBody on the request
  const rawBody: Buffer = (req as any).rawBody || Buffer.from(JSON.stringify(req.body || {}));

  let stripeLib: any;
  try {
    // lazy-require to avoid startup errors when stripe SDK is not installed in some environments
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    stripeLib = require('stripe');
  } catch (err) {
    logger.error('Stripe SDK not installed', err);
    res.status(500).send({ error: 'Stripe SDK not installed' });
    return;
  }

  try {
    const stripe = stripeLib('');
    const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

    // Basic event handling scaffold
    switch (event.type) {
      case 'checkout.session.completed':
        logger.info('Stripe checkout.session.completed', { id: event.id, data: event.data });
        break;
      case 'invoice.payment_succeeded':
        logger.info('Stripe invoice.payment_succeeded', { id: event.id });
        break;
      default:
        logger.info('Stripe webhook event received', { type: event.type });
    }

    res.status(200).send({ received: true });
  } catch (err: any) {
    logger.error('Stripe webhook signature verification failed', err && err.message ? err.message : err);
    res.status(400).send({ error: 'Invalid webhook signature' });
  }
});

export default { stripeWebhook };
