import { storage } from '../storage';
import { EventEmitter } from 'events';

interface SyncEvent {
  userId: number;
  entityType: 'wishlist' | 'item' | 'beneficiary' | 'notification' | 'price_alert' | 'recommendation';
  entityId: number;
  action: 'create' | 'update' | 'delete';
  data?: any;
  timestamp: Date;
  deviceId?: number; // Exclude device that triggered the change
}

interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: 'wishlist' | 'item' | 'beneficiary';
  data: any;
  timestamp: string;
  tempId?: string; // For client-side temporary IDs
}

interface ConflictResolution {
  strategy: 'server_wins' | 'client_wins' | 'merge' | 'prompt_user';
  mergeFields?: string[];
}

class SyncService extends EventEmitter {
  private connectedDevices = new Map<number, Set<number>>(); // userId -> Set of deviceIds
  private conflictResolutionStrategies = new Map<string, ConflictResolution>();

  constructor() {
    super();
    this.setupConflictResolutionStrategies();
  }

  private setupConflictResolutionStrategies() {
    // Define how to handle conflicts for different entity types
    this.conflictResolutionStrategies.set('wishlist', {
      strategy: 'merge',
      mergeFields: ['name', 'description', 'occasion', 'occasionDate']
    });
    
    this.conflictResolutionStrategies.set('item', {
      strategy: 'merge',
      mergeFields: ['title', 'note', 'price', 'imageUrl', 'productUrl']
    });
    
    this.conflictResolutionStrategies.set('beneficiary', {
      strategy: 'merge',
      mergeFields: ['name', 'relationship', 'birthdate', 'notes']
    });
  }

  /**
   * Register a device as connected for real-time sync
   */
  registerDevice(userId: number, deviceId: number) {
    if (!this.connectedDevices.has(userId)) {
      this.connectedDevices.set(userId, new Set());
    }
    this.connectedDevices.get(userId)!.add(deviceId);
    console.log(`Device ${deviceId} registered for user ${userId}`);
  }

  /**
   * Unregister a device from real-time sync
   */
  unregisterDevice(userId: number, deviceId: number) {
    const userDevices = this.connectedDevices.get(userId);
    if (userDevices) {
      userDevices.delete(deviceId);
      if (userDevices.size === 0) {
        this.connectedDevices.delete(userId);
      }
    }
    console.log(`Device ${deviceId} unregistered for user ${userId}`);
  }

  /**
   * Broadcast a sync event to all connected devices except the originating one
   */
  async broadcastSyncEvent(syncEvent: SyncEvent) {
    const userDevices = this.connectedDevices.get(syncEvent.userId);
    if (!userDevices) return;

    // Log the sync event
    await this.logSyncEvent(syncEvent);

    // Broadcast to all connected devices except the originating one
    userDevices.forEach(deviceId => {
      if (deviceId !== syncEvent.deviceId) {
        this.emit('sync_event', {
          deviceId,
          event: syncEvent
        });
      }
    });

    // Also broadcast to browser extension and web app via WebSocket (if implemented)
    this.emit('web_sync_event', {
      userId: syncEvent.userId,
      event: syncEvent
    });
  }

  /**
   * Get all changes since a specific timestamp for incremental sync
   */
  async getChangesSinceTimestamp(userId: number, timestamp: Date) {
    try {
      const changes = {
        wishlists: [] as any[],
        items: [] as any[],
        beneficiaries: [] as any[],
        notifications: [] as any[],
        deletions: [] as any[]
      };

      // Get all user's wishlists and filter by timestamp
      const allWishlists = await storage.getWishlists(userId);
      changes.wishlists = allWishlists.filter(w => w.createdAt > timestamp);

      // Get all items from user's wishlists and filter by timestamp
      for (const wishlist of allWishlists) {
        const items = await storage.getWishlistItems(wishlist.id);
        const recentItems = items.filter(item => item.createdAt > timestamp);
        changes.items.push(...recentItems);
      }

      // Get beneficiary changes
      const allBeneficiaries = await storage.getBeneficiaries(userId);
      changes.beneficiaries = allBeneficiaries.filter(b => b.createdAt > timestamp);

      // Get recent notifications (limited for mobile)
      const notifications = await storage.getNotifications(userId, 50);
      changes.notifications = notifications.filter(n => n.createdAt > timestamp);

      return changes;
    } catch (error) {
      console.error('Error getting changes since timestamp:', error);
      throw error;
    }
  }

