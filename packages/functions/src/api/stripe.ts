import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { normalizeText } from '../utils/http-normalization.js';

/**
 * POST /api/stripe/create-checkout
 * Body: { priceId?: string, successUrl?: string, cancelUrl?: string, quantity?: number }
 * Requires env `STRIPE_SECRET` to be set. Returns { sessionId }
 */
export const checkoutSessionCreate = onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).send({ error: 'Method not allowed' });
      return;
    }

    const secret = process.env.STRIPE_SECRET;
    if (!secret) {
      res.status(501).send({ error: 'Stripe not configured' });
      return;
    }

    // Lazily require Stripe to avoid startup failure when dependency missing
    let stripe: any;
    try {
      const Stripe = require('stripe');
      stripe = Stripe(secret);
    } catch (err) {
      logger.error('Stripe SDK not available', err);
      res.status(500).send({ error: 'Stripe SDK not installed' });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const priceId = normalizeText(body.priceId);
    const requestedQuantity = Number(body.quantity ?? 1);
    const quantity = Number.isFinite(requestedQuantity) && requestedQuantity > 0
      ? Math.floor(requestedQuantity)
      : 1;
    const successUrl =
      normalizeText(body.successUrl) ||
      normalizeText(body.success) ||
      'https://example.com/success';
    const cancelUrl =
      normalizeText(body.cancelUrl) ||
      normalizeText(body.cancel) ||
      'https://example.com/cancel';

    if (!priceId) {
      res.status(400).send({ error: 'Missing priceId' });
      return;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity }],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    res.status(200).send({ sessionId: session.id });
  } catch (error) {
    logger.error('Error in checkoutSessionCreate', error);
    res.status(500).send({ error: 'Internal server error' });
  }
});

export default { checkoutSessionCreate };
