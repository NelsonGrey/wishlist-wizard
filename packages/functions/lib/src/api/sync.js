"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncMobileActions = exports.getSyncLogs = exports.logSyncEvent = exports.updateDevice = exports.listDevices = exports.registerDevice = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const v2_1 = require("firebase-functions/v2");
const crypto_1 = require("crypto");
const db = (0, firestore_1.getFirestore)();
function requireAuth(request) {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
}
exports.registerDevice = (0, https_1.onCall)(async (request) => {
    requireAuth(request);
    const { deviceId, deviceType, deviceToken, deviceName, osType, osVersion, appVersion, pushEnabled = true, notificationSettings = {} } = request.data;
    const finalDeviceId = deviceId || (0, crypto_1.randomUUID)();
    try {
        await db.collection("userDevices").doc(finalDeviceId).set({
            userId: request.auth.uid,
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
    }
    catch (error) {
        v2_1.logger.error("Error registering device:", error);
        throw new https_1.HttpsError("internal", "Failed to register device");
    }
});
exports.listDevices = (0, https_1.onCall)(async (request) => {
    requireAuth(request);
    try {
        const snapshot = await db
            .collection("userDevices")
            .where("userId", "==", request.auth.uid)
            .where("isActive", "==", true)
            .orderBy("lastActive", "desc")
            .get();
        const devices = snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        return { devices };
    }
    catch (error) {
        v2_1.logger.error("Error listing devices:", error);
        throw new https_1.HttpsError("internal", "Failed to list devices");
    }
});
exports.updateDevice = (0, https_1.onCall)(async (request) => {
    var _a;
    requireAuth(request);
    const { deviceId, updates } = request.data;
    if (!deviceId || !updates) {
        throw new https_1.HttpsError("invalid-argument", "Device ID and updates are required");
    }
    try {
        const deviceDoc = await db.collection("userDevices").doc(deviceId).get();
        if (!deviceDoc.exists) {
            throw new https_1.HttpsError("not-found", "Device not found");
        }
        if (((_a = deviceDoc.data()) === null || _a === void 0 ? void 0 : _a.userId) !== request.auth.uid) {
            throw new https_1.HttpsError("permission-denied", "You can only update your own device");
        }
        await db.collection("userDevices").doc(deviceId).update(Object.assign(Object.assign({}, updates), { lastActive: new Date(), updatedAt: new Date() }));
        return { success: true };
    }
    catch (error) {
        v2_1.logger.error("Error updating device:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "Failed to update device");
    }
});
exports.logSyncEvent = (0, https_1.onCall)(async (request) => {
    requireAuth(request);
    const { deviceId, entityType, entityId, action, syncStatus = "success", errorMessage, details } = request.data;
    if (!entityType || !action) {
        throw new https_1.HttpsError("invalid-argument", "Entity type and action are required");
    }
    try {
        const logRef = await db.collection("syncLogs").add({
            userId: request.auth.uid,
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
    }
    catch (error) {
        v2_1.logger.error("Error logging sync event:", error);
        throw new https_1.HttpsError("internal", "Failed to log sync event");
    }
});
exports.getSyncLogs = (0, https_1.onCall)(async (request) => {
    requireAuth(request);
    const { limit = 50 } = request.data;
    try {
        const snapshot = await db
            .collection("syncLogs")
            .where("userId", "==", request.auth.uid)
            .orderBy("createdAt", "desc")
            .limit(limit)
            .get();
        const logs = snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        return { logs };
    }
    catch (error) {
        v2_1.logger.error("Error fetching sync logs:", error);
        throw new https_1.HttpsError("internal", "Failed to fetch sync logs");
    }
});
exports.syncMobileActions = (0, https_1.onCall)(async (request) => {
    requireAuth(request);
    const { deviceId, offlineActions = [] } = request.data;
    if (!deviceId) {
        throw new https_1.HttpsError("invalid-argument", "Device ID is required");
    }
    try {
        const deviceRef = db.collection("userDevices").doc(deviceId);
        await deviceRef.set({
            userId: request.auth.uid,
            lastActive: new Date(),
            isActive: true,
        }, { merge: true });
        const batch = db.batch();
        offlineActions.forEach((action) => {
            const logRef = db.collection("syncLogs").doc();
            batch.set(logRef, {
                userId: request.auth.uid,
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
    }
    catch (error) {
        v2_1.logger.error("Error syncing mobile actions:", error);
        throw new https_1.HttpsError("internal", "Failed to sync mobile actions");
    }
});
//# sourceMappingURL=sync.js.map