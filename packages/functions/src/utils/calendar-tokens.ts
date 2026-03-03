import { getFirestore, Timestamp } from "firebase-admin/firestore";

export type OAuthCalendarProvider = "google" | "outlook";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || "";
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || "";

const TOKEN_REFRESH_BUFFER_MS = 60_000;

type CalendarConnection = {
  calendarType?: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiry?: Date | Timestamp | string | null;
};

function toDate(value: CalendarConnection["tokenExpiry"]): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === "object" && value && "toDate" in value && typeof (value as any).toDate === "function") {
    const parsed = (value as any).toDate();
    return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }

  return null;
}

function validateOAuthConfig(provider: OAuthCalendarProvider) {
  if (provider === "google") {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error("Google calendar OAuth is not configured");
    }
    return;
  }

  if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
    throw new Error("Outlook calendar OAuth is not configured");
  }
}

async function refreshGoogleAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google token refresh failed: ${text}`);
  }

  return response.json() as Promise<{ access_token?: string; expires_in?: number; refresh_token?: string }>;
}

async function refreshMicrosoftAccessToken(refreshToken: string) {
  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      client_secret: MICROSOFT_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "offline_access User.Read Calendars.ReadWrite Contacts.Read",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Microsoft token refresh failed: ${text}`);
  }

  return response.json() as Promise<{ access_token?: string; expires_in?: number; refresh_token?: string }>;
}

export async function getValidCalendarAccessToken(connectionId: string, connection: CalendarConnection): Promise<string> {
  const provider = connection.calendarType as OAuthCalendarProvider;

  if (provider !== "google" && provider !== "outlook") {
    throw new Error("Provider does not support OAuth token refresh");
  }

  const accessToken = typeof connection.accessToken === "string" ? connection.accessToken : "";
  const refreshToken = typeof connection.refreshToken === "string" ? connection.refreshToken : "";
  const tokenExpiry = toDate(connection.tokenExpiry);

  const expiresSoon = tokenExpiry ? tokenExpiry.getTime() <= Date.now() + TOKEN_REFRESH_BUFFER_MS : false;
  if (accessToken && !expiresSoon) {
    return accessToken;
  }

  if (!refreshToken) {
    if (accessToken) {
      return accessToken;
    }
    throw new Error("Connected provider has no usable access token");
  }

  validateOAuthConfig(provider);

  const refreshed = provider === "google"
    ? await refreshGoogleAccessToken(refreshToken)
    : await refreshMicrosoftAccessToken(refreshToken);

  if (!refreshed.access_token) {
    throw new Error("OAuth token refresh response did not include access_token");
  }

  const nextRefreshToken = refreshed.refresh_token || refreshToken;
  const expiresIn = typeof refreshed.expires_in === "number" && refreshed.expires_in > 0
    ? refreshed.expires_in
    : 3600;
  const nextExpiry = new Date(Date.now() + expiresIn * 1000);

  await getFirestore().collection("userCalendars").doc(connectionId).update({
    accessToken: refreshed.access_token,
    refreshToken: nextRefreshToken,
    tokenExpiry: nextExpiry,
    updatedAt: new Date(),
  });

  return refreshed.access_token;
}
