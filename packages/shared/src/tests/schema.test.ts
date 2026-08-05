import { describe, it, expect } from 'vitest';
import { 
  insertUserSchema,
  insertWishlistSchema,
  insertWishlistItemSchema,
  insertNotificationSchema
} from '../schema';

describe('Schema Validation', () => {
  describe('User Schema', () => {
    it('should validate a valid user', () => {
      // Arrange
      const validUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        displayName: 'Test User'
      };
      
      // Act
      const result = insertUserSchema.safeParse(validUser);
      
      // Assert
      expect(result.success).toBe(true);
    });
    
    it('should accept a user with any email format', () => {
      // Arrange
      const userWithInvalidEmail = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'Password123!'
      };
      
      // Act
      const result = insertUserSchema.safeParse(userWithInvalidEmail);
      
      // Assert - The schema doesn't validate email format, just accepts strings
      expect(result.success).toBe(true);
    });
    
    it('should reject a user with missing required fields', () => {
      // Arrange
      const incompleteUser = {
        username: 'testuser'
        // Missing email and password
      };
      
      // Act
      const result = insertUserSchema.safeParse(incompleteUser);
      
      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(2); // At least 2 issues for missing fields
      }
    });
  });
  
  describe('Wishlist Schema', () => {
    it('should validate a valid wishlist', () => {
      // Arrange
      const validWishlist = {
        name: 'Birthday Wishlist',
        userId: 1,
        shareId: 'abc123def456ghi789jkl012mno345pqr', // 36 characters
        isPublic: true,
        isCollaborative: false,
        occasion: 'Birthday',
        occasionDate: new Date() // Use Date object, not string
      };
      
      // Act
      const result = insertWishlistSchema.safeParse(validWishlist);
      
      // Assert
      expect(result.success).toBe(true);
    });
    
    it('should reject a wishlist with missing required fields', () => {
      // Arrange
      const invalidWishlist = {
        // Missing name
        userId: 1,
        shareId: 'abc123def456ghi789jkl012mno345pqr'
      };
      
      // Act
      const result = insertWishlistSchema.safeParse(invalidWishlist);
      
      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        const nameIssue = result.error.issues.find(issue => issue.path.includes('name'));
        expect(nameIssue).toBeDefined();
      }
    });
    
    it('should validate a wishlist with optional fields omitted', () => {
      // Arrange
      const minimumWishlist = {
        name: 'Simple Wishlist',
        userId: 1,
        shareId: 'abc123def456ghi789jkl012mno345pqr'
      };
      
      // Act
      const result = insertWishlistSchema.safeParse(minimumWishlist);
      
      // Assert
      expect(result.success).toBe(true);
    });
  });
  
  describe('Wishlist Item Schema', () => {
    it('should validate a valid wishlist item', () => {
      // Arrange
      const validItem = {
        wishlistId: 1,
        title: 'Test Product',
        price: '$19.99',
        imageUrl: 'https://example.com/image.jpg',
        productUrl: 'https://example.com/product',
        store: 'Test Store',
        note: 'This is a test note'
      };
      
      // Act
      const result = insertWishlistItemSchema.safeParse(validItem);
      
      // Assert
      expect(result.success).toBe(true);
    });
    
    it('should reject an item with invalid fields', () => {
      // Arrange
      const invalidItem = {
        wishlistId: 'one', // Should be a number
        title: 'Test Product',
        price: '$19.99',
        imageUrl: 'example.com/image', // Invalid URL
        productUrl: 'example.com/product', // Invalid URL
        store: 'Test Store'
      };
      
      // Act
      const result = insertWishlistItemSchema.safeParse(invalidItem);
      
      // Assert
      expect(result.success).toBe(false);
    });
    
    it('should validate an item with optional fields omitted', () => {
      // Arrange
      const minimumItem = {
        wishlistId: 1,
        title: 'Test Product',
        price: '$19.99',
        imageUrl: 'https://example.com/image.jpg',
        productUrl: 'https://example.com/product',
        store: 'Test Store'
        // Note is optional
      };
      
      // Act
      const result = insertWishlistItemSchema.safeParse(minimumItem);
      
      // Assert
      expect(result.success).toBe(true);
    });
  });
  
  describe('Notification Schema', () => {
    it('should validate a valid notification', () => {
      // Arrange
      const validNotification = {
        userId: 1,
        type: 'wishlist_created',
        title: 'New Wishlist Created',
        content: 'A wishlist "Birthday Wishlist" has been created.',
        data: { wishlistId: 123, wishlistName: 'Birthday Wishlist' },
        isRead: false,
        actionUrl: '/wishlists/123'
      };
      
      // Act
      const result = insertNotificationSchema.safeParse(validNotification);
      
      // Assert
      expect(result.success).toBe(true);
    });
    
    it('should reject a notification with missing required fields', () => {
      // Arrange
      const invalidNotification = {
        userId: 1,
        // Missing type
        // Missing title
        content: 'A wishlist has been created.'
      };
      
      // Act
      const result = insertNotificationSchema.safeParse(invalidNotification);
      
      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
      }
    });
    
    it('should validate a notification with optional fields omitted', () => {
      // Arrange
      const minimumNotification = {
        userId: 1,
        type: 'wishlist_created',
        title: 'New Wishlist Created',
        content: 'A wishlist has been created.'
        // Optional fields omitted
      };
      
      // Act
      const result = insertNotificationSchema.safeParse(minimumNotification);
      
      // Assert
      expect(result.success).toBe(true);
    });
  });
});