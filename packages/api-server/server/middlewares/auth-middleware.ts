/**
 * Authentication and Authorization Middleware
 * 
 * Provides middleware for secure API access and permission verification
 */

import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../jwt-auth";
import { UserRole, Permission, ROLE_PERMISSIONS } from "../auth-utils";
import { storage } from "../storage";

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

/**
 * Middleware to verify JWT token and set user in request
 */
export const verifyJWT = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = await verifyToken(token);
    req.userId = parseInt(decoded.sub);
    next();
  } catch (error) {
    console.error("JWT verification failed:", error);
    res.status(401).json({ error: "Invalid token" });
  }
};

/**
 * Middleware to check if user has the required role
 */
export const hasRole = (role: UserRole) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.userId);
      if (!user || user.role !== role) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      next();
    } catch (error) {
      console.error("Role check failed:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};

/**
 * Middleware to check if user has the required permission
 */
export const requirePermission = (permission: Permission) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const userPermissions = ROLE_PERMISSIONS[user.role as UserRole] || [];
      if (!userPermissions.includes(permission)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      next();
    } catch (error) {
      console.error("Permission check failed:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};

/**
 * Middleware to check if the current user is the owner of a resource
 */
export const isOwner = (resourceType: 'wishlist' | 'beneficiary' | 'item') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const resourceId = parseInt(req.params.id || req.params.wishlistId || req.params.beneficiaryId || req.params.itemId);
      let isOwner = false;

      switch (resourceType) {
        case 'wishlist':
          const wishlist = await storage.getWishlistById(resourceId);
          isOwner = wishlist?.userId === req.userId;
          break;
        case 'beneficiary':
          const beneficiary = await storage.getBeneficiary(resourceId);
          isOwner = beneficiary?.ownerId === req.userId;
          break;
        case 'item':
          const item = await storage.getWishlistItem(resourceId);
          if (item) {
            const itemWishlist = await storage.getWishlistById(item.wishlistId);
            isOwner = itemWishlist?.userId === req.userId;
          }
          break;
      }

      if (!isOwner) {
        return res.status(403).json({ error: "Access denied: not the owner" });
      }

      next();
    } catch (error) {
      console.error("Ownership check failed:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};

/**
 * Middleware to check if the current user is a collaborator on a resource
 */
export const canAccessResource = (resourceType: 'wishlist' | 'item') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const resourceId = parseInt(req.params.id || req.params.wishlistId || req.params.itemId);
      let hasAccess = false;
      let wishlistId: number;

      switch (resourceType) {
        case 'wishlist':
          wishlistId = resourceId;
          const wishlist = await storage.getWishlistById(wishlistId);
          
          if (wishlist?.userId === req.userId) {
            hasAccess = true;
          } else {
            // Check if user is a collaborator
            hasAccess = await storage.isCollaborator(wishlistId, req.userId);
          }
          break;
        case 'item':
          const item = await storage.getWishlistItem(resourceId);
          if (item) {
            wishlistId = item.wishlistId;
            const itemWishlist = await storage.getWishlistById(wishlistId);
            
            if (itemWishlist?.userId === req.userId) {
              hasAccess = true;
            } else {
              // Check if user is a collaborator
              hasAccess = await storage.isCollaborator(wishlistId, req.userId);
            }
          }
          break;
      }

      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      next();
    } catch (error) {
      console.error("Resource access check failed:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};

/**
 * Middleware that allows both owners and collaborators to access a resource
 */
export function ownerOrCollaborator(resourceType: 'wishlist' | 'item') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const resourceId = parseInt(req.params.id);
      if (isNaN(resourceId)) {
        return res.status(400).json({ error: `Invalid ${resourceType} ID` });
      }
      
      let hasAccess = false;
      let wishlistId = -1;
      
      switch (resourceType) {
        case 'wishlist':
          wishlistId = resourceId;
          // Check if owner
          const wishlist = await storage.getWishlistById(wishlistId);
          if (wishlist?.userId === req.userId) {
            hasAccess = true;
            break;
          }
          
          // Check if collaborator
          hasAccess = await storage.isCollaborator(wishlistId, req.userId);
          break;
          
        case 'item':
          const item = await storage.getWishlistItem(resourceId);
          if (item) {
            wishlistId = item.wishlistId;
            // Check if owner of the wishlist
            const itemWishlist = await storage.getWishlistById(wishlistId);
            if (itemWishlist?.userId === req.userId) {
              hasAccess = true;
              break;
            }
            
            // Check if collaborator
            hasAccess = await storage.isCollaborator(wishlistId, req.userId);
          }
          break;
      }
      
      if (!hasAccess) {
        return res.status(403).json({ error: "You do not have permission to access this resource" });
      }
      
      // Store wishlist ID for later use
      (req as any).wishlistId = wishlistId;
      
      next();
    } catch (error) {
      console.error(`${resourceType} access check error:`, error);
      res.status(500).json({ error: `Failed to verify ${resourceType} access` });
    }
  };
}