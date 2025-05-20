import { Request, Response } from "express";
import { isAuthenticated } from "../auth";
import { ecommerceService, EcommercePlatform } from "../services/ecommerceIntegrationService";
import { storage } from "../storage";
import { z } from "zod";

// Get supported e-commerce platforms
export async function getSupportedPlatforms(req: Request, res: Response) {
  try {
    const platforms = ecommerceService.getSupportedPlatforms();
    res.json(platforms);
  } catch (error) {
    console.error("Error getting supported platforms:", error);
    res.status(500).json({ message: "Error getting supported platforms", error: error.message });
  }
}

// Search products across e-commerce platforms
export async function searchProducts(req: Request, res: Response) {
  try {
    // Validate request body
    const schema = z.object({
      query: z.string().min(2).max(100),
      platforms: z.array(z.string()).optional(),
      limit: z.number().min(1).max(50).optional().default(10),
    });

    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid request parameters", 
        errors: validationResult.error.format() 
      });
    }

    const { query, platforms, limit } = validationResult.data;
    
    // Convert platforms string array to enum values
    const platformEnums = platforms 
      ? platforms.map(p => p as EcommercePlatform).filter(p => 
          Object.values(EcommercePlatform).includes(p)
        )
      : undefined;

    const products = await ecommerceService.searchProducts(query, platformEnums, limit);
    res.json(products);
  } catch (error) {
    console.error("Error searching products:", error);
    
    // Return a friendly error if platforms aren't configured
    if (error.message === 'No enabled e-commerce platforms to search') {
      return res.status(503).json({ 
        message: "E-commerce platform integration is not configured", 
        error: "Please contact the administrator to set up e-commerce platform integrations."
      });
    }
    
    res.status(500).json({ message: "Error searching products", error: error.message });
  }
}

// Get product data from a product URL
export async function getProductFromUrl(req: Request, res: Response) {
  try {
    // Validate request parameters
    const schema = z.object({
      url: z.string().url(),
    });

    const validationResult = schema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid URL parameter", 
        errors: validationResult.error.format() 
      });
    }

    const { url } = validationResult.data;
    
    const productData = await ecommerceService.getProductDataByUrl(url);
    res.json(productData);
  } catch (error) {
    console.error("Error fetching product data:", error);
    
    // Special handling for specific errors
    if (error.message.includes("integration is not configured")) {
      return res.status(503).json({ 
        message: "E-commerce platform integration is not configured", 
        error: error.message
      });
    }
    
    if (error.message === 'Unsupported e-commerce platform') {
      return res.status(400).json({ 
        message: "Unsupported e-commerce platform", 
        error: "The provided URL is from an unsupported e-commerce platform."
      });
    }
    
    res.status(500).json({ message: "Error fetching product data", error: error.message });
  }
}

// Add a product from a URL directly to a wishlist
export async function addProductToWishlist(req: Request, res: Response) {
  try {
    // Validate request body
    const schema = z.object({
      wishlistId: z.number().int().positive(),
      url: z.string().url(),
      note: z.string().optional(),
    });

    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid request parameters", 
        errors: validationResult.error.format() 
      });
    }

    const { wishlistId, url, note } = validationResult.data;
    
    // Check if wishlist exists and user has permission
    const wishlist = await storage.getWishlistById(wishlistId);
    if (!wishlist) {
      return res.status(404).json({ message: "Wishlist not found" });
    }
    
    // Check if user owns the wishlist or is a collaborator
    const isOwner = wishlist.userId === req.session.userId;
    const isCollaborator = !isOwner 
      ? await storage.isCollaborator(wishlistId, req.session.userId!)
      : false;
    
    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ message: "You don't have permission to add items to this wishlist" });
    }
    
    // Add the product to the wishlist
    const item = await ecommerceService.addItemFromUrl(wishlistId, url, note || '');
    
    // Get user info for notification
    const user = await storage.getUser(req.session.userId!);
    const userName = user?.displayName || user?.username || "Someone";
    
    // If this is a collaborative wishlist, notify collaborators
    if (wishlist.isCollaborative) {
      // Get all collaborators
      const collaborators = await storage.getCollaborators(wishlist.id);
      
      // Notify each collaborator (except the current user)
      for (const collaborator of collaborators) {
        if (collaborator.userId !== req.session.userId) {
          await notificationService.createWishlistActivityNotification(
            collaborator.userId,
            req.session.userId!,
            wishlist.id,
            `added item "${item.title}"`
          );
        }
      }
    }
    
    res.status(201).json(item);
  } catch (error) {
    console.error("Error adding product to wishlist:", error);
    
    // Special handling for specific errors
    if (error.message.includes("integration is not configured")) {
      return res.status(503).json({ 
        message: "E-commerce platform integration is not configured", 
        error: error.message
      });
    }
    
    if (error.message === 'Unsupported e-commerce platform') {
      return res.status(400).json({ 
        message: "Unsupported e-commerce platform", 
        error: "The provided URL is from an unsupported e-commerce platform."
      });
    }
    
    if (error.message === 'Unable to fetch product data from the provided URL') {
      return res.status(400).json({ 
        message: "Unable to fetch product data", 
        error: "Could not extract product information from the provided URL."
      });
    }
    
    res.status(500).json({ message: "Error adding product to wishlist", error: error.message });
  }
}

