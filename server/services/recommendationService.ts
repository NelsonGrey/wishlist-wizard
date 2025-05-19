import OpenAI from "openai";
import { db } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import { 
  wishlistItems, 
  wishlists, 
  recommendations,
  users,
  beneficiaries,
  insertRecommendationSchema
} from "@shared/schema";

// Initialize the OpenAI client
// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface RecommendedProduct {
  title: string;
  imageUrl: string;
  price: string;
  productUrl: string;
  store: string;
  description: string;
  relevanceScore: number; // 0-100 score indicating how relevant this recommendation is
  matchReason: string; // Brief explanation of why this was recommended
  category?: string;
}

interface RecommendationWithMetadata extends RecommendedProduct {
  id?: number;
  userId: number;
  isViewed?: boolean;
  isSaved?: boolean;
  isRejected?: boolean;
  createdAt?: Date;
  targetWishlistId?: number | null;
}

/**
 * Get personalized product recommendations based on user's wishlist items
 * @param userId The user ID to get recommendations for
 * @param limit Maximum number of recommendations to return
 * @returns Array of recommended products
 */
export async function getRecommendationsForUser(userId: number, limit = 5): Promise<RecommendationWithMetadata[]> {
  try {
    // First, check if we have recent recommendations in the database
    const existingRecommendations = await db
      .select()
      .from(recommendations)
      .where(
        and(
          eq(recommendations.userId, userId),
          eq(recommendations.isRejected, false)
        )
      )
      .orderBy(desc(recommendations.createdAt))
      .limit(limit);

    // If we have enough recent recommendations, return those
    if (existingRecommendations.length >= limit) {
      console.log(`Found ${existingRecommendations.length} existing recommendations for user ${userId}`);
      
      return existingRecommendations.map(rec => ({
        id: rec.id,
        userId: rec.userId,
        title: rec.itemTitle,
        imageUrl: rec.imageUrl || '',
        price: rec.price || '',
        productUrl: rec.productUrl || '',
        store: rec.store || '',
        description: rec.itemDescription || '',
        relevanceScore: rec.confidence ? parseFloat(rec.confidence.toString()) * 100 : 70,
        matchReason: rec.reasoningText || 'Based on your preferences',
        category: rec.category || '',
        isViewed: rec.isViewed,
        isSaved: rec.isSaved,
        isRejected: rec.isRejected,
        createdAt: rec.createdAt,
        targetWishlistId: rec.targetWishlistId
      }));
    }

    // Get all of the user's wishlist IDs
    const userWishlists = await db
      .select({ id: wishlists.id })
      .from(wishlists)
      .where(eq(wishlists.userId, userId));

    const wishlistIds = userWishlists.map(wl => wl.id);

    if (wishlistIds.length === 0) {
      return []; // User has no wishlists
    }

    // Get the user's wishlist items
    const items = await db
      .select({
        title: wishlistItems.title,
        price: wishlistItems.price,
        store: wishlistItems.store,
        category: wishlistItems.category,
        brand: wishlistItems.brand,
        metadata: wishlistItems.metadata
      })
      .from(wishlistItems)
      .where(
        wishlistIds.length === 1 
          ? eq(wishlistItems.wishlistId, wishlistIds[0])
          : wishlistItems.wishlistId.in(wishlistIds)
      )
      .limit(20); // Limit to recent items to analyze

    if (items.length === 0) {
      return []; // No items in wishlists
    }

    // Create a user profile based on wishlist items
    const userProfile = analyzeWishlistItems(items);

    // Get recommendations based on the user profile using AI
    const aiRecommendations = await generateRecommendationsWithAI(userProfile, items, limit);
    
    // Store the new recommendations in the database
    const savedRecommendations = await saveRecommendations(userId, aiRecommendations);
    
    return savedRecommendations;
  } catch (error) {
    console.error('Error getting recommendations:', error);
    throw new Error('Failed to generate recommendations');
  }
}

/**
 * Save generated recommendations to the database
 */
