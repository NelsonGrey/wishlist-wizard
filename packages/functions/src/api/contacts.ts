import { onCall, CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";

const db = getFirestore();

type ContactProvider = "google" | "outlook" | "apple";

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
      const id = (contact.resourceName || "").toString().split("/").pop() || "";
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

      const connection = snapshot.docs[0].data();
      const accessToken = connection.accessToken;
      if (!accessToken) {
        throw new HttpsError("failed-precondition", "Connected provider has no access token");
      }

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
