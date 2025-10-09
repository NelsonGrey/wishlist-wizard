import { storage } from '../storage';
import { PrivacySettings, InsertPrivacySettings } from '@wishlist-wizard/shared';

export class PrivacyService {
  /**
   * Create or update privacy settings for an entity
   */
  async setPrivacySettings(settings: InsertPrivacySettings): Promise<PrivacySettings> {
    // Check if privacy settings already exist for this entity
    const existing = await storage.getPrivacySettings(
      settings.entityType, 
      settings.entityId
    );

    if (existing) {
      // Update existing settings
      return storage.updatePrivacySettings(existing.id, settings);
    } else {
      // Create new settings
      return storage.createPrivacySettings(settings);
    }
  }

  /**
   * Get privacy settings for an entity
   */
  async getPrivacySettings(
    entityType: string, 
    entityId: number
  ): Promise<PrivacySettings | null> {
    return storage.getPrivacySettings(entityType, entityId);
  }

  /**
   * Delete privacy settings for an entity
   */
  async deletePrivacySettings(
    entityType: string, 
    entityId: number
  ): Promise<boolean> {
    const settings = await storage.getPrivacySettings(entityType, entityId);
    if (!settings) {
      return false;
    }
    return storage.deletePrivacySettings(settings.id);
  }

  /**
   * Check if a user has access to view an entity based on privacy settings
   */
  async hasViewAccess(
    entityType: string,
    entityId: number,
    requestingUserId: number,
    entityOwnerId?: number
  ): Promise<boolean> {
    // Get privacy settings for the entity
    const settings = await storage.getPrivacySettings(entityType, entityId);
    
    // If no privacy settings exist, default to public access
    if (!settings) {
      return true;
    }

    // Owner always has access
    if (entityOwnerId && requestingUserId === entityOwnerId) {
      return true;
    }

    // Check visibility level
    switch (settings.visibilityLevel) {
      case 'public':
        return true;
      
      case 'private':
        // Only owner has access (already checked above)
        return false;
      
      case 'friends':
        // Check if requesting user is friends with entity owner
        if (entityOwnerId) {
          return this.areFriends(requestingUserId, entityOwnerId);
        }
        return false;
      
      case 'custom':
        // Check if user is in custom access list
        const customAccessList = Array.isArray(settings.customAccessList) 
          ? settings.customAccessList as number[]
          : [];
        return customAccessList.includes(requestingUserId);
      
      default:
        return false;
    }
  }

  /**
   * Check if a user has access to interact with an entity (comment, reserve, etc.)
   */
  async hasInteractionAccess(
    entityType: string,
    entityId: number,
    requestingUserId: number,
    interactionType: 'comment' | 'reserve',
    entityOwnerId?: number
  ): Promise<boolean> {
    // First check if user has view access
    const hasView = await this.hasViewAccess(entityType, entityId, requestingUserId, entityOwnerId);
    if (!hasView) {
      return false;
    }

    // Get privacy settings for the entity
    const settings = await storage.getPrivacySettings(entityType, entityId);
    
    // If no privacy settings exist, default to allowing interactions
    if (!settings) {
      return true;
    }

    // Check specific interaction permissions
    switch (interactionType) {
      case 'comment':
        return settings.allowComments;
      case 'reserve':
        return settings.allowReservations;
      default:
        return false;
    }
  }

  /**
   * Check if user needs approval for an action
   */
  async requiresApproval(
    entityType: string,
    entityId: number,
    requestingUserId: number,
    entityOwnerId?: number
  ): Promise<boolean> {
    // Owner doesn't need approval for their own entities
    if (entityOwnerId && requestingUserId === entityOwnerId) {
      return false;
    }

    const settings = await storage.getPrivacySettings(entityType, entityId);
    return settings?.requireApproval || false;
  }

  /**
   * Get privacy settings for multiple entities efficiently
   */
  async getBulkPrivacySettings(
    entities: Array<{ entityType: string; entityId: number }>
  ): Promise<Map<string, PrivacySettings>> {
    const results = new Map<string, PrivacySettings>();
    
    // Batch fetch all privacy settings
    for (const entity of entities) {
      const settings = await storage.getPrivacySettings(entity.entityType, entity.entityId);
      if (settings) {
        const key = `${entity.entityType}:${entity.entityId}`;
        results.set(key, settings);
      }
    }
    
    return results;
  }

  /**
   * Set default privacy settings for a new entity
   */
  async setDefaultPrivacySettings(
    userId: number,
    entityType: string,
    entityId: number,
    defaultVisibility: string = 'public'
  ): Promise<PrivacySettings> {
    const settings: InsertPrivacySettings = {
      userId,
      entityType,
      entityId,
      visibilityLevel: defaultVisibility,
      customAccessList: [],
      allowComments: true,
      allowReservations: true,
      requireApproval: false
    };

    return this.setPrivacySettings(settings);
  }

  /**
   * Update access list for custom visibility
   */
  async updateCustomAccessList(
    entityType: string,
    entityId: number,
    userIds: number[]
  ): Promise<PrivacySettings | null> {
    const settings = await storage.getPrivacySettings(entityType, entityId);
    if (!settings) {
      return null;
    }

    return storage.updatePrivacySettings(settings.id, {
      customAccessList: userIds
    });
  }

  /**
   * Add user to custom access list
   */
  async addToCustomAccessList(
    entityType: string,
    entityId: number,
    userId: number
  ): Promise<PrivacySettings | null> {
    const settings = await storage.getPrivacySettings(entityType, entityId);
    if (!settings) {
      return null;
    }

    const currentList = Array.isArray(settings.customAccessList) 
      ? settings.customAccessList as number[]
      : [];
    
    if (!currentList.includes(userId)) {
      currentList.push(userId);
      return storage.updatePrivacySettings(settings.id, {
        customAccessList: currentList
      });
    }

    return settings;
  }

  /**
   * Remove user from custom access list
   */
  async removeFromCustomAccessList(
    entityType: string,
    entityId: number,
    userId: number
  ): Promise<PrivacySettings | null> {
    const settings = await storage.getPrivacySettings(entityType, entityId);
    if (!settings) {
      return null;
    }

    const currentList = Array.isArray(settings.customAccessList) 
      ? settings.customAccessList as number[]
      : [];
    
    const updatedList = currentList.filter(id => id !== userId);
    
    return storage.updatePrivacySettings(settings.id, {
      customAccessList: updatedList
    });
  }

  /**
   * Helper method to check if two users are friends
   * This would typically check a friends/connections table
   */
  private async areFriends(userId1: number, userId2: number): Promise<boolean> {
    // For now, return false since we don't have a friends system implemented
    // This would typically query a friends or connections table
    return false;
  }

  /**
   * Get user's default privacy preferences
   */
  async getUserDefaultPrivacySettings(userId: number): Promise<{
    defaultWishlistVisibility: string;
    defaultItemVisibility: string;
    allowComments: boolean;
    allowReservations: boolean;
    requireApproval: boolean;
  }> {
    // This could be stored in user preferences or calculated from their most common settings
    // For now, return sensible defaults
    return {
      defaultWishlistVisibility: 'public',
      defaultItemVisibility: 'public',
      allowComments: true,
      allowReservations: true,
      requireApproval: false
    };
  }

  /**
   * Clean up expired privacy settings
   */
  async cleanupExpiredSettings(): Promise<void> {
    // This would be called by a scheduled job to remove expired custom access
    const now = new Date();
    // Implementation would query for settings with expirationDate < now and reset them
    console.log('Cleaning up expired privacy settings at', now);
  }
}

// Export a singleton instance
export const privacyService = new PrivacyService();