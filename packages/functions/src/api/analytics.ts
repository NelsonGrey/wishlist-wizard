import { onCall, CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Query, DocumentData } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { ensureFirebaseAdmin } from "../firebase-admin.js";
import { requireAuthenticatedUser, requireAdminUser } from "../utils/auth-guards.js";

ensureFirebaseAdmin();
const db = getFirestore();

const MAX_EVENTS_LIMIT = 200;
const DEFAULT_EVENTS_LIMIT = 50;
const DEFAULT_SUMMARY_WINDOW_DAYS = 30;
const MAX_SUMMARY_WINDOW_DAYS = 365;

const normalizeLimit = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(parsed), MAX_EVENTS_LIMIT);
};

const normalizeWindowDays = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SUMMARY_WINDOW_DAYS;
  }
  return Math.min(Math.floor(parsed), MAX_SUMMARY_WINDOW_DAYS);
};

const toDate = (value: unknown): Date | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof (value as { toDate?: unknown }).toDate === "function") {
    const maybeDate = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(maybeDate.getTime()) ? null : maybeDate;
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

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
  const requesterId = requireAuthenticatedUser(request);
  const { limit = DEFAULT_EVENTS_LIMIT, category, action, includeGlobal = false } = request.data || {};

  try {
    let query: Query<DocumentData> = db.collection("analyticsEvents").orderBy("createdAt", "desc");

    if (includeGlobal) {
      await requireAdminUser(request, "Admin role required for global analytics access");
    } else {
      query = query.where("userId", "==", requesterId);
    }

    if (typeof category === "string" && category.trim()) {
      query = query.where("category", "==", category.trim());
    }

    if (typeof action === "string" && action.trim()) {
      query = query.where("action", "==", action.trim());
    }

    query = query.limit(normalizeLimit(limit, DEFAULT_EVENTS_LIMIT));

    const snapshot = await query.get();
    const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return { events };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    logger.error("Error getting analytics events:", error);
    throw new HttpsError("internal", "Failed to get analytics events");
  }
});

export const getAnalyticsSummary = onCall(async (request: CallableRequest) => {
  const requesterId = requireAuthenticatedUser(request);
  const { windowDays = DEFAULT_SUMMARY_WINDOW_DAYS, includeGlobal = false } = request.data || {};

  try {
    let query: Query<DocumentData> = db.collection("analyticsEvents");

    if (includeGlobal) {
      await requireAdminUser(request, "Admin role required for global analytics access");
    } else {
      query = query.where("userId", "==", requesterId);
    }

    const summaryWindowDays = normalizeWindowDays(windowDays);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - summaryWindowDays);

    query = query.where("createdAt", ">=", startDate);

    const snapshot = await query.get();
    const events = snapshot.docs.map((doc) => doc.data());

    const totalEvents = events.length;
    const byCategory: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    const byDay: Record<string, number> = {};
    let totalValue = 0;

    events.forEach((event) => {
      const category = event.category || "uncategorized";
      const action = event.action || "unknown";
      const createdAt = toDate(event.createdAt);
      const eventValue = Number(event.value);

      byCategory[category] = (byCategory[category] || 0) + 1;
      byAction[action] = (byAction[action] || 0) + 1;

      if (createdAt) {
        const dayKey = createdAt.toISOString().slice(0, 10);
        byDay[dayKey] = (byDay[dayKey] || 0) + 1;
      }

      if (Number.isFinite(eventValue)) {
        totalValue += eventValue;
      }
    });

    const topActions = Object.entries(byAction)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));

    const trendByDay = Object.entries(byDay)
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([date, count]) => ({ date, count }));

    return {
      summary: {
        totalEvents,
        byCategory,
        byAction,
        topActions,
        trendByDay,
        totalValue,
        windowDays: summaryWindowDays,
      },
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    logger.error("Error getting analytics summary:", error);
    throw new HttpsError("internal", "Failed to get analytics summary");
  }
});
