/**
 * Authentication and Authorization Middleware
 * 
 * Provides middleware for secure API access and permission verification
 */

import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../jwt-auth";
import { UserRole, Permission, ROLE_PERMISSIONS } from "../auth-utils";
import { storage } from "../storage";

/**
 * Middleware to verify JWT token and set user in request
 */
export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(' ')[1]; // Format: "Bearer TOKEN"
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  
  // Set user ID in session for compatibility with session-based auth
  req.session.userId = decoded.sub;
  
  // Attach user info to request for use in route handlers
  (req as any).user = {
    id: decoded.sub,
    username: decoded.username,
    email: decoded.email,
    role: decoded.role || UserRole.User
  };
  
  next();
}

/**
 * Middleware to check if user has the required role
 */
export function hasRole(role: UserRole) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const userRole = user.role as UserRole || UserRole.User;
      
      // Admin role can access everything
      if (userRole === UserRole.Admin) {
        return next();
      }
      
      // Check if user has the required role
      if (userRole !== role) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      
      next();
    } catch (error) {
      console.error("Role check error:", error);
      res.status(500).json({ error: "Failed to check role" });
    }
  };
}

/**
 * Middleware to check if user has the required permission
 */
export function requirePermission(permission: Permission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const userRole = user.role as UserRole || UserRole.User;
      const permissions = ROLE_PERMISSIONS[userRole] || [];
      
      // Check if user has the required permission
      if (!permissions.includes(permission)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }
      
      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ error: "Failed to check permissions" });
    }
  };
}

/**
 * Middleware to check if the current user is the owner of a resource
 */
export function isOwner(resourceType: 'wishlist' | 'beneficiary' | 'item') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const resourceId = parseInt(req.params.id);
      if (isNaN(resourceId)) {
        return res.status(400).json({ error: `Invalid ${resourceType} ID` });
      }
      
      let isOwner = false;
      
      switch (resourceType) {
        case 'wishlist':
          const wishlist = await storage.getWishlistById(resourceId);
          isOwner = wishlist?.userId === req.session.userId;
          break;
        case 'beneficiary':
          const beneficiary = await storage.getBeneficiary(resourceId);
          isOwner = beneficiary?.ownerId === req.session.userId;
          break;
        case 'item':
          const item = await storage.getWishlistItem(resourceId);
          if (item) {
            const itemWishlist = await storage.getWishlistById(item.wishlistId);
            isOwner = itemWishlist?.userId === req.session.userId;
          }
          break;
      }
      
      if (!isOwner) {
        return res.status(403).json({ error: "You do not have permission to access this resource" });
      }
      
      next();
    } catch (error) {
      console.error(`${resourceType} owner check error:`, error);
      res.status(500).json({ error: `Failed to verify ${resourceType} ownership` });
    }
  };
}

/**
 * Middleware to check if the current user is a collaborator on a resource
 */
export function isCollaborator(resourceType: 'wishlist' | 'item') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.session.userId) {
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
          hasAccess = await storage.isCollaborator(wishlistId, req.session.userId);
          break;
        case 'item':
          const item = await storage.getWishlistItem(resourceId);
          if (item) {
            wishlistId = item.wishlistId;
            hasAccess = await storage.isCollaborator(wishlistId, req.session.userId);
          }
          break;
      }
      
      if (!hasAccess) {
        return res.status(403).json({ error: "You are not a collaborator on this resource" });
      }
      
      next();
    } catch (error) {
      console.error(`${resourceType} collaborator check error:`, error);
      res.status(500).json({ error: `Failed to verify ${resourceType} collaboration` });
    }
  };
}

/**
 * Middleware that allows both owners and collaborators to access a resource
 */
export function ownerOrCollaborator(resourceType: 'wishlist' | 'item') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.session.userId) {
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
          if (wishlist?.userId === req.session.userId) {
            hasAccess = true;
            break;
          }
          
          // Check if collaborator
          hasAccess = await storage.isCollaborator(wishlistId, req.session.userId);
          break;
          
        case 'item':
          const item = await storage.getWishlistItem(resourceId);
          if (item) {
            wishlistId = item.wishlistId;
            // Check if owner of the wishlist
            const itemWishlist = await storage.getWishlistById(wishlistId);
            if (itemWishlist?.userId === req.session.userId) {
              hasAccess = true;
              break;
            }
            
            // Check if collaborator
            hasAccess = await storage.isCollaborator(wishlistId, req.session.userId);
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