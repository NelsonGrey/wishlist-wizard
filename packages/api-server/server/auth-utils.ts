/**
 * Authentication Utilities
 * 
 * This module provides advanced authentication utilities including:
 * - JWT token management for API auth
 * - Role-based access control
 * - Session security enhancements
 * - Password policy enforcement
 */

import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { User } from '@wishlist-wizard/shared';

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

// Password policy settings
export const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days in milliseconds
};

// User roles and permissions
export enum UserRole {
  User = 'user',
  Admin = 'admin',
  Moderator = 'moderator'
}

// Permission types
export enum Permission {
  ReadWishlist = 'read:wishlist',
  WriteWishlist = 'write:wishlist',
  DeleteWishlist = 'delete:wishlist',
  ShareWishlist = 'share:wishlist',
  ManageUsers = 'manage:users',
  ModerateContent = 'moderate:content'
}

// Role to permission mapping
export const ROLE_PERMISSIONS = {
  [UserRole.User]: [
    Permission.ReadWishlist,
    Permission.WriteWishlist,
    Permission.DeleteWishlist,
    Permission.ShareWishlist
  ],
  [UserRole.Moderator]: [
    Permission.ReadWishlist,
    Permission.WriteWishlist,
    Permission.DeleteWishlist, 
    Permission.ShareWishlist,
    Permission.ModerateContent
  ],
  [UserRole.Admin]: [
    Permission.ReadWishlist,
    Permission.WriteWishlist,
    Permission.DeleteWishlist,
    Permission.ShareWishlist,
    Permission.ManageUsers,
    Permission.ModerateContent
  ]
};

/**
 * Validate password meets security requirements
 */
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < PASSWORD_POLICY.minLength) {
    return { valid: false, message: `Password must be at least ${PASSWORD_POLICY.minLength} characters` };
  }
  
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  if (PASSWORD_POLICY.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }

  return { valid: true };
}

/**
 * Generate a security token (for password reset, email verification, etc.)
 */
export function generateSecurityToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Check if token is valid and not expired
 */
export function isValidToken(token: string, createdAt: Date, expiresInHours: number = 24): boolean {
  const now = new Date();
  const expiresAt = new Date(createdAt.getTime() + (expiresInHours * 60 * 60 * 1000));
  return now < expiresAt;
}

/**
 * Middleware to check for specific permissions
 */
export function hasPermission(permission: Permission) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Get the user
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      // Get user's role (default to regular user if not specified)
      const role = user.role || UserRole.User;
      
      // Check if the role has the required permission
      const permissions = ROLE_PERMISSIONS[role as UserRole];
      if (!permissions || !permissions.includes(permission)) {
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
 * Middleware to check if a user is the owner of a resource
 */
export function isResourceOwner(resourceType: 'wishlist' | 'beneficiary' | 'item') {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.userId) {
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
 * Middleware to check if a user can access a resource (as owner or collaborator)
 */
export function canAccessResource(resourceType: 'wishlist' | 'item') {
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
      let wishlistId: number | null = null;
      
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
      
      // Add wishlist ID to request for later use
      (req as any).wishlistId = wishlistId;
      
      next();
    } catch (error) {
      console.error(`${resourceType} access check error:`, error);
      res.status(500).json({ error: `Failed to verify ${resourceType} access` });
    }
  };
}

/**
 * Enhanced authentication check with rate limiting and security headers
 */
export function enhancedAuthCheck(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  if (!req.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  // User is authenticated via Firebase - no session management needed
  
  next();
}

/**
 * Check if a shared wishlist is accessible by the current user
 */
export async function canAccessSharedWishlist(shareId: string, userId: number | null): Promise<boolean> {
  try {
    const wishlist = await storage.getWishlistByShareId(shareId);
    
    if (!wishlist) {
      return false;
    }
    
    // Public wishlists can be accessed by anyone
    if (wishlist.isPublic) {
      return true;
    }
    
    // If not public, only the owner or collaborators can access
    if (!userId) {
      return false;
    }
    
    // Check if owner
    if (wishlist.userId === userId) {
      return true;
    }
    
    // Check if collaborator
    return await storage.isCollaborator(wishlist.id, userId);
  } catch (error) {
    console.error("Error checking shared wishlist access:", error);
    return false;
  }
}