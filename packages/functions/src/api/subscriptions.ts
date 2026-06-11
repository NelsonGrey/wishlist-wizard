/**
 * Subscription Management API
 *
 * Callable Firebase Functions for subscription lifecycle management.
 * Stripe is the payment processor; we never handle raw card data.
 *
 * Endpoints:
 *   billingStatus   — return current tier, usage, and limits
 *   billingCheckout  — create a Stripe Checkout session for upgrade
 *   billingPortal    — create a Stripe Customer Portal session (manage/cancel)
 *   billingPlans     — return available tiers with pricing
 *   cancelSubscription   — schedule cancellation at period end
 *   reactivateSubscription — remove cancel_at_period_end
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions/v2';
import { getNormalizedHeader } from '../utils/http-normalization.js';
import { ensureFirebaseAdmin } from '../firebase-admin.js';
import {
  getUserTier,
  getUserUsage,
} from '../utils/subscription-guard.js';
import {
  TIER_LIMITS,
  TIER_PRICING,
  SubscriptionTier,
} from '@wishlist-wizard/shared';

ensureFirebaseAdmin();
const db = getFirestore();
const auth = getAuth();

// ─────────────────────────────────────────────────────────────────────────────
// Stripe price ID map — set these in Firebase environment config
// Format: STRIPE_PRICE_<TIER>_<CYCLE>
// ─────────────────────────────────────────────────────────────────────────────

function getStripePriceId(tier: SubscriptionTier, cycle: 'monthly' | 'annual'): string | null {
  const key = `STRIPE_PRICE_${tier.toUpperCase()}_${cycle.toUpperCase()}`;
  return process.env[key] ?? null;
}

function getStripeInstance(): any {
  const secret = process.env.STRIPE_SECRET;
  if (!secret) throw new HttpsError('internal', 'Stripe not configured');
  const Stripe = require('stripe');
  return new Stripe(secret, { apiVersion: '2024-06-20' });
}

// ─────────────────────────────────────────────────────────────────────────────
// billingStatus
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the user's current subscription tier, status, usage, limits, and
 * upgrade prompt information. Called on every app load.
 */
