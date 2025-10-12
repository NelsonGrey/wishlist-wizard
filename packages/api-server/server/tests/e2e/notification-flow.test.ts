import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import supertest, { SuperTest, Test } from 'supertest';
import express from 'express';
import { registerRoutes } from '../../routes';
import { storage } from '../../storage';

// Mock required modules
vi.mock('../../storage', () => ({
  storage: {
    getUser: vi.fn(),
    createUser: vi.fn(),
    getWishlistById: vi.fn(),
    createWishlist: vi.fn(),
    getWishlistItems: vi.fn(),
    createWishlistItem: vi.fn(),
    getCollaborators: vi.fn(),
    createNotification: vi.fn(),
    getNotifications: vi.fn(),
    getUnreadNotificationCount: vi.fn(),
    markNotificationAsRead: vi.fn(),
    markAllNotificationsAsRead: vi.fn()
  }
}));

// Mock auth functionality
vi.mock('../../auth', () => ({
  isAuthenticated: (req: any, res: any, next: any) => {
    req.session = {
      userId: 1,
      authenticated: true
    };
    next();
  }
}));

// Mock express-session
// Mock Firebase auth middleware
vi.mock('../../firebase-auth-simple', () => ({
  firebaseAuthMiddleware: (req: any, res: any, next: any) => {
    req.userId = 1;
    req.firebaseUser = { uid: 'test-uid', email: 'test@example.com' };
    next();
  }
}));

describe('Notification Flow E2E', () => {
  let app: express.Express;
  let request: any;
  let server: any;
  
  beforeAll(async () => {
    // Create Express app
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    // Register routes
    server = await registerRoutes(app);
    
    // Create supertest instance
    request = supertest(app);
  });
  
  afterAll(() => {
    if (server) {
      server.close();
    }
  });
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock data
    const mockUser = { id: 1, username: 'testuser', displayName: 'Test User', email: 'test@example.com' };
    const mockWishlist = { id: 1, name: 'Test Wishlist', userId: 1, shareId: 'abc123', isCollaborative: false };
    const mockItem = { id: 1, wishlistId: 1, title: 'Test Item', price: '$19.99', imageUrl: 'https://example.com/image.jpg', productUrl: 'https://example.com/product', store: 'Test Store' };
    const mockNotifications = [
      { 
        id: 1, 
        userId: 1, 
        type: 'wishlist_created', 
        title: 'New Wishlist Created', 
        message: 'Test message',
        isRead: false,
        createdAt: new Date(),
        actionUrl: '/wishlists/1'
      }
    ];
    
    (storage.getUser as any).mockResolvedValue(mockUser);
    (storage.getWishlistById as any).mockResolvedValue(mockWishlist);
    (storage.createWishlist as any).mockResolvedValue(mockWishlist);
    (storage.getWishlistItems as any).mockResolvedValue([mockItem]);
    (storage.createWishlistItem as any).mockResolvedValue(mockItem);
    (storage.getCollaborators as any).mockResolvedValue([]);
    (storage.getNotifications as any).mockResolvedValue(mockNotifications);
    (storage.getUnreadNotificationCount as any).mockResolvedValue(1);
    (storage.markNotificationAsRead as any).mockImplementation((id: number) => {
      return {
        ...mockNotifications.find(n => n.id === id),
        isRead: true
      };
    });
    (storage.markAllNotificationsAsRead as any).mockResolvedValue(true);
  });
  
  describe('Complete Notification Flow', () => {
    it('should create wishlist, generate a notification, and allow reading it', async () => {
      // 1. Create a wishlist (which should generate a notification)
      const createWishlistResponse = await request
        .post('/api/wishlists')
        .send({
          name: 'Test Wishlist',
          userId: 1,
          isPublic: false
        });
      
      // Verify wishlist was created
      expect(createWishlistResponse.status).toBe(201);
      expect(createWishlistResponse.body).toEqual(expect.objectContaining({
        id: 1,
        name: 'Test Wishlist'
      }));
      
      // Check if notification was created internally
      expect(storage.createNotification).toHaveBeenCalled();
      
      // 2. Get notifications
      const getNotificationsResponse = await request
        .get('/api/notifications');
      
      // Verify notifications response
      expect(getNotificationsResponse.status).toBe(200);
      expect(getNotificationsResponse.body).toEqual(expect.objectContaining({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            type: 'wishlist_created'
          })
        ]),
        unreadCount: 1
      }));
      
      // 3. Mark a notification as read
      const markAsReadResponse = await request
        .patch('/api/notifications/1/read');
      
      // Verify notification was marked as read
      expect(markAsReadResponse.status).toBe(200);
      expect(markAsReadResponse.body).toEqual(expect.objectContaining({
        id: 1,
        isRead: true
      }));
      expect(storage.markNotificationAsRead).toHaveBeenCalledWith(1);
      
      // 4. Add an item to wishlist (which should trigger another notification)
      const addItemResponse = await request
        .post('/api/items')
        .send({
          wishlistId: 1,
          title: 'Test Item',
          price: '$19.99',
          imageUrl: 'https://example.com/image.jpg',
          productUrl: 'https://example.com/product',
          store: 'Test Store'
        });
      
      // Verify item was added
      expect(addItemResponse.status).toBe(201);
      
      // 5. Mark all notifications as read
      const markAllReadResponse = await request
        .post('/api/notifications/mark-all-read');
      
      // Verify all notifications were marked as read
      expect(markAllReadResponse.status).toBe(200);
      expect(markAllReadResponse.body).toEqual(expect.objectContaining({
        success: true
      }));
      expect(storage.markAllNotificationsAsRead).toHaveBeenCalledWith(1);
    });
    
    it('should handle collaboration notifications properly', async () => {
      // Mock a collaborative wishlist
      const collaborativeWishlist = { 
        id: 2, 
        name: 'Collaborative List', 
        userId: 1, 
        shareId: 'xyz789', 
        isCollaborative: true 
      };
      (storage.getWishlistById as any).mockResolvedValue(collaborativeWishlist);
      (storage.createWishlist as any).mockResolvedValue(collaborativeWishlist);
      
      // Mock collaborators
      const collaborators = [
        { userId: 2, role: 'editor', wishlistId: 2 },
        { userId: 3, role: 'viewer', wishlistId: 2 }
      ];
      (storage.getCollaborators as any).mockResolvedValue(collaborators);
      
      // Add an item to the collaborative wishlist
      const addItemResponse = await request
        .post('/api/items')
        .send({
          wishlistId: 2,
          title: 'Collaborative Item',
          price: '$29.99',
          imageUrl: 'https://example.com/collab.jpg',
          productUrl: 'https://example.com/collab-item',
          store: 'Collab Store'
        });
      
      // Verify item was added
      expect(addItemResponse.status).toBe(201);
      
      // Verify collaborator notifications were created
      // Note: We expect storage.createNotification to be called for each collaborator (2 in this case)
      expect(storage.createNotification).toHaveBeenCalledTimes(2);
    });
  });
});