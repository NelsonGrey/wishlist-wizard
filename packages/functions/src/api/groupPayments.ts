import { onCall, CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import Stripe from "stripe";
import { ensureFirebaseAdmin } from "../firebase-admin.js";
import { parsePrice } from "../utils/helpers.js";

ensureFirebaseAdmin();
const db = getFirestore();
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";

const stripe = stripeSecretKey
  ? new (Stripe as unknown as any)(stripeSecretKey, { apiVersion: "2023-10-16" })
  : null;

export const createGroupPaymentIntent = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  if (!stripe) {
    throw new HttpsError("failed-precondition", "Stripe is not configured");
  }

  const { itemId, amount, message = "", isAnonymous = false } = request.data;

  if (!itemId || !amount) {
    throw new HttpsError("invalid-argument", "Item ID and amount are required");
  }

  const normalizedAmount = Number(amount);
  if (Number.isNaN(normalizedAmount) || normalizedAmount <= 0) {
    throw new HttpsError("invalid-argument", "Invalid amount");
  }

  try {
    const itemDoc = await db.collection("wishlistItems").doc(itemId).get();
    if (!itemDoc.exists) {
      throw new HttpsError("not-found", "Wishlist item not found");
    }

    const itemData = itemDoc.data() || {};
    const targetAmount = parsePrice(itemData.price || "0");

    const groupGiftRef = db.collection("groupGifts").doc(itemId);
    const groupGiftSnap = await groupGiftRef.get();

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
        userId: request.auth.uid,
      },
    });

    const contributionRef = await db.collection("groupGiftContributions").add({
      itemId,
      userId: request.auth.uid,
      amount: normalizedAmount,
      message,
      isAnonymous,
      paymentIntentId: paymentIntent.id,
      status: "pending",
      createdAt: new Date(),
    });

    return {
      clientSecret: paymentIntent.client_secret,
      contributionId: contributionRef.id,
    };
  } catch (error) {
    logger.error("Error creating group payment intent:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to create payment intent");
  }
});

export const confirmGroupContribution = onCall(async (request: CallableRequest) => {
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

  try {
    const contributionDoc = await db.collection("groupGiftContributions").doc(contributionId).get();
    if (!contributionDoc.exists) {
      throw new HttpsError("not-found", "Contribution not found");
    }

    const contribution = contributionDoc.data() || {};
    if (contribution.userId !== request.auth.uid) {
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

    return { success: true };
  } catch (error) {
    logger.error("Error confirming contribution:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to confirm contribution");
  }
});

export const getGroupGiftSummary = onCall(async (request: CallableRequest) => {
  const { itemId } = request.data;
  if (!itemId) {
    throw new HttpsError("invalid-argument", "Item ID is required");
  }

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
      userIds.map((userId) => db.collection("users").doc(userId).get())
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

    return {
      itemId,
      targetAmount: giftData?.targetAmount || 0,
      totalAmount: giftData?.totalAmount || totalAmount,
      participants,
    };
  } catch (error) {
    logger.error("Error getting group gift summary:", error);
    throw new HttpsError("internal", "Failed to get group gift summary");
  }
});
