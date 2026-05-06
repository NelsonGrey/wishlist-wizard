import { onCall, CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import Stripe from "stripe";
import { ensureFirebaseAdmin } from "../firebase-admin.js";
import { parsePrice } from "../utils/helpers.js";
import { requireAppCheck } from "../utils/app-check.js";
import { CustomTrace } from "../utils/performance-monitoring.js";
import { logErrorWithContext } from "../utils/error-reporting.js";

ensureFirebaseAdmin();
const db = getFirestore();
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";

const stripe = stripeSecretKey
  ? new (Stripe as unknown as any)(stripeSecretKey, { apiVersion: "2023-10-16" })
  : null;

// Budget guardrails for group gift contributions
const MIN_CONTRIBUTION_AMOUNT = 1.0; // Minimum $1.00 per contribution
const MAX_CONTRIBUTION_AMOUNT = 5000.0; // Maximum $5,000 per contribution
const MAX_GROUP_GIFT_TOTAL = 50000.0; // Maximum $50,000 per group gift

export const createGroupPaymentIntent = onCall(async (request: CallableRequest) => {
  // WP-04: Verify device integrity before payment mutation
  await requireAppCheck(request);

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const { itemId, amount, message = "", isAnonymous = false } = request.data;

  if (!itemId || !amount) {
    throw new HttpsError("invalid-argument", "Item ID and amount are required");
  }

  const userId = request.auth.uid;
  const trace = new CustomTrace('create_group_payment_intent');
  trace.putAttribute('item_id', itemId);
  trace.putAttribute('user_id', userId);
  trace.putAttribute('amount', String(amount));
  let normalizedAmount: number | null = null;

  return trace.executeAsync(async () => {
    try {
    normalizedAmount = Number(amount);
    if (Number.isNaN(normalizedAmount) || normalizedAmount <= 0) {
      throw new HttpsError("invalid-argument", "Invalid amount");
    }

    // Budget guardrail: minimum contribution
    if (normalizedAmount < MIN_CONTRIBUTION_AMOUNT) {
      throw new HttpsError(
        "invalid-argument",
        `Contribution amount must be at least $${MIN_CONTRIBUTION_AMOUNT.toFixed(2)}`
      );
    }

    // Budget guardrail: maximum contribution
    if (normalizedAmount > MAX_CONTRIBUTION_AMOUNT) {
      throw new HttpsError(
        "invalid-argument",
        `Contribution amount cannot exceed $${MAX_CONTRIBUTION_AMOUNT.toFixed(2)}`
      );
    }

    if (!stripe) {
      throw new HttpsError("failed-precondition", "Stripe is not configured");
    }

    const itemDoc = await db.collection("wishlistItems").doc(itemId).get();
    if (!itemDoc.exists) {
      throw new HttpsError("not-found", "Wishlist item not found");
    }

    const itemData = itemDoc.data() || {};
    const targetAmount = parsePrice(itemData.price || "0");

    const groupGiftRef = db.collection("groupGifts").doc(itemId);
    const groupGiftSnap = await groupGiftRef.get();

    const currentTotal = groupGiftSnap.exists ? (groupGiftSnap.data()?.totalAmount || 0) : 0;

    // Budget guardrail: total group gift amount
    if (currentTotal + normalizedAmount > MAX_GROUP_GIFT_TOTAL) {
      throw new HttpsError(
        "invalid-argument",
        `Total contributions for this group gift cannot exceed $${MAX_GROUP_GIFT_TOTAL.toFixed(2)}. Current total: $${currentTotal.toFixed(2)}, requested: $${normalizedAmount.toFixed(2)}.`
      );
    }

    if (!groupGiftSnap.exists) {
      await groupGiftRef.set({
        itemId,
        targetAmount,
        totalAmount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(normalizedAmount * 100),
      currency: "usd",
      description: `Group gift contribution for ${itemData.title || "wishlist item"}`,
      metadata: {
        itemId,
        userId,
      },
    });

    const contributionRef = await db.collection("groupGiftContributions").add({
      itemId,
      userId,
      amount: normalizedAmount,
      message,
      isAnonymous,
      paymentIntentId: paymentIntent.id,
      status: "pending",
      createdAt: new Date(),
    });

    trace.incrementMetric('payment_intents_created', 1);
    return {
      clientSecret: paymentIntent.client_secret,
      contributionId: contributionRef.id,
    };
    } catch (error) {
      logErrorWithContext(error, {
        operation: 'create_group_payment_intent',
        userId,
        itemId,
        metadata: {
          amount: normalizedAmount,
        }
      });
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to create payment intent");
    }
  });
});

export const confirmGroupContribution = onCall(async (request: CallableRequest) => {
  // WP-04: Verify device integrity before payment mutation
  await requireAppCheck(request);

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!stripe) {
    throw new HttpsError("failed-precondition", "Stripe is not configured");
  }

  const { contributionId } = request.data;
  if (!contributionId) {
    throw new HttpsError("invalid-argument", "Contribution ID is required");
  }

  const userId = request.auth.uid;
  const trace = new CustomTrace('confirm_group_contribution');
  trace.putAttribute('contribution_id', contributionId);
  trace.putAttribute('user_id', userId);

  return trace.executeAsync(async () => {
    try {
      const contributionDoc = await db.collection("groupGiftContributions").doc(contributionId).get();
      if (!contributionDoc.exists) {
        throw new HttpsError("not-found", "Contribution not found");
      }

      const contribution = contributionDoc.data() || {};
      if (contribution.userId !== userId) {
        throw new HttpsError("permission-denied", "You can only confirm your own contribution");
      }

      if (contribution.status === "succeeded") {
        return { success: true };
      }

      const paymentIntentId = contribution.paymentIntentId;
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== "succeeded") {
        throw new HttpsError("failed-precondition", "Payment not completed");
      }

      const groupGiftRef = db.collection("groupGifts").doc(contribution.itemId);

      await db.runTransaction(async (transaction) => {
        transaction.update(contributionDoc.ref, {
          status: "succeeded",
          updatedAt: new Date(),
        });

        transaction.set(groupGiftRef, {
          itemId: contribution.itemId,
          updatedAt: new Date(),
          totalAmount: FieldValue.increment(contribution.amount || 0),
        }, { merge: true });
      });

    trace.incrementMetric('contributions_confirmed', 1);
    return { success: true };
    } catch (error) {
      logErrorWithContext(error, {
        operation: 'confirm_group_contribution',
        userId,
        contributionId
      });
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Failed to confirm contribution");
    }
  });
});