async function saveRecommendations(
  userId: number, 
  generatedRecommendations: RecommendedProduct[]
): Promise<RecommendationWithMetadata[]> {
  const savedRecommendations: RecommendationWithMetadata[] = [];
  
  // Get the default target wishlist (first wishlist of the user)
  const [defaultWishlist] = await db
    .select({ id: wishlists.id })
    .from(wishlists)
    .where(eq(wishlists.userId, userId))
    .limit(1);
    
  const defaultWishlistId = defaultWishlist?.id || null;
  
  for (const rec of generatedRecommendations) {
    try {
      // Convert confidence from 0-100 scale to 0-1 scale for database
      const confidence = rec.relevanceScore / 100;
      
      // Create new recommendation in database
      const [savedRec] = await db.insert(recommendations)
        .values({
          userId,
          targetWishlistId: defaultWishlistId,
          itemTitle: rec.title,
          itemDescription: rec.description,
          imageUrl: rec.imageUrl,
          productUrl: rec.productUrl,
          price: rec.price,
          store: rec.store,
          category: rec.category || null,
          confidence: confidence.toString(),
          reasoningText: rec.matchReason,
          source: 'ai',
          isViewed: false,
          isSaved: false,
          isRejected: false,
          metadata: JSON.stringify({
            generatedAt: new Date().toISOString(),
            originalScore: rec.relevanceScore
          })
        })
        .returning();
        
      savedRecommendations.push({
        id: savedRec.id,
        userId: savedRec.userId,
        title: savedRec.itemTitle,
        imageUrl: savedRec.imageUrl || '',
        price: savedRec.price || '',
        productUrl: savedRec.productUrl || '',
        store: savedRec.store || '',
        description: savedRec.itemDescription || '',
        relevanceScore: confidence * 100,
        matchReason: savedRec.reasoningText || '',
        category: savedRec.category || '',
        isViewed: savedRec.isViewed,
        isSaved: savedRec.isSaved,
        isRejected: savedRec.isRejected,
        createdAt: savedRec.createdAt,
        targetWishlistId: savedRec.targetWishlistId
      });
    } catch (error) {
      console.error('Error saving recommendation:', error);
      // Continue with other recommendations even if one fails
    }
  }
  
  return savedRecommendations;
}

/**
 * Get recommendations targeting a specific beneficiary
 */
export async function getRecommendationsForBeneficiary(
  userId: number,
  beneficiaryId: number,
  limit = 5
): Promise<RecommendationWithMetadata[]> {
  try {
    // Check if the user has access to this beneficiary
    const [beneficiary] = await db
      .select()
      .from(beneficiaries)
      .where(
        and(
          eq(beneficiaries.id, beneficiaryId),
          eq(beneficiaries.userId, userId)
        )
      );
      
    if (!beneficiary) {
      throw new Error('Beneficiary not found or access denied');
    }
    
    // Get existing recommendations for this beneficiary
    const existingRecommendations = await db
      .select()
      .from(recommendations)
      .where(
        and(
          eq(recommendations.userId, userId),
          eq(recommendations.targetBeneficiaryId, beneficiaryId),
          eq(recommendations.isRejected, false)
        )
      )
      .orderBy(desc(recommendations.createdAt))
      .limit(limit);
      
    if (existingRecommendations.length >= limit) {
      // Return existing recommendations
      return existingRecommendations.map(rec => ({
        id: rec.id,
        userId: rec.userId,
        title: rec.itemTitle,
        imageUrl: rec.imageUrl || '',
        price: rec.price || '',
        productUrl: rec.productUrl || '',
        store: rec.store || '',
        description: rec.itemDescription || '',
        relevanceScore: rec.confidence ? parseFloat(rec.confidence.toString()) * 100 : 70,
        matchReason: rec.reasoningText || 'Based on your preferences',
        category: rec.category || '',
        isViewed: rec.isViewed,
        isSaved: rec.isSaved,
        isRejected: rec.isRejected,
        createdAt: rec.createdAt,
        targetWishlistId: rec.targetWishlistId
      }));
    }
    
    // Get the beneficiary's wishlists
    const beneficiaryWishlists = await db
      .select()
      .from(wishlists)
      .where(eq(wishlists.beneficiaryId, beneficiaryId));
      
    const wishlistIds = beneficiaryWishlists.map(wl => wl.id);
    
    // Get items from those wishlists
    const items = await db
      .select()
      .from(wishlistItems)
      .where(
        wishlistIds.length === 1
          ? eq(wishlistItems.wishlistId, wishlistIds[0])
          : wishlistItems.wishlistId.in(wishlistIds)
      )
      .limit(20);
      
    if (items.length === 0 && existingRecommendations.length === 0) {
      // Generate generic gift recommendations based on beneficiary info
      return generateGenericGiftRecommendations(beneficiary, limit)
        .then(genericRecs => saveRecommendationsForBeneficiary(userId, beneficiaryId, genericRecs));
    }
    
    // Analyze the items and generate AI recommendations
    const userProfile = analyzeWishlistItems(items);
    const aiRecommendations = await generateRecommendationsWithAI(userProfile, items, limit);
    
    // Save and return the recommendations
    return saveRecommendationsForBeneficiary(userId, beneficiaryId, aiRecommendations);
  } catch (error) {
    console.error('Error getting recommendations for beneficiary:', error);
    throw new Error('Failed to generate recommendations for beneficiary');
  }
}