// Update product pricing for a wishlist item
export async function updateProductPricing(req: Request, res: Response) {
  try {
    // Validate request parameters
    const schema = z.object({
      itemId: z.number().int().positive(),
    });

    const validationResult = schema.safeParse(req.params);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid item ID", 
        errors: validationResult.error.format() 
      });
    }

    const { itemId } = validationResult.data;
    
    // Check if item exists
    const item = await storage.getWishlistItem(Number(itemId));
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    // Check if user has permission to update this item
    const wishlist = await storage.getWishlistById(item.wishlistId);
    if (!wishlist) {
      return res.status(404).json({ message: "Associated wishlist not found" });
    }
    
    const isOwner = wishlist.userId === req.session.userId;
    const isCollaborator = !isOwner 
      ? await storage.isCollaborator(wishlist.id, req.session.userId!)
      : false;
    
    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ message: "You don't have permission to update this item" });
    }
    
    // Update the product pricing
    const updatedItem = await ecommerceService.updateProductPricing(Number(itemId));
    
    res.json(updatedItem);
  } catch (error) {
    console.error("Error updating product pricing:", error);
    res.status(500).json({ message: "Error updating product pricing", error: error.message });
  }
}

// Generate an affiliate link for a product URL
export async function getAffiliateLink(req: Request, res: Response) {
  try {
    // Validate request parameters
    const schema = z.object({
      url: z.string().url(),
    });

    const validationResult = schema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid URL parameter", 
        errors: validationResult.error.format() 
      });
    }

    const { url } = validationResult.data;
    
    const affiliateLink = ecommerceService.createAffiliateLink(url as string);
    res.json({ originalUrl: url, affiliateUrl: affiliateLink });
  } catch (error) {
    console.error("Error creating affiliate link:", error);
    res.status(500).json({ message: "Error creating affiliate link", error: error.message });
  }
}

// Register e-commerce routes
export function registerEcommerceRoutes(app: any) {
  // Import notification service here to avoid circular dependency
  const { notificationService } = require("../services/notificationService");
  
  // Get supported platforms (public endpoint)
  app.get("/api/ecommerce/platforms", getSupportedPlatforms);
  
  // Search products across platforms
  app.post("/api/ecommerce/search", isAuthenticated, searchProducts);
  
  // Get product data from URL
  app.get("/api/ecommerce/product", isAuthenticated, getProductFromUrl);
  
  // Add product to wishlist
  app.post("/api/ecommerce/add-to-wishlist", isAuthenticated, addProductToWishlist);
  
  // Update product pricing
  app.patch("/api/ecommerce/items/:itemId/pricing", isAuthenticated, updateProductPricing);
  
  // Get affiliate link
  app.get("/api/ecommerce/affiliate-link", isAuthenticated, getAffiliateLink);
}