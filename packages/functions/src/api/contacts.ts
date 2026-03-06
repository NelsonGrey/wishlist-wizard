import { onCall, CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { ensureFirebaseAdmin } from "../firebase-admin.js";
import { getValidCalendarAccessToken } from "../utils/calendar-tokens.js";

ensureFirebaseAdmin();
const db = getFirestore();

type ContactProvider = "google" | "outlook" | "apple";
type ExternalContactProvider = ContactProvider | "facebook";

function requireAuth(request: CallableRequest) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
}

type NormalizedContact = {
  sourceContactId: string;
  name: string;
  email?: string;
  phone?: string;
  birthdate?: string;
  notes?: string;
};

type NormalizedContactWithProvider = NormalizedContact & {
  provider: ContactProvider;
};

type ProviderStatus = {
  provider: ExternalContactProvider;
  connected: boolean;
  supported: boolean;
  message?: string;
};

type ExternalContactResult = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  birthdate?: string;
  notes?: string;
  primarySource: ContactProvider;
  sources: Array<{
    provider: ContactProvider;
    sourceContactId: string;
  }>;
  duplicateSourceCount: number;
  quality: {
    score: number;
    level: "high" | "medium" | "low";
    factors: string[];
  };
};

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizePhone(value: unknown): string {
  if (typeof value !== "string") return "";
  const digits = value.replace(/\D/g, "");
  return digits;
}

function normalizeName(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/\s+/g, " ")
    : "";
}

function buildContactIdentityKey(contact: NormalizedContact): string {
  const email = normalizeEmail(contact.email);
  if (email) return `email:${email}`;

  const phone = normalizePhone(contact.phone);
  if (phone) return `phone:${phone}`;

  const name = normalizeName(contact.name);
  if (name) return `name:${name}`;

  return `source:${contact.sourceContactId}`;
}

function evaluateContactQuality(contact: {
  name?: string;
  email?: string;
  phone?: string;
  birthdate?: string;
  sourceCount: number;
}): ExternalContactResult["quality"] {
  const factors: string[] = [];
  let score = 0;

  if (normalizeName(contact.name)) {
    score += 20;
    factors.push("has_name");
  }
  if (normalizeEmail(contact.email)) {
    score += 30;
    factors.push("has_email");
  }
  if (normalizePhone(contact.phone)) {
    score += 25;
    factors.push("has_phone");
  }
  if (typeof contact.birthdate === "string" && contact.birthdate.trim()) {
    score += 10;
    factors.push("has_birthdate");
  }
  if (contact.sourceCount > 1) {
    score += 15;
    factors.push("verified_across_sources");
  }

  if (normalizeEmail(contact.email) && normalizePhone(contact.phone)) {
    score += 10;
    factors.push("multi_channel_reachability");
  }

  if (score > 100) score = 100;

  const level = score >= 80
    ? "high"
    : score >= 55
      ? "medium"
      : "low";

  return { score, level, factors };
}

async function resolveProviderConnection(
  userId: string,
  provider: ContactProvider,
  connectionId?: unknown
) {
  let connectionQuery = db
    .collection("userCalendars")
    .where("userId", "==", userId)
    .where("calendarType", "==", provider)
    .where("isActive", "==", true)
    .limit(1);

  if (connectionId) {
    const doc = await db.collection("userCalendars").doc(String(connectionId)).get();
    if (!doc.exists) {
      throw new HttpsError("not-found", "Calendar connection not found");
    }
    const data = doc.data() || {};
    if (data.userId !== userId || data.calendarType !== provider) {
      throw new HttpsError("permission-denied", "Invalid connection for provider");
    }
    connectionQuery = db.collection("userCalendars").where("__name__", "==", String(connectionId)).limit(1);
  }

  const snapshot = await connectionQuery.get();
  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0];
}

