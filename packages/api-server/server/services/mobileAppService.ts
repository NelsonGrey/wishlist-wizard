import { db } from "../db";
import { 
  userDevices, 
  syncLogs,
  wishlistItems,
  InsertUserDevice,
  InsertSyncLog
} from "@wishlist-wizard/shared";
import { eq, and, desc, gt } from "drizzle-orm";
import { IStorage } from "../storage";

export class MobileAppService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Register a new mobile device for a user
   */
  async registerDevice(deviceData: InsertUserDevice): Promise<number | null> {
    try {
      // Check if device already exists
      const existingDevice = await db.query.userDevices.findFirst({
        where: and(
          eq(userDevices.userId, deviceData.userId),
          eq(userDevices.deviceToken, deviceData.deviceToken || '')
        )
      });
      
      if (existingDevice) {
        // Update the existing device
        await db.update(userDevices)
          .set({
            lastActiveAt: new Date(),
            isActive: true,
            appVersion: deviceData.appVersion,
            osVersion: deviceData.osVersion,
            settings: deviceData.settings
          })
          .where(eq(userDevices.id, existingDevice.id));
        
        return existingDevice.id;
      }
      
      // Create a new device registration
      const [newDevice] = await db.insert(userDevices)
        .values(deviceData)
        .returning({ id: userDevices.id });
      
      return newDevice.id;
    } catch (error) {
      console.error("Error registering mobile device:", error);
      return null;
    }
  }

  /**
   * Deactivate a device (when user logs out)
   */
  async deactivateDevice(deviceId: number): Promise<boolean> {
    try {
      await db.update(userDevices)
        .set({ isActive: false })
        .where(eq(userDevices.id, deviceId));
      
      return true;
    } catch (error) {
      console.error("Error deactivating device:", error);
      return false;
    }
  }

  /**
   * Get all active devices for a user
   */
  async getUserDevices(userId: number): Promise<any[]> {
    return db.query.userDevices.findMany({
      where: and(
        eq(userDevices.userId, userId),
        eq(userDevices.isActive, true)
      ),
      orderBy: [desc(userDevices.lastActiveAt)]
    });
  }

  /**
   * Update device settings
   */
  async updateDeviceSettings(deviceId: number, settings: any): Promise<boolean> {
    try {
      await db.update(userDevices)
        .set({ 
          settings,
          lastActiveAt: new Date()
        })
        .where(eq(userDevices.id, deviceId));
      
      return true;
    } catch (error) {
      console.error("Error updating device settings:", error);
      return false;
    }
  }

  /**
   * Update device token (for push notifications)
   */
  async updateDeviceToken(deviceId: number, deviceToken: string): Promise<boolean> {
    try {
      await db.update(userDevices)
        .set({ 
          deviceToken,
          lastActiveAt: new Date()
        })
        .where(eq(userDevices.id, deviceId));
      
      return true;
    } catch (error) {
      console.error("Error updating device token:", error);
      return false;
    }
  }

  /**
   * Log device sync
   */
  async logSync(syncData: InsertSyncLog): Promise<number | null> {
    try {
      const [newLog] = await db.insert(syncLogs)
        .values(syncData)
        .returning({ id: syncLogs.id });
      
      if (syncData.deviceId) {
        // Update last synced timestamp for the device
        await db.update(userDevices)
          .set({ lastSyncedAt: new Date() })
          .where(eq(userDevices.id, syncData.deviceId));
      }
      
      return newLog.id;
    } catch (error) {
      console.error("Error logging sync:", error);
      return null;
    }
  }

  /**
   * Get changes since last sync
   * This is crucial for efficient mobile sync
   */
  async getChangesSinceLastSync(userId: number, deviceId: number, lastSyncTime: Date): Promise<any> {
    try {
      // Get the device
      const device = await db.query.userDevices.findFirst({
        where: eq(userDevices.id, deviceId)
      });

      if (!device || device.userId !== userId) {
        throw new Error("Device not found or does not belong to user");
      }
      
      // Get updated wishlists
      const updatedWishlists = await db.query.wishlists.findMany({
        where: and(
          eq(userDevices.userId, userId),
          gt(userDevices.lastSyncedAt, lastSyncTime)
        )
      });
      
      // Get updated wishlist items
      const updatedItems = await db.query.wishlistItems.findMany({
        where: and(
          eq(wishlistItems.wishlist.owner.id, userId),
          gt(wishlistItems.createdAt, lastSyncTime)
        ),
        with: {
          wishlist: {
            with: {
              owner: true
            }
          }
        }
      });
      
      // Get updated user data
      const userData = await db.query.users.findFirst({
        where: eq(userDevices.userId, userId)
      });
      
      // Get updated notifications
      const notifications = await db.query.notifications.findMany({
        where: and(
          eq(userDevices.userId, userId),
          gt(userDevices.createdAt, lastSyncTime)
        )
      });
      
      // Put it all together in a comprehensive sync response
      return {
        syncTimestamp: new Date(),
        user: userData,
        wishlists: updatedWishlists,
        items: updatedItems,
        notifications
      };
    } catch (error) {
      console.error("Error getting changes since last sync:", error);
      return null;
    }
  }

  /**
   * Scan a barcode and search for matching products
   * This simulates the mobile barcode scanning functionality
   */
  async searchProductByBarcode(barcode: string): Promise<any | null> {
    try {
      // In a real implementation, this would connect to a product database
      // For now, we'll simulate a product match based on the barcode
      
      // Simple mock implementation - in a real app, this would call a product API
      const mockProducts = [
        {
          barcode: "0123456789",
          title: "Wireless Headphones",
          price: "$89.99",
          imageUrl: "https://example.com/headphones.jpg",
          productUrl: "https://example.com/products/headphones",
          store: "Electronics Emporium",
          brand: "AudioMax",
          category: "Electronics"
        },
        {
          barcode: "9876543210",
          title: "Coffee Maker",
          price: "$49.99",
          imageUrl: "https://example.com/coffeemaker.jpg",
          productUrl: "https://example.com/products/coffeemaker",
          store: "Home Goods",
          brand: "BrewMaster",
          category: "Kitchen Appliances"
        }
      ];
      
      const product = mockProducts.find(p => p.barcode === barcode);
      
      if (product) {
        return {
          found: true,
          product
        };
      }
      
      return {
        found: false,
        message: "Product not found. You can add it manually."
      };
    } catch (error) {
      console.error("Error searching product by barcode:", error);
      return null;
    }
  }

  /**
   * Handle offline actions that were performed on the mobile device
   */
  async processOfflineActions(userId: number, actions: any[]): Promise<any> {
    try {
      const results = {
        processed: 0,
        failed: 0,
        details: []
      };
      
      // Process each action sequentially
      for (const action of actions) {
        try {
          switch (action.type) {
            case "add_item":
              // Create item from offline data
              await db.insert(wishlistItems)
                .values({
                  wishlistId: action.wishlistId,
                  title: action.title,
                  price: action.price,
                  imageUrl: action.imageUrl || "",
                  productUrl: action.productUrl || "",
                  store: action.store || "Added offline",
                  note: action.note || "",
                  metadata: { addedFromMobile: true, offlineAction: true }
                });
              results.processed++;
              results.details.push({
                action: action.type,
                status: "success",
                id: action.id
              });
              break;
              
            case "update_item":
              // Update existing item
              await db.update(wishlistItems)
                .set({
                  title: action.title,
                  price: action.price,
                  note: action.note
                })
                .where(eq(wishlistItems.id, action.itemId));
              results.processed++;
              results.details.push({
                action: action.type,
                status: "success",
                id: action.id
              });
              break;
              
            default:
              results.failed++;
              results.details.push({
                action: action.type,
                status: "unsupported",
                id: action.id
              });
          }
        } catch (error) {
          console.error(`Error processing offline action: ${action.type}`, error);
          results.failed++;
          results.details.push({
            action: action.type,
            status: "error",
            id: action.id,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error("Error processing offline actions:", error);
      return {
        processed: 0,
        failed: actions.length,
        error: error.message
      };
    }
  }

  /**
   * Send a push notification to a user's devices
   */
  async sendPushNotification(userId: number, title: string, body: string, data: any = {}): Promise<any> {
    try {
      // Get the user's active devices with push tokens
      const devices = await db.query.userDevices.findMany({
        where: and(
          eq(userDevices.userId, userId),
          eq(userDevices.isActive, true)
        )
      });
      
      const results = {
        sent: 0,
        failed: 0,
        devices: devices.length
      };
      
      // In a real implementation, this would connect to FCM, APNS, etc.
      // For now, we'll just log that we would send to these devices
      for (const device of devices) {
        if (device.deviceToken) {
          // This would be replaced with actual push notification code
          console.log(`[PUSH] Sending to ${device.deviceType} (${device.deviceToken}): ${title} - ${body}`);
          results.sent++;
        } else {
          console.log(`[PUSH] Device has no token: ${device.id} (${device.deviceType})`);
          results.failed++;
        }
      }
      
      return results;
    } catch (error) {
      console.error("Error sending push notification:", error);
      return null;
    }
  }
}