export const billingStatus = onCall(async (request: CallableRequest) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Must be signed in');
  const uid = request.auth.uid;

  const [subDoc, usage] = await Promise.all([
    db.collection('subscriptions').doc(uid).get(),
    getUserUsage(uid),
  ]);

  const tier = await getUserTier(uid);
  const limits = TIER_LIMITS[tier];
  const pricing = TIER_PRICING[tier];
  const sub = subDoc.exists ? subDoc.data() : null;

  return {
    tier,
    status: sub?.status ?? 'active',
    billingCycle: sub?.billingCycle ?? 'none',
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    trialEnd: sub?.trialEnd ?? null,
    usage: {
      wishlistsOwned: usage.wishlistsOwned ?? 0,
      priceAlertsActive: usage.priceAlertsActive ?? 0,
      apiCallsThisMonth: usage.apiCallsTotal ?? 0,
    },
    limits: {
      maxWishlists: limits.maxWishlists,
      maxItemsPerWishlist: limits.maxItemsPerWishlist,
      maxPriceTrackedItems: limits.maxPriceTrackedItems,
      maxCollaboratorsPerWishlist: limits.maxCollaboratorsPerWishlist,
      groupGiftingEnabled: limits.groupGiftingEnabled,
      creatorDashboardEnabled: limits.creatorDashboardEnabled,
      analyticsDepth: limits.analyticsDepth,
      apiAccessEnabled: limits.apiAccessEnabled,
      maxApiCallsPerMonth: limits.maxApiCallsPerMonth,
      affiliateCommissionShare: limits.affiliateCommissionShare,
      adsEnabled: limits.adsEnabled,
    },
    pricing: {
      displayName: pricing.displayName,
      monthlyUsd: pricing.monthlyUsd,
      annualUsd: pricing.annualUsd,
    },
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// billingPlans
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all available tiers above the current tier with pricing and feature
 * highlights — used to populate the upgrade modal.
 */
export const billingPlans = onCall(async (request: CallableRequest) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Must be signed in');
  const currentTier = await getUserTier(request.auth.uid);

  const ordered: SubscriptionTier[] = ['free', 'starter', 'plus', 'creator', 'business', 'enterprise'];
  const currentIdx = ordered.indexOf(currentTier);

  return ordered.slice(currentIdx + 1).map((tier) => ({
    tier,
    pricing: TIER_PRICING[tier],
    limits: TIER_LIMITS[tier],
  }));
});

// ─────────────────────────────────────────────────────────────────────────────
// billingCheckout
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a Stripe Checkout Session for upgrading to a paid tier.
 * Returns { url } — the client redirects the browser to this URL.
 *
 * Request: { tier: SubscriptionTier, billingCycle: 'monthly' | 'annual', successUrl, cancelUrl }
 */
export const billingCheckout = onCall(async (request: CallableRequest) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Must be signed in');
  const uid = request.auth.uid;
  const { tier, billingCycle, successUrl, cancelUrl } = request.data ?? {};

  if (!tier || !billingCycle) {
    throw new HttpsError('invalid-argument', 'tier and billingCycle are required');
  }

  if (tier === 'free') {
    throw new HttpsError('invalid-argument', 'Cannot checkout for the free tier');
  }

  const priceId = getStripePriceId(tier as SubscriptionTier, billingCycle);
  if (!priceId) {
    throw new HttpsError('not-found', `No Stripe price configured for ${tier}/${billingCycle}`);
  }

  const stripe = getStripeInstance();

  // Look up or create Stripe customer
  const subDoc = await db.collection('subscriptions').doc(uid).get();
  let stripeCustomerId: string | undefined = subDoc.exists ? subDoc.data()?.stripeCustomerId : undefined;

  if (!stripeCustomerId) {
    const userRecord = await auth.getUser(uid);
    const customer = await stripe.customers.create({
      email: userRecord.email,
      name: userRecord.displayName ?? undefined,
      metadata: { firebaseUid: uid },
    });
    stripeCustomerId = customer.id;

    // Persist customer ID immediately
    await db.collection('subscriptions').doc(uid).set(
      { userId: uid, stripeCustomerId, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    await db.collection('users').doc(uid).set(
      { stripeCustomerId, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  }

  const pricing = TIER_PRICING[tier as SubscriptionTier];
  const hasTrialEligibility = (pricing?.trialDays ?? 0) > 0 && !subDoc.exists;

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl ?? `${process.env.APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl ?? `${process.env.APP_URL}/subscription/upgrade`,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { firebaseUid: uid, tier },
      ...(hasTrialEligibility ? { trial_period_days: pricing.trialDays } : {}),
    },
    metadata: { firebaseUid: uid, tier, billingCycle },
  });

  logger.info('Checkout session created', { uid, tier, billingCycle, sessionId: session.id });
  return { url: session.url, sessionId: session.id };
});

// ─────────────────────────────────────────────────────────────────────────────
// billingPortal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a Stripe Customer Portal session so the user can manage their
 * subscription, update payment methods, and view invoices.
 * Returns { url }
 */
export const billingPortal = onCall(async (request: CallableRequest) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Must be signed in');
  const uid = request.auth.uid;

  const subDoc = await db.collection('subscriptions').doc(uid).get();
  const stripeCustomerId = subDoc.exists ? subDoc.data()?.stripeCustomerId : undefined;

  if (!stripeCustomerId) {
    throw new HttpsError('not-found', 'No billing account found. Subscribe first.');
  }

  const stripe = getStripeInstance();
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: process.env.APP_URL ? `${process.env.APP_URL}/account/subscription` : undefined,
  });

  return { url: session.url };
});

// ─────────────────────────────────────────────────────────────────────────────
// Stripe Webhook Handler (HTTP trigger, not callable)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handles Stripe webhook events to keep Firestore subscription data in sync.
 *
 * Critical events:
 *   checkout.session.completed        — new subscription created
 *   invoice.payment_succeeded          — renewal; update period dates
 *   invoice.payment_failed             — mark past_due
 *   customer.subscription.updated      — tier change, cancel scheduling
 *   customer.subscription.deleted      — canceled; downgrade to free
 */
export const billingWebhook = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send({ error: 'Method not allowed' });
    return;
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    res.status(501).send({ error: 'Webhook secret not configured' });
    return;
  }

  const sig = getNormalizedHeader(req.headers, 'stripe-signature');
  if (!sig) {
    res.status(400).send({ error: 'Missing Stripe-Signature header' });
    return;
  }

  const rawBody: Buffer = (req as any).rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));

  let stripe: any;
  let event: any;
  try {
    const Stripe = require('stripe');
    stripe = new Stripe(process.env.STRIPE_SECRET ?? '', { apiVersion: '2024-06-20' });
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    logger.error('Webhook signature verification failed', err?.message);
    res.status(400).send({ error: 'Invalid webhook signature' });
    return;
  }

  try {
    await handleStripeEvent(event, db);
    res.status(200).send({ received: true });
  } catch (err) {
    logger.error('Webhook handler error', { eventType: event.type, err });
    res.status(500).send({ error: 'Webhook processing error' });
  }
});

async function handleStripeEvent(event: any, db: FirebaseFirestore.Firestore): Promise<void> {
  const { type, data } = event;
  logger.info('Processing Stripe event', { type, eventId: event.id });

  switch (type) {
    case 'checkout.session.completed': {
      const session = data.object;
      const uid: string = session.metadata?.firebaseUid;
      const tier: SubscriptionTier = session.metadata?.tier ?? 'starter';
      const billingCycle: string = session.metadata?.billingCycle ?? 'monthly';
      if (!uid) { logger.warn('checkout.session.completed missing firebaseUid'); return; }

      const subId = session.subscription;
      let periodEnd: Date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      let periodStart: Date = new Date();

      if (subId) {
        // Fetch full subscription for period dates
        try {
          const Stripe = require('stripe');
          const s = new Stripe(process.env.STRIPE_SECRET ?? '', { apiVersion: '2024-06-20' });
          const sub = await s.subscriptions.retrieve(subId);
          periodStart = new Date(sub.current_period_start * 1000);
          periodEnd = new Date(sub.current_period_end * 1000);
        } catch (e) { /* use defaults */ }
      }

      const commissionShare = TIER_LIMITS[tier]?.affiliateCommissionShare ?? 0;
      const now = FieldValue.serverTimestamp();

      const subData = {
        userId: uid,
        tier,
        status: 'active',
        billingCycle,
        stripeSubscriptionId: subId ?? null,
        stripePriceId: session.line_items?.data?.[0]?.price?.id ?? null,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        affiliateCommissionShare: commissionShare,
        updatedAt: now,
        updatedBy: 'stripe_webhook',
      };

      await Promise.all([
        db.collection('subscriptions').doc(uid).set(subData, { merge: true }),
        db.collection('users').doc(uid).set(
          { subscriptionTier: tier, subscriptionStatus: 'active', updatedAt: now },
          { merge: true },
        ),
        writeAuditLog(db, {
          action: 'subscription.created',
          actorUid: uid,
          actorRole: 'stripe_webhook',
          resourceType: 'subscription',
          resourceId: uid,
          newState: { tier, status: 'active' },
        }),
      ]);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = data.object;
      const subId: string = invoice.subscription;
      if (!subId) return;

      const uid = await uidFromStripeSubscription(db, subId);
      if (!uid) return;

      await Promise.all([
        db.collection('subscriptions').doc(uid).set(
          {
            status: 'active',
            currentPeriodStart: new Date(invoice.period_start * 1000),
            currentPeriodEnd: new Date(invoice.period_end * 1000),
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: 'stripe_webhook',
          },
          { merge: true },
        ),
        db.collection('users').doc(uid).set(
          { subscriptionStatus: 'active', updatedAt: FieldValue.serverTimestamp() },
          { merge: true },
        ),
        writeAuditLog(db, {
          action: 'payment.succeeded',
          actorUid: uid,
          actorRole: 'stripe_webhook',
          resourceType: 'payment',
          resourceId: subId,
        }),
      ]);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = data.object;
      const subId: string = invoice.subscription;
      if (!subId) return;

      const uid = await uidFromStripeSubscription(db, subId);
      if (!uid) return;

      await Promise.all([
        db.collection('subscriptions').doc(uid).set(
          { status: 'past_due', updatedAt: FieldValue.serverTimestamp(), updatedBy: 'stripe_webhook' },
          { merge: true },
        ),
        db.collection('users').doc(uid).set(
          { subscriptionStatus: 'past_due', updatedAt: FieldValue.serverTimestamp() },
          { merge: true },
        ),
        writeAuditLog(db, {
          action: 'payment.failed',
          actorUid: uid,
          actorRole: 'stripe_webhook',
          resourceType: 'payment',
          resourceId: subId,
        }),
      ]);
      break;
    }

    case 'customer.subscription.updated': {
      const sub = data.object;
      const uid = await uidFromStripeSubscription(db, sub.id);
      if (!uid) return;

      const tier: SubscriptionTier = sub.metadata?.tier ?? 'starter';
      const status = sub.status;
      const cancelAtPeriodEnd = sub.cancel_at_period_end ?? false;
      const commissionShare = TIER_LIMITS[tier]?.affiliateCommissionShare ?? 0;
      const now = FieldValue.serverTimestamp();

      await Promise.all([
        db.collection('subscriptions').doc(uid).set(
          {
            tier,
            status,
            cancelAtPeriodEnd,
            affiliateCommissionShare: commissionShare,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            updatedAt: now,
            updatedBy: 'stripe_webhook',
          },
          { merge: true },
        ),
        db.collection('users').doc(uid).set(
          { subscriptionTier: tier, subscriptionStatus: status, updatedAt: now },
          { merge: true },
        ),
      ]);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = data.object;
      const uid = await uidFromStripeSubscription(db, sub.id);
      if (!uid) return;

      const now = FieldValue.serverTimestamp();
      await Promise.all([
        db.collection('subscriptions').doc(uid).set(
          { tier: 'free', status: 'canceled', canceledAt: new Date(), updatedAt: now, updatedBy: 'stripe_webhook' },
          { merge: true },
        ),
        db.collection('users').doc(uid).set(
          { subscriptionTier: 'free', subscriptionStatus: 'canceled', updatedAt: now },
          { merge: true },
        ),
        writeAuditLog(db, {
          action: 'subscription.canceled',
          actorUid: uid,
          actorRole: 'stripe_webhook',
          resourceType: 'subscription',
          resourceId: uid,
          newState: { tier: 'free', status: 'canceled' },
        }),
      ]);
      break;
    }

    default:
      logger.info('Unhandled Stripe event type', { type });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Find the Firebase UID that owns a given Stripe subscription ID */
async function uidFromStripeSubscription(
  db: FirebaseFirestore.Firestore,
  stripeSubscriptionId: string,
): Promise<string | null> {
  const snap = await db
    .collection('subscriptions')
    .where('stripeSubscriptionId', '==', stripeSubscriptionId)
    .limit(1)
    .get();

  if (snap.empty) {
    logger.warn('No subscription doc found for stripeSubscriptionId', { stripeSubscriptionId });
    return null;
  }
  return snap.docs[0].data().userId ?? null;
}

async function writeAuditLog(
  db: FirebaseFirestore.Firestore,
  entry: {
    action: string;
    actorUid: string;
    actorRole: string;
    resourceType: string;
    resourceId: string;
    previousState?: Record<string, unknown>;
    newState?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await db.collection('auditLog').add({
      ...entry,
      timestamp: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    logger.error('Failed to write audit log', { entry, err });
  }
}
