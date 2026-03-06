import { onCall, CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
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
const MAX_SCAN_EVENTS = 2000;
const DEFAULT_AD_ECPM_USD = 8;
const MAX_SNAPSHOT_SCAN_EVENTS = 10_000;
const MAX_SNAPSHOT_BACKFILL_DAYS = 30;

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

const normalizeBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }
  if (typeof value === "number") {
    return value === 1;
  }
  return false;
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

type AnalyticsEventRecord = {
  id: string;
  category?: unknown;
  action?: unknown;
  createdAt?: unknown;
  value?: unknown;
  [key: string]: unknown;
};

type AdRevenueMetrics = {
  rendered: number;
  viewableImpressions: number;
  clickSignals: number;
  clickThroughRate: number;
  viewabilityRate: number;
  renderFailures: number;
  configMissing: number;
  estimatedRevenueUsd: number;
};

function normalizeEcpm(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_AD_ECPM_USD;
  }
  return parsed;
}

function computeAdRevenueMetrics(events: Array<Record<string, unknown>>, ecpmUsd: number): AdRevenueMetrics {
  let rendered = 0;
  let viewableImpressions = 0;
  let clickSignals = 0;
  let renderFailures = 0;
  let configMissing = 0;

  events.forEach((event) => {
    if (String(event.category || "").toLowerCase() !== "advertising") {
      return;
    }

    const action = String(event.action || "").toLowerCase();
    if (action.includes("ad_slot_rendered")) rendered += 1;
    if (action.includes("ad_slot_viewable")) viewableImpressions += 1;
    if (action.includes("ad_slot_container_click")) clickSignals += 1;
    if (action.includes("ad_slot_render_failed")) renderFailures += 1;
    if (action.includes("ad_slot_config_missing")) configMissing += 1;
  });

  const estimatedRevenueUsd = (viewableImpressions / 1000) * ecpmUsd;
  const clickThroughRate = viewableImpressions > 0
    ? (clickSignals / viewableImpressions) * 100
    : 0;
  const viewabilityRate = rendered > 0
    ? (viewableImpressions / rendered) * 100
    : 0;

  return {
    rendered,
    viewableImpressions,
    clickSignals,
    clickThroughRate,
    viewabilityRate,
    renderFailures,
    configMissing,
    estimatedRevenueUsd,
  };
}

function toDateKeyUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 0, 0, 0, 0));
}