/**
 * Save recommendations for a specific beneficiary
 */
async function saveRecommendationsForBeneficiary(
  userId: number,
  beneficiaryId: number,
  generatedRecommendations: RecommendedProduct[]
): Promise<RecommendationWithMetadata[]> {
  const savedRecommendations: RecommendationWithMetadata[] = [];
  
  // Get the default target wishlist for this beneficiary
  const [defaultWishlist] = await db
    .select({ id: wishlists.id })
    .from(wishlists)
    .where(eq(wishlists.beneficiaryId, beneficiaryId))
    .limit(1);
    
  const defaultWishlistId = defaultWishlist?.id || null;
  
  for (const rec of generatedRecommendations) {
    try {
      // Convert confidence from 0-100 scale to 0-1 scale for database
      const confidence = rec.relevanceScore / 100;
      
      // Create new recommendation in database
      const [savedRec] = await db.insert(recommendations)
        .values({
          userId,
          targetBeneficiaryId: beneficiaryId,
          targetWishlistId: defaultWishlistId,
          itemTitle: rec.title,
          itemDescription: rec.description,
          imageUrl: rec.imageUrl,
          productUrl: rec.productUrl,
          price: rec.price,
          store: rec.store,
          category: rec.category || null,
          confidence: confidence.toString(),
          reasoningText: rec.matchReason,
          source: 'ai',
          isViewed: false,
          isSaved: false,
          isRejected: false,
          metadata: JSON.stringify({
            generatedAt: new Date().toISOString(),
            originalScore: rec.relevanceScore,
            forBeneficiary: true
          })
        })
        .returning();
        
      savedRecommendations.push({
        id: savedRec.id,
        userId: savedRec.userId,
        title: savedRec.itemTitle,
        imageUrl: savedRec.imageUrl || '',
        price: savedRec.price || '',
        productUrl: savedRec.productUrl || '',
        store: savedRec.store || '',
        description: savedRec.itemDescription || '',
        relevanceScore: confidence * 100,
        matchReason: savedRec.reasoningText || '',
        category: savedRec.category || '',
        isViewed: savedRec.isViewed,
        isSaved: savedRec.isSaved,
        isRejected: savedRec.isRejected,
        createdAt: savedRec.createdAt,
        targetWishlistId: savedRec.targetWishlistId
      });
    } catch (error) {
      console.error('Error saving recommendation for beneficiary:', error);
      // Continue with other recommendations even if one fails
    }
  }
  
  return savedRecommendations;
}

/**
 * Generate generic gift recommendations for a beneficiary with little data
 */
