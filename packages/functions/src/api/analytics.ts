import { onCall, CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Query, DocumentData } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";

const db = getFirestore();

export const trackAnalyticsEvent = onCall(async (request: CallableRequest) => {
  const { action, category, label, value, metadata } = request.data;

  if (!action) {
    throw new HttpsError("invalid-argument", "Action is required");
  }

  try {
    const eventData = {
      userId: request.auth?.uid || null,
      action,
      category: category || null,
      label: label || null,
      value: value ?? null,
      metadata: metadata || {},
      createdAt: new Date(),
    };

    await db.collection("analyticsEvents").add(eventData);
    return { success: true };
  } catch (error) {
    logger.error("Error tracking analytics event:", error);
    throw new HttpsError("internal", "Failed to track analytics event");
  }
});

export const getAnalyticsEvents = onCall(async (request: CallableRequest) => {
  const { limit = 50 } = request.data;
  const userId = request.auth?.uid || null;

  try {
    let query: Query<DocumentData> = db.collection("analyticsEvents").orderBy("createdAt", "desc").limit(limit);

    if (userId) {
      query = query.where("userId", "==", userId);
    }

    const snapshot = await query.get();
    const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return { events };
  } catch (error) {
    logger.error("Error getting analytics events:", error);
    throw new HttpsError("internal", "Failed to get analytics events");
  }
});

export const getAnalyticsSummary = onCall(async (request: CallableRequest) => {
  const userId = request.auth?.uid || null;

  try {
    let query: Query<DocumentData> = db.collection("analyticsEvents");
    if (userId) {
      query = query.where("userId", "==", userId);
    }

    const snapshot = await query.get();
    const events = snapshot.docs.map((doc) => doc.data());

    const totalEvents = events.length;
    const byCategory: Record<string, number> = {};

    events.forEach((event) => {
      const category = event.category || "uncategorized";
      byCategory[category] = (byCategory[category] || 0) + 1;
    });

    return {
      summary: {
        totalEvents,
        byCategory,
      },
    };
  } catch (error) {
    logger.error("Error getting analytics summary:", error);
    throw new HttpsError("internal", "Failed to get analytics summary");
  }
});
