import { Router, Request, Response } from 'express';
import { affiliateService } from '../services/affiliateService';
import { verifyJWT } from '../middlewares/auth-middleware';
import { storage } from '../storage';

// Firebase-first authenticated request interface
interface AuthenticatedRequest extends Request {
  firebaseUser?: {
    uid: string;
    email?: string;
    displayName?: string;
    emailVerified: boolean;
  };
  userId?: number;
}

const affiliateRouter = Router();

// Convert a single URL to affiliate link
affiliateRouter.post("/convert", verifyJWT, async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: "URL is required" });
    }
    
    const conversion = affiliateService.convertToAffiliateLink(url);
    
    if (!conversion) {
      return res.json({
        success: false,
        message: "No affiliate program available for this URL",
        originalUrl: url
      });
    }
    
    res.json({
      success: true,
      conversion: {
        originalUrl: conversion.originalUrl,
        affiliateUrl: conversion.affiliateUrl,
        program: conversion.program,
        estimatedCommission: conversion.commission
      }
    });
  } catch (error) {
    console.error("Error converting affiliate link:", error);
    res.status(500).json({ error: "Failed to convert affiliate link" });
  }
});

// Batch convert multiple URLs
affiliateRouter.post("/convert-batch", verifyJWT, async (req: Request, res: Response) => {
  try {
    const { urls } = req.body;
    
    if (!Array.isArray(urls)) {
      return res.status(400).json({ error: "URLs must be an array" });
    }
    
    const conversions = affiliateService.batchConvertUrls(urls);
    
    res.json({
      success: true,
      conversions: conversions.map(c => ({
        originalUrl: c.originalUrl,
        success: c.conversion !== null,
        conversion: c.conversion ? {
          affiliateUrl: c.conversion.affiliateUrl,
          program: c.conversion.program,
          estimatedCommission: c.conversion.commission
        } : null
      }))
    });
  } catch (error) {
    console.error("Error batch converting affiliate links:", error);
    res.status(500).json({ error: "Failed to batch convert affiliate links" });
  }
});

// Generate shareable affiliate link
affiliateRouter.post("/share", verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { url } = req.body;
    const userId = req.userId!;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: "URL is required" });
    }
    
    const shareableLink = affiliateService.generateShareableLink(url, userId);
    
    if (!shareableLink) {
      return res.json({
        success: false,
        message: "Cannot create shareable affiliate link for this URL"
      });
    }
    
    res.json({
      success: true,
      shareableLink,
      disclosure: affiliateService.getAffiliateDisclosure()
    });
  } catch (error) {
    console.error("Error generating shareable affiliate link:", error);
    res.status(500).json({ error: "Failed to generate shareable link" });
  }
});

// Track affiliate link click
affiliateRouter.post("/track-click", async (req: Request, res: Response) => {
  try {
    const { originalUrl } = req.body;
    
    if (!originalUrl) {
      return res.status(400).json({ error: "Original URL is required" });
    }
    
    affiliateService.trackClick(originalUrl);
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking affiliate click:", error);
    res.status(500).json({ error: "Failed to track click" });
  }
});

// Get affiliate statistics (admin/analytics)
affiliateRouter.get("/stats", verifyJWT, async (req: Request, res: Response) => {
  try {
    const stats = affiliateService.getAffiliateStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("Error getting affiliate stats:", error);
    res.status(500).json({ error: "Failed to get affiliate statistics" });
  }
});

// Get supported affiliate programs
affiliateRouter.get("/programs", async (req: Request, res: Response) => {
  try {
    const programs = affiliateService.getSupportedPrograms();
    
    res.json({
      success: true,
      programs
    });
  } catch (error) {
    console.error("Error getting affiliate programs:", error);
    res.status(500).json({ error: "Failed to get affiliate programs" });
  }
});

// Check if URL can be converted
affiliateRouter.post("/can-convert", async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }
    
    const canConvert = affiliateService.canConvertUrl(url);
    
    res.json({
      success: true,
      canConvert
    });
  } catch (error) {
    console.error("Error checking URL conversion:", error);
    res.status(500).json({ error: "Failed to check URL conversion" });
  }
});

