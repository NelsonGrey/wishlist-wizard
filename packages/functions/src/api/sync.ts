import { onCall, CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { randomUUID } from "crypto";
import { ensureFirebaseAdmin } from "../firebase-admin.js";

ensureFirebaseAdmin();
const db = getFirestore();

function requireAuth(request: CallableRequest) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
}

export const registerDevice = onCall(async (request: CallableRequest) => {
  requireAuth(request);
  const { deviceId, deviceType, deviceToken, deviceName, osType, osVersion, appVersion, pushEnabled = true, notificationSettings = {} } = request.data;

  const finalDeviceId = deviceId || randomUUID();

  try {
    await db.collection("userDevices").doc(finalDeviceId).set({
      userId: request.auth!.uid,
      deviceType: deviceType || "unknown",
      deviceToken: deviceToken || null,
      deviceName: deviceName || null,
      osType: osType || null,
      osVersion: osVersion || null,
      appVersion: appVersion || null,
      pushEnabled,
      notificationSettings,
      lastActive: new Date(),
      updatedAt: new Date(),
      createdAt: new Date(),
      isActive: true,
    }, { merge: true });

    return { deviceId: finalDeviceId };
  } catch (error) {
    logger.error("Error registering device:", error);
    throw new HttpsError("internal", "Failed to register device");
  }
});

export const listDevices = onCall(async (request: CallableRequest) => {
  requireAuth(request);

  try {
    const snapshot = await db
      .collection("userDevices")
      .where("userId", "==", request.auth!.uid)
      .where("isActive", "==", true)
      .orderBy("lastActive", "desc")
      .get();

    const devices = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return { devices };
  } catch (error) {
    logger.error("Error listing devices:", error);
    throw new HttpsError("internal", "Failed to list devices");
  }
});

export const updateDevice = onCall(async (request: CallableRequest) => {
  requireAuth(request);
  const { deviceId, updates } = request.data;

  if (!deviceId || !updates) {
    throw new HttpsError("invalid-argument", "Device ID and updates are required");
  }

  try {
    const deviceDoc = await db.collection("userDevices").doc(deviceId).get();
    if (!deviceDoc.exists) {
      throw new HttpsError("not-found", "Device not found");
    }

    if (deviceDoc.data()?.userId !== request.auth!.uid) {
      throw new HttpsError("permission-denied", "You can only update your own device");
    }

    await db.collection("userDevices").doc(deviceId).update({
      ...updates,
      lastActive: new Date(),
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    logger.error("Error updating device:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to update device");
  }
});

export const logSyncEvent = onCall(async (request: CallableRequest) => {
  requireAuth(request);
  const { deviceId, entityType, entityId, action, syncStatus = "success", errorMessage, details } = request.data;

  if (!entityType || !action) {
    throw new HttpsError("invalid-argument", "Entity type and action are required");
  }

  try {
    const logRef = await db.collection("syncLogs").add({
      userId: request.auth!.uid,
      deviceId: deviceId || null,
      entityType,
      entityId: entityId || null,
      action,
      syncStatus,
      errorMessage: errorMessage || null,
      details: details || {},
      createdAt: new Date(),
    });

    return { id: logRef.id };
  } catch (error) {
    logger.error("Error logging sync event:", error);
    throw new HttpsError("internal", "Failed to log sync event");
  }
});

export const getSyncLogs = onCall(async (request: CallableRequest) => {
  requireAuth(request);
  const { limit = 50 } = request.data;

  try {
    const snapshot = await db
      .collection("syncLogs")
      .where("userId", "==", request.auth!.uid)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const logs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return { logs };
  } catch (error) {
    logger.error("Error fetching sync logs:", error);
    throw new HttpsError("internal", "Failed to fetch sync logs");
  }
});

export const syncMobileActions = onCall(async (request: CallableRequest) => {
  requireAuth(request);
  const { deviceId, offlineActions = [] } = request.data;

  if (!deviceId) {
    throw new HttpsError("invalid-argument", "Device ID is required");
  }

  try {
    const deviceRef = db.collection("userDevices").doc(deviceId);
    await deviceRef.set({
      userId: request.auth!.uid,
      lastActive: new Date(),
      isActive: true,
    }, { merge: true });

    const batch = db.batch();
    offlineActions.forEach((action: any) => {
      const logRef = db.collection("syncLogs").doc();
      batch.set(logRef, {
        userId: request.auth!.uid,
        deviceId,
        entityType: action.type || "mobile_action",
        entityId: action.barcode || null,
        action: action.type || "offline_action",
        syncStatus: "success",
        details: action,
        createdAt: new Date(),
      });
    });

    await batch.commit();

    return {
      success: true,
      syncedActions: offlineActions.length,
      serverTime: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Error syncing mobile actions:", error);
    throw new HttpsError("internal", "Failed to sync mobile actions");
  }
});
