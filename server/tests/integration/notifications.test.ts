import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import supertest from 'supertest';
import express from 'express';
import { storage } from '../../storage';
import { registerRoutes } from '../../routes';
import session from 'express-session';

// Mock storage
vi.mock('../../storage', () => {
  return {
    storage: {
      getNotifications: vi.fn(),
      getUnreadNotificationCount: vi.fn(),
      markNotificationAsRead: vi.fn(),
      markAllNotificationsAsRead: vi.fn(),
      deleteNotification: vi.fn(),
      getUser: vi.fn()
    }
  };
});

// Mock authentication middleware
vi.mock('../../auth', () => {
  return {
    isAuthenticated: (req: any, res: any, next: any) => {
      req.session = {
        userId: 1,
        authenticated: true
      };
      next();
    }
  };
});

// Mock session middleware
vi.mock('express-session', () => {
  return vi.fn(() => (req: any, res: any, next: any) => {
    req.session = {
      userId: 1,
      authenticated: true
    };
    next();
  });
});

describe('Notification API Endpoints', () => {
  let app: express.Express;
  let request: supertest.SuperTest<supertest.Test>;
  let server: any;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create Express app
    app = express();
    app.use(express.json());
    app.use(session());
    
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

  describe('GET /api/notifications', () => {
    it('should return notifications and unread count', async () => {
      // Arrange
      const mockNotifications = [
        { 
          id: 1, 
          userId: 1, 
          type: 'wishlist_created', 
          title: 'Test Notification',
          message: 'This is a test notification',
          isRead: false,
          createdAt: new Date()
        }
      ];
      
      const mockUnreadCount = 1;
      
      (storage.getNotifications as any).mockResolvedValue(mockNotifications);
      (storage.getUnreadNotificationCount as any).mockResolvedValue(mockUnreadCount);

      // Act
      const response = await request.get('/api/notifications');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.notifications).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 1,
          type: 'wishlist_created',
          title: 'Test Notification'
        })
      ]));
      expect(response.body.unreadCount).toBe(mockUnreadCount);
      expect(storage.getNotifications).toHaveBeenCalledWith(1, undefined);
      expect(storage.getUnreadNotificationCount).toHaveBeenCalledWith(1);
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      // Arrange
      const notificationId = 1;
      const mockNotifications = [
        { 
          id: notificationId, 
          userId: 1, 
          type: 'wishlist_created', 
          title: 'Test Notification',
          message: 'This is a test notification',
          isRead: false,
          createdAt: new Date()
        }
      ];
      
      const updatedNotification = {
        ...mockNotifications[0],
        isRead: true
      };
      
      (storage.getNotifications as any).mockResolvedValue(mockNotifications);
      (storage.markNotificationAsRead as any).mockResolvedValue(updatedNotification);

      // Act
      const response = await request
        .patch(`/api/notifications/${notificationId}/read`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(expect.objectContaining({
        id: notificationId,
        isRead: true
      }));
      expect(storage.markNotificationAsRead).toHaveBeenCalledWith(notificationId);
    });

    it('should return 404 if notification not found', async () => {
      // Arrange
      const notificationId = 999; // non-existent
      (storage.getNotifications as any).mockResolvedValue([]);
      
      // Act
      const response = await request
        .patch(`/api/notifications/${notificationId}/read`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toEqual(expect.objectContaining({
        message: expect.stringContaining('not found')
      }));
    });
  });

  describe('POST /api/notifications/mark-all-read', () => {
    it('should mark all notifications as read', async () => {
      // Arrange
      (storage.markAllNotificationsAsRead as any).mockResolvedValue(true);

      // Act
      const response = await request
        .post('/api/notifications/mark-all-read');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(storage.markAllNotificationsAsRead).toHaveBeenCalledWith(1);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should delete a notification', async () => {
      // Arrange
      const notificationId = 1;
      const mockNotifications = [
        { 
          id: notificationId, 
          userId: 1, 
          type: 'wishlist_created', 
          title: 'Test Notification',
          message: 'This is a test notification',
          isRead: false,
          createdAt: new Date()
        }
      ];
      
      (storage.getNotifications as any).mockResolvedValue(mockNotifications);
      (storage.deleteNotification as any).mockResolvedValue(true);

      // Act
      const response = await request
        .delete(`/api/notifications/${notificationId}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(storage.deleteNotification).toHaveBeenCalledWith(notificationId);
    });

    it('should return 404 if notification not found', async () => {
      // Arrange
      const notificationId = 999; // non-existent
      (storage.getNotifications as any).mockResolvedValue([]);
      
      // Act
      const response = await request
        .delete(`/api/notifications/${notificationId}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toEqual(expect.objectContaining({
        message: expect.stringContaining('not found')
      }));
    });
  });
});