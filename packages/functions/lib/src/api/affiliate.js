"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAffiliateDisclosure = exports.getAffiliateStats = exports.getAffiliatePrograms = exports.trackAffiliateClick = exports.convertWishlistAffiliateLinks = exports.batchConvertAffiliateLinks = exports.convertAffiliateLink = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const v2_1 = require("firebase-functions/v2");
const affiliate_js_1 = require("../utils/affiliate.js");
const db = (0, firestore_1.getFirestore)();
exports.convertAffiliateLink = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c;
    const { url } = request.data;
    if (!url) {
        throw new https_1.HttpsError("invalid-argument", "URL is required");
    }
    try {
        const result = (0, affiliate_js_1.convertAffiliateUrl)(url);
        if (result.wasConverted) {
            await db.collection("affiliateConversions").add({
                userId: ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || null,
                originalUrl: result.originalUrl,
                convertedUrl: result.convertedUrl,
                program: (_b = result.program) === null || _b === void 0 ? void 0 : _b.name,
                commissionRate: ((_c = result.program) === null || _c === void 0 ? void 0 : _c.defaultCommission) || 0,
                tagUsed: result.tagUsed || null,
                createdAt: new Date(),
            });
        }
        return Object.assign({ success: true }, result);
    }
    catch (error) {
        v2_1.logger.error("Error converting affiliate link:", error);
        throw new https_1.HttpsError("internal", "Failed to convert affiliate link");
    }
});
exports.batchConvertAffiliateLinks = (0, https_1.onCall)(async (request) => {
    const { urls = [] } = request.data;
    if (!Array.isArray(urls) || urls.length === 0) {
        throw new https_1.HttpsError("invalid-argument", "URLs array is required");
    }
    const conversions = urls.map((url) => (0, affiliate_js_1.convertAffiliateUrl)(url));
    const batch = db.batch();
    const now = new Date();
    conversions.forEach((conversion) => {
        var _a, _b, _c;
        if (conversion.wasConverted) {
            const docRef = db.collection("affiliateConversions").doc();
            batch.set(docRef, {
                userId: ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || null,
                originalUrl: conversion.originalUrl,
                convertedUrl: conversion.convertedUrl,
                program: (_b = conversion.program) === null || _b === void 0 ? void 0 : _b.name,
                commissionRate: ((_c = conversion.program) === null || _c === void 0 ? void 0 : _c.defaultCommission) || 0,
                tagUsed: conversion.tagUsed || null,
                createdAt: now,
            });
        }
    });
    try {
        await batch.commit();
        return {
            success: true,
            conversions,
        };
    }
    catch (error) {
        v2_1.logger.error("Error batch converting affiliate links:", error);
        throw new https_1.HttpsError("internal", "Failed to convert affiliate links");
    }
});
exports.convertWishlistAffiliateLinks = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated");
    }
    const { wishlistId } = request.data;
    if (!wishlistId) {
        throw new https_1.HttpsError("invalid-argument", "Wishlist ID is required");
    }
    try {
        const wishlistDoc = await db.collection("wishlists").doc(wishlistId).get();
        if (!wishlistDoc.exists) {
            throw new https_1.HttpsError("not-found", "Wishlist not found");
        }
        if (((_a = wishlistDoc.data()) === null || _a === void 0 ? void 0 : _a.userId) !== request.auth.uid) {
            throw new https_1.HttpsError("permission-denied", "You can only convert your own wishlists");
        }
        const itemsSnapshot = await db
            .collection("wishlistItems")
            .where("wishlistId", "==", wishlistId)
            .get();
        const batch = db.batch();
        let convertedCount = 0;
        itemsSnapshot.docs.forEach((doc) => {
            var _a, _b;
            const data = doc.data();
            const url = data.productUrl;
            if (!url)
                return;
            const conversion = (0, affiliate_js_1.convertAffiliateUrl)(url);
            if (!conversion.wasConverted)
                return;
            convertedCount += 1;
            batch.update(doc.ref, {
                productUrl: conversion.convertedUrl,
                metadata: Object.assign(Object.assign({}, (data.metadata || {})), { affiliateConversion: {
                        originalUrl: conversion.originalUrl,
                        affiliateProgram: ((_a = conversion.program) === null || _a === void 0 ? void 0 : _a.name) || null,
                        convertedAt: new Date().toISOString(),
                        commission: ((_b = conversion.program) === null || _b === void 0 ? void 0 : _b.defaultCommission) || 0,
                        tagUsed: conversion.tagUsed || null,
                    } }),
                updatedAt: new Date(),
            });
        });
        await batch.commit();
        return { success: true, convertedCount };
    }
    catch (error) {
        v2_1.logger.error("Error converting wishlist affiliate links:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "Failed to convert wishlist links");
    }
});
exports.trackAffiliateClick = (0, https_1.onCall)(async (request) => {
    var _a;
    const { url, program } = request.data;
    if (!url) {
        throw new https_1.HttpsError("invalid-argument", "URL is required");
    }
    try {
        await db.collection("affiliateClicks").add({
            userId: ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || null,
            url,
            program: program || null,
            createdAt: new Date(),
        });
        return { success: true };
    }
    catch (error) {
        v2_1.logger.error("Error tracking affiliate click:", error);
        throw new https_1.HttpsError("internal", "Failed to track affiliate click");
    }
});
exports.getAffiliatePrograms = (0, https_1.onCall)(async () => {
    return {
        programs: affiliate_js_1.AFFILIATE_PROGRAMS.map((program) => ({
            name: program.name,
            domains: program.domains,
            commission: program.defaultCommission,
        })),
    };
});
exports.getAffiliateStats = (0, https_1.onCall)(async (request) => {
    var _a;
    const userId = ((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid) || null;
    try {
        let conversionsQuery = db.collection("affiliateConversions");
        let clicksQuery = db.collection("affiliateClicks");
        if (userId) {
            conversionsQuery = conversionsQuery.where("userId", "==", userId);
            clicksQuery = clicksQuery.where("userId", "==", userId);
        }
        const conversionsSnapshot = await conversionsQuery.get();
        const clicksSnapshot = await clicksQuery.get();
        const conversions = conversionsSnapshot.docs.map((doc) => doc.data());
        const clicks = clicksSnapshot.docs.map((doc) => doc.data());
        const totalConversions = conversions.length;
        const totalClicks = clicks.length;
        const revenueByProgram = {};
        conversions.forEach((conversion) => {
            const program = conversion.program || "Unknown";
            if (!revenueByProgram[program]) {
                revenueByProgram[program] = { conversions: 0, clicks: 0, revenue: 0 };
            }
            revenueByProgram[program].conversions += 1;
            revenueByProgram[program].revenue += conversion.commissionRate || 0;
        });
        clicks.forEach((click) => {
            const program = click.program || "Unknown";
            if (!revenueByProgram[program]) {
                revenueByProgram[program] = { conversions: 0, clicks: 0, revenue: 0 };
            }
            revenueByProgram[program].clicks += 1;
        });
        const topPrograms = Object.entries(revenueByProgram)
            .map(([program, stats]) => (Object.assign({ program }, stats)))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        const estimatedRevenue = Object.values(revenueByProgram).reduce((sum, entry) => sum + entry.revenue, 0);
        return {
            stats: {
                totalConversions,
                totalClicks,
                estimatedRevenue,
                topPrograms,
            },
        };
    }
    catch (error) {
        v2_1.logger.error("Error getting affiliate stats:", error);
        throw new https_1.HttpsError("internal", "Failed to get affiliate stats");
    }
});
exports.getAffiliateDisclosure = (0, https_1.onCall)(async () => {
    return {
        disclosure: "This site participates in affiliate programs. When you click certain links, we may earn a commission at no additional cost to you.",
    };
});
//# sourceMappingURL=affiliate.js.map