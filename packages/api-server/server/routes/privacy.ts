import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { privacyService } from '../services/privacyService';
import { firebaseAuthMiddleware as isAuthenticated } from '../firebase-auth-simple';

// Firebase-first authenticated request interface
interface AuthenticatedRequest extends Request {
  firebaseUser?: {
    uid: string;
    email?: string;
    displayName?: string;
    emailVerified: boolean;
  };
  userId?: number;
}

const router = Router();

// ===========================
// VALIDATION SCHEMAS
// ===========================

const setPrivacySettingsSchema = z.object({
  entityType: z.enum(['wishlist', 'item', 'user_profile']),
  entityId: z.number().int().positive(),
  visibilityLevel: z.enum(['public', 'friends', 'private', 'custom']).optional(),
  customAccessList: z.array(z.number().int().positive()).optional(),
  expirationDate: z.string().datetime().optional(),
  allowComments: z.boolean().optional(),
  allowReservations: z.boolean().optional(),
  requireApproval: z.boolean().optional()
});

const updateAccessListSchema = z.object({
  userIds: z.array(z.number().int().positive())
});

const addUserSchema = z.object({
  userId: z.number().int().positive()
});

const checkAccessSchema = z.object({
  entityType: z.enum(['wishlist', 'item', 'user_profile']),
  entityId: z.number().int().positive(),
  interactionType: z.enum(['view', 'comment', 'reserve']).optional()
});

// ===========================
// ROUTES
// ===========================

/**
 * Set privacy settings for an entity
 * POST /api/privacy/settings
 */
