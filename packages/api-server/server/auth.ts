import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { User, InsertUser } from "@wishlist-wizard/shared";
import { validatePasswordStrength, generateSecurityToken } from "./auth-utils";
import { generateToken } from "./jwt-auth";
import { emailService } from "./services/emailService";

// Helper function to hash passwords
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Helper function to compare passwords
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Register a new user
export async function register(req: Request, res: Response) {
  try {
    const { username, email, password, displayName } = req.body;
    
    // Check if user already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: "Username already taken" });
    }
    
    // Check if email already exists
    const existingEmail = await storage.getUserByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: "Email already registered" });
    }
    
    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }
    
    // Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Generate verification token
    const verificationToken = generateSecurityToken();
    const now = new Date();
    const expirationDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Create the user
    const user = await storage.createUser({
      username,
      email,
      password: hashedPassword,
      displayName: displayName || username,
      avatarUrl: null,
      role: 'user',
      emailVerified: false,
      verificationToken: verificationToken,
      verificationExpires: expirationDate,
      active: true
    });
    
    // Don't return the password in the response
    const { password: _, ...userWithoutPassword } = user;
    
    // Start a session for the user
    req.session.userId = user.id;
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Update last login time
    await storage.updateUser(user.id, { lastLogin: new Date() });
    
    // Send verification email
    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'https://wishlist-wizard.web.app'}/verify-email/${verificationToken}`;
      await emailService.sendVerificationEmail(user.email, user.displayName || user.username, verificationUrl);
      
      // Also send welcome email
      await emailService.sendWelcomeEmail(user.email, user.displayName || user.username);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Don't fail registration if email fails - user can request resend
    }
    
    res.status(201).json({
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
}

// Login a user
export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;
    
    // Find the user
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    
    // Check if the user is active
    if (!user.active) {
      return res.status(401).json({ error: "Account is deactivated" });
    }
    
    // Check the password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    
    // Set session
    req.session.userId = user.id;
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Update last login time
    await storage.updateUser(user.id, { lastLogin: new Date() });
    
    // Don't return the password in the response
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to login" });
  }
}

// Logout a user
export function logout(req: Request, res: Response) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to logout" });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully" });
  });
}

// Get the current user
export async function getCurrentUser(req: Request, res: Response) {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    // Don't return the password or sensitive security data in the response
    const { 
      password: _, 
      verificationToken: __, 
      passwordResetToken: ___, 
      twoFactorSecret: ____, 
      ...userWithoutSensitiveData 
    } = user;
    
    res.json(userWithoutSensitiveData);
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ error: "Failed to get current user" });
  }
}

// Verify a user's email address
export async function verifyEmail(req: Request, res: Response) {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ error: "Verification token is required" });
    }
    
    // Find user with this verification token
    const users = await storage.getUserByVerificationToken(token);
    if (!users || users.length === 0) {
      return res.status(400).json({ error: "Invalid verification token" });
    }
    
    const user = users[0];
    
    // Check if token has expired
    if (!user.verificationExpires || new Date() > user.verificationExpires) {
      return res.status(400).json({ error: "Verification token has expired" });
    }
    
    // Mark email as verified
    await storage.updateUser(user.id, {
      emailVerified: true,
      verificationToken: null,
      verificationExpires: null
    });
    
    res.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({ error: "Failed to verify email" });
  }
}

// Request a password reset
export async function requestPasswordReset(req: Request, res: Response) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    
    // Find user with this email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal that email doesn't exist for security reasons
      return res.json({ message: "If the email exists, a password reset link has been sent" });
    }
    
    // Generate reset token
    const resetToken = generateSecurityToken();
    const now = new Date();
    const expirationDate = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hour
    
    // Save token to user
    await storage.updateUser(user.id, {
      passwordResetToken: resetToken,
      passwordResetExpires: expirationDate
    });
    
    // Send password reset email
    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'https://wishlist-wizard.web.app'}/reset-password/${resetToken}`;
      await emailService.sendPasswordResetEmail(user.email, resetUrl);
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
      // Don't fail the request if email fails - security through obscurity
    }
    
    res.json({ message: "If the email exists, a password reset link has been sent" });
  } catch (error) {
    console.error("Password reset request error:", error);
    res.status(500).json({ error: "Failed to process password reset request" });
  }
}

// Reset a user's password
export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required" });
    }
    
    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }
    
    // Find user with this reset token
    const users = await storage.getUserByResetToken(token);
    if (!users || users.length === 0) {
      return res.status(400).json({ error: "Invalid reset token" });
    }
    
    const user = users[0];
    
    // Check if token has expired
    if (!user.passwordResetExpires || new Date() > user.passwordResetExpires) {
      return res.status(400).json({ error: "Password reset token has expired" });
    }
    
    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update user's password
    await storage.updateUser(user.id, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null
    });
    
    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
}

// Middleware to check if user is authenticated (supports both session and JWT)
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // Check for JWT token in the Authorization header
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Handle JWT authentication
    return authenticateWithJWT(req, res, next);
  }
  
  // Fall back to session-based authentication
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  next();
}

// JWT Authentication helper
function authenticateWithJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  try {
    // This will be using the JWT verification from jwt-auth.ts
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'wishkeeper-jwt-secret-key';
    const decoded = jwt.verify(token, secret);
    
    // Set the user ID in the session
    req.session.userId = decoded.sub;
    
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}