async function fetchGoogleContacts(accessToken: string): Promise<NormalizedContact[]> {
  const url = new URL("https://people.googleapis.com/v1/people/me/connections");
  url.searchParams.set("personFields", "names,emailAddresses,phoneNumbers,birthdays");
  url.searchParams.set("pageSize", "500");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google contacts request failed: ${text}`);
  }

  const payload = await response.json() as { connections?: any[] };
  const contacts = payload.connections || [];

  return contacts
    .map((contact: any) => {
      const resourceName = typeof contact.resourceName === "string"
        ? contact.resourceName
        : contact.resourceName === null || contact.resourceName === undefined
          ? ""
          : String(contact.resourceName);
      const id = resourceName.split("/").filter(Boolean).pop() || "";
      const name = contact.names?.[0]?.displayName || "";
      if (!id || !name) return null;

      const birthday = contact.birthdays?.[0]?.date;
      const birthdate = birthday
        ? `${String(birthday.year || "").padStart(4, "0")}-${String(birthday.month || "").padStart(2, "0")}-${String(birthday.day || "").padStart(2, "0")}`
        : undefined;

      return {
        sourceContactId: id,
        name,
        email: contact.emailAddresses?.[0]?.value,
        phone: contact.phoneNumbers?.[0]?.value,
        birthdate,
      } as NormalizedContact;
    })
    .filter((contact): contact is NormalizedContact => Boolean(contact));
}

async function fetchMicrosoftContacts(accessToken: string): Promise<NormalizedContact[]> {
  const url = new URL("https://graph.microsoft.com/v1.0/me/contacts");
  url.searchParams.set("$top", "500");
  url.searchParams.set("$select", "id,displayName,emailAddresses,mobilePhone,homePhones,businessPhones,birthday");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Microsoft contacts request failed: ${text}`);
  }

  const payload = await response.json() as { value?: any[] };
  const contacts = payload.value || [];

  return contacts
    .map((contact: any) => {
      const id = contact.id || "";
      const name = contact.displayName || "";
      if (!id || !name) return null;

      const phone = contact.mobilePhone || contact.homePhones?.[0] || contact.businessPhones?.[0];
      return {
        sourceContactId: id,
        name,
        email: contact.emailAddresses?.[0]?.address,
        phone,
        birthdate: contact.birthday || undefined,
      } as NormalizedContact;
    })
    .filter((contact): contact is NormalizedContact => Boolean(contact));
}

function parseVcard(vcardContent: string): NormalizedContact[] {
  const cards = vcardContent
    .split(/END:VCARD/gi)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const contacts: NormalizedContact[] = [];

  for (const card of cards) {
    const lines = card.split(/\r?\n/).map((line) => line.trim());
    const fnLine = lines.find((line) => line.toUpperCase().startsWith("FN:"));
    const emailLine = lines.find((line) => line.toUpperCase().startsWith("EMAIL"));
    const telLine = lines.find((line) => line.toUpperCase().startsWith("TEL"));
    const bdayLine = lines.find((line) => line.toUpperCase().startsWith("BDAY"));
    const uidLine = lines.find((line) => line.toUpperCase().startsWith("UID:"));

    const name = fnLine?.split(":").slice(1).join(":").trim();
    if (!name) continue;

    const id = uidLine?.split(":").slice(1).join(":").trim() || `${name.toLowerCase().replace(/\s+/g, "-")}-${contacts.length + 1}`;

    contacts.push({
      sourceContactId: id,
      name,
      email: emailLine?.split(":").slice(1).join(":").trim(),
      phone: telLine?.split(":").slice(1).join(":").trim(),
      birthdate: bdayLine?.split(":").slice(1).join(":").trim(),
      notes: "Imported from Apple vCard",
    });
  }

  return contacts;
}

export const getContacts = onCall(async (request: CallableRequest) => {
  requireAuth(request);

  try {
    const snapshot = await db
      .collection("beneficiaries")
      .where("ownerId", "==", request.auth!.uid)
      .get();

    const contacts = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((contact: any) => !contact.isHidden)
      .sort((a: any, b: any) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });

    return contacts;
  } catch (error) {
    logger.error("Error fetching contacts:", error);
    throw new HttpsError("internal", "Failed to fetch contacts");
  }
});

