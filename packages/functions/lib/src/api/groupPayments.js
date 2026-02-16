"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGroupGiftSummary = exports.confirmGroupContribution = exports.createGroupPaymentIntent = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const v2_1 = require("firebase-functions/v2");
const stripe_1 = __importDefault(require("stripe"));
const helpers_js_1 = require("../utils/helpers.js");
const db = (0, firestore_1.getFirestore)();
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeSecretKey
    ? new stripe_1.default(stripeSecretKey, { apiVersion: "2023-10-16" })
    : null;
exports.createGroupPaymentIntent = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    if (!stripe) {
        throw new https_1.HttpsError("failed-precondition", "Stripe is not configured");
    }
    const { itemId, amount, message = "", isAnonymous = false } = request.data;
    if (!itemId || !amount) {
        throw new https_1.HttpsError("invalid-argument", "Item ID and amount are required");
    }
    const normalizedAmount = Number(amount);
    if (Number.isNaN(normalizedAmount) || normalizedAmount <= 0) {
        throw new https_1.HttpsError("invalid-argument", "Invalid amount");
    }
    try {
        const itemDoc = await db.collection("wishlistItems").doc(itemId).get();
        if (!itemDoc.exists) {
            throw new https_1.HttpsError("not-found", "Wishlist item not found");
        }
        const itemData = itemDoc.data() || {};
        const targetAmount = (0, helpers_js_1.parsePrice)(itemData.price || "0");
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
    }
    catch (error) {
        v2_1.logger.error("Error creating group payment intent:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "Failed to create payment intent");
    }
});
exports.confirmGroupContribution = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    if (!stripe) {
        throw new https_1.HttpsError("failed-precondition", "Stripe is not configured");
    }
    const { contributionId } = request.data;
    if (!contributionId) {
        throw new https_1.HttpsError("invalid-argument", "Contribution ID is required");
    }
    try {
        const contributionDoc = await db.collection("groupGiftContributions").doc(contributionId).get();
        if (!contributionDoc.exists) {
            throw new https_1.HttpsError("not-found", "Contribution not found");
        }
        const contribution = contributionDoc.data() || {};
        if (contribution.userId !== request.auth.uid) {
            throw new https_1.HttpsError("permission-denied", "You can only confirm your own contribution");
        }
        if (contribution.status === "succeeded") {
            return { success: true };
        }
        const paymentIntentId = contribution.paymentIntentId;
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status !== "succeeded") {
            throw new https_1.HttpsError("failed-precondition", "Payment not completed");
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
                totalAmount: firestore_1.FieldValue.increment(contribution.amount || 0),
            }, { merge: true });
        });
        return { success: true };
    }
    catch (error) {
        v2_1.logger.error("Error confirming contribution:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "Failed to confirm contribution");
    }
});
exports.getGroupGiftSummary = (0, https_1.onCall)(async (request) => {
    const { itemId } = request.data;
    if (!itemId) {
        throw new https_1.HttpsError("invalid-argument", "Item ID is required");
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
        const participantsRaw = contributionsSnapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        const userIds = Array.from(new Set(participantsRaw.map((p) => p.userId).filter(Boolean)));
        const userDocs = await Promise.all(userIds.map((userId) => db.collection("users").doc(userId).get()));
        const userMap = new Map(userDocs.map((doc) => [doc.id, doc.data()]));
        const participants = participantsRaw.map((participant) => {
            var _a;
            return (Object.assign(Object.assign({}, participant), { contributionAmount: participant.amount || 0, user: participant.isAnonymous || !participant.userId
                    ? null
                    : {
                        displayName: ((_a = userMap.get(participant.userId)) === null || _a === void 0 ? void 0 : _a.displayName) || null,
                    } }));
        });
        const totalAmount = participants.reduce((sum, c) => sum + (c.amount || 0), 0);
        return {
            itemId,
            targetAmount: (giftData === null || giftData === void 0 ? void 0 : giftData.targetAmount) || 0,
            totalAmount: (giftData === null || giftData === void 0 ? void 0 : giftData.totalAmount) || totalAmount,
            participants,
        };
    }
    catch (error) {
        v2_1.logger.error("Error getting group gift summary:", error);
        throw new https_1.HttpsError("internal", "Failed to get group gift summary");
    }
});
//# sourceMappingURL=groupPayments.js.map