import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { downloadExtension, getExtensionMetadata, packageExtensions } from "./extension-deploy";
import { 
  insertUserSchema, 
  insertWishlistSchema, 
  insertWishlistItemSchema,
  insertBeneficiarySchema,
  insertNotificationSchema
} from "@shared/schema";
import { z } from "zod";
import { register, login, logout, getCurrentUser, isAuthenticated, verifyEmail, requestPasswordReset, resetPassword } from "./auth";
import { issueToken } from "./jwt-auth";
import { initializeSessionTable } from "./session";
import { verifyExtensionAuth, getExtensionWishlists, addItemFromExtension, verifyExtensionJWT } from "./extension";
import { 
  notifyWishlistCreated, 
  notifyItemAdded, 
  notifyItemReserved, 
  notifyItemPurchased,
  notifyWishlistShared,
  notifyCollaboratorAdded,
  notifyCollaboratorRemoved,
  notifyWishlistCollaborators
} from "./services/notificationService";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize session table if using database storage
  await initializeSessionTable();
  
  // Authentication routes
  app.post("/api/auth/register", register);
  app.post("/api/auth/login", login);
  app.post("/api/auth/logout", logout);
  app.get("/api/auth/me", getCurrentUser);
  
  // Enhanced authentication features
  app.get("/api/auth/verify-email/:token", verifyEmail);
  app.post("/api/auth/forgot-password", requestPasswordReset);
  app.post("/api/auth/reset-password", resetPassword);
  app.post("/api/auth/token", issueToken);

  // Get all wishlists for a user
  app.get("/api/wishlists", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const wishlists = await storage.getWishlists(userId);
      
      // Get item counts for each wishlist
      const wishlistsWithCounts = await Promise.all(
        wishlists.map(async (wishlist) => {
          const items = await storage.getWishlistItems(wishlist.id);
          return {
            ...wishlist,
            itemCount: items.length
          };
        })
      );
      
      res.json(wishlistsWithCounts);
    } catch (error) {
      console.error("Error fetching wishlists:", error);
      res.status(500).json({ message: "Failed to retrieve wishlists" });
    }
  });

  // Get a specific wishlist by ID
  app.get("/api/wishlists/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid wishlist ID" });
      }
      
      const wishlist = await storage.getWishlistById(id);
      if (!wishlist) {
        return res.status(404).json({ message: "Wishlist not found" });
      }
      
      res.json(wishlist);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      res.status(500).json({ message: "Failed to retrieve wishlist" });
    }
  });

  // Get a shared wishlist by share ID
  app.get("/api/shared/:shareId", async (req: Request, res: Response) => {
    try {
      const { shareId } = req.params;
      
      const wishlist = await storage.getWishlistByShareId(shareId);
      if (!wishlist) {
        return res.status(404).json({ message: "Shared wishlist not found" });
      }
      
      const items = await storage.getWishlistItems(wishlist.id);
      
      res.json({
        wishlist,
        items
      });
    } catch (error) {
      console.error("Error fetching shared wishlist:", error);
      res.status(500).json({ message: "Failed to retrieve shared wishlist" });
    }
  });

  // Create a new wishlist
  app.post("/api/wishlists", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const schema = insertWishlistSchema.omit({ shareId: true });
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid wishlist data", 
          errors: result.error.format() 
        });
      }
      
      const wishlist = await storage.createWishlist(result.data);
      
      // Get creator info for notification
      const creator = await storage.getUser(req.session.userId!);
      const creatorName = creator?.displayName || creator?.username || "Someone";
      
      // Notify the creator about their new wishlist
      await notifyWishlistCreated(req.session.userId!, wishlist, creatorName);
      
      res.status(201).json(wishlist);
    } catch (error) {
      console.error("Error creating wishlist:", error);
      res.status(500).json({ message: "Failed to create wishlist" });
    }
  });

  // Update a wishlist
  app.patch("/api/wishlists/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid wishlist ID" });
      }
      
      // Verify the user owns this wishlist
      const existingWishlist = await storage.getWishlistById(id);
      if (!existingWishlist || existingWishlist.userId !== req.session.userId) {
        return res.status(404).json({ message: "Wishlist not found" });
      }
      
      // Enhanced schema to support beneficiary wishlists and more features
      const schema = z.object({ 
        name: z.string().min(1).optional(),
        beneficiaryId: z.number().nullable().optional(),
        isPublic: z.boolean().optional(),
        occasion: z.string().nullable().optional(),
        occasionDate: z.coerce.date().nullable().optional()
      });
      
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid wishlist data", 
          errors: result.error.format() 
        });
      }
      
      const wishlist = await storage.updateWishlist(id, result.data);
      if (!wishlist) {
        return res.status(404).json({ message: "Wishlist not found" });
      }
      
      res.json(wishlist);
    } catch (error) {
      console.error("Error updating wishlist:", error);
      res.status(500).json({ message: "Failed to update wishlist" });
    }
  });

  // Delete a wishlist
  app.delete("/api/wishlists/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid wishlist ID" });
      }
      
      const success = await storage.deleteWishlist(id);
      if (!success) {
        return res.status(404).json({ message: "Wishlist not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting wishlist:", error);
      res.status(500).json({ message: "Failed to delete wishlist" });
    }
  });

  // Get items in a wishlist
  app.get("/api/wishlists/:id/items", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const wishlistId = parseInt(req.params.id);
      if (isNaN(wishlistId)) {
        return res.status(400).json({ message: "Invalid wishlist ID" });
      }
      
      const wishlist = await storage.getWishlistById(wishlistId);
      if (!wishlist) {
        return res.status(404).json({ message: "Wishlist not found" });
      }
      
      const items = await storage.getWishlistItems(wishlistId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching wishlist items:", error);
      res.status(500).json({ message: "Failed to retrieve wishlist items" });
    }
  });

  // Add an item to a wishlist
  app.post("/api/items", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const result = insertWishlistItemSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid item data", 
          errors: result.error.format() 
        });
      }
      
      const wishlist = await storage.getWishlistById(result.data.wishlistId);
      if (!wishlist) {
        return res.status(404).json({ message: "Wishlist not found" });
      }
      
      const item = await storage.createWishlistItem(result.data);
      
      // Get user info for notification
      const addedByUser = await storage.getUser(req.session.userId!);
      const adderName = addedByUser?.displayName || addedByUser?.username || "Someone";
      
      // If this is a collaborative wishlist, notify collaborators
      if (wishlist.isCollaborative) {
        await notifyWishlistCollaborators(
          wishlist.id,
          `${adderName} added "${item.title}" to the wishlist "${wishlist.name}"`,
          "New Item Added",
          "item_added",
          req.session.userId // Exclude the current user from notifications
        );
      } 
      // If this is a regular wishlist owned by someone else (beneficiary wishlist)
      else if (wishlist.userId !== req.session.userId) {
        // Notify the owner
        await notifyItemAdded(
          wishlist.userId,
          item,
          wishlist.name,
          adderName
        );
      }
      
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating wishlist item:", error);
      res.status(500).json({ message: "Failed to create wishlist item" });
    }
  });

  // Delete an item from a wishlist
  app.delete("/api/items/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      
      const success = await storage.deleteWishlistItem(id);
      if (!success) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting wishlist item:", error);
      res.status(500).json({ message: "Failed to delete wishlist item" });
    }
  });

  // Update a wishlist item
  app.patch("/api/items/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      
      // Get the item to verify ownership
      const item = await storage.getWishlistItem(id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      // Get the wishlist to verify ownership
      const wishlist = await storage.getWishlistById(item.wishlistId);
      if (!wishlist || wishlist.userId !== req.session.userId) {
        return res.status(403).json({ message: "You don't have permission to update this item" });
      }
      
      const schema = z.object({
        note: z.string().nullable().optional(),
        price: z.string().optional(),
        title: z.string().optional(),
        imageUrl: z.string().optional(),
        productUrl: z.string().optional(),
        store: z.string().optional()
      });
      
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid item data", 
          errors: result.error.format() 
        });
      }
      
      const updatedItem = await storage.updateWishlistItem(id, result.data);
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating wishlist item:", error);
      res.status(500).json({ message: "Failed to update wishlist item" });
    }
  });

  // Reserve an item on a wishlist
  app.post("/api/items/:id/reserve", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      
      const userId = req.session.userId!;
      
      // Get the item to check if it's already reserved or purchased
      const item = await storage.getWishlistItem(id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      if (item.reservedByUserId) {
        return res.status(400).json({ message: "This item is already reserved" });
      }
      
      if (item.purchasedByUserId) {
        return res.status(400).json({ message: "This item has already been purchased" });
      }
      
      const updatedItem = await storage.reserveWishlistItem(id, userId);
      if (!updatedItem) {
        return res.status(500).json({ message: "Failed to reserve item" });
      }
      
      // Create a notification for the wishlist owner if the reserver isn't the owner
      const wishlist = await storage.getWishlistById(updatedItem.wishlistId);
      if (!wishlist) {
        return res.status(500).json({ message: "Failed to retrieve wishlist information" });
      }
      
      // Get reserver info for notification
      const reserver = await storage.getUser(userId);
      const reserverName = reserver?.displayName || reserver?.username || "Someone";
      
      // If this is a collaborative wishlist, notify all collaborators
      if (wishlist.isCollaborative) {
        await notifyWishlistCollaborators(
          wishlist.id,
          `${reserverName} reserved "${updatedItem.title}" from the wishlist "${wishlist.name}"`,
          "Item Reserved",
          "item_reserved",
          userId // Exclude the reserver from notifications
        );
      } 
      // If this is a regular wishlist and reserver isn't the owner, notify the owner
      else if (wishlist.userId !== userId) {
        await notifyItemReserved(
          wishlist.userId,
          updatedItem,
          wishlist.name,
          reserverName
        );
      }
      
      res.json(updatedItem);
    } catch (error) {
      console.error("Error reserving wishlist item:", error);
      res.status(500).json({ message: "Failed to reserve wishlist item" });
    }
  });

  // Mark an item as purchased
  app.post("/api/items/:id/purchase", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid item ID" });
      }
      
      const userId = req.session.userId!;
      
      // Get the item to check if it's already purchased
      const item = await storage.getWishlistItem(id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      if (item.purchasedByUserId) {
        return res.status(400).json({ message: "This item has already been purchased" });
      }
      
      const updatedItem = await storage.markItemPurchased(id, userId);
      if (!updatedItem) {
        return res.status(500).json({ message: "Failed to mark item as purchased" });
      }
      
      // Get wishlist information for notification
      const wishlist = await storage.getWishlistById(updatedItem.wishlistId);
      if (!wishlist) {
        return res.status(500).json({ message: "Failed to retrieve wishlist information" });
      }
      
      // Get purchaser info for notification
      const purchaser = await storage.getUser(userId);
      const purchaserName = purchaser?.displayName || purchaser?.username || "Someone";
      
      // If this is a collaborative wishlist, notify all collaborators
      if (wishlist.isCollaborative) {
        await notifyWishlistCollaborators(
          wishlist.id,
          `${purchaserName} purchased "${updatedItem.title}" from the wishlist "${wishlist.name}"`,
          "Item Purchased",
          "item_purchased",
          userId // Exclude the purchaser from notifications
        );
      } 
      // If this is a regular wishlist and purchaser isn't the owner, notify the owner
      else if (wishlist.userId !== userId) {
        await notifyItemPurchased(
          wishlist.userId,
          updatedItem,
          wishlist.name,
          purchaserName
        );
      }
      
      res.json(updatedItem);
    } catch (error) {
      console.error("Error marking wishlist item as purchased:", error);
      res.status(500).json({ message: "Failed to mark wishlist item as purchased" });
    }
  });

  // Get recently added items (across all wishlists for a user)
  app.get("/api/recent-items", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      const wishlists = await storage.getWishlists(userId);
      
      let allItems: any[] = [];
      for (const wishlist of wishlists) {
        const items = await storage.getWishlistItems(wishlist.id);
        allItems.push(...items.map(item => ({
          ...item,
          wishlistName: wishlist.name,
          wishlistId: wishlist.id
        })));
      }
      
      // Sort by most recently added first and limit to 10 items
      allItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const recentItems = allItems.slice(0, 10);
      
      res.json(recentItems);
    } catch (error) {
      console.error("Error fetching recent items:", error);
      res.status(500).json({ message: "Failed to retrieve recent items" });
    }
  });

  // ==================== BENEFICIARY ROUTES ====================
  
  // Get all beneficiaries for a user
  app.get("/api/beneficiaries", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const beneficiaries = await storage.getBeneficiaries(userId);
      res.json(beneficiaries);
    } catch (error) {
      console.error("Error fetching beneficiaries:", error);
      res.status(500).json({ message: "Failed to retrieve beneficiaries" });
    }
  });

  // Get a specific beneficiary
  app.get("/api/beneficiaries/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid beneficiary ID" });
      }
      
      const beneficiary = await storage.getBeneficiary(id);
      
      // Ensure the user owns this beneficiary
      if (!beneficiary || beneficiary.ownerId !== req.session.userId) {
        return res.status(404).json({ message: "Beneficiary not found" });
      }
      
      res.json(beneficiary);
    } catch (error) {
      console.error("Error fetching beneficiary:", error);
      res.status(500).json({ message: "Failed to retrieve beneficiary" });
    }
  });

  // Create a new beneficiary
  app.post("/api/beneficiaries", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Ensure the beneficiary has the current user as owner
      const beneficiaryData = {
        ...req.body,
        ownerId: req.session.userId
      };
      
      const schema = insertBeneficiarySchema;
      const result = schema.safeParse(beneficiaryData);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid beneficiary data", 
          errors: result.error.format() 
        });
      }
      
      const beneficiary = await storage.createBeneficiary(result.data);
      res.status(201).json(beneficiary);
    } catch (error) {
      console.error("Error creating beneficiary:", error);
      res.status(500).json({ message: "Failed to create beneficiary" });
    }
  });

  // Update a beneficiary
  app.patch("/api/beneficiaries/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid beneficiary ID" });
      }
      
      // Verify the user owns this beneficiary
      const existingBeneficiary = await storage.getBeneficiary(id);
      if (!existingBeneficiary || existingBeneficiary.ownerId !== req.session.userId) {
        return res.status(404).json({ message: "Beneficiary not found" });
      }
      
      // Define schema for beneficiary updates
      const schema = z.object({ 
        name: z.string().min(1).optional(),
        relationship: z.string().nullable().optional(),
        birthdate: z.coerce.date().nullable().optional(),
        notes: z.string().nullable().optional()
      });
      
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid beneficiary data", 
          errors: result.error.format() 
        });
      }
      
      const beneficiary = await storage.updateBeneficiary(id, result.data);
      if (!beneficiary) {
        return res.status(404).json({ message: "Beneficiary not found" });
      }
      
      res.json(beneficiary);
    } catch (error) {
      console.error("Error updating beneficiary:", error);
      res.status(500).json({ message: "Failed to update beneficiary" });
    }
  });

  // Delete a beneficiary
  app.delete("/api/beneficiaries/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid beneficiary ID" });
      }
      
      // Verify the user owns this beneficiary
      const beneficiary = await storage.getBeneficiary(id);
      if (!beneficiary || beneficiary.ownerId !== req.session.userId) {
        return res.status(404).json({ message: "Beneficiary not found" });
      }
      
      const success = await storage.deleteBeneficiary(id);
      if (!success) {
        return res.status(400).json({ 
          message: "Cannot delete beneficiary with active wishlists. Remove all wishlists first." 
        });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting beneficiary:", error);
      res.status(500).json({ message: "Failed to delete beneficiary" });
    }
  });

  // Get wishlists for a specific beneficiary
  app.get("/api/beneficiaries/:id/wishlists", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid beneficiary ID" });
      }
      
      // Verify the user owns this beneficiary
      const beneficiary = await storage.getBeneficiary(id);
      if (!beneficiary || beneficiary.ownerId !== req.session.userId) {
        return res.status(404).json({ message: "Beneficiary not found" });
      }
      
      const wishlists = await storage.getWishlistsByBeneficiary(id);
      
      // Get item counts for each wishlist
      const wishlistsWithCounts = await Promise.all(
        wishlists.map(async (wishlist) => {
          const items = await storage.getWishlistItems(wishlist.id);
          return {
            ...wishlist,
            itemCount: items.length
          };
        })
      );
      
      res.json(wishlistsWithCounts);
    } catch (error) {
      console.error("Error fetching beneficiary wishlists:", error);
      res.status(500).json({ message: "Failed to retrieve beneficiary wishlists" });
    }
  });

  // ==================== COLLABORATIVE WISHLIST ROUTES ====================
  
  // Get wishlists where the user is a collaborator
  app.get("/api/collaborative-wishlists", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      const wishlists = await storage.getCollaborativeWishlists(userId);
      
      // Get item counts for each wishlist
      const wishlistsWithCounts = await Promise.all(
        wishlists.map(async (wishlist) => {
          const items = await storage.getWishlistItems(wishlist.id);
          return {
            ...wishlist,
            itemCount: items.length
          };
        })
      );
      
      res.json(wishlistsWithCounts);
    } catch (error) {
      console.error("Error fetching collaborative wishlists:", error);
      res.status(500).json({ message: "Failed to retrieve collaborative wishlists" });
    }
  });
  
  // Get collaborators for a wishlist
  app.get("/api/wishlists/:id/collaborators", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid wishlist ID" });
      }
      
      // Check if user owns or is a collaborator on this wishlist
      const wishlist = await storage.getWishlistById(id);
      const isOwner = wishlist?.userId === req.session.userId;
      const isCollaborator = await storage.isCollaborator(id, req.session.userId!);
      
      if (!wishlist || (!isOwner && !isCollaborator)) {
        return res.status(403).json({ message: "You don't have access to this wishlist" });
      }
      
      // Get collaborators and add user details
      const collaborators = await storage.getCollaborators(id);
      const collaboratorsWithDetails = await Promise.all(
        collaborators.map(async (collaborator) => {
          const user = await storage.getUser(collaborator.userId);
          return {
            ...collaborator,
            user: user ? {
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl
            } : null
          };
        })
      );
      
      res.json(collaboratorsWithDetails);
    } catch (error) {
      console.error("Error fetching collaborators:", error);
      res.status(500).json({ message: "Failed to retrieve collaborators" });
    }
  });
  
  // Add a collaborator to a wishlist
  app.post("/api/wishlists/:id/collaborators", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const wishlistId = parseInt(req.params.id);
      if (isNaN(wishlistId)) {
        return res.status(400).json({ message: "Invalid wishlist ID" });
      }
      
      // Check that the current user is the owner of the wishlist
      const wishlist = await storage.getWishlistById(wishlistId);
      if (!wishlist || wishlist.userId !== req.session.userId) {
        return res.status(403).json({ message: "You don't have permission to add collaborators to this wishlist" });
      }
      
      // Make sure the wishlist is collaborative
      if (!wishlist.isCollaborative) {
        return res.status(400).json({ message: "This wishlist is not set up for collaboration" });
      }
      
      // Validate request data
      const schema = z.object({
        userId: z.number(),
        role: z.string().optional()
      });
      
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid collaborator data", 
          errors: result.error.format() 
        });
      }
      
      // Check that the target user exists
      const targetUser = await storage.getUser(result.data.userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if the user is already a collaborator
      const isAlreadyCollaborator = await storage.isCollaborator(wishlistId, result.data.userId);
      if (isAlreadyCollaborator) {
        return res.status(400).json({ message: "User is already a collaborator on this wishlist" });
      }
      
      // Add the collaborator
      const collaborator = await storage.addCollaborator({
        wishlistId,
        userId: result.data.userId,
        role: result.data.role || 'editor',
        addedBy: req.session.userId,
        lastActive: new Date()
      });
      
      // Create a notification for the added user
      const addedUser = await storage.getUser(result.data.userId);
      if (addedUser) {
        // Notification for the user who was added to the wishlist
        await storage.createNotification({
          userId: result.data.userId,
          type: "added_as_collaborator",
          title: "Added to Collaborative Wishlist",
          message: `You were added as a ${result.data.role || 'editor'} to the wishlist "${wishlist.name}"`,
          relatedEntityId: wishlistId,
          relatedEntityType: "wishlist",
          isRead: false,
          actionUrl: `/wishlist/${wishlistId}`
        });
      }
      
      res.status(201).json(collaborator);
    } catch (error) {
      console.error("Error adding collaborator:", error);
      res.status(500).json({ message: "Failed to add collaborator" });
    }
  });
  
  // Remove a collaborator from a wishlist
  app.delete("/api/wishlists/:id/collaborators/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const wishlistId = parseInt(req.params.id);
      const collaboratorId = parseInt(req.params.userId);
      
      if (isNaN(wishlistId) || isNaN(collaboratorId)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      // Check that the current user is the owner of the wishlist
      const wishlist = await storage.getWishlistById(wishlistId);
      if (!wishlist || wishlist.userId !== req.session.userId) {
        return res.status(403).json({ message: "You don't have permission to remove collaborators from this wishlist" });
      }
      
      // Remove the collaborator
      const success = await storage.removeCollaborator(wishlistId, collaboratorId);
      if (!success) {
        return res.status(404).json({ message: "Collaborator not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing collaborator:", error);
      res.status(500).json({ message: "Failed to remove collaborator" });
    }
  });
  
  // Update a collaborator's role
  app.patch("/api/wishlists/:id/collaborators/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const wishlistId = parseInt(req.params.id);
      const collaboratorId = parseInt(req.params.userId);
      
      if (isNaN(wishlistId) || isNaN(collaboratorId)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      // Check that the current user is the owner of the wishlist
      const wishlist = await storage.getWishlistById(wishlistId);
      if (!wishlist || wishlist.userId !== req.session.userId) {
        return res.status(403).json({ message: "You don't have permission to update collaborator roles for this wishlist" });
      }
      
      // Validate the role
      const schema = z.object({
        role: z.string()
      });
      
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid role data", 
          errors: result.error.format() 
        });
      }
      
      // Update the collaborator's role
      const updatedCollaborator = await storage.updateCollaboratorRole(wishlistId, collaboratorId, result.data.role);
      if (!updatedCollaborator) {
        return res.status(404).json({ message: "Collaborator not found" });
      }
      
      res.json(updatedCollaborator);
    } catch (error) {
      console.error("Error updating collaborator role:", error);
      res.status(500).json({ message: "Failed to update collaborator role" });
    }
  });
  
  // Update a collaborator's last activity time (used to track who is currently active)
  app.post("/api/wishlists/:id/collaborators/:userId/activity", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const wishlistId = parseInt(req.params.id);
      const collaboratorId = parseInt(req.params.userId);
      
      if (isNaN(wishlistId) || isNaN(collaboratorId)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      // Only the user themselves should update their own activity
      if (collaboratorId !== req.session.userId) {
        return res.status(403).json({ message: "You can only update your own activity status" });
      }
      
      // Make sure the user is a collaborator on this wishlist
      const isCollaborator = await storage.isCollaborator(wishlistId, collaboratorId);
      if (!isCollaborator) {
        return res.status(403).json({ message: "You are not a collaborator on this wishlist" });
      }
      
      // Update the activity timestamp
      const success = await storage.updateCollaboratorActivity(wishlistId, collaboratorId);
      if (!success) {
        return res.status(404).json({ message: "Failed to update activity" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error updating collaborator activity:", error);
      res.status(500).json({ message: "Failed to update collaborator activity" });
    }
  });
  
  // ==================== NOTIFICATIONS ROUTES ====================
  
  // Get AdSense configuration
  app.get("/api/config/adsense", async (_req: Request, res: Response) => {
    try {
      // Provide the AdSense publisher ID from environment variables
      res.json({
        publisherId: process.env.GOOGLE_ADSENSE_PUBLISHER_ID || ''
      });
    } catch (error) {
      console.error("Error fetching AdSense config:", error);
      res.status(500).json({ message: "Failed to retrieve AdSense configuration" });
    }
  });

  // Get recent notifications for the current user
  app.get("/api/notifications", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      // Get recent notifications for the user
      const notifications = await storage.getNotifications(userId, limit);
      
      // Get count of unread notifications
      const unreadCount = await storage.getUnreadNotificationCount(userId);
      
      res.json({ 
        notifications,
        unreadCount
      });
    } catch (error) {
      console.error("Error getting notifications:", error);
      res.status(500).json({ message: "Failed to retrieve notifications" });
    }
  });
  
  // Mark a notification as read
  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid notification ID" });
      }
      
      // Verify ownership of the notification
      const notifications = await storage.getNotifications(req.session.userId!);
      const notification = notifications.find(n => n.id === id);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      const updatedNotification = await storage.markNotificationAsRead(id);
      
      res.json(updatedNotification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });
  
  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      await storage.markAllNotificationsAsRead(userId);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });
  
  // ==================== BROWSER EXTENSION ROUTES ====================
  
  // Legacy extension authentication
  app.get("/api/extension/auth", verifyExtensionAuth);
  
  // Enhanced JWT authentication for extension
  app.post("/api/extension/jwt-auth", async (req, res) => {
    // Import dynamically to avoid circular dependencies
    const { authenticateExtension } = require('./extension-auth');
    await authenticateExtension(req, res);
  });
  
  // Token refresh endpoint for extension
  app.post("/api/extension/refresh-token", async (req, res) => {
    const { refreshExtensionToken } = require('./extension-auth');
    await refreshExtensionToken(req, res);
  });
  
  // Get wishlists for extension (supports both JWT and session auth)
  app.get("/api/extension/wishlists", verifyExtensionJWT, getExtensionWishlists);
  
  // Add item from extension (supports both JWT and session auth)
  app.post("/api/extension/items", verifyExtensionJWT, addItemFromExtension);
  
  // Delete a notification
  app.delete("/api/notifications/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid notification ID" });
      }
      
      // Verify ownership of the notification
      const notifications = await storage.getNotifications(req.session.userId!);
      const notification = notifications.find(n => n.id === id);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      await storage.deleteNotification(id);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });
  
  // Extension download endpoints
  app.get("/extension/download", downloadExtension);
  app.get("/api/extension/metadata", getExtensionMetadata);
  app.post("/api/extension/package", packageExtensions);

  return httpServer;
}
