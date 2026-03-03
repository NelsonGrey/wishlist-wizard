import { onCall, CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { randomUUID } from "crypto";
import { ensureFirebaseAdmin } from "../firebase-admin.js";
import { getValidCalendarAccessToken } from "../utils/calendar-tokens.js";

ensureFirebaseAdmin();
const db = getFirestore();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "";
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || "";
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || "";
const MICROSOFT_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || "";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

const MICROSOFT_SCOPES = [
  "offline_access",
  "User.Read",
  "Calendars.ReadWrite",
  "Contacts.Read",
].join(" ");

function requireAuth(request: CallableRequest) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
}

function requireOAuthProviderConfig(provider: string) {
  if (provider === "google") {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new HttpsError("failed-precondition", "Google calendar OAuth is not configured");
    }
    return;
  }

  if (provider === "outlook") {
    if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
      throw new HttpsError("failed-precondition", "Outlook calendar OAuth is not configured");
    }
  }
}

function sanitizeCalendarConnection(connection: Record<string, unknown>, id: string) {
  const { accessToken, refreshToken, ...safe } = connection;
  void accessToken;
  void refreshToken;
  return {
    id,
    ...safe,
    hasRefreshToken: Boolean(refreshToken),
  };
}

function normalizeText(value: unknown, fallback = ""): string {
  const normalized = typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
  const trimmed = normalized.trim();
  return trimmed || fallback;
}

function toDateOnly(value: unknown): string | null {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const isoDateMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDateMatch) {
    return isoDateMatch[1];
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().split("T")[0];
}

function buildGoogleAuthUrl(state: string, redirectUri: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPES);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

function buildMicrosoftAuthUrl(state: string, redirectUri: string) {
  const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  url.searchParams.set("client_id", MICROSOFT_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", MICROSOFT_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

async function exchangeGoogleCode(code: string, redirectUri: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google token exchange failed: ${text}`);
  }

  return response.json();
}

async function exchangeMicrosoftCode(code: string, redirectUri: string) {
  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: MICROSOFT_CLIENT_ID,
      client_secret: MICROSOFT_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope: MICROSOFT_SCOPES,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Microsoft token exchange failed: ${text}`);
  }

  return response.json();
}

async function fetchGoogleCalendars(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google calendar list failed: ${text}`);
  }

  return response.json();
}

async function fetchMicrosoftCalendars(accessToken: string) {
  const response = await fetch("https://graph.microsoft.com/v1.0/me/calendars", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Microsoft calendar list failed: ${text}`);
  }

  return response.json();
}

export const getCalendarEvents = onCall(async (request: CallableRequest) => {
  requireAuth(request);

  try {
    const snapshot = await db
      .collection("calendarEvents")
      .where("userId", "==", request.auth!.uid)
      .get();

    const events = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((left: any, right: any) => {
        const leftTime = new Date(left.startDate || 0).getTime();
        const rightTime = new Date(right.startDate || 0).getTime();
        return leftTime - rightTime;
      });
    return events;
  } catch (error) {
    logger.error("Error fetching calendar events:", error);
    throw new HttpsError("internal", "Failed to fetch calendar events");
  }
});

