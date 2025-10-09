/**
 * JWT Authentication Module
 * 
 * This module handles JWT token generation, verification, and management for API authentication.
 */

import jwt from 'jsonwebtoken';
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

// JWT secret key should be stored in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'wishkeeper-jwt-secret-key';
const JWT_EXPIRES_IN = '24h'; // Token expiration time

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: User): string {
  const payload = {
    sub: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Middleware to authenticate API requests using JWT
 */
export function authenticateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Get the token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Format: "Bearer TOKEN"
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Set the user ID in the request for use in route handlers
      req.userId = parseInt(decoded.sub);
      
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } else {
    // Check if authenticated through Firebase
    if (req.userId) {
      next();
    } else {
      return res.status(401).json({ error: 'Authentication required' });
    }
  }
}

/**
 * Generate a new token for a user and send it in the response
 */
export function issueToken(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    storage.getUser(req.userId)
      .then(user => {
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        const token = generateToken(user);
        res.json({ token });
      })
      .catch(error => {
        console.error('Error generating token:', error);
        res.status(500).json({ error: 'Failed to generate token' });
      });
  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
}

/**
 * Middleware to refresh an expiring JWT token
 */
export function refreshTokenIfNeeded(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.decode(token) as any;
      
      // Check if token is about to expire (less than 1 hour remaining)
      const expirationTime = decoded.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeRemaining = expirationTime - currentTime;
      
      // If less than 1 hour remaining, generate a new token
      if (timeRemaining < 60 * 60 * 1000) {
        storage.getUser(decoded.sub)
          .then(user => {
            if (user) {
              const newToken = generateToken(user);
              res.setHeader('X-New-Token', newToken);
            }
            next();
          })
          .catch(() => next());
      } else {
        next();
      }
    } catch (error) {
      // Continue even if token refresh fails
      next();
    }
  } else {
    next();
  }
}