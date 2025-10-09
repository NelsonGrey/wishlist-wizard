import { Router } from 'express';
import {
  createPaymentIntent,
  createCheckoutSession,
  createGroupGift,
  getGroupGift,
  getUserGroupGifts,
  processRefund,
  getPaymentStats,
  getPaymentHistory,
  handleStripeWebhook
} from './groupPayments';

const router = Router();

// Group gift management
router.post('/', createGroupGift);
router.get('/user', getUserGroupGifts);
router.get('/:id', getGroupGift);
router.get('/:id/stats', getPaymentStats);

// Payment processing
router.post('/payment-intent', createPaymentIntent);
router.post('/checkout-session', createCheckoutSession);
router.post('/refund/:contributionId', processRefund);

// Payment history
router.get('/payments/history', getPaymentHistory);

// Stripe webhooks (should be configured with raw body parsing)
router.post('/webhook', handleStripeWebhook);

export { router as groupPaymentsRouter };