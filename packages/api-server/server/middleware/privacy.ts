import { Request, Response, NextFunction } from 'express';
import { privacyService } from '../services/privacyService';
import { storage } from '../storage';

/**
 * Middleware to check privacy access for wishlist entities
 */
export const checkPrivacyAccess = (
  entityType: 'wishlist' | 'item',
  paramName: string = 'id',
  interactionType: 'view' | 'comment' | 'reserve' = 'view'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const entityId = parseInt(req.params[paramName]);
      if (isNaN(entityId)) {
        return res.status(400).json({ error: `Invalid ${entityType} ID` });
      }

      // Get entity owner
      let entityOwnerId: number | null = null;

      if (entityType === 'wishlist') {
        const wishlist = await storage.getWishlistById(entityId);
        if (!wishlist) {
          return res.status(404).json({ error: 'Wishlist not found' });
        }
        entityOwnerId = wishlist.userId;
      } else if (entityType === 'item') {
        const item = await storage.getWishlistItem(entityId);
        if (!item) {
          return res.status(404).json({ error: 'Item not found' });
        }
        const wishlist = await storage.getWishlistById(item.wishlistId);
        if (!wishlist) {
          return res.status(404).json({ error: 'Wishlist not found' });
        }
        entityOwnerId = wishlist.userId;
      }

      if (!entityOwnerId) {
        return res.status(404).json({ error: 'Entity not found' });
      }

      // Check if user has access
      let hasAccess = false;

      if (interactionType === 'view') {
        hasAccess = await privacyService.hasViewAccess(
          entityType,
          entityId,
          req.session.userId,
          entityOwnerId
        );
      } else {
        hasAccess = await privacyService.hasInteractionAccess(
          entityType,
          entityId,
          req.session.userId,
          interactionType,
          entityOwnerId
        );
      }

      if (!hasAccess) {
        return res.status(403).json({ 
          error: `You do not have permission to ${interactionType} this ${entityType}` 
        });
      }

      // Check if approval is required
      const requiresApproval = await privacyService.requiresApproval(
        entityType,
        entityId,
        req.session.userId,
        entityOwnerId
      );

      // Add privacy info to request for later use
      (req as any).privacyInfo = {
        entityOwnerId,
        requiresApproval,
        isOwner: req.session.userId === entityOwnerId
      };

      next();
    } catch (error) {
      console.error('Privacy access check error:', error);
      res.status(500).json({ error: 'Failed to check privacy permissions' });
    }
  };
};

/**
 * Middleware to ensure user owns an entity (bypasses privacy checks)
 */
export const requireEntityOwnership = (
  entityType: 'wishlist' | 'item',
  paramName: string = 'id'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const entityId = parseInt(req.params[paramName]);
      if (isNaN(entityId)) {
        return res.status(400).json({ error: `Invalid ${entityType} ID` });
      }

      let isOwner = false;

      if (entityType === 'wishlist') {
        const wishlist = await storage.getWishlistById(entityId);
        if (!wishlist) {
          return res.status(404).json({ error: 'Wishlist not found' });
        }
        isOwner = wishlist.userId === req.session.userId;
      } else if (entityType === 'item') {
        const item = await storage.getWishlistItem(entityId);
        if (!item) {
          return res.status(404).json({ error: 'Item not found' });
        }
        const wishlist = await storage.getWishlistById(item.wishlistId);
        if (!wishlist) {
          return res.status(404).json({ error: 'Wishlist not found' });
        }
        isOwner = wishlist.userId === req.session.userId;
      }

      if (!isOwner) {
        return res.status(403).json({ 
          error: `You do not have permission to modify this ${entityType}` 
        });
      }

      next();
    } catch (error) {
      console.error('Entity ownership check error:', error);
      res.status(500).json({ error: 'Failed to verify entity ownership' });
    }
  };
};

/**
 * Middleware to automatically set default privacy settings for new entities
 */
export const setDefaultPrivacySettings = (entityType: 'wishlist' | 'item') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // This middleware should be used after the entity has been created
    // It will be called in the response handler
    const originalJson = res.json.bind(res);
    
    res.json = function(body: any) {
      // Set default privacy settings asynchronously after response
      if (res.statusCode === 201 && body && body.id && req.session.userId) {
        setImmediate(async () => {
          try {
            await privacyService.setDefaultPrivacySettings(
              req.session.userId!,
              entityType,
              body.id
            );
          } catch (error) {
            console.error('Error setting default privacy settings:', error);
          }
        });
      }
      
      return originalJson(body);
    };
    
    next();
  };
};

/**
 * Utility function to get privacy settings for multiple entities efficiently
 */
export const bulkPrivacyCheck = async (
  userId: number,
  entities: Array<{ entityType: string; entityId: number; entityOwnerId?: number }>
): Promise<Map<string, { hasAccess: boolean; requiresApproval: boolean; isOwner: boolean }>> => {
  const results = new Map();
  
  for (const entity of entities) {
    const key = `${entity.entityType}:${entity.entityId}`;
    
    // Owner always has access
    if (entity.entityOwnerId && userId === entity.entityOwnerId) {
      results.set(key, { hasAccess: true, requiresApproval: false, isOwner: true });
      continue;
    }
    
    try {
      const hasAccess = await privacyService.hasViewAccess(
        entity.entityType,
        entity.entityId,
        userId,
        entity.entityOwnerId
      );
      
      const requiresApproval = await privacyService.requiresApproval(
        entity.entityType,
        entity.entityId,
        userId,
        entity.entityOwnerId
      );
      
      results.set(key, {
        hasAccess,
        requiresApproval,
        isOwner: false
      });
    } catch (error) {
      console.error(`Error checking privacy for ${key}:`, error);
      results.set(key, { hasAccess: false, requiresApproval: false, isOwner: false });
    }
  }
  
  return results;
};