export const createCalendarEvent = onCall(async (request: CallableRequest) => {
  requireAuth(request);
  const { title, description, startDate, endDate, allDay, location, type, recurYearly, reminderDays, beneficiaryId, wishlistId, color } = request.data;

  if (!title || !startDate) {
    throw new HttpsError("invalid-argument", "Title and start date are required");
  }

  try {
    const eventData = {
      userId: request.auth!.uid,
      title,
      description: description || "",
      startDate,
      endDate: endDate || startDate,
      allDay: Boolean(allDay),
      location: location || "",
      type: type || "reminder",
      recurYearly: Boolean(recurYearly),
      reminderDays: reminderDays ?? 7,
      beneficiaryId: beneficiaryId || null,
      wishlistId: wishlistId || null,
      color: color || "#6366F1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection("calendarEvents").add(eventData);
    return { id: docRef.id, ...eventData };
  } catch (error) {
    logger.error("Error creating calendar event:", error);
    throw new HttpsError("internal", "Failed to create calendar event");
  }
});

export const updateCalendarEvent = onCall(async (request: CallableRequest) => {
  requireAuth(request);
  const { eventId, updates } = request.data;

  if (!eventId || !updates) {
    throw new HttpsError("invalid-argument", "Event ID and updates are required");
  }

  try {
    const eventDoc = await db.collection("calendarEvents").doc(eventId).get();
    if (!eventDoc.exists) {
      throw new HttpsError("not-found", "Event not found");
    }

    if (eventDoc.data()?.userId !== request.auth!.uid) {
      throw new HttpsError("permission-denied", "You can only update your own events");
    }

    await db.collection("calendarEvents").doc(eventId).update({
      ...updates,
      updatedAt: new Date(),
    });

    return { id: eventId, ...eventDoc.data(), ...updates };
  } catch (error) {
    logger.error("Error updating calendar event:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to update calendar event");
  }
});

export const deleteCalendarEvent = onCall(async (request: CallableRequest) => {
  requireAuth(request);
  const { eventId } = request.data;

  if (!eventId) {
    throw new HttpsError("invalid-argument", "Event ID is required");
  }

  try {
    const eventDoc = await db.collection("calendarEvents").doc(eventId).get();
    if (!eventDoc.exists) {
      throw new HttpsError("not-found", "Event not found");
    }

    if (eventDoc.data()?.userId !== request.auth!.uid) {
      throw new HttpsError("permission-denied", "You can only delete your own events");
    }

    await db.collection("calendarEvents").doc(eventId).delete();
    return { success: true };
  } catch (error) {
    logger.error("Error deleting calendar event:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to delete calendar event");
  }
});

export const getCalendarAuthUrl = onCall(async (request: CallableRequest) => {
  requireAuth(request);
  const { provider, redirectUri } = request.data;

  if (!provider) {
    throw new HttpsError("invalid-argument", "Provider is required");
  }

  const state = randomUUID();
  const finalRedirect = redirectUri || (provider === "google" ? GOOGLE_REDIRECT_URI : MICROSOFT_REDIRECT_URI);

  if ((provider === "google" || provider === "outlook") && !finalRedirect) {
    throw new HttpsError("failed-precondition", "Redirect URI is required for OAuth providers");
  }

  if (provider === "google" || provider === "outlook") {
    requireOAuthProviderConfig(provider);
  }

  await db.collection("calendarAuthStates").doc(state).set({
    userId: request.auth!.uid,
    provider,
    redirectUri: finalRedirect,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    createdAt: new Date(),
  });

  if (provider === "google") {
    const url = buildGoogleAuthUrl(state, finalRedirect);
    return { url, authUrl: url, provider };
  }

  if (provider === "outlook") {
    const url = buildMicrosoftAuthUrl(state, finalRedirect);
    return { url, authUrl: url, provider };
  }

  if (provider === "apple") {
    const url = "https://www.icloud.com/calendar";
    return {
      url,
      authUrl: url,
      provider,
      message: "Apple Calendar uses read-only subscription URLs in Wishlist Wizard.",
    };
  }

  throw new HttpsError("invalid-argument", "Unsupported provider");
});

export const connectCalendar = onCall(async (request: CallableRequest) => {
  requireAuth(request);
  const { provider, code, state, redirectUri, subscriptionUrl, displayName } = request.data;

  if (!provider) {
    throw new HttpsError("invalid-argument", "Provider is required");
  }

  if ((provider === "google" || provider === "outlook") && !code) {
    throw new HttpsError("invalid-argument", "Authorization code is required for this provider");
  }

  if (provider === "google" || provider === "outlook") {
    requireOAuthProviderConfig(provider);
  }

  if (provider === "apple") {
    if (!subscriptionUrl || typeof subscriptionUrl !== "string") {
      throw new HttpsError("invalid-argument", "Apple calendar subscription URL is required");
    }

    const connectionData = {
      userId: request.auth!.uid,
      calendarType: provider,
      calendarId: subscriptionUrl.trim(),
      displayName: normalizeText(displayName, "Apple Calendar Subscription"),
      accessToken: null,
      refreshToken: null,
      tokenExpiry: null,
      isActive: true,
      settings: {
        syncEvents: true,
        syncDirection: "import",
        defaultReminders: [60],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSyncedAt: null,
    };

    const existing = await db
      .collection("userCalendars")
      .where("userId", "==", request.auth!.uid)
      .where("calendarType", "==", "apple")
      .where("calendarId", "==", connectionData.calendarId)
      .limit(1)
      .get();

    if (!existing.empty) {
      const existingDoc = existing.docs[0];
      await existingDoc.ref.update({
        ...connectionData,
        isActive: true,
        updatedAt: new Date(),
      });
      return sanitizeCalendarConnection(connectionData, existingDoc.id);
    }

    const docRef = await db.collection("userCalendars").add(connectionData);
    return sanitizeCalendarConnection(connectionData, docRef.id);
  }

  let redirect = redirectUri || (provider === "google" ? GOOGLE_REDIRECT_URI : MICROSOFT_REDIRECT_URI);

  if (state) {
    const stateDoc = await db.collection("calendarAuthStates").doc(state).get();
    if (stateDoc.exists) {
      const stateData = stateDoc.data();
      if (stateData?.userId !== request.auth!.uid) {
        throw new HttpsError("permission-denied", "Invalid auth state");
      }

      if (stateData?.provider && stateData.provider !== provider) {
        throw new HttpsError("invalid-argument", "Auth state provider does not match");
      }

      const expiresAtRaw = stateData?.expiresAt;
      const expiresAt = expiresAtRaw && typeof expiresAtRaw.toDate === "function"
        ? expiresAtRaw.toDate()
        : expiresAtRaw instanceof Date
          ? expiresAtRaw
          : null;
      if (expiresAt && expiresAt.getTime() < Date.now()) {
        await db.collection("calendarAuthStates").doc(state).delete();
        throw new HttpsError("failed-precondition", "Calendar auth state has expired. Please try again.");
      }

      redirect = stateData?.redirectUri || redirect;
      await db.collection("calendarAuthStates").doc(state).delete();
    }
  }

  try {
    let tokenResponse: any;
    if (provider === "google") {
      tokenResponse = await exchangeGoogleCode(code, redirect);
    } else if (provider === "outlook") {
      tokenResponse = await exchangeMicrosoftCode(code, redirect);
    } else {
      throw new HttpsError("invalid-argument", "Unsupported provider");
    }

    const accessToken = tokenResponse.access_token;
    const refreshToken = tokenResponse.refresh_token || null;
    const expiresIn = tokenResponse.expires_in || 3600;
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000);

    let calendarId = "primary";
    let displayName = `${provider} Calendar`;

    if (provider === "google") {
      const calendars = await fetchGoogleCalendars(accessToken);
      const primary = calendars.items?.find((c: any) => c.primary) || calendars.items?.[0];
      if (primary) {
        calendarId = primary.id;
        displayName = primary.summary || displayName;
      }
    }

    if (provider === "outlook") {
      const calendars = await fetchMicrosoftCalendars(accessToken);
      const primary = calendars.value?.[0];
      if (primary) {
        calendarId = primary.id;
        displayName = primary.name || displayName;
      }
    }

    const connectionData = {
      userId: request.auth!.uid,
      calendarType: provider,
      calendarId,
      displayName,
      accessToken,
      refreshToken,
      tokenExpiry,
      isActive: true,
      settings: {
        syncEvents: true,
        syncDirection: "bidirectional",
        defaultReminders: [60],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingConnection = await db
      .collection("userCalendars")
      .where("userId", "==", request.auth!.uid)
      .where("calendarType", "==", provider)
      .where("calendarId", "==", calendarId)
      .limit(1)
      .get();

    if (!existingConnection.empty) {
      const doc = existingConnection.docs[0];
      await doc.ref.update({
        ...connectionData,
        isActive: true,
        updatedAt: new Date(),
      });
      return sanitizeCalendarConnection(connectionData, doc.id);
    }

    const docRef = await db.collection("userCalendars").add(connectionData);
    return sanitizeCalendarConnection(connectionData, docRef.id);
  } catch (error) {
    logger.error("Error connecting calendar:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to connect calendar");
  }
});

export const getCalendarConnections = onCall(async (request: CallableRequest) => {
  requireAuth(request);

  try {
    const snapshot = await db
      .collection("userCalendars")
      .where("userId", "==", request.auth!.uid)
      .where("isActive", "==", true)
      .get();

    const connections = snapshot.docs.map((doc) => sanitizeCalendarConnection(doc.data(), doc.id));
    return connections;
  } catch (error) {
    logger.error("Error fetching calendar connections:", error);
    throw new HttpsError("internal", "Failed to fetch calendar connections");
  }
});

export const updateCalendarConnectionSettings = onCall(async (request: CallableRequest) => {
  requireAuth(request);
  const { connectionId, settings } = request.data || {};

  if (!connectionId || !settings) {
    throw new HttpsError("invalid-argument", "Connection ID and settings are required");
  }

  try {
    const docRef = db.collection("userCalendars").doc(connectionId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new HttpsError("not-found", "Connection not found");
    }

    if (doc.data()?.userId !== request.auth!.uid) {
      throw new HttpsError("permission-denied", "You can only update your own calendars");
    }

    const existingSettings = doc.data()?.settings || {};
    const nextSettings = {
      ...existingSettings,
      ...settings,
    };

    await docRef.update({ settings: nextSettings, updatedAt: new Date() });
    return { success: true, settings: nextSettings };
  } catch (error) {
    logger.error("Error updating calendar settings:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to update calendar settings");
  }
});

export const disconnectCalendar = onCall(async (request: CallableRequest) => {
  requireAuth(request);
  const { connectionId } = request.data;
  if (!connectionId) {
    throw new HttpsError("invalid-argument", "Connection ID is required");
  }

  try {
    const docRef = db.collection("userCalendars").doc(connectionId);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new HttpsError("not-found", "Connection not found");
    }

    if (doc.data()?.userId !== request.auth!.uid) {
      throw new HttpsError("permission-denied", "You can only disconnect your own calendars");
    }

    await docRef.update({ isActive: false, updatedAt: new Date() });
    return { success: true };
  } catch (error) {
    logger.error("Error disconnecting calendar:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to disconnect calendar");
  }
});

async function createGoogleEvent(accessToken: string, calendarId: string, event: any) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google event creation failed: ${text}`);
  }

  return response.json();
}

async function createMicrosoftEvent(accessToken: string, calendarId: string, event: any) {
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Microsoft event creation failed: ${text}`);
  }

  return response.json();
}