export const importContacts = onCall(async (request: CallableRequest) => {
  requireAuth(request);
  const { provider, connectionId, vcard } = request.data || {};

  if (!provider) {
    throw new HttpsError("invalid-argument", "Provider is required");
  }

  const normalizedProvider = String(provider).toLowerCase() as ContactProvider;

  if (!["google", "outlook", "apple"].includes(normalizedProvider)) {
    throw new HttpsError("invalid-argument", "Unsupported provider");
  }

  try {
    let contactsToImport: NormalizedContact[] = [];

    if (normalizedProvider === "apple") {
      if (!vcard || typeof vcard !== "string") {
        throw new HttpsError("invalid-argument", "Apple contact import requires vCard content");
      }
      contactsToImport = parseVcard(vcard);
    } else {
      let connectionQuery = db
        .collection("userCalendars")
        .where("userId", "==", request.auth!.uid)
        .where("calendarType", "==", normalizedProvider)
        .where("isActive", "==", true)
        .limit(1);

      if (connectionId) {
        const doc = await db.collection("userCalendars").doc(String(connectionId)).get();
        if (!doc.exists) {
          throw new HttpsError("not-found", "Calendar connection not found");
        }
        const data = doc.data() || {};
        if (data.userId !== request.auth!.uid || data.calendarType !== normalizedProvider) {
          throw new HttpsError("permission-denied", "Invalid connection for provider");
        }
        connectionQuery = db.collection("userCalendars").where("__name__", "==", String(connectionId)).limit(1);
      }

      const snapshot = await connectionQuery.get();
      if (snapshot.empty) {
        throw new HttpsError("failed-precondition", `No active ${normalizedProvider} calendar connection found`);
      }

      const connectionDoc = snapshot.docs[0];
      const connection = connectionDoc.data();
      const accessToken = await getValidCalendarAccessToken(connectionDoc.id, connection);

      contactsToImport = normalizedProvider === "google"
        ? await fetchGoogleContacts(accessToken)
        : await fetchMicrosoftContacts(accessToken);
    }

    if (contactsToImport.length === 0) {
      return { imported: 0, skipped: 0, total: 0 };
    }

    const existingSnapshot = await db
      .collection("beneficiaries")
      .where("ownerId", "==", request.auth!.uid)
      .get();

    const existingKeys = new Set(
      existingSnapshot.docs.map((doc) => {
        const data = doc.data();
        return `${data.sourceProvider || "manual"}:${data.sourceContactId || ""}`;
      })
    );

    let imported = 0;
    let skipped = 0;

    const batch = db.batch();
    const now = new Date();

    for (const contact of contactsToImport) {
      const key = `${normalizedProvider}:${contact.sourceContactId}`;
      if (existingKeys.has(key)) {
        skipped += 1;
        continue;
      }

      const ref = db.collection("beneficiaries").doc();
      batch.set(ref, {
        ownerId: request.auth!.uid,
        name: contact.name,
        relationship: "contact",
        birthdate: contact.birthdate ? new Date(contact.birthdate) : null,
        notes: contact.notes || "",
        email: contact.email || null,
        phone: contact.phone || null,
        sourceProvider: normalizedProvider,
        sourceContactId: contact.sourceContactId,
        isHidden: false,
        createdAt: now,
        updatedAt: now,
      });

      imported += 1;
      existingKeys.add(key);
    }

    if (imported > 0) {
      await batch.commit();
    }

    return {
      imported,
      skipped,
      total: contactsToImport.length,
    };
  } catch (error) {
    logger.error("Error importing contacts:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to import contacts");
  }
});