function parseDateKey(dateKey: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return null;
  }

  const parsed = new Date(`${dateKey}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function writeAdKpiSnapshotForDate(date: Date, ecpmUsd: number) {
  const start = startOfUtcDay(date);
  const end = endOfUtcDay(date);
  const dateKey = toDateKeyUtc(start);

  const snapshot = await db
    .collection("analyticsEvents")
    .where("createdAt", ">=", start)
    .where("createdAt", "<", end)
    .limit(MAX_SNAPSHOT_SCAN_EVENTS)
    .get();

  const events = snapshot.docs.map((doc) => doc.data() as Record<string, unknown>);
  const metrics = computeAdRevenueMetrics(events, ecpmUsd);

  await db.collection("adKpiDaily").doc(dateKey).set({
    date: dateKey,
    startAt: start,
    endAt: end,
    ecpmUsd,
    metrics,
    sourceEventCount: snapshot.size,
    createdAt: new Date(),
    updatedAt: new Date(),
  }, { merge: true });

  return {
    date: dateKey,
    sourceEventCount: snapshot.size,
    ...metrics,
  };
}

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
  const includeGlobalNormalized = normalizeBoolean(includeGlobal);

  try {
    let query: Query<DocumentData> = db.collection("analyticsEvents");

    if (includeGlobalNormalized) {
      await requireAdminUser(request, "Admin role required for global analytics access");
      query = query.limit(MAX_SCAN_EVENTS);
    } else {
      query = query.where("userId", "==", requesterId);
      query = query.limit(MAX_SCAN_EVENTS);
    }

    const categoryFilter = typeof category === "string" ? category.trim() : "";
    const actionFilter = typeof action === "string" ? action.trim() : "";
    const outputLimit = normalizeLimit(limit, DEFAULT_EVENTS_LIMIT);

    const snapshot = await query.get();
    const rawEvents: AnalyticsEventRecord[] = snapshot.docs.map((doc): AnalyticsEventRecord => ({
      id: doc.id,
      ...(doc.data() as Record<string, unknown>),
    }));

    const events = rawEvents
      .filter((event) => {
        if (categoryFilter && String(event.category || "") !== categoryFilter) return false;
        if (actionFilter && String(event.action || "") !== actionFilter) return false;
        return true;
      })
      .sort((left, right) => {
        const leftDate = toDate(left.createdAt)?.getTime() || 0;
        const rightDate = toDate(right.createdAt)?.getTime() || 0;
        return rightDate - leftDate;
      })
      .slice(0, outputLimit);

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
  const includeGlobalNormalized = normalizeBoolean(includeGlobal);

  try {
    let query: Query<DocumentData> = db.collection("analyticsEvents");

    if (includeGlobalNormalized) {
      await requireAdminUser(request, "Admin role required for global analytics access");
      query = query.limit(MAX_SCAN_EVENTS);
    } else {
      query = query.where("userId", "==", requesterId);
      query = query.limit(MAX_SCAN_EVENTS);
    }

    const summaryWindowDays = normalizeWindowDays(windowDays);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - summaryWindowDays);

    const snapshot = await query.get();
    const events = snapshot.docs
      .map((doc) => doc.data())
      .filter((event) => {
        const createdAt = toDate(event.createdAt);
        return Boolean(createdAt && createdAt >= startDate);
      });

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

export const getAdRevenueSummary = onCall(async (request: CallableRequest) => {
  const requesterId = requireAuthenticatedUser(request);
  const {
    windowDays = DEFAULT_SUMMARY_WINDOW_DAYS,
    includeGlobal = false,
    ecpmUsd = DEFAULT_AD_ECPM_USD,
  } = request.data || {};
  const includeGlobalNormalized = normalizeBoolean(includeGlobal);

  try {
    let query: Query<DocumentData> = db.collection("analyticsEvents");

    if (includeGlobalNormalized) {
      await requireAdminUser(request, "Admin role required for global analytics access");
      query = query.limit(MAX_SCAN_EVENTS);
    } else {
      query = query.where("userId", "==", requesterId);
      query = query.limit(MAX_SCAN_EVENTS);
    }

    const summaryWindowDays = normalizeWindowDays(windowDays);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - summaryWindowDays);

    const normalizedEcpm = normalizeEcpm(ecpmUsd);

    const snapshot = await query.get();
    const events = snapshot.docs
      .map((doc) => doc.data())
      .filter((event) => {
        const createdAt = toDate(event.createdAt);
        if (!createdAt || createdAt < startDate) return false;
        return String(event.category || "").toLowerCase() === "advertising";
      });

    const metrics = computeAdRevenueMetrics(events, normalizedEcpm);

    return {
      summary: {
        windowDays: summaryWindowDays,
        ecpmUsd: normalizedEcpm,
        ...metrics,
      },
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    logger.error("Error getting ad revenue summary:", error);
    throw new HttpsError("internal", "Failed to get ad revenue summary");
  }
});

export const createAdKpiSnapshot = onCall(async (request: CallableRequest) => {
  requireAuthenticatedUser(request);
  await requireAdminUser(request, "Admin role required to create ad KPI snapshots");

  const { date, days = 1, ecpmUsd = DEFAULT_AD_ECPM_USD } = request.data || {};
  const normalizedDays = Math.max(1, Math.min(Math.floor(Number(days) || 1), MAX_SNAPSHOT_BACKFILL_DAYS));
  const normalizedEcpm = normalizeEcpm(ecpmUsd);

  const results: Array<Record<string, unknown>> = [];

  if (typeof date === "string" && date.trim()) {
    const parsed = parseDateKey(date.trim());
    if (!parsed) {
      throw new HttpsError("invalid-argument", "Date must use YYYY-MM-DD format");
    }

    const snapshot = await writeAdKpiSnapshotForDate(parsed, normalizedEcpm);
    results.push(snapshot);
    return { snapshots: results, ecpmUsd: normalizedEcpm };
  }

  for (let offset = 1; offset <= normalizedDays; offset += 1) {
    const target = new Date();
    target.setUTCDate(target.getUTCDate() - offset);
    const snapshot = await writeAdKpiSnapshotForDate(target, normalizedEcpm);
    results.push(snapshot);
  }

  return {
    snapshots: results,
    ecpmUsd: normalizedEcpm,
  };
});

export const scheduledAdKpiSnapshot = onSchedule({
  schedule: "15 1 * * *",
  timeZone: "Etc/UTC",
}, async (event) => {
  const configuredEcpm = normalizeEcpm(process.env.AD_ECPM_USD);
  const target = new Date();
  target.setUTCDate(target.getUTCDate() - 1);

  const snapshot = await writeAdKpiSnapshotForDate(target, configuredEcpm);
  logger.info("Daily ad KPI snapshot written", {
    scheduleTime: event.scheduleTime,
    ...snapshot,
    ecpmUsd: configuredEcpm,
  });
});

export const getAdKpiSnapshots = onCall(async (request: CallableRequest) => {
  requireAuthenticatedUser(request);
  await requireAdminUser(request, "Admin role required to read ad KPI snapshots");

  const { days = 14 } = request.data || {};
  const normalizedDays = Math.max(1, Math.min(Math.floor(Number(days) || 14), 90));

  try {
    const snapshot = await db
      .collection("adKpiDaily")
      .orderBy("date", "desc")
      .limit(normalizedDays)
      .get();

    const rows = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Record<string, unknown>),
    }));

    return {
      snapshots: rows.reverse(),
      count: rows.length,
    };
  } catch (error) {
    logger.error("Error fetching ad KPI snapshots:", error);
    throw new HttpsError("internal", "Failed to fetch ad KPI snapshots");
  }
});
