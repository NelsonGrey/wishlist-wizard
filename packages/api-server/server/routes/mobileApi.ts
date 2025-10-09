import { Router, Request, Response } from "express";
import { db } from "../db";
import { MobileAppService } from "../services/mobileAppService";
import { storage } from "../storage";
import { authenticateJWT } from "../jwt-auth";
import { eq, and, or } from "drizzle-orm";
import { wishlists, wishlistCollaborators, wishlistItems } from "@wishlist-wizard/shared";

const mobileRouter = Router();
const mobileAppService = new MobileAppService(storage);

// Apply JWT authentication to all mobile API routes
mobileRouter.use(authenticateJWT);

// Register a mobile device
mobileRouter.post("/devices/register", async (req: Request, res: Response) => {
  try {
    const { deviceType, deviceToken, deviceName, osType, osVersion, appVersion, settings } = req.body;
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const deviceData = {
      userId: req.user.id,
      deviceType,
      deviceToken,
      deviceName,
      osType,
      osVersion,
      appVersion,
      settings: settings || {}
    };
    
    const deviceId = await mobileAppService.registerDevice(deviceData);
    
    if (!deviceId) {
      return res.status(500).json({ error: "Failed to register device" });
    }
    
    res.status(201).json({ 
      success: true, 
      deviceId,
      message: "Device registered successfully"
    });
  } catch (error) {
    console.error("Error in device registration:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Deactivate a device
mobileRouter.post("/devices/:deviceId/deactivate", async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const success = await mobileAppService.deactivateDevice(parseInt(deviceId));
    
    if (!success) {
      return res.status(500).json({ error: "Failed to deactivate device" });
    }
    
    res.json({ 
      success: true,
      message: "Device deactivated successfully" 
    });
  } catch (error) {
    console.error("Error in device deactivation:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get user's devices
mobileRouter.get("/devices", async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const devices = await mobileAppService.getUserDevices(req.user.id);
    
    res.json({ 
      success: true,
      devices 
    });
  } catch (error) {
    console.error("Error getting user devices:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update device settings
mobileRouter.patch("/devices/:deviceId/settings", async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { settings } = req.body;
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const success = await mobileAppService.updateDeviceSettings(parseInt(deviceId), settings);
    
    if (!success) {
      return res.status(500).json({ error: "Failed to update device settings" });
    }
    
    res.json({ 
      success: true,
      message: "Device settings updated successfully" 
    });
  } catch (error) {
    console.error("Error updating device settings:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update push notification token
mobileRouter.patch("/devices/:deviceId/token", async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { deviceToken } = req.body;
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const success = await mobileAppService.updateDeviceToken(parseInt(deviceId), deviceToken);
    
    if (!success) {
      return res.status(500).json({ error: "Failed to update device token" });
    }
    
    res.json({ 
      success: true,
      message: "Device token updated successfully" 
    });
  } catch (error) {
    console.error("Error updating device token:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Sync device data
mobileRouter.post("/sync", async (req: Request, res: Response) => {
  try {
    const { deviceId, lastSyncTime, offlineActions } = req.body;
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Import sync service
    const { syncService } = await import("../services/syncService");
    
    // Process offline actions first if any
    let offlineResults = null;
    if (offlineActions && Array.isArray(offlineActions) && offlineActions.length > 0) {
      offlineResults = await syncService.processOfflineActions(req.user.id, offlineActions);
    }
    
    // Get changes since last sync
    const syncData = await syncService.getChangesSinceTimestamp(
      req.user.id,
      new Date(lastSyncTime || 0)
    );
    
    res.json({
      success: true,
      syncTimestamp: new Date(),
      data: syncData,
      offlineResults
    });
  } catch (error) {
    console.error("Error syncing device data:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Search product by barcode
mobileRouter.get("/barcode/:barcode", async (req: Request, res: Response) => {
  try {
    const { barcode } = req.params;
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const result = await mobileAppService.searchProductByBarcode(barcode);
    
    if (!result) {
      return res.status(404).json({ error: "Product search failed" });
    }
    
    res.json(result);
  } catch (error) {
    console.error("Error searching product by barcode:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Mobile-optimized wishlist view
mobileRouter.get("/wishlists", async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Get wishlists with minimal data for mobile display
    const userWishlists = await storage.getWishlists(req.user.id);
    
    // Get count of items for each wishlist
    const wishlistsWithCounts = await Promise.all(userWishlists.map(async (wishlist) => {
      const items = await storage.getWishlistItems(wishlist.id);
      
      const beneficiary = wishlist.beneficiaryId ? 
        await storage.getBeneficiary(wishlist.beneficiaryId) : null;
      
      return {
        id: wishlist.id,
        name: wishlist.name,
        occasion: wishlist.occasion,
        occasionDate: wishlist.occasionDate,
        isPublic: wishlist.isPublic,
        isCollaborative: wishlist.isCollaborative,
        shareId: wishlist.shareId,
        createdAt: wishlist.createdAt,
        itemCount: items.length,
        beneficiaryName: beneficiary?.name || null
      };
    }));
    
    res.json({ 
      success: true,
      wishlists: wishlistsWithCounts 
    });
  } catch (error) {
    console.error("Error fetching mobile wishlists:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Mobile-optimized wishlist detail view
mobileRouter.get("/wishlists/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Get wishlist with items
    const wishlist = await storage.getWishlistById(parseInt(id));
    
    if (!wishlist) {
      return res.status(404).json({ error: "Wishlist not found" });
    }
    
    // Check if user owns this wishlist or is a collaborator
    const isOwner = wishlist.userId === req.user.id;
    
    if (!isOwner) {
      const isCollaborator = await storage.isCollaborator(parseInt(id), req.user.id);
      
      if (!isCollaborator && !wishlist.isPublic) {
        return res.status(403).json({ error: "Access denied" });
      }
    }
    
    // Get items for this wishlist
    const items = await storage.getWishlistItems(parseInt(id));
    
    // Get collaborators if any
    const collaborators = await storage.getCollaborators(parseInt(id));
    
    res.json({
      success: true,
      wishlist: {
        ...wishlist,
        items,
        collaborators,
        isOwner
      }
    });
  } catch (error) {
    console.error("Error fetching mobile wishlist detail:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Check for app updates
mobileRouter.get("/app/version", (req: Request, res: Response) => {
  // In a real app, this would check against a database of app versions
  res.json({
    latestVersion: {
      ios: "1.0.0",
      android: "1.0.0"
    },
    minimumVersion: {
      ios: "1.0.0",
      android: "1.0.0"
    },
    updateRequired: false,
    updateUrl: {
      ios: "https://apps.apple.com/app/wishkeeper",
      android: "https://play.google.com/store/apps/details?id=com.wishkeeper"
    }
  });
});

export default mobileRouter;