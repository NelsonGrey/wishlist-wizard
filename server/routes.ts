import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertWishlistSchema, 
  insertWishlistItemSchema,
  insertBeneficiarySchema 
} from "@shared/schema";
import { z } from "zod";
import { register, login, logout, getCurrentUser, isAuthenticated } from "./auth";
import { initializeSessionTable } from "./session";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize session table if using database storage
  await initializeSessionTable();
  
  // Authentication routes
  app.post("/api/auth/register", register);
  app.post("/api/auth/login", login);
  app.post("/api/auth/logout", logout);
  app.get("/api/auth/me", getCurrentUser);

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

  return httpServer;
}
