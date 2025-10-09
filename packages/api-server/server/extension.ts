import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { verifyToken } from './jwt-auth';

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
 * Handles extension-specific authentication functionality
 * Verifies that the extension is allowed to access the user's data
 */
export async function verifyExtensionAuth(req: AuthenticatedRequest, res: Response) {
  try {
    // Check if user is authenticated
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user information
    const user = await storage.getUser(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return necessary user information to the extension
    return res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      email: user.email
    });
  } catch (error) {
    console.error('Error verifying extension auth:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Middleware to verify JWT or session authentication for extension API endpoints
 * This supports both cookie-based sessions and JWT token authentication
 */
export function verifyExtensionJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    // First check for JWT token in Authorization header
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]; // Format: "Bearer TOKEN"
      const decoded = verifyToken(token);
      
      if (decoded) {
        // Set user ID for Firebase-first authentication
        req.userId = parseInt(decoded.sub);
        return next();
      }
    }
    
    // Fall back to checking Firebase authentication
    if (req.userId) {
      return next();
    }
    
    // Neither JWT nor session authentication found
    return res.status(401).json({ error: 'Authentication required' });
  } catch (error) {
    console.error('Extension JWT verification error:', error);
    return res.status(401).json({ error: 'Invalid authentication' });
  }
}

/**
 * Gets wishlists for the extension
 * Returns a simplified list of wishlists that the user has access to
 */
export async function getExtensionWishlists(req: AuthenticatedRequest, res: Response) {
  try {
    // User is already authenticated by middleware
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user's wishlists
    const wishlists = await storage.getWishlists(req.userId);
    
    // Also get collaborative wishlists
    const collaborativeWishlists = await storage.getCollaborativeWishlists(req.userId);
    
    // Combine and format the wishlists
    const allWishlists = [...wishlists, ...collaborativeWishlists].map(wishlist => ({
      id: wishlist.id,
      name: wishlist.name,
      isOwner: wishlist.userId === req.userId,
      isCollaborative: wishlist.isCollaborative
    }));

    return res.json(allWishlists);
  } catch (error) {
    console.error('Error getting wishlists for extension:', error);
    return res.status(500).json({ error: 'Failed to retrieve wishlists' });
  }
}

/**
 * Tracks analytics events from the browser extension
 */
export async function trackExtensionEvent(req: AuthenticatedRequest, res: Response) {
  try {
    // Event data from the extension
    const { action, category, label, value, url } = req.body;
    
    if (!action) {
      return res.status(400).json({ error: 'Missing required event action' });
    }
    
    // Log the event data for debugging
    console.log('Extension analytics event:', {
      action,
      category: category || 'extension',
      label: label || null,
      value: value || null,
      userId: req.userId || 'anonymous',
      url: url || null,
      timestamp: new Date().toISOString()
    });
    
    // In a production environment, you would integrate with Google Analytics
    // using the Measurement Protocol or another server-side tracking method
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error tracking extension event:', error);
    return res.status(500).json({ error: 'Failed to track event' });
  }
}

export async function addItemFromExtension(req: AuthenticatedRequest, res: Response) {
  try {
    // User is already authenticated by middleware
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Validate request body
    const { wishlistId, title, price, imageUrl, productUrl, store, note } = req.body;
    
    if (!wishlistId || !title || !productUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if the user has access to this wishlist
    const wishlist = await storage.getWishlistById(wishlistId);
    
    if (!wishlist) {
      return res.status(404).json({ error: 'Wishlist not found' });
    }
    
    // Check if user is owner or collaborator
    const isOwner = wishlist.userId === req.userId;
    const isCollaborator = !isOwner && await storage.isCollaborator(wishlistId, req.userId);
    
    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ error: 'You do not have permission to add items to this wishlist' });
    }

    // Add the item to the wishlist
    const newItem = await storage.createWishlistItem({
      wishlistId,
      title,
      price: price || '0.00',
      imageUrl: imageUrl || '',
      productUrl,
      store: store || 'Unknown',
      note: note || null,
      reservedByUserId: null,
      purchasedByUserId: null,
      purchasedAt: null
    });

    // Create a notification for the wishlist owner if added by a collaborator
    if (isCollaborator) {
      await storage.createNotification({
        userId: wishlist.userId,
        type: 'item_added',
        title: 'New Item Added',
        content: `A collaborator added "${title}" to your wishlist "${wishlist.name}"`,
        data: {
          itemId: newItem.id,
          wishlistId: wishlist.id,
          title: title,
          addedBy: req.userId
        },
        isRead: false,
        actionUrl: `/wishlist/${wishlist.id}`
      });
    }

    return res.status(201).json(newItem);
  } catch (error) {
    console.error('Error adding item from extension:', error);
    return res.status(500).json({ error: 'Failed to add item to wishlist' });
  }
}