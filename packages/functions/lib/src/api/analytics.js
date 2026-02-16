"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalyticsSummary = exports.getAnalyticsEvents = exports.trackAnalyticsEvent = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const v2_1 = require("firebase-functions/v2");
const db = (0, firestore_1.getFirestore)();
exports.trackAnalyticsEvent = (0, https_1.onCall)(async (request) => {
    var _a;
    const { action, category, label, value, metadata } = request.data;
    if (!action) {
        throw new https_1.HttpsError("invalid-argument", "Action is required");
    }
    try {
        const eventData = {
            userId: ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || null,
            action,
            category: category || null,
            label: label || null,
            value: value !== null && value !== void 0 ? value : null,
            metadata: metadata || {},
            createdAt: new Date(),
        };
        await db.collection("analyticsEvents").add(eventData);
        return { success: true };
    }
    catch (error) {
        v2_1.logger.error("Error tracking analytics event:", error);
        throw new https_1.HttpsError("internal", "Failed to track analytics event");
    }
});
exports.getAnalyticsEvents = (0, https_1.onCall)(async (request) => {
    var _a;
    const { limit = 50 } = request.data;
    const userId = ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || null;
    try {
        let query = db.collection("analyticsEvents").orderBy("createdAt", "desc").limit(limit);
        if (userId) {
            query = query.where("userId", "==", userId);
        }
        const snapshot = await query.get();
        const events = snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        return { events };
    }
    catch (error) {
        v2_1.logger.error("Error getting analytics events:", error);
        throw new https_1.HttpsError("internal", "Failed to get analytics events");
    }
});
exports.getAnalyticsSummary = (0, https_1.onCall)(async (request) => {
    var _a;
    const userId = ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || null;
    try {
        let query = db.collection("analyticsEvents");
        if (userId) {
            query = query.where("userId", "==", userId);
        }
        const snapshot = await query.get();
        const events = snapshot.docs.map((doc) => doc.data());
        const totalEvents = events.length;
        const byCategory = {};
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
    }
    catch (error) {
        v2_1.logger.error("Error getting analytics summary:", error);
        throw new https_1.HttpsError("internal", "Failed to get analytics summary");
    }
});
//# sourceMappingURL=analytics.js.map