export const getGroupGiftSummary = onCall(async (request: CallableRequest) => {
  const { itemId } = request.data;
  if (!itemId) {
    throw new HttpsError("invalid-argument", "Item ID is required");
  }

  const userId = request.auth?.uid;
  const trace = new CustomTrace('get_group_gift_summary');
  trace.putAttribute('item_id', itemId);
  trace.putAttribute('user_id', userId || 'anonymous');

  return trace.executeAsync(async () => {
    try {
      const giftDoc = await db.collection("groupGifts").doc(itemId).get();
      const giftData = giftDoc.exists ? giftDoc.data() : null;

      const contributionsSnapshot = await db
        .collection("groupGiftContributions")
        .where("itemId", "==", itemId)
        .where("status", "==", "succeeded")
        .orderBy("createdAt", "desc")
        .get();

      type GroupContribution = {
        id: string;
        userId?: string;
        amount?: number;
        isAnonymous?: boolean;
      };

      const participantsRaw: GroupContribution[] = contributionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<GroupContribution, "id">)
      }));
      const userIds = Array.from(new Set(participantsRaw.map((p) => p.userId).filter(Boolean))) as string[];

      const userDocs = await Promise.all(
        userIds.map((uid) => db.collection("users").doc(uid).get())
      );
      const userMap = new Map(userDocs.map((doc) => [doc.id, doc.data()]));

      const participants = participantsRaw.map((participant) => ({
        ...participant,
        contributionAmount: participant.amount || 0,
        user: participant.isAnonymous || !participant.userId
          ? null
          : {
              displayName: userMap.get(participant.userId)?.displayName || null,
            },
      }));
      const totalAmount = participants.reduce((sum, c) => sum + (c.amount || 0), 0);

    trace.incrementMetric('gift_summaries_retrieved', 1);
    return {
      itemId,
      targetAmount: giftData?.targetAmount || 0,
      totalAmount: giftData?.totalAmount || totalAmount,
      participants,
    };
    } catch (error) {
      logErrorWithContext(error, {
        operation: 'get_group_gift_summary',
        userId: userId || 'anonymous',
        itemId
      });
      throw new HttpsError("internal", "Failed to get group gift summary");
    }
  });
});