async function syncConnectionEvents(connectionId: string, connection: any, userId: string) {
  if (connection.calendarType === "apple") {
    await db.collection("userCalendars").doc(connectionId).update({
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    });
    return 0;
  }

  const eventsSnapshot = await db
    .collection("calendarEvents")
    .where("userId", "==", userId)
    .get();

  type CalendarEventData = {
    externalEventId?: string;
    calendarId?: string;
    title?: string;
    description?: string;
    location?: string;
    allDay?: boolean;
    startDate?: string;
    endDate?: string;
  };

  const events: Array<CalendarEventData & { id: string }> = eventsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as CalendarEventData)
  }));

  const accessToken = await getValidCalendarAccessToken(connectionId, connection);

  let syncedCount = 0;

  for (const event of events) {
    if (event.externalEventId && event.calendarId === connection.calendarId) {
      continue;
    }

    const startDateTime = normalizeText(event.startDate);
    const endDateTime = normalizeText(event.endDate) || startDateTime;
    const startDateOnly = toDateOnly(event.startDate);
    const endDateOnly = toDateOnly(event.endDate) || startDateOnly;

    if (event.allDay && (!startDateOnly || !endDateOnly)) {
      logger.warn("Skipping calendar sync event due to invalid all-day dates", { eventId: event.id });
      continue;
    }

    if (!event.allDay && !startDateTime) {
      logger.warn("Skipping calendar sync event due to missing startDate", { eventId: event.id });
      continue;
    }

    const payload = {
      summary: event.title,
      description: event.description || "",
      location: event.location || "",
      start: event.allDay
        ? { date: startDateOnly }
        : { dateTime: startDateTime },
      end: event.allDay
        ? { date: endDateOnly }
        : { dateTime: endDateTime },
    };

    let externalEvent;
    if (connection.calendarType === "google") {
      externalEvent = await createGoogleEvent(accessToken, connection.calendarId, payload);
    } else if (connection.calendarType === "outlook") {
      externalEvent = await createMicrosoftEvent(accessToken, connection.calendarId, payload);
    }

    if (externalEvent?.id) {
      await db.collection("calendarEvents").doc(event.id).update({
        externalEventId: externalEvent.id,
        calendarId: connection.calendarId,
        updatedAt: new Date(),
      });
      syncedCount += 1;
    }
  }

  await db.collection("userCalendars").doc(connectionId).update({
    lastSyncedAt: new Date(),
    updatedAt: new Date(),
  });

  return syncedCount;
}