router.post('/settings', isAuthenticated, async (req, res) => {
  try {
    const validatedData = setPrivacySettingsSchema.parse(req.body);
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify user owns the entity
    const hasPermission = await verifyEntityOwnership(
      userId,
      validatedData.entityType,
      validatedData.entityId
    );

    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'You do not have permission to modify privacy settings for this entity' 
      });
    }

    // Parse expiration date if provided
    const settingsData = {
      ...validatedData,
      userId,
      expirationDate: validatedData.expirationDate 
        ? new Date(validatedData.expirationDate) 
        : undefined
    };

    const settings = await privacyService.setPrivacySettings(settingsData);
    res.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid request data', 
        details: error.errors 
      });
    }
    console.error('Error setting privacy settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get privacy settings for an entity
 * GET /api/privacy/settings/:entityType/:entityId
 */
router.get('/settings/:entityType/:entityId', isAuthenticated, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate entity type
    if (!['wishlist', 'item', 'user_profile'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const entityIdNum = parseInt(entityId);
    if (isNaN(entityIdNum)) {
      return res.status(400).json({ error: 'Invalid entity ID' });
    }

    // Only allow users to view privacy settings for entities they own
    const hasPermission = await verifyEntityOwnership(userId, entityType, entityIdNum);
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'You do not have permission to view privacy settings for this entity' 
      });
    }

    const settings = await privacyService.getPrivacySettings(entityType, entityIdNum);
    
    if (!settings) {
      // Return default settings if none exist
      const defaultSettings = await privacyService.setDefaultPrivacySettings(
        userId,
        entityType,
        entityIdNum
      );
      return res.json(defaultSettings);
    }

    res.json(settings);
  } catch (error) {
    console.error('Error getting privacy settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete privacy settings for an entity (reset to default)
 * DELETE /api/privacy/settings/:entityType/:entityId
 */
router.delete('/settings/:entityType/:entityId', isAuthenticated, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate entity type
    if (!['wishlist', 'item', 'user_profile'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const entityIdNum = parseInt(entityId);
    if (isNaN(entityIdNum)) {
      return res.status(400).json({ error: 'Invalid entity ID' });
    }

    // Verify user owns the entity
    const hasPermission = await verifyEntityOwnership(userId, entityType, entityIdNum);
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'You do not have permission to modify privacy settings for this entity' 
      });
    }

    const deleted = await privacyService.deletePrivacySettings(entityType, entityIdNum);
    
    if (deleted) {
      res.json({ message: 'Privacy settings deleted successfully' });
    } else {
      res.status(404).json({ error: 'Privacy settings not found' });
    }
  } catch (error) {
    console.error('Error deleting privacy settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update custom access list for an entity
 * PUT /api/privacy/settings/:entityType/:entityId/access-list
 */
router.put('/settings/:entityType/:entityId/access-list', isAuthenticated, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const validatedData = updateAccessListSchema.parse(req.body);
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate entity type
    if (!['wishlist', 'item', 'user_profile'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const entityIdNum = parseInt(entityId);
    if (isNaN(entityIdNum)) {
      return res.status(400).json({ error: 'Invalid entity ID' });
    }

    // Verify user owns the entity
    const hasPermission = await verifyEntityOwnership(userId, entityType, entityIdNum);
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'You do not have permission to modify privacy settings for this entity' 
      });
    }

    const settings = await privacyService.updateCustomAccessList(
      entityType,
      entityIdNum,
      validatedData.userIds
    );

    if (!settings) {
      return res.status(404).json({ error: 'Privacy settings not found' });
    }

    res.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid request data', 
        details: error.errors 
      });
    }
    console.error('Error updating access list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Add user to custom access list
 * POST /api/privacy/settings/:entityType/:entityId/access-list/add
 */
router.post('/settings/:entityType/:entityId/access-list/add', isAuthenticated, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const validatedData = addUserSchema.parse(req.body);
    const ownerId = req.session.userId;

    if (!ownerId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate entity type
    if (!['wishlist', 'item', 'user_profile'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const entityIdNum = parseInt(entityId);
    if (isNaN(entityIdNum)) {
      return res.status(400).json({ error: 'Invalid entity ID' });
    }

    // Verify user owns the entity
    const hasPermission = await verifyEntityOwnership(ownerId, entityType, entityIdNum);
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'You do not have permission to modify privacy settings for this entity' 
      });
    }

    const settings = await privacyService.addToCustomAccessList(
      entityType,
      entityIdNum,
      validatedData.userId
    );

    if (!settings) {
      return res.status(404).json({ error: 'Privacy settings not found' });
    }

    res.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid request data', 
        details: error.errors 
      });
    }
    console.error('Error adding user to access list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Remove user from custom access list
 * DELETE /api/privacy/settings/:entityType/:entityId/access-list/:userId
 */
router.delete('/settings/:entityType/:entityId/access-list/:userId', isAuthenticated, async (req, res) => {
  try {
    const { entityType, entityId, userId: targetUserId } = req.params;
    const ownerId = req.session.userId;

    if (!ownerId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate entity type
    if (!['wishlist', 'item', 'user_profile'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    const entityIdNum = parseInt(entityId);
    const targetUserIdNum = parseInt(targetUserId);
    
    if (isNaN(entityIdNum) || isNaN(targetUserIdNum)) {
      return res.status(400).json({ error: 'Invalid entity ID or user ID' });
    }

    // Verify user owns the entity
    const hasPermission = await verifyEntityOwnership(ownerId, entityType, entityIdNum);
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'You do not have permission to modify privacy settings for this entity' 
      });
    }

    const settings = await privacyService.removeFromCustomAccessList(
      entityType,
      entityIdNum,
      targetUserIdNum
    );

    if (!settings) {
      return res.status(404).json({ error: 'Privacy settings not found' });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error removing user from access list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Check if current user has access to an entity
 * POST /api/privacy/check-access
 */
router.post('/check-access', isAuthenticated, async (req, res) => {
  try {
    const validatedData = checkAccessSchema.parse(req.body);
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get entity owner
    const entityOwnerId = await getEntityOwnerId(
      validatedData.entityType,
      validatedData.entityId
    );

    if (!entityOwnerId) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    let hasAccess = false;

    if (validatedData.interactionType && validatedData.interactionType !== 'view') {
      // Check interaction access (comment, reserve)
      hasAccess = await privacyService.hasInteractionAccess(
        validatedData.entityType,
        validatedData.entityId,
        userId,
        validatedData.interactionType,
        entityOwnerId
      );
    } else {
      // Check view access
      hasAccess = await privacyService.hasViewAccess(
        validatedData.entityType,
        validatedData.entityId,
        userId,
        entityOwnerId
      );
    }

    // Check if approval is required
    const requiresApproval = await privacyService.requiresApproval(
      validatedData.entityType,
      validatedData.entityId,
      userId,
      entityOwnerId
    );

    res.json({
      hasAccess,
      requiresApproval,
      isOwner: userId === entityOwnerId
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid request data', 
        details: error.errors 
      });
    }
    console.error('Error checking access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get user's default privacy preferences
 * GET /api/privacy/defaults
 */
router.get('/defaults', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const defaults = await privacyService.getUserDefaultPrivacySettings(userId);
    res.json(defaults);
  } catch (error) {
    console.error('Error getting default privacy settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===========================
// HELPER FUNCTIONS
// ===========================

/**
 * Verify that a user owns an entity
 */
async function verifyEntityOwnership(
  userId: number,
  entityType: string,
  entityId: number
): Promise<boolean> {
  // This would implement entity ownership verification
  // For now, return true as a placeholder
  // In real implementation, you would check:
  // - For wishlists: check wishlists table
  // - For items: check wishlist_items and then wishlist ownership
  // - For user_profile: check if userId matches entityId
  
  if (entityType === 'user_profile') {
    return userId === entityId;
  }
  
  // For wishlists and items, we would query the database
  // This is a simplified implementation
  return true;
}

/**
 * Get the owner ID of an entity
 */
async function getEntityOwnerId(
  entityType: string,
  entityId: number
): Promise<number | null> {
  // This would implement entity owner lookup
  // For now, return 1 as a placeholder
  // In real implementation, you would query:
  // - For wishlists: get userId from wishlists table
  // - For items: get wishlist owner from wishlist_items -> wishlists
  // - For user_profile: return entityId
  
  if (entityType === 'user_profile') {
    return entityId;
  }
  
  // For wishlists and items, we would query the database
  // This is a simplified implementation
  return 1;
}

export default router;