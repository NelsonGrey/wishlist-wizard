import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as notificationService from '../../services/notificationService';
import { storage } from '../../storage';

// Mock the storage implementation
vi.mock('../../storage', () => ({
  storage: {
    createNotification: vi.fn(),
    getWishlistById: vi.fn(),
    getCollaborators: vi.fn(),
    getUser: vi.fn()
  }
}));

describe('Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification with the correct properties', async () => {
      // Arrange
      const userId = 1;
      const type = 'wishlist_created';
      const title = 'Test Title';
      const message = 'Test Message';
      const relatedEntityId = 123;
      const relatedEntityType = 'wishlist';
      const actionUrl = '/wishlist/123';

      // Act
      await notificationService.createNotification(
        userId,
        type as any,
        title,
        message,
        relatedEntityId,
        relatedEntityType,
        actionUrl
      );

      // Assert
      expect(storage.createNotification).toHaveBeenCalledTimes(1);
      expect(storage.createNotification).toHaveBeenCalledWith({
        userId,
        type,
        title,
        message,
        relatedEntityId,
        relatedEntityType,
        isRead: false,
        actionUrl
      });
    });
  });

  describe('notifyWishlistCreated', () => {
    it('should create a notification for wishlist creation', async () => {
      // Arrange
      const userId = 1;
      const wishlist = { id: 123, name: 'Test Wishlist' };
      const creatorName = 'Test User';
      
      const createNotificationSpy = vi.spyOn(notificationService, 'createNotification')
        .mockResolvedValue();

      // Act
      await notificationService.notifyWishlistCreated(userId, wishlist as any, creatorName);

      // Assert
      expect(createNotificationSpy).toHaveBeenCalledTimes(1);
      expect(createNotificationSpy).toHaveBeenCalledWith(
        userId,
        'wishlist_created',
        'New Wishlist Created',
        `A new wishlist "${wishlist.name}" has been created by ${creatorName}.`,
        wishlist.id,
        'wishlist',
        `/wishlists/${wishlist.id}`
      );
    });
  });

  describe('notifyWishlistCollaborators', () => {
    it('should notify all collaborators except the excluded user', async () => {
      // Arrange
      const wishlistId = 123;
      const message = 'Test collaboration message';
      const title = 'Collaboration Test';
      const type = 'item_added';
      const excludeUserId = 2;
      
      const wishlist = { id: wishlistId, userId: 1, name: 'Test Wishlist' };
      const collaborators = [
        { userId: 2, role: 'editor' },
        { userId: 3, role: 'viewer' },
        { userId: 4, role: 'editor' }
      ];
      
      (storage.getWishlistById as any).mockResolvedValue(wishlist);
      (storage.getCollaborators as any).mockResolvedValue(collaborators);
      
      const createNotificationSpy = vi.spyOn(notificationService, 'createNotification')
        .mockResolvedValue();

      // Act
      await notificationService.notifyWishlistCollaborators(
        wishlistId,
        message,
        title,
        type as any,
        excludeUserId
      );

      // Assert
      // Should notify the owner (userId = 1)
      expect(createNotificationSpy).toHaveBeenCalledWith(
        1,
        type,
        title,
        message,
        wishlistId,
        'wishlist',
        `/wishlists/${wishlistId}`
      );
      
      // Should not notify the excluded user (userId = 2)
      expect(createNotificationSpy).not.toHaveBeenCalledWith(
        2,
        type,
        title,
        message,
        wishlistId,
        'wishlist',
        `/wishlists/${wishlistId}`
      );
      
      // Should notify users 3 and 4
      expect(createNotificationSpy).toHaveBeenCalledWith(
        3,
        type,
        title,
        message,
        wishlistId,
        'wishlist',
        `/wishlists/${wishlistId}`
      );
      
      expect(createNotificationSpy).toHaveBeenCalledWith(
        4,
        type,
        title,
        message,
        wishlistId,
        'wishlist',
        `/wishlists/${wishlistId}`
      );
      
      // Total calls should be 3 (owner + 2 non-excluded collaborators)
      expect(createNotificationSpy).toHaveBeenCalledTimes(3);
    });

    it('should return early if wishlist is not found', async () => {
      // Arrange
      const wishlistId = 999; // non-existent wishlist
      (storage.getWishlistById as any).mockResolvedValue(null);
      
      const createNotificationSpy = vi.spyOn(notificationService, 'createNotification');

      // Act
      await notificationService.notifyWishlistCollaborators(
        wishlistId,
        'Test message',
        'Test title',
        'item_added' as any
      );

      // Assert
      expect(storage.getWishlistById).toHaveBeenCalledWith(wishlistId);
      expect(createNotificationSpy).not.toHaveBeenCalled();
    });
  });
});