export const syncCalendarConnection = onCall(async (request: CallableRequest) => {
  requireAuth(request);
  const { connectionId } = request.data;
  if (!connectionId) {
    throw new HttpsError("invalid-argument", "Connection ID is required");
  }

  try {
    const connectionDoc = await db.collection("userCalendars").doc(connectionId).get();
    if (!connectionDoc.exists) {
      throw new HttpsError("not-found", "Connection not found");
    }

    const connection = connectionDoc.data()!;
    if (connection.userId !== request.auth!.uid) {
      throw new HttpsError("permission-denied", "You can only sync your own calendars");
    }

    const syncedCount = await syncConnectionEvents(connectionId, connection, request.auth!.uid);
    return { success: true, syncedCount };
  } catch (error) {
    logger.error("Error syncing calendar:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to sync calendar");
  }
});

export const syncCalendar = onCall(async (request: CallableRequest) => {
  requireAuth(request);
  const connectionsSnapshot = await db
    .collection("userCalendars")
    .where("userId", "==", request.auth!.uid)
    .where("isActive", "==", true)
    .get();

  const results = [];
  for (const doc of connectionsSnapshot.docs) {
    try {
      const syncedCount = await syncConnectionEvents(doc.id, doc.data(), request.auth!.uid);
      results.push({ id: doc.id, syncedCount });
    } catch (error) {
      results.push({ id: doc.id, error: (error as Error).message });
    }
  }

  return { results };
});

export const getCalendarSyncSettings = onCall(async (request: CallableRequest) => {
  requireAuth(request);
  try {
    const snapshot = await db
      .collection("userCalendars")
      .where("userId", "==", request.auth!.uid)
      .where("isActive", "==", true)
      .get();

    const providers = snapshot.docs.map((doc) => doc.data().calendarType);
    return {
      google: { connected: providers.includes("google") },
      apple: { connected: providers.includes("apple") },
      outlook: { connected: providers.includes("outlook") },
    };
  } catch (error) {
    logger.error("Error fetching calendar sync settings:", error);
    throw new HttpsError("internal", "Failed to fetch calendar sync settings");
  }
});
