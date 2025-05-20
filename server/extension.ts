import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { verifyToken } from './jwt-auth';

/**
 * Handles extension-specific authentication functionality
 * Verifies that the extension is allowed to access the user's data
 */
export async function verifyExtensionAuth(req: Request, res: Response) {
  try {
    // Check if user is authenticated
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user information
    const user = await storage.getUser(req.session.userId);
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
export function verifyExtensionJWT(req: Request, res: Response, next: NextFunction) {
  try {
    // First check for JWT token in Authorization header
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]; // Format: "Bearer TOKEN"
      const decoded = verifyToken(token);
      
      if (decoded) {
        // Set user ID in session for compatibility with existing code
        req.session.userId = decoded.sub;
        return next();
      }
    }
    
    // Fall back to session-based authentication
    if (req.session.userId) {
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
export async function getExtensionWishlists(req: Request, res: Response) {
  try {
    // User is already authenticated by middleware
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user's wishlists
    const wishlists = await storage.getWishlists(req.session.userId);
    
    // Also get collaborative wishlists
    const collaborativeWishlists = await storage.getCollaborativeWishlists(req.session.userId);
    
    // Combine and format the wishlists
    const allWishlists = [...wishlists, ...collaborativeWishlists].map(wishlist => ({
      id: wishlist.id,
      name: wishlist.name,
      isOwner: wishlist.userId === req.session.userId,
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
export async function trackExtensionEvent(req: Request, res: Response) {
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
      userId: req.session.userId || 'anonymous',
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

export async function addItemFromExtension(req: Request, res: Response) {
  try {
    // User is already authenticated by middleware
    if (!req.session.userId) {
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
    const isOwner = wishlist.userId === req.session.userId;
    const isCollaborator = !isOwner && await storage.isCollaborator(wishlistId, req.session.userId);
    
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
          addedBy: req.session.userId
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