import { Request, Response, NextFunction } from "express";

interface FirebaseUser {
  uid: string;
  email?: string;
  displayName?: string;
  emailVerified: boolean;
}

interface AuthenticatedRequest extends Request {
  firebaseUser?: FirebaseUser;
  userId?: number; // For backward compatibility with existing routes
}

/**
 * Simple Firebase Auth Middleware Fallback
 * Falls back to session-based auth when Firebase Admin is not available
 */
export async function firebaseAuthMiddleware(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) {
  try {
    // Check for Firebase ID token in Authorization header
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      
      // For development without Firebase Admin setup, 
      // we'll simulate Firebase Auth by checking the token format
      if (idToken && idToken.length > 50) {
        // This is likely a Firebase ID token, but we can't verify it without Firebase Admin
        console.warn('Firebase ID token detected but Firebase Admin not configured - using mock auth');
        
        // Mock Firebase user for development
        req.firebaseUser = {
          uid: 'dev-user-123',
          email: 'dev@example.com',
          displayName: 'Development User',
          emailVerified: true
        };
        
        // Set userId directly for compatibility with existing routes
        req.userId = 1; // Fallback numeric ID for existing code
        
        return next();
      }
    }
    
    // Fallback - if no Firebase token, deny access (no session fallback)
    // All authentication should go through Firebase in the Firebase-first architecture
    
    return res.status(401).json({ 
      error: "Authentication required",
      code: "AUTH_REQUIRED"
    });
    
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      error: "Authentication service error",
      code: "AUTH_SERVICE_ERROR"
    });
  }
}

/**
 * Get current user (simplified version)
 */
export async function getCurrentUser(req: AuthenticatedRequest, res: Response) {
  try {
    const firebaseUid = req.firebaseUser?.uid;
    const userId = req.userId;
    
    if (!firebaseUid && !userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    // Return mock user data for development
    if (firebaseUid) {
      res.json({
        id: firebaseUid,
        email: req.firebaseUser?.email || 'dev@example.com',
        displayName: req.firebaseUser?.displayName || 'Development User',
        emailVerified: req.firebaseUser?.emailVerified || true,
        firebaseUser: true
      });
    } else {
      res.json({
        id: userId,
        email: 'dev@example.com',
        displayName: 'Development User',
        emailVerified: true,
        userId: userId
      });
    }
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ error: "Failed to get current user" });
  }
}

/**
 * Update user profile (simplified version)
 */
export async function updateUserProfile(req: AuthenticatedRequest, res: Response) {
  try {
    const firebaseUid = req.firebaseUser?.uid;
    const userId = req.userId;
    
    if (!firebaseUid && !userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const { displayName, photoURL, username, bio } = req.body;
    
    // In development, we'll just return success without actually updating anything
    console.log('Mock profile update:', { displayName, photoURL, username, bio });
    
    res.json({ success: true, message: 'Profile updated (development mode)' });
  } catch (error) {
    console.error("Update user profile error:", error);
    res.status(500).json({ error: "Failed to update user profile" });
  }
}

/**
 * Search users (simplified version)
 */
export async function searchUsers(req: AuthenticatedRequest, res: Response) {
  try {
    const firebaseUid = req.firebaseUser?.uid;
    const userId = req.userId;
    
    if (!firebaseUid && !userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const query = String(req.query.q || "").trim();
    const limit = parseInt(String(req.query.limit || "10"));
    
    if (!query || query.length < 2) {
      return res.status(400).json({ message: "Query 'q' must be at least 2 characters" });
    }
    
    // Return mock search results for development
    const mockResults = [
      {
        id: 'user-1',
        username: `${query}-user1`,
        displayName: `${query} User 1`,
        avatarUrl: null,
        email: `${query}1@example.com`
      },
      {
        id: 'user-2', 
        username: `${query}-user2`,
        displayName: `${query} User 2`,
        avatarUrl: null,
        email: `${query}2@example.com`
      }
    ].slice(0, limit);
    
    res.json({ users: mockResults });
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ message: "Failed to search users" });
  }
}

/**
 * Register user (simplified version)
 */
export async function register(req: Request, res: Response) {
  try {
    const { email, password, username } = req.body;
    
    // Mock registration for development
    console.log('Mock user registration:', { email, username });
    
    // Create mock user
    const mockUser = {
      id: `user-${Date.now()}`,
      email,
      username: username || email.split('@')[0],
      displayName: username || email.split('@')[0],
      emailVerified: false,
      firebaseUser: true
    };
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully (development mode)',
      user: mockUser
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
}

/**
 * Login user (simplified version)
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    
    // Mock login for development
    console.log('Mock user login:', { email });
    
    const mockUser = {
      id: `user-${email.replace('@', '-')}`,
      email,
      username: email.split('@')[0],
      displayName: email.split('@')[0],
      emailVerified: true,
      firebaseUser: true
    };
    
    res.json({
      success: true,
      message: 'Login successful (development mode)',
      user: mockUser
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to login user" });
  }
}

/**
 * Logout user (simplified version)
 */
export async function logout(req: Request, res: Response) {
  try {
    // In Firebase-first architecture, logout is handled client-side
    // Server just acknowledges the logout request
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Failed to logout user" });
  }
}

/**
 * Verify email (placeholder)
 */
export async function verifyEmail(req: Request, res: Response) {
  try {
    const { token } = req.params;
    
    console.log('Mock email verification:', { token });
    
    res.json({
      success: true,
      message: 'Email verified successfully (development mode)'
    });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({ error: "Failed to verify email" });
  }
}

/**
 * Request password reset (placeholder)
 */
export async function requestPasswordReset(req: Request, res: Response) {
  try {
    const { email } = req.body;
    
    console.log('Mock password reset request:', { email });
    
    res.json({
      success: true,
      message: 'Password reset email sent (development mode)'
    });
  } catch (error) {
    console.error("Request password reset error:", error);
    res.status(500).json({ error: "Failed to request password reset" });
  }
}

/**
 * Reset password (placeholder)
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, password } = req.body;
    
    console.log('Mock password reset:', { token });
    
    res.json({
      success: true,
      message: 'Password reset successfully (development mode)'
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
}

// Export middleware alias for backward compatibility
export const isAuthenticated = firebaseAuthMiddleware;