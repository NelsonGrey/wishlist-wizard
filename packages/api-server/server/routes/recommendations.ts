import { Router } from "express";
import { z } from "zod";
import { firebaseAuthMiddleware as isAuthenticated } from "../firebase-auth-simple";
import {
  getRecommendationsForUser,
  getRecommendationsForBeneficiary,
  updateRecommendationStatus
} from "../services/recommendationService";

const router = Router();

/**
 * Schema for recommendation query parameters
 */
const getRecommendationsSchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 5),
  beneficiaryId: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined)
});

/**
 * Schema for updating recommendation status
 */
const updateRecommendationStatusSchema = z.object({
  isViewed: z.boolean().optional(),
  isSaved: z.boolean().optional(),
  isRejected: z.boolean().optional()
});

/**
 * GET /api/recommendations
 * Get personalized product recommendations for the authenticated user
 */
router.get(
  "/",
  isAuthenticated,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Parse and validate query parameters
      const limit = req.query.limit ? Math.min(Math.max(parseInt(req.query.limit as string, 10), 1), 20) : 5;
      const beneficiaryId = req.query.beneficiaryId ? parseInt(req.query.beneficiaryId as string, 10) : undefined;

      if (req.query.beneficiaryId && isNaN(beneficiaryId!)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_BENEFICIARY_ID',
            message: 'Beneficiary ID must be a valid number'
          }
        });
      }

      let recommendations;
      
      if (beneficiaryId) {
        // Get recommendations for a specific beneficiary
        recommendations = await getRecommendationsForBeneficiary(userId, beneficiaryId, limit);
      } else {
        // Get recommendations for the user
        recommendations = await getRecommendationsForUser(userId, limit);
      }

      res.json({
        success: true,
        data: recommendations,
        meta: {
          count: recommendations.length,
          userId,
          beneficiaryId: beneficiaryId || null,
          limit
        }
      });
    } catch (error: any) {
      console.error("Error getting recommendations:", error);
      
      // Handle specific error types
      if (error.message.includes('Rate limit exceeded')) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: error.message
          }
        });
      }
      
      if (error.message.includes('Beneficiary not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'BENEFICIARY_NOT_FOUND',
            message: 'Beneficiary not found or access denied'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'RECOMMENDATION_ERROR',
          message: 'Failed to get recommendations'
        }
      });
    }
  }
);

/**
 * PATCH /api/recommendations/:id
 * Update recommendation status (viewed, saved, rejected)
 */
router.patch(
  "/:id",
  isAuthenticated,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const recommendationId = parseInt(req.params.id, 10);
      
      // Validate request body
      const validation = updateRecommendationStatusSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: validation.error.errors
          }
        });
      }
      
      const statusUpdates = validation.data;

      if (isNaN(recommendationId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_RECOMMENDATION_ID',
            message: 'Recommendation ID must be a valid number'
          }
        });
      }

      const success = await updateRecommendationStatus(
        recommendationId,
        userId,
        statusUpdates
      );

      if (!success) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'RECOMMENDATION_NOT_FOUND',
            message: 'Recommendation not found or access denied'
          }
        });
      }

      res.json({
        success: true,
        message: 'Recommendation status updated successfully'
      });
    } catch (error: any) {
      console.error("Error updating recommendation status:", error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update recommendation status'
        }
      });
    }
  }
);

/**
 * POST /api/recommendations/refresh
 * Force refresh recommendations for the user (bypasses cache and rate limits for admin use)
 */
router.post(
  "/refresh",
  isAuthenticated,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.body.limit, 10) || 5;

      // This endpoint bypasses cache and rate limits for manual refresh
      // It's intended for admin use or user-initiated refresh
      console.log(`Manual refresh requested for user ${userId}`);

      const recommendations = await getRecommendationsForUser(userId, limit);

      res.json({
        success: true,
        data: recommendations,
        meta: {
          count: recommendations.length,
          userId,
          limit,
          refreshed: true,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error("Error refreshing recommendations:", error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REFRESH_ERROR',
          message: 'Failed to refresh recommendations'
        }
      });
    }
  }
);

/**
 * GET /api/recommendations/stats
 * Get recommendation statistics for the user
 */
router.get(
  "/stats",
  isAuthenticated,
  async (req, res) => {
    try {
      const userId = req.user!.id;

      // This could be expanded to include more detailed statistics
      // For now, just return basic info
      res.json({
        success: true,
        data: {
          userId,
          features: {
            rateLimiting: true,
            caching: true,
            aiRecommendations: true,
            fallbackRecommendations: true
          },
          limits: {
            requestsPerHour: 10,
            requestsPerDay: 50,
            cacheTimeHours: 6
          }
        }
      });
    } catch (error: any) {
      console.error("Error getting recommendation stats:", error);
      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: 'Failed to get recommendation statistics'
        }
      });
    }
  }
);

export default router;