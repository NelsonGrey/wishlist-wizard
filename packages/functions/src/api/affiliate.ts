import { onCall, CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Query, DocumentData } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { AFFILIATE_PROGRAMS, convertAffiliateUrl } from "../utils/affiliate.js";
import { ensureFirebaseAdmin } from "../firebase-admin.js";

ensureFirebaseAdmin();
const db = getFirestore();

export const linkConvert = onCall(async (request: CallableRequest) => {
  const { url } = request.data;
  if (!url) {
    throw new HttpsError("invalid-argument", "URL is required");
  }

  try {
    const result = convertAffiliateUrl(url);
    if (result.wasConverted) {
      await db.collection("affiliateConversions").add({
        userId: request.auth?.uid || null,
        originalUrl: result.originalUrl,
        convertedUrl: result.convertedUrl,
        program: result.program?.name,
        commissionRate: result.program?.defaultCommission || 0,
        tagUsed: result.tagUsed || null,
        createdAt: new Date(),
      });
    }

    return {
      success: true,
      ...result,
    };
  } catch (error) {
    logger.error("Error converting affiliate link:", error);
    throw new HttpsError("internal", "Failed to convert affiliate link");
  }
});

export const linkConvertBatch = onCall(async (request: CallableRequest) => {
  const { urls = [] } = request.data;
  if (!Array.isArray(urls) || urls.length === 0) {
    throw new HttpsError("invalid-argument", "URLs array is required");
  }

  const conversions = urls.map((url: string) => convertAffiliateUrl(url));
  const batch = db.batch();
  const now = new Date();

  conversions.forEach((conversion) => {
    if (conversion.wasConverted) {
      const docRef = db.collection("affiliateConversions").doc();
      batch.set(docRef, {
        userId: request.auth?.uid || null,
        originalUrl: conversion.originalUrl,
        convertedUrl: conversion.convertedUrl,
        program: conversion.program?.name,
        commissionRate: conversion.program?.defaultCommission || 0,
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
  } catch (error) {
    logger.error("Error batch converting affiliate links:", error);
    throw new HttpsError("internal", "Failed to convert affiliate links");
  }
});

export const linkConvertWishlist = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const { wishlistId } = request.data;
  if (!wishlistId) {
    throw new HttpsError("invalid-argument", "Wishlist ID is required");
  }

  try {
    const wishlistDoc = await db.collection("wishlists").doc(wishlistId).get();
    if (!wishlistDoc.exists) {
      throw new HttpsError("not-found", "Wishlist not found");
    }

    if (wishlistDoc.data()?.userId !== request.auth.uid) {
      throw new HttpsError("permission-denied", "You can only convert your own wishlists");
    }

    const itemsSnapshot = await db
      .collection("wishlistItems")
      .where("wishlistId", "==", wishlistId)
      .get();

    const batch = db.batch();
    let convertedCount = 0;

    itemsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const url = data.productUrl as string | undefined;
      if (!url) return;

      const conversion = convertAffiliateUrl(url);
      if (!conversion.wasConverted) return;

      convertedCount += 1;
      batch.update(doc.ref, {
        productUrl: conversion.convertedUrl,
        metadata: {
          ...(data.metadata || {}),
          affiliateConversion: {
            originalUrl: conversion.originalUrl,
            affiliateProgram: conversion.program?.name || null,
            convertedAt: new Date().toISOString(),
            commission: conversion.program?.defaultCommission || 0,
            tagUsed: conversion.tagUsed || null,
          },
        },
        updatedAt: new Date(),
      });
    });

    await batch.commit();
    return { success: true, convertedCount };
  } catch (error) {
    logger.error("Error converting wishlist affiliate links:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to convert wishlist links");
  }
});

export const linkTrackClick = onCall(async (request: CallableRequest) => {
  const { url, program } = request.data;
  if (!url) {
    throw new HttpsError("invalid-argument", "URL is required");
  }

  try {
    await db.collection("affiliateClicks").add({
      userId: request.auth?.uid || null,
      url,
      program: program || null,
      createdAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    logger.error("Error tracking affiliate click:", error);
    throw new HttpsError("internal", "Failed to track affiliate click");
  }
});

export const linkPrograms = onCall(async () => {
  return {
    programs: AFFILIATE_PROGRAMS.map((program) => ({
      name: program.name,
      domains: program.domains,
      commission: program.defaultCommission,
    })),
  };
});

export const linkStats = onCall(async (request: CallableRequest) => {
  const userId = request.auth?.uid || null;

  try {
    let conversionsQuery: Query<DocumentData> = db.collection("affiliateConversions");
    let clicksQuery: Query<DocumentData> = db.collection("affiliateClicks");

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

    const revenueByProgram: Record<string, { conversions: number; clicks: number; revenue: number }>= {};

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
      .map(([program, stats]) => ({ program, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const estimatedRevenue = Object.values(revenueByProgram).reduce(
      (sum, entry) => sum + entry.revenue,
      0
    );

    return {
      stats: {
        totalConversions,
        totalClicks,
        estimatedRevenue,
        topPrograms,
      },
    };
  } catch (error) {
    logger.error("Error getting affiliate stats:", error);
    throw new HttpsError("internal", "Failed to get affiliate stats");
  }
});

export const linkDisclosure = onCall(async () => {
  return {
    disclosure:
      "This site participates in affiliate programs. When you click certain links, we may earn a commission at no additional cost to you.",
  };
});