// Convert all items in a wishlist to affiliate links
affiliateRouter.post("/convert-wishlist", verifyJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { wishlistId } = req.body;
    const userId = req.userId!;
    
    if (!wishlistId) {
      return res.status(400).json({ error: "Wishlist ID is required" });
    }
    
    // Verify user has access to the wishlist
    const wishlist = await storage.getWishlistById(wishlistId);
    if (!wishlist) {
      return res.status(404).json({ error: "Wishlist not found" });
    }
    
    const isOwner = wishlist.userId === userId;
    const isCollaborator = !isOwner && await storage.isCollaborator(wishlistId, userId);
    
    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    // Get all items in the wishlist
    const items = await storage.getWishlistItems(wishlistId);
    
    // Convert URLs to affiliate links
    const results = [];
    let convertedCount = 0;
    
    for (const item of items) {
      if (item.productUrl) {
        const conversion = affiliateService.convertToAffiliateLink(item.productUrl);
        
        if (conversion) {
          // Update the item with the affiliate URL
          const currentMetadata = item.metadata || {};
          await storage.updateWishlistItem(item.id, {
            productUrl: conversion.affiliateUrl,
            metadata: {
              ...currentMetadata,
              affiliateProgram: conversion.program,
              originalUrl: item.productUrl,
              affiliateConversion: {
                timestamp: conversion.timestamp,
                commission: conversion.commission
              }
            }
          });
          
          convertedCount++;
          
          results.push({
            itemId: item.id,
            itemTitle: item.title,
            originalUrl: item.productUrl,
            affiliateUrl: conversion.affiliateUrl,
            program: conversion.program,
            converted: true
          });
        } else {
          results.push({
            itemId: item.id,
            itemTitle: item.title,
            originalUrl: item.productUrl,
            converted: false,
            reason: "No affiliate program available"
          });
        }
      }
    }
    
    res.json({
      success: true,
      wishlistId,
      totalItems: items.length,
      convertedCount,
      results
    });
  } catch (error) {
    console.error("Error converting wishlist to affiliate links:", error);
    res.status(500).json({ error: "Failed to convert wishlist" });
  }
});

// Get revenue estimate for a price and program
affiliateRouter.post("/estimate-revenue", async (req: Request, res: Response) => {
  try {
    const { price, program } = req.body;
    
    if (!price || !program) {
      return res.status(400).json({ error: "Price and program are required" });
    }
    
    const estimatedRevenue = affiliateService.estimateRevenue(
      parseFloat(price),
      program
    );
    
    res.json({
      success: true,
      price: parseFloat(price),
      program,
      estimatedRevenue
    });
  } catch (error) {
    console.error("Error estimating revenue:", error);
    res.status(500).json({ error: "Failed to estimate revenue" });
  }
});

// Get affiliate disclosure text
affiliateRouter.get("/disclosure", async (req: Request, res: Response) => {
  try {
    const disclosure = affiliateService.getAffiliateDisclosure();
    
    res.json({
      success: true,
      disclosure
    });
  } catch (error) {
    console.error("Error getting affiliate disclosure:", error);
    res.status(500).json({ error: "Failed to get affiliate disclosure" });
  }
});

// Auto-convert items as they're added (middleware function)
export const autoConvertAffiliateLinks = async (req: Request, res: Response, next: any) => {
  try {
    // Only process if this is an item creation request with a product URL
    if (req.method === 'POST' && req.body.productUrl) {
      const conversion = affiliateService.convertToAffiliateLink(req.body.productUrl);
      
      if (conversion) {
        // Store original URL and replace with affiliate URL
        const originalUrl = req.body.productUrl;
        req.body.productUrl = conversion.affiliateUrl;
        
        // Add affiliate information to metadata
        const currentMetadata = req.body.metadata || {};
        req.body.metadata = {
          ...currentMetadata,
          affiliateProgram: conversion.program,
          originalUrl: originalUrl,
          autoConverted: true,
          affiliateConversion: {
            timestamp: conversion.timestamp,
            commission: conversion.commission
          }
        };
      }
    }
    
    next();
  } catch (error) {
    console.error("Error in auto-convert affiliate links middleware:", error);
    next(); // Continue even if affiliate conversion fails
  }
};

export default affiliateRouter;