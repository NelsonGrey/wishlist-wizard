/**
 * Extension-specific Authentication Module
 *
 * This handles secure authentication for the browser extension
 * using JWT tokens rather than session cookies.
 */

import { Request, Response, NextFunction } from "express";
import { verifyToken, generateToken } from "./jwt-auth";
import { storage } from "./storage";
import { User } from "@wishlist-wizard/shared";

/**
 * Authenticate a user for extension API access using JWT
 */
export async function authenticateExtension(req: Request, res: Response) {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }
    
    // Find the user
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Check if the user is active
    if (!user.active) {
      return res.status(401).json({ error: "Account is inactive" });
    }
    
    // Check password
    const bcrypt = require('bcryptjs');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Update last login time
    await storage.updateUser(user.id, { lastLogin: new Date() });
    
    // Generate extended lifespan token for extension (7 days)
    const token = generateExtensionToken(user);
    
    // Return user data (without sensitive fields) and token
    const { 
      password: _, 
      verificationToken: __, 
      passwordResetToken: ___, 
      twoFactorSecret: ____, 
      ...userWithoutSensitiveData 
    } = user;
    
    res.json({
      user: userWithoutSensitiveData,
      token,
      extensionVersion: "1.0.0"
    });
  } catch (error) {
    console.error("Extension authentication error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
}

/**
 * Generate a long-lived JWT token for extension use
 */
function generateExtensionToken(user: User): string {
  // Use the standard generateToken function but override expiration
  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET || 'wishkeeper-jwt-secret-key';
  
  const payload = {
    sub: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    type: 'extension'
  };
  
  // 7-day expiration for extension tokens
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

/**
 * Middleware to verify extension JWT token
 */
export function verifyExtensionToken(req: Request, res: Response, next: NextFunction) {
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
  
  // Verify this is an extension token
  if (decoded.type !== 'extension') {
    return res.status(401).json({ error: "Invalid token type" });
  }
  
  // Set user ID in request for use in route handlers
  req.session.userId = decoded.sub;
  
  // Attach user info to request for use in route handlers
  (req as any).user = {
    id: decoded.sub,
    username: decoded.username,
    email: decoded.email,
    role: decoded.role
  };
  
  next();
}

/**
 * Refresh an extension token that's about to expire
 */
export async function refreshExtensionToken(req: Request, res: Response) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    
    // Get fresh user data
    const user = await storage.getUser(decoded.sub);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    // Check if user is still active
    if (!user.active) {
      return res.status(401).json({ error: "Account is inactive" });
    }
    
    // Generate new token
    const newToken = generateExtensionToken(user);
    
    res.json({ token: newToken });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(500).json({ error: "Failed to refresh token" });
  }
}