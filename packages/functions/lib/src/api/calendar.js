"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCalendarSyncSettings = exports.syncCalendar = exports.syncCalendarConnection = exports.disconnectCalendar = exports.updateCalendarConnectionSettings = exports.getCalendarConnections = exports.connectCalendar = exports.getCalendarAuthUrl = exports.deleteCalendarEvent = exports.updateCalendarEvent = exports.createCalendarEvent = exports.getCalendarEvents = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const v2_1 = require("firebase-functions/v2");
const crypto_1 = require("crypto");
const db = (0, firestore_1.getFirestore)();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "";
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || "";
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || "";
const MICROSOFT_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || "";
const GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/userinfo.email",
].join(" ");
const MICROSOFT_SCOPES = [
    "offline_access",
    "User.Read",
    "Calendars.ReadWrite",
].join(" ");
function requireAuth(request) {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
}
function buildGoogleAuthUrl(state, redirectUri) {
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
function buildMicrosoftAuthUrl(state, redirectUri) {
    const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
    url.searchParams.set("client_id", MICROSOFT_CLIENT_ID);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("response_mode", "query");
    url.searchParams.set("scope", MICROSOFT_SCOPES);
    url.searchParams.set("state", state);
    return url.toString();
}
async function exchangeGoogleCode(code, redirectUri) {
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
async function exchangeMicrosoftCode(code, redirectUri) {
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
async function fetchGoogleCalendars(accessToken) {
    const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Google calendar list failed: ${text}`);
    }
    return response.json();
}
async function fetchMicrosoftCalendars(accessToken) {
    const response = await fetch("https://graph.microsoft.com/v1.0/me/calendars", {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Microsoft calendar list failed: ${text}`);
    }
    return response.json();
}
exports.getCalendarEvents = (0, https_1.onCall)(async (request) => {
    requireAuth(request);
    try {
        const snapshot = await db
            .collection("calendarEvents")
            .where("userId", "==", request.auth.uid)
            .orderBy("startDate", "asc")
            .get();
        const events = snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        return events;
    }
    catch (error) {
        v2_1.logger.error("Error fetching calendar events:", error);
        throw new https_1.HttpsError("internal", "Failed to fetch calendar events");
    }
});
exports.createCalendarEvent = (0, https_1.onCall)(async (request) => {
    requireAuth(request);
    const { title, description, startDate, endDate, allDay, location, type, recurYearly, reminderDays, beneficiaryId, wishlistId, color } = request.data;
    if (!title || !startDate) {
        throw new https_1.HttpsError("invalid-argument", "Title and start date are required");
    }
    try {
        const eventData = {
            userId: request.auth.uid,
            title,
            description: description || "",
            startDate,
            endDate: endDate || startDate,
            allDay: Boolean(allDay),
            location: location || "",
            type: type || "reminder",
            recurYearly: Boolean(recurYearly),
            reminderDays: reminderDays !== null && reminderDays !== void 0 ? reminderDays : 7,
            beneficiaryId: beneficiaryId || null,
            wishlistId: wishlistId || null,
            color: color || "#6366F1",
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const docRef = await db.collection("calendarEvents").add(eventData);
        return Object.assign({ id: docRef.id }, eventData);
    }
    catch (error) {
        v2_1.logger.error("Error creating calendar event:", error);
        throw new https_1.HttpsError("internal", "Failed to create calendar event");
    }
});
exports.updateCalendarEvent = (0, https_1.onCall)(async (request) => {
    var _a;
    requireAuth(request);
    const { eventId, updates } = request.data;
    if (!eventId || !updates) {
        throw new https_1.HttpsError("invalid-argument", "Event ID and updates are required");
    }
    try {
        const eventDoc = await db.collection("calendarEvents").doc(eventId).get();
        if (!eventDoc.exists) {
            throw new https_1.HttpsError("not-found", "Event not found");
        }
        if (((_a = eventDoc.data()) === null || _a === void 0 ? void 0 : _a.userId) !== request.auth.uid) {
            throw new https_1.HttpsError("permission-denied", "You can only update your own events");
        }
        await db.collection("calendarEvents").doc(eventId).update(Object.assign(Object.assign({}, updates), { updatedAt: new Date() }));
        return Object.assign(Object.assign({ id: eventId }, eventDoc.data()), updates);
    }
    catch (error) {
        v2_1.logger.error("Error updating calendar event:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "Failed to update calendar event");
    }
});
exports.deleteCalendarEvent = (0, https_1.onCall)(async (request) => {
    var _a;
    requireAuth(request);
    const { eventId } = request.data;
    if (!eventId) {
        throw new https_1.HttpsError("invalid-argument", "Event ID is required");
    }
    try {
        const eventDoc = await db.collection("calendarEvents").doc(eventId).get();
        if (!eventDoc.exists) {
            throw new https_1.HttpsError("not-found", "Event not found");
        }
        if (((_a = eventDoc.data()) === null || _a === void 0 ? void 0 : _a.userId) !== request.auth.uid) {
            throw new https_1.HttpsError("permission-denied", "You can only delete your own events");
        }
        await db.collection("calendarEvents").doc(eventId).delete();
        return { success: true };
    }
    catch (error) {
        v2_1.logger.error("Error deleting calendar event:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "Failed to delete calendar event");
    }
});
exports.getCalendarAuthUrl = (0, https_1.onCall)(async (request) => {
    requireAuth(request);
    const { provider, redirectUri } = request.data;
    if (!provider) {
        throw new https_1.HttpsError("invalid-argument", "Provider is required");
    }
    const state = (0, crypto_1.randomUUID)();
    const finalRedirect = redirectUri || (provider === "google" ? GOOGLE_REDIRECT_URI : MICROSOFT_REDIRECT_URI);
    await db.collection("calendarAuthStates").doc(state).set({
        userId: request.auth.uid,
        provider,
        redirectUri: finalRedirect,
        createdAt: new Date(),
    });
    if (provider === "google") {
        return { url: buildGoogleAuthUrl(state, finalRedirect) };
    }
    if (provider === "outlook") {
        return { url: buildMicrosoftAuthUrl(state, finalRedirect) };
    }
    if (provider === "apple") {
        return {
            url: "https://support.apple.com/guide/calendar/subscribe-to-calendars-icl1022",
            message: "Apple Calendar sync is available via subscription. Use the provided instructions.",
        };
    }
    throw new https_1.HttpsError("invalid-argument", "Unsupported provider");
});
exports.connectCalendar = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c;
    requireAuth(request);
    const { provider, code, state, redirectUri } = request.data;
    if (!provider || !code) {
        throw new https_1.HttpsError("invalid-argument", "Provider and code are required");
    }
    let redirect = redirectUri || (provider === "google" ? GOOGLE_REDIRECT_URI : MICROSOFT_REDIRECT_URI);
    if (state) {
        const stateDoc = await db.collection("calendarAuthStates").doc(state).get();
        if (stateDoc.exists) {
            const stateData = stateDoc.data();
            if ((stateData === null || stateData === void 0 ? void 0 : stateData.userId) !== request.auth.uid) {
                throw new https_1.HttpsError("permission-denied", "Invalid auth state");
            }
            redirect = (stateData === null || stateData === void 0 ? void 0 : stateData.redirectUri) || redirect;
            await db.collection("calendarAuthStates").doc(state).delete();
        }
    }
    try {
        let tokenResponse;
        if (provider === "google") {
            tokenResponse = await exchangeGoogleCode(code, redirect);
        }
        else if (provider === "outlook") {
            tokenResponse = await exchangeMicrosoftCode(code, redirect);
        }
        else if (provider === "apple") {
            throw new https_1.HttpsError("failed-precondition", "Apple calendar requires manual subscription");
        }
        else {
            throw new https_1.HttpsError("invalid-argument", "Unsupported provider");
        }
        const accessToken = tokenResponse.access_token;
        const refreshToken = tokenResponse.refresh_token || null;
        const expiresIn = tokenResponse.expires_in || 3600;
        const tokenExpiry = new Date(Date.now() + expiresIn * 1000);
        let calendarId = "primary";
        let displayName = `${provider} Calendar`;
        if (provider === "google") {
            const calendars = await fetchGoogleCalendars(accessToken);
            const primary = ((_a = calendars.items) === null || _a === void 0 ? void 0 : _a.find((c) => c.primary)) || ((_b = calendars.items) === null || _b === void 0 ? void 0 : _b[0]);
            if (primary) {
                calendarId = primary.id;
                displayName = primary.summary || displayName;
            }
        }
        if (provider === "outlook") {
            const calendars = await fetchMicrosoftCalendars(accessToken);
            const primary = (_c = calendars.value) === null || _c === void 0 ? void 0 : _c[0];
            if (primary) {
                calendarId = primary.id;
                displayName = primary.name || displayName;
            }
        }
        const connectionData = {
            userId: request.auth.uid,
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
        const docRef = await db.collection("userCalendars").add(connectionData);
        return Object.assign({ id: docRef.id }, connectionData);
    }
    catch (error) {
        v2_1.logger.error("Error connecting calendar:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "Failed to connect calendar");
    }
});
exports.getCalendarConnections = (0, https_1.onCall)(async (request) => {
    requireAuth(request);
    try {
        const snapshot = await db
            .collection("userCalendars")
            .where("userId", "==", request.auth.uid)
            .where("isActive", "==", true)
            .get();
        const connections = snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        return connections;
    }
    catch (error) {
        v2_1.logger.error("Error fetching calendar connections:", error);
        throw new https_1.HttpsError("internal", "Failed to fetch calendar connections");
    }
});
exports.updateCalendarConnectionSettings = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    requireAuth(request);
    const { connectionId, settings } = request.data || {};
    if (!connectionId || !settings) {
        throw new https_1.HttpsError("invalid-argument", "Connection ID and settings are required");
    }
    try {
        const docRef = db.collection("userCalendars").doc(connectionId);
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new https_1.HttpsError("not-found", "Connection not found");
        }
        if (((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.userId) !== request.auth.uid) {
            throw new https_1.HttpsError("permission-denied", "You can only update your own calendars");
        }
        const existingSettings = ((_b = doc.data()) === null || _b === void 0 ? void 0 : _b.settings) || {};
        const nextSettings = Object.assign(Object.assign({}, existingSettings), settings);
        await docRef.update({ settings: nextSettings, updatedAt: new Date() });
        return { success: true, settings: nextSettings };
    }
    catch (error) {
        v2_1.logger.error("Error updating calendar settings:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "Failed to update calendar settings");
    }
});
exports.disconnectCalendar = (0, https_1.onCall)(async (request) => {
    var _a;
    requireAuth(request);
    const { connectionId } = request.data;
    if (!connectionId) {
        throw new https_1.HttpsError("invalid-argument", "Connection ID is required");
    }
    try {
        const docRef = db.collection("userCalendars").doc(connectionId);
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new https_1.HttpsError("not-found", "Connection not found");
        }
        if (((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.userId) !== request.auth.uid) {
            throw new https_1.HttpsError("permission-denied", "You can only disconnect your own calendars");
        }
        await docRef.update({ isActive: false, updatedAt: new Date() });
        return { success: true };
    }
    catch (error) {
        v2_1.logger.error("Error disconnecting calendar:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "Failed to disconnect calendar");
    }
});
async function createGoogleEvent(accessToken, calendarId, event) {
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
async function createMicrosoftEvent(accessToken, calendarId, event) {
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
async function syncConnectionEvents(connectionId, connection, userId) {
    if (connection.calendarType === "apple") {
        throw new https_1.HttpsError("failed-precondition", "Apple calendar sync is not automated. Use subscription instead.");
    }
    const eventsSnapshot = await db
        .collection("calendarEvents")
        .where("userId", "==", userId)
        .get();
    const events = eventsSnapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
    let syncedCount = 0;
    for (const event of events) {
        if (event.externalEventId && event.calendarId === connection.calendarId) {
            continue;
        }
        const endDate = event.endDate || event.startDate || "";
        const payload = {
            summary: event.title,
            description: event.description || "",
            location: event.location || "",
            start: event.allDay
                ? { date: event.startDate.split("T")[0] }
                : { dateTime: event.startDate },
            end: event.allDay
                ? { date: endDate.split("T")[0] }
                : { dateTime: endDate },
        };
        let externalEvent;
        if (connection.calendarType === "google") {
            externalEvent = await createGoogleEvent(connection.accessToken, connection.calendarId, payload);
        }
        else if (connection.calendarType === "outlook") {
            externalEvent = await createMicrosoftEvent(connection.accessToken, connection.calendarId, payload);
        }
        if (externalEvent === null || externalEvent === void 0 ? void 0 : externalEvent.id) {
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
exports.syncCalendarConnection = (0, https_1.onCall)(async (request) => {
    requireAuth(request);
    const { connectionId } = request.data;
    if (!connectionId) {
        throw new https_1.HttpsError("invalid-argument", "Connection ID is required");
    }
    try {
        const connectionDoc = await db.collection("userCalendars").doc(connectionId).get();
        if (!connectionDoc.exists) {
            throw new https_1.HttpsError("not-found", "Connection not found");
        }
        const connection = connectionDoc.data();
        if (connection.userId !== request.auth.uid) {
            throw new https_1.HttpsError("permission-denied", "You can only sync your own calendars");
        }
        const syncedCount = await syncConnectionEvents(connectionId, connection, request.auth.uid);
        return { success: true, syncedCount };
    }
    catch (error) {
        v2_1.logger.error("Error syncing calendar:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "Failed to sync calendar");
    }
});
exports.syncCalendar = (0, https_1.onCall)(async (request) => {
    requireAuth(request);
    const connectionsSnapshot = await db
        .collection("userCalendars")
        .where("userId", "==", request.auth.uid)
        .where("isActive", "==", true)
        .get();
    const results = [];
    for (const doc of connectionsSnapshot.docs) {
        try {
            const syncedCount = await syncConnectionEvents(doc.id, doc.data(), request.auth.uid);
            results.push({ id: doc.id, syncedCount });
        }
        catch (error) {
            results.push({ id: doc.id, error: error.message });
        }
    }
    return { results };
});
exports.getCalendarSyncSettings = (0, https_1.onCall)(async (request) => {
    requireAuth(request);
    try {
        const snapshot = await db
            .collection("userCalendars")
            .where("userId", "==", request.auth.uid)
            .where("isActive", "==", true)
            .get();
        const providers = snapshot.docs.map((doc) => doc.data().calendarType);
        return {
            google: { connected: providers.includes("google") },
            apple: { connected: providers.includes("apple") },
            outlook: { connected: providers.includes("outlook") },
        };
    }
    catch (error) {
        v2_1.logger.error("Error fetching calendar sync settings:", error);
        throw new https_1.HttpsError("internal", "Failed to fetch calendar sync settings");
    }
});
//# sourceMappingURL=calendar.js.map