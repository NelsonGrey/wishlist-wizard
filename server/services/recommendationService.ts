import { db } from "../db";
import { users, beneficiaries, wishlists, wishlistItems, userPreferences, recommendations, InsertRecommendation } from "@shared/schema";
import { eq, and, not, isNull, desc, sql } from "drizzle-orm";
import { IStorage } from "../storage";

export class RecommendationService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Generate personalized recommendations for a user
   */
  async generateRecommendationsForUser(userId: number): Promise<boolean> {
    try {
      // Get user preferences
      const userPrefs = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, userId)
      });

      // Get user's past interactions with items
      const userWishlists = await db.query.wishlists.findMany({
        where: eq(wishlists.userId, userId),
        with: {
          items: true
        }
      });

      // Flatten the items from all wishlists
      const userItems = userWishlists.flatMap(wishlist => wishlist.items || []);

      // Extract categories and brands that the user has shown interest in
      const userCategories = new Set(userItems
        .filter(item => item.category)
        .map(item => item.category));

      const userBrands = new Set(userItems
        .filter(item => item.brand)
        .map(item => item.brand));

      // Get the user's beneficiaries
      const userBeneficiaries = await db.query.beneficiaries.findMany({
        where: eq(beneficiaries.ownerId, userId)
      });

      // Generate recommendations for each beneficiary
      for (const beneficiary of userBeneficiaries) {
        // Get beneficiary's wishlists
        const beneficiaryWishlists = await db.query.wishlists.findMany({
          where: eq(wishlists.beneficiaryId, beneficiary.id)
        });

        for (const wishlist of beneficiaryWishlists) {
          // Generate recommendations based on similar users
          await this.generateSimilarUserRecommendations(userId, beneficiary.id, wishlist.id);
          
          // Generate popularity-based recommendations
          await this.generatePopularityRecommendations(userId, beneficiary.id, wishlist.id, 
            Array.from(userCategories), Array.from(userBrands));
        }
      }

      // Generate general recommendations for the user (not beneficiary-specific)
      await this.generateGeneralRecommendations(userId, userPrefs);

      return true;
    } catch (error) {
      console.error("Error generating recommendations:", error);
      return false;
    }
  }

  /**
   * Generate recommendations based on similar users
   */
  private async generateSimilarUserRecommendations(
    userId: number, 
    beneficiaryId: number, 
    wishlistId: number
  ): Promise<void> {
    // Find users with similar tastes
    const similarUsers = await this.findSimilarUsers(userId);
    
    // Get items from similar users that might be relevant
    const recommendedItems = await this.getItemsFromSimilarUsers(similarUsers, userId);
    
    // Convert to recommendations and save
    for (const item of recommendedItems.slice(0, 5)) { // Limit to 5 recommendations
      const recommendation: InsertRecommendation = {
        userId,
        targetBeneficiaryId: beneficiaryId,
        targetWishlistId: wishlistId,
        itemTitle: item.title,
        itemDescription: `Similar users have this item on their wishlists`,
        imageUrl: item.imageUrl,
        productUrl: item.productUrl,
        price: item.price,
        store: item.store,
        category: item.category,
        confidence: 0.85, // High confidence for similar user recommendations
        reasoningText: "Other users with similar tastes have added this item to their wishlists",
        source: "similar_users",
        metadata: {
          originalItemId: item.id,
          similarityScore: item.similarityScore
        }
      };
      
      await db.insert(recommendations).values(recommendation);
    }
  }

  /**
   * Generate recommendations based on item popularity
   */
  private async generatePopularityRecommendations(
    userId: number, 
    beneficiaryId: number, 
    wishlistId: number,
    userCategories: string[],
    userBrands: string[]
  ): Promise<void> {
    // Find popular items in categories the user is interested in
    const popularItems = await db.query.wishlistItems.findMany({
      where: sql`${wishlistItems.category} IN (${userCategories.join(',')}) OR ${wishlistItems.brand} IN (${userBrands.join(',')})`,
      orderBy: [desc(wishlistItems.popularity)]
    });
    
    // Convert to recommendations and save
    for (const item of popularItems.slice(0, 5)) { // Limit to 5 recommendations
      const recommendation: InsertRecommendation = {
        userId,
        targetBeneficiaryId: beneficiaryId,
        targetWishlistId: wishlistId,
        itemTitle: item.title,
        itemDescription: `Popular item with other users`,
        imageUrl: item.imageUrl,
        productUrl: item.productUrl,
        price: item.price,
        store: item.store,
        category: item.category,
        confidence: 0.7, // Medium confidence for popularity-based recommendations
        reasoningText: "This is a popular item in categories you've shown interest in",
        source: "popularity",
        metadata: {
          originalItemId: item.id,
          popularityScore: item.popularity
        }
      };
      
      await db.insert(recommendations).values(recommendation);
    }
  }

  /**
   * Generate general recommendations based on user preferences
   */
  private async generateGeneralRecommendations(userId: number, userPrefs: any): Promise<void> {
    if (!userPrefs) return;
    
    // Extract preferences
    const favoriteCategories = userPrefs.favoriteCategories || [];
    const favoriteBrands = userPrefs.favoriteBrands || [];
    
    // Find items matching preferences
    const matchingItems = await db.query.wishlistItems.findMany({
      where: sql`
        (${wishlistItems.category} IN (${favoriteCategories.join(',')}) OR 
        ${wishlistItems.brand} IN (${favoriteBrands.join(',')})) AND
        ${wishlistItems.purchasedByUserId} IS NULL
      `,
      orderBy: [desc(wishlistItems.createdAt)]
    });
    
    // Convert to recommendations
    for (const item of matchingItems.slice(0, 3)) { // Limit to 3 general recommendations
      const recommendation: InsertRecommendation = {
        userId,
        targetBeneficiaryId: null,
        targetWishlistId: null,
        itemTitle: item.title,
        itemDescription: `Matches your preferences`,
        imageUrl: item.imageUrl,
        productUrl: item.productUrl,
        price: item.price,
        store: item.store,
        category: item.category,
        confidence: 0.6, // Lower confidence for general recommendations
        reasoningText: "This matches categories and brands you've marked as favorites",
        source: "user_preferences",
        metadata: {
          originalItemId: item.id
        }
      };
      
      await db.insert(recommendations).values(recommendation);
    }
  }

  /**
   * Find users with similar tastes
   */
  private async findSimilarUsers(userId: number): Promise<number[]> {
    // Get all wishlists for the user
    const userWishlists = await db.query.wishlists.findMany({
      where: eq(wishlists.userId, userId),
      with: {
        items: true
      }
    });
    
    // Get unique categories and brands from user's items
    const userItems = userWishlists.flatMap(wishlist => wishlist.items || []);
    const userCategories = new Set(userItems.filter(item => item.category).map(item => item.category));
    const userBrands = new Set(userItems.filter(item => item.brand).map(item => item.brand));
    
    // Find users with similar items
    const similarUsers = await db.query.users.findMany({
      where: not(eq(users.id, userId)),
      with: {
        wishlists: {
          with: {
            items: true
          }
        }
      }
    });
    
    // Calculate similarity scores
    const userSimilarityScores = similarUsers.map(user => {
      const userItems = user.wishlists.flatMap(wishlist => wishlist.items || []);
      const userItemCategories = new Set(userItems.filter(item => item.category).map(item => item.category));
      const userItemBrands = new Set(userItems.filter(item => item.brand).map(item => item.brand));
      
      // Calculate Jaccard similarity for categories and brands
      const categoryIntersection = new Set([...userCategories].filter(x => userItemCategories.has(x))).size;
      const categoryUnion = new Set([...userCategories, ...userItemCategories]).size;
      
      const brandIntersection = new Set([...userBrands].filter(x => userItemBrands.has(x))).size;
      const brandUnion = new Set([...userBrands, ...userItemBrands]).size;
      
      const categorySimilarity = categoryUnion > 0 ? categoryIntersection / categoryUnion : 0;
      const brandSimilarity = brandUnion > 0 ? brandIntersection / brandUnion : 0;
      
      // Combined similarity score (weighted)
      const similarityScore = (categorySimilarity * 0.7) + (brandSimilarity * 0.3);
      
      return {
        userId: user.id,
        similarityScore
      };
    });
    
    // Sort by similarity and take top 5
    const topSimilarUsers = userSimilarityScores
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 5)
      .map(user => user.userId);
    
    return topSimilarUsers;
  }

  /**
   * Get items from similar users that might be relevant
   */
  private async getItemsFromSimilarUsers(similarUserIds: number[], currentUserId: number): Promise<any[]> {
    // Get items from similar users' wishlists
    const items = [];
    
    for (const userId of similarUserIds) {
      const userWishlists = await db.query.wishlists.findMany({
        where: eq(wishlists.userId, userId),
        with: {
          items: true
        }
      });
      
      const userItems = userWishlists.flatMap(wishlist => wishlist.items || []);
      
      // Add all items with similarity score
      const similarityScore = similarUserIds.indexOf(userId) / similarUserIds.length;
      items.push(...userItems.map(item => ({
        ...item,
        similarityScore: 1 - similarityScore // Higher score for more similar users
      })));
    }
    
    // Deduplicate items by URL
    const uniqueItems = [];
    const urlSet = new Set();
    
    for (const item of items) {
      if (!urlSet.has(item.productUrl)) {
        urlSet.add(item.productUrl);
        uniqueItems.push(item);
      }
    }
    
    return uniqueItems;
  }

  /**
   * Get recommendations for a user
   */
  async getUserRecommendations(userId: number, limit: number = 10): Promise<any[]> {
    // Query recommendations for the user
    const userRecommendations = await db.query.recommendations.findMany({
      where: and(
        eq(recommendations.userId, userId),
        eq(recommendations.isRejected, false)
      ),
      orderBy: [
        desc(recommendations.confidence),
        desc(recommendations.createdAt)
      ],
      limit
    });
    
    return userRecommendations;
  }

  /**
   * Get recommendations for a specific beneficiary
   */
  async getBeneficiaryRecommendations(userId: number, beneficiaryId: number, limit: number = 10): Promise<any[]> {
    // Query recommendations for the beneficiary
    const beneficiaryRecommendations = await db.query.recommendations.findMany({
      where: and(
        eq(recommendations.userId, userId),
        eq(recommendations.targetBeneficiaryId, beneficiaryId),
        eq(recommendations.isRejected, false)
      ),
      orderBy: [
        desc(recommendations.confidence),
        desc(recommendations.createdAt)
      ],
      limit
    });
    
    return beneficiaryRecommendations;
  }

  /**
   * Save a recommendation as a wishlist item
   */
  async saveRecommendationToWishlist(recommendationId: number): Promise<number | null> {
    // Get the recommendation
    const recommendation = await db.query.recommendations.findFirst({
      where: eq(recommendations.id, recommendationId)
    });
    
    if (!recommendation || !recommendation.targetWishlistId) return null;
    
    // Create a wishlist item from the recommendation
    const newItem = {
      wishlistId: recommendation.targetWishlistId,
      title: recommendation.itemTitle,
      price: recommendation.price || "Unknown price",
      imageUrl: recommendation.imageUrl || "",
      productUrl: recommendation.productUrl || "",
      store: recommendation.store || "Unknown store",
      note: recommendation.itemDescription || "",
      category: recommendation.category,
      brand: null,
      numericPrice: null,
      metadata: { source: "recommendation", recommendationId: recommendation.id }
    };
    
    // Save the item to the database
    const [createdItem] = await db.insert(wishlistItems).values(newItem).returning({ id: wishlistItems.id });
    
    // Mark the recommendation as saved
    await db.update(recommendations)
      .set({ isSaved: true })
      .where(eq(recommendations.id, recommendationId));
    
    return createdItem?.id || null;
  }

  /**
   * Reject a recommendation
   */
  async rejectRecommendation(recommendationId: number): Promise<boolean> {
    // Mark the recommendation as rejected
    const result = await db.update(recommendations)
      .set({ isRejected: true })
      .where(eq(recommendations.id, recommendationId));
    
    return result.rowCount > 0;
  }

  /**
   * Mark a recommendation as viewed
   */
  async markRecommendationAsViewed(recommendationId: number): Promise<boolean> {
    // Mark the recommendation as viewed
    const result = await db.update(recommendations)
      .set({ isViewed: true })
      .where(eq(recommendations.id, recommendationId));
    
    return result.rowCount > 0;
  }
}