export const getExternalContacts = onCall(async (request: CallableRequest) => {
  requireAuth(request);

  const data = (request.data || {}) as {
    providers?: unknown;
    connectionIds?: Record<string, unknown>;
    appleVcard?: unknown;
    query?: unknown;
    limit?: unknown;
  };

  const requestedProviders = Array.isArray(data.providers)
    ? data.providers.map((value) => String(value).toLowerCase())
    : ["google", "outlook", "apple", "facebook"];

  const selectedProviders = Array.from(new Set(requestedProviders)).filter((provider): provider is ExternalContactProvider =>
    ["google", "outlook", "apple", "facebook"].includes(provider)
  );

  const providerStatuses: ProviderStatus[] = [];
  const collected: NormalizedContactWithProvider[] = [];
  const connectionIds = data.connectionIds || {};

  const limitRaw = Number(data.limit);
  const maxResults = Number.isFinite(limitRaw) && limitRaw > 0
    ? Math.min(Math.floor(limitRaw), 500)
    : 200;

  const queryFilter = typeof data.query === "string"
    ? data.query.trim().toLowerCase()
    : "";

  for (const provider of selectedProviders) {
    if (provider === "facebook") {
      providerStatuses.push({
        provider,
        connected: false,
        supported: false,
        message: "Facebook contact OAuth is not configured yet. Provider capability is reserved for future integration.",
      });
      continue;
    }

    if (provider === "apple") {
      const appleVcard = typeof data.appleVcard === "string" ? data.appleVcard.trim() : "";
      if (!appleVcard) {
        providerStatuses.push({
          provider,
          connected: false,
          supported: true,
          message: "Paste Apple vCard content to load Apple contacts without storing them.",
        });
        continue;
      }

      const parsedContacts = parseVcard(appleVcard).slice(0, maxResults);
      parsedContacts.forEach((contact) => {
        collected.push({
          ...contact,
          provider: "apple",
        });
      });

      providerStatuses.push({
        provider,
        connected: true,
        supported: true,
      });
      continue;
    }

    const connectionDoc = await resolveProviderConnection(
      request.auth!.uid,
      provider,
      connectionIds[provider]
    );

    if (!connectionDoc) {
      providerStatuses.push({
        provider,
        connected: false,
        supported: true,
        message: `No active ${provider} connection found. Connect this provider in Calendar Settings first.`,
      });
      continue;
    }

    const connection = connectionDoc.data();
    const accessToken = await getValidCalendarAccessToken(connectionDoc.id, connection);
    const sourceContacts = provider === "google"
      ? await fetchGoogleContacts(accessToken)
      : await fetchMicrosoftContacts(accessToken);

    sourceContacts.slice(0, maxResults).forEach((contact) => {
      collected.push({
        ...contact,
        provider,
      });
    });

    providerStatuses.push({
      provider,
      connected: true,
      supported: true,
    });
  }

  const grouped = new Map<string, ExternalContactResult>();

  for (const contact of collected) {
    if (!contact.name?.trim()) continue;

    if (queryFilter) {
      const haystack = `${contact.name || ""} ${contact.email || ""} ${contact.phone || ""}`.toLowerCase();
      if (!haystack.includes(queryFilter)) {
        continue;
      }
    }

    const key = buildContactIdentityKey(contact);
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, {
        id: key,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        birthdate: contact.birthdate,
        notes: contact.notes,
        primarySource: contact.provider,
        sources: [{ provider: contact.provider, sourceContactId: contact.sourceContactId }],
        duplicateSourceCount: 1,
        quality: evaluateContactQuality({
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          birthdate: contact.birthdate,
          sourceCount: 1,
        }),
      });
      continue;
    }

    const hasSource = existing.sources.some((source) =>
      source.provider === contact.provider && source.sourceContactId === contact.sourceContactId
    );

    if (!hasSource) {
      existing.sources.push({ provider: contact.provider, sourceContactId: contact.sourceContactId });
    }

    if (!existing.email && contact.email) existing.email = contact.email;
    if (!existing.phone && contact.phone) existing.phone = contact.phone;
    if (!existing.birthdate && contact.birthdate) existing.birthdate = contact.birthdate;
    if (!existing.notes && contact.notes) existing.notes = contact.notes;

    existing.duplicateSourceCount = existing.sources.length;
    existing.quality = evaluateContactQuality({
      name: existing.name,
      email: existing.email,
      phone: existing.phone,
      birthdate: existing.birthdate,
      sourceCount: existing.duplicateSourceCount,
    });
  }

  const contacts = Array.from(grouped.values())
    .sort((a, b) => {
      if (b.quality.score !== a.quality.score) return b.quality.score - a.quality.score;
      return a.name.localeCompare(b.name);
    })
    .slice(0, maxResults);

  return {
    contacts,
    providerStatuses,
    metadata: {
      requestedProviders: selectedProviders,
      returnedContacts: contacts.length,
      storageMode: "ephemeral",
    },
  };
});

export const hideContact = onCall(async (request: CallableRequest) => {
  requireAuth(request);
  const { contactId } = request.data || {};

  if (!contactId) {
    throw new HttpsError("invalid-argument", "Contact ID is required");
  }

  try {
    const ref = db.collection("beneficiaries").doc(String(contactId));
    const doc = await ref.get();

    if (!doc.exists) {
      throw new HttpsError("not-found", "Contact not found");
    }

    if (doc.data()?.ownerId !== request.auth!.uid) {
      throw new HttpsError("permission-denied", "You can only hide your own contacts");
    }

    await ref.update({
      isHidden: true,
      hiddenAt: new Date(),
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    logger.error("Error hiding contact:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to hide contact");
  }
});

export const deleteContact = onCall(async (request: CallableRequest) => {
  requireAuth(request);
  const { contactId } = request.data || {};

  if (!contactId) {
    throw new HttpsError("invalid-argument", "Contact ID is required");
  }

  try {
    const ref = db.collection("beneficiaries").doc(String(contactId));
    const doc = await ref.get();

    if (!doc.exists) {
      throw new HttpsError("not-found", "Contact not found");
    }

    if (doc.data()?.ownerId !== request.auth!.uid) {
      throw new HttpsError("permission-denied", "You can only delete your own contacts");
    }

    await ref.delete();
    return { success: true };
  } catch (error) {
    logger.error("Error deleting contact:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to delete contact");
  }
});