async function generateGenericGiftRecommendations(
  beneficiary: any,
  limit: number
): Promise<RecommendedProduct[]> {
  try {
    // Create a prompt based on the beneficiary information
    const prompt = `
      I need gift ideas for someone named ${beneficiary.name}. I don't have much information about their preferences.
      
      Please suggest ${limit} gift ideas that would be appropriate for most people. Include a variety of price points and categories.
      
      For each gift idea, include:
      1. A product title
      2. A product URL (can be fictional but realistic looking)
      3. An image URL (can be fictional but realistic looking)
      4. A reasonable price
      5. A store where this might be purchased
      6. A brief description
      7. A relevance score from 0-100
      8. A brief reason why this would make a good gift
      
      Return the results as a JSON array with these fields: title, productUrl, imageUrl, price, store, description, relevanceScore, matchReason, category.
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a gift recommendation assistant that helps people find good gift ideas." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });
    
    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error("No content in OpenAI response");
    }
    
    try {
      const data = JSON.parse(content);
      return data.recommendations || [];
    } catch (error) {
      console.error("Error parsing OpenAI response for generic recommendations:", error);
      return generateBasicRecommendations({}, [], limit);
    }
  } catch (error) {
    console.error("Error generating generic gift recommendations:", error);
    return generateBasicRecommendations({}, [], limit);
  }
}

/**
 * Mark a recommendation as viewed, saved, or rejected
 */
export async function updateRecommendationStatus(
  recommendationId: number,
  userId: number,
  status: { isViewed?: boolean, isSaved?: boolean, isRejected?: boolean }
): Promise<boolean> {
  try {
    // Verify the recommendation belongs to the user
    const [recommendation] = await db
      .select()
      .from(recommendations)
      .where(
        and(
          eq(recommendations.id, recommendationId),
          eq(recommendations.userId, userId)
        )
      );
      
    if (!recommendation) {
      return false;
    }
    
    // Update the recommendation status
    await db.update(recommendations)
      .set(status)
      .where(eq(recommendations.id, recommendationId));
      
    return true;
  } catch (error) {
    console.error('Error updating recommendation status:', error);
    return false;
  }
}

/**
 * Analyze wishlist items to create a user profile
 */
function analyzeWishlistItems(items: any[]): any {
  // Extract categories, brands, price ranges, etc.
  const categories = {};
  const brands = {};
  const stores = {};
  let totalPrice = 0;
  
  items.forEach(item => {
    // Count categories
    if (item.category) {
      categories[item.category] = (categories[item.category] || 0) + 1;
    }
    
    // Count brands
    if (item.brand) {
      brands[item.brand] = (brands[item.brand] || 0) + 1;
    }
    
    // Count stores
    if (item.store) {
      stores[item.store] = (stores[item.store] || 0) + 1;
    }
    
    // Add to total price for average calculation
    if (item.price) {
      const numericPrice = parseFloat(item.price.replace(/[^0-9.]/g, ''));
      if (!isNaN(numericPrice)) {
        totalPrice += numericPrice;
      }
    }
  });
  
  // Calculate average price
  const averagePrice = items.length > 0 ? totalPrice / items.length : 0;
  
  // Sort categories, brands, etc. by frequency
  const sortedCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);
    
  const sortedBrands = Object.entries(brands)
    .sort((a, b) => b[1] - a[1])
    .map(([brand]) => brand);
    
  const sortedStores = Object.entries(stores)
    .sort((a, b) => b[1] - a[1])
    .map(([store]) => store);
  
  return {
    topCategories: sortedCategories.slice(0, 5),
    topBrands: sortedBrands.slice(0, 5),
    preferredStores: sortedStores.slice(0, 3),
    averagePrice,
    itemCount: items.length
  };
}

/**
 * Generate product recommendations using OpenAI API
 */
async function generateRecommendationsWithAI(
  userProfile: any, 
  existingItems: any[], 
  limit: number
): Promise<RecommendedProduct[]> {
  try {
    // Create a prompt for the AI to generate recommendations
    const existingTitles = existingItems.map(item => item.title);
    const existingBrands = existingItems
      .filter(item => item.brand)
      .map(item => item.brand);
      
    const itemDescriptions = existingItems.map(item => 
      `- ${item.title}${item.brand ? ` by ${item.brand}` : ''}${item.price ? ` (${item.price})` : ''}`
    ).join('\n');
    
    const prompt = `
      I need to recommend products to a user based on their wishlist. Here's what I know about their preferences:
      
      Top product categories: ${userProfile.topCategories.join(', ') || 'Not enough data'}
      Preferred brands: ${userProfile.topBrands.join(', ') || 'Not enough data'}
      Preferred stores: ${userProfile.preferredStores.join(', ') || 'Various online stores'}
      Average price point: $${userProfile.averagePrice.toFixed(2)}
      
      Their current wishlist items include:
      ${itemDescriptions}
      
      Please recommend ${limit} products that would appeal to this user based on their preferences. The recommendations should be different from what they already have, but complementary or similar in style/theme/function.
      
      For each product, include:
      1. A realistic product title
      2. A plausible product URL (can be fictional but realistic looking)
      3. An image URL (can be fictional but realistic looking)
      4. A realistic price that aligns with their average spending
      5. A store name that aligns with their preferences
      6. A brief description of the product
      7. A relevance score from 0-100 indicating how well this matches their preferences
      8. A brief reason why this product would appeal to them
      9. A category for the product (e.g., Electronics, Clothing, Home Decor, etc.)
      
      Return the results as a JSON array with these fields: title, productUrl, imageUrl, price, store, description, relevanceScore, matchReason, category.
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // The newest OpenAI model
      messages: [
        { role: "system", content: "You are a personalized shopping recommendation assistant that helps users discover products they might like based on their preferences." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });
    
    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error("No content in OpenAI response");
    }
    
    try {
      const data = JSON.parse(content);
      return data.recommendations || [];
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      console.log("Raw response:", content);
      throw new Error("Failed to parse AI recommendations");
    }
  } catch (error) {
    console.error("Error generating AI recommendations:", error);
    // Fallback to simpler recommendations if AI fails
    return generateBasicRecommendations(userProfile, existingItems, limit);
  }
}