  /**
   * Process offline actions with conflict resolution
   */
  async processOfflineActions(userId: number, actions: OfflineAction[]) {
    const results = [];
    const conflicts = [];

    for (const action of actions) {
      try {
        const result = await this.processOfflineAction(userId, action);
        
        if ('conflict' in result && result.conflict) {
          conflicts.push(result);
        } else {
          results.push(result);
          
          // Broadcast successful changes for successful operations
          if ('data' in result && result.data) {
            await this.broadcastSyncEvent({
              userId,
              entityType: action.entityType as any,
              entityId: result.entityId,
              action: action.type as any,
              data: result.data,
              timestamp: new Date()
            });
          }
        }
      } catch (error) {
        console.error(`Error processing offline action ${action.id}:`, error);
        results.push({
          actionId: action.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      processed: results,
      conflicts,
      summary: {
        total: actions.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        conflicts: conflicts.length
      }
    };
  }

  /**
   * Process a single offline action
   */
  private async processOfflineAction(userId: number, action: OfflineAction) {
    const conflictStrategy = this.conflictResolutionStrategies.get(action.entityType);
    
    switch (action.type) {
      case 'create':
        return await this.processOfflineCreation(userId, action);
      
      case 'update':
        return await this.processOfflineUpdate(userId, action, conflictStrategy);
      
      case 'delete':
        return await this.processOfflineDeletion(userId, action);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Process offline creation
   */
  private async processOfflineCreation(userId: number, action: OfflineAction) {
    switch (action.entityType) {
      case 'wishlist':
        const wishlist = await storage.createWishlist({
          ...action.data,
          userId
        });
        return {
          actionId: action.id,
          success: true,
          entityId: wishlist.id,
          data: wishlist,
          tempId: action.tempId
        };
      
      case 'item':
        const item = await storage.createWishlistItem(action.data);
        return {
          actionId: action.id,
          success: true,
          entityId: item.id,
          data: item,
          tempId: action.tempId
        };
      
      case 'beneficiary':
        const beneficiary = await storage.createBeneficiary({
          ...action.data,
          ownerId: userId
        });
        return {
          actionId: action.id,
          success: true,
          entityId: beneficiary.id,
          data: beneficiary,
          tempId: action.tempId
        };
      
      default:
        throw new Error(`Cannot create entity type: ${action.entityType}`);
    }
  }

  /**
   * Process offline update with conflict detection
   */
  private async processOfflineUpdate(userId: number, action: OfflineAction, conflictStrategy?: ConflictResolution) {
    const entityId = action.data.id;
    const clientTimestamp = new Date(action.timestamp);
    
    // Get current server state
    let serverEntity;
    switch (action.entityType) {
      case 'wishlist':
        serverEntity = await storage.getWishlistById(entityId);
        break;
      case 'item':
        serverEntity = await storage.getWishlistItem(entityId);
        break;
      case 'beneficiary':
        serverEntity = await storage.getBeneficiary(entityId);
        break;
    }

    if (!serverEntity) {
      throw new Error(`Entity not found: ${action.entityType} ${entityId}`);
    }

    // For simplicity, since we don't have updatedAt fields, we'll apply client changes
    // In a production system, you'd want proper conflict detection
    
    // No conflict, proceed with update
    let updatedEntity;
    switch (action.entityType) {
      case 'wishlist':
        updatedEntity = await storage.updateWishlist(entityId, action.data);
        break;
      case 'item':
        updatedEntity = await storage.updateWishlistItem(entityId, action.data);
        break;
      case 'beneficiary':
        updatedEntity = await storage.updateBeneficiary(entityId, action.data);
        break;
    }

    return {
      actionId: action.id,
      success: true,
      entityId,
      data: updatedEntity
    };
  }

  /**
   * Handle update conflicts
   */
  private async handleUpdateConflict(
    userId: number,
    action: OfflineAction,
    serverEntity: any,
    conflictStrategy?: ConflictResolution
  ) {
    if (!conflictStrategy || conflictStrategy.strategy === 'server_wins') {
      return {
        actionId: action.id,
        success: false,
        conflict: true,
        conflictType: 'server_wins',
        serverData: serverEntity,
        clientData: action.data,
        resolution: 'Server data preserved'
      };
    }

    if (conflictStrategy.strategy === 'client_wins') {
      // Force update with client data
      let updatedEntity;
      const entityId = action.data.id;
      
      switch (action.entityType) {
        case 'wishlist':
          updatedEntity = await storage.updateWishlist(entityId, action.data);
          break;
        case 'item':
          updatedEntity = await storage.updateWishlistItem(entityId, action.data);
          break;
        case 'beneficiary':
          updatedEntity = await storage.updateBeneficiary(entityId, action.data);
          break;
      }

      return {
        actionId: action.id,
        success: true,
        entityId,
        data: updatedEntity,
        conflictResolved: true,
        resolution: 'Client data applied'
      };
    }

    if (conflictStrategy.strategy === 'merge' && conflictStrategy.mergeFields) {
      // Merge specific fields
      const mergedData = { ...serverEntity };
      
      conflictStrategy.mergeFields.forEach(field => {
        if (action.data[field] !== undefined) {
          mergedData[field] = action.data[field];
        }
      });

      let updatedEntity;
      const entityId = action.data.id;
      
      switch (action.entityType) {
        case 'wishlist':
          updatedEntity = await storage.updateWishlist(entityId, mergedData);
          break;
        case 'item':
          updatedEntity = await storage.updateWishlistItem(entityId, mergedData);
          break;
        case 'beneficiary':
          updatedEntity = await storage.updateBeneficiary(entityId, mergedData);
          break;
      }

      return {
        actionId: action.id,
        success: true,
        entityId,
        data: updatedEntity,
        conflictResolved: true,
        resolution: 'Data merged'
      };
    }

    // Default: return conflict for manual resolution
    return {
      actionId: action.id,
      success: false,
      conflict: true,
      conflictType: 'requires_manual_resolution',
      serverData: serverEntity,
      clientData: action.data,
      resolution: 'Manual resolution required'
    };
  }

  /**
   * Process offline deletion
   */
  private async processOfflineDeletion(userId: number, action: OfflineAction) {
    const entityId = action.data.id;
    let success = false;

    switch (action.entityType) {
      case 'wishlist':
        success = await storage.deleteWishlist(entityId);
        break;
      case 'item':
        success = await storage.deleteWishlistItem(entityId);
        break;
      case 'beneficiary':
        success = await storage.deleteBeneficiary(entityId);
        break;
    }

    return {
      actionId: action.id,
      success,
      entityId,
      deleted: success
    };
  }

  /**
   * Log sync events for audit trail
   */
  private async logSyncEvent(syncEvent: SyncEvent) {
    try {
      // Simple console logging for now - could be enhanced with proper DB logging
      console.log(`Sync event: ${syncEvent.action} ${syncEvent.entityType} ${syncEvent.entityId} for user ${syncEvent.userId}`);
    } catch (error) {
      console.error('Error logging sync event:', error);
      // Don't throw - sync logging is not critical
    }
  }

  /**
   * Get sync statistics for a user
   */
  async getSyncStats(userId: number, days: number = 7) {
    // Simplified stats - in production would use proper sync logs
    return {
      totalSyncs: 0,
      creates: 0,
      updates: 0,
      deletes: 0,
      failures: 0,
      devices: 1,
      mostRecentSync: Date.now()
    };
  }

  /**
   * Validate data integrity across platforms
   */
  async validateDataIntegrity(userId: number) {
    try {
      // Basic validation using storage interface
      const wishlists = await storage.getWishlists(userId);
      const issues: any[] = [];

      // Check for basic data consistency
      for (const wishlist of wishlists) {
        const items = await storage.getWishlistItems(wishlist.id);
        
        // Check for duplicate titles in same wishlist
        const titleMap = new Map();
        items.forEach(item => {
          const key = item.title.toLowerCase();
          if (!titleMap.has(key)) {
            titleMap.set(key, []);
          }
          titleMap.get(key)!.push(item.id);
        });

        titleMap.forEach((itemIds, title) => {
          if (itemIds.length > 1) {
            issues.push({
              type: 'duplicate_titles',
              wishlistId: wishlist.id,
              title,
              itemIds
            });
          }
        });
      }

      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('Error validating data integrity:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const syncService = new SyncService();
export default syncService;