/**
 * Generate basic recommendations without AI as a fallback
 */
function generateBasicRecommendations(
  userProfile: any, 
  existingItems: any[], 
  limit: number
): RecommendedProduct[] {
  const recommendations: RecommendedProduct[] = [];
  
  // Create some basic recommendations based on categories and price points
  if (userProfile.topCategories?.includes('Electronics')) {
    recommendations.push({
      title: 'Wireless Noise Cancelling Headphones',
      imageUrl: 'https://example.com/headphones.jpg',
      price: `$${Math.round((userProfile.averagePrice || 50) * 0.9)}`,
      productUrl: 'https://example.com/headphones',
      store: userProfile.preferredStores?.[0] || 'Amazon',
      description: 'Premium wireless headphones with active noise cancellation and long battery life.',
      relevanceScore: 85,
      matchReason: 'Based on your interest in electronics and similar price range.',
      category: 'Electronics'
    });
  }
  
  if (userProfile.topCategories?.includes('Clothing')) {
    recommendations.push({
      title: 'Premium Cotton T-Shirt',
      imageUrl: 'https://example.com/tshirt.jpg',
      price: `$${Math.round((userProfile.averagePrice || 30) * 0.4)}`,
      productUrl: 'https://example.com/tshirt',
      store: userProfile.preferredStores?.[0] || 'Gap',
      description: 'Soft, comfortable cotton t-shirt available in multiple colors.',
      relevanceScore: 80,
      matchReason: 'Matches your clothing preferences at a similar price point.',
      category: 'Clothing'
    });
  }
  
  // Generic recommendations if we don't have enough data
  if (recommendations.length < limit) {
    recommendations.push({
      title: 'Bestselling Novel',
      imageUrl: 'https://example.com/book.jpg',
      price: '$14.99',
      productUrl: 'https://example.com/book',
      store: 'BookStore',
      description: 'Award-winning bestseller that has captivated readers worldwide.',
      relevanceScore: 65,
      matchReason: 'Popular choice that complements your existing wishlist items.',
      category: 'Books'
    });
    
    recommendations.push({
      title: 'Smart Water Bottle',
      imageUrl: 'https://example.com/bottle.jpg',
      price: '$29.99',
      productUrl: 'https://example.com/bottle',
      store: 'FitnessGear',
      description: 'Tracks your hydration and reminds you when to drink water.',
      relevanceScore: 60,
      matchReason: 'Useful everyday item that complements your lifestyle.',
      category: 'Fitness'
    });
    
    recommendations.push({
      title: 'Portable Bluetooth Speaker',
      imageUrl: 'https://example.com/speaker.jpg',
      price: '$39.99',
      productUrl: 'https://example.com/speaker',
      store: 'ElectronicsStore',
      description: 'Compact, waterproof speaker with impressive sound quality.',
      relevanceScore: 70,
      matchReason: 'Versatile gadget that enhances everyday activities.',
      category: 'Electronics'
    });
    
    recommendations.push({
      title: 'Gourmet Chocolate Gift Box',
      imageUrl: 'https://example.com/chocolate.jpg',
      price: '$24.99',
      productUrl: 'https://example.com/chocolate',
      store: 'GourmetFood',
      description: 'Assortment of premium chocolates from around the world.',
      relevanceScore: 55,
      matchReason: 'Popular gift item with universal appeal.',
      category: 'Food & Drink'
    });
  }
  
  return recommendations.slice(0, limit);
}