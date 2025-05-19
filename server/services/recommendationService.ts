import OpenAI from "openai";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { wishlistItems, wishlists } from "@shared/schema";

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
}

/**
 * Get personalized product recommendations based on user's wishlist items
 * @param userId The user ID to get recommendations for
 * @param limit Maximum number of recommendations to return
 * @returns Array of recommended products
 */
export async function getRecommendationsForUser(userId: number, limit = 5): Promise<RecommendedProduct[]> {
  try {
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
    const recommendations = await generateRecommendationsWithAI(userProfile, items, limit);
    
    return recommendations;
  } catch (error) {
    console.error('Error getting recommendations:', error);
    throw new Error('Failed to generate recommendations');
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
      
      Return the results as a JSON array with these fields: title, productUrl, imageUrl, price, store, description, relevanceScore, matchReason.
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
  if (userProfile.topCategories.includes('Electronics')) {
    recommendations.push({
      title: 'Wireless Noise Cancelling Headphones',
      imageUrl: 'https://example.com/headphones.jpg',
      price: `$${Math.round(userProfile.averagePrice * 0.9)}`,
      productUrl: 'https://example.com/headphones',
      store: userProfile.preferredStores[0] || 'Amazon',
      description: 'Premium wireless headphones with active noise cancellation and long battery life.',
      relevanceScore: 85,
      matchReason: 'Based on your interest in electronics and similar price range.'
    });
  }
  
  if (userProfile.topCategories.includes('Clothing')) {
    recommendations.push({
      title: 'Premium Cotton T-Shirt',
      imageUrl: 'https://example.com/tshirt.jpg',
      price: `$${Math.round(userProfile.averagePrice * 0.4)}`,
      productUrl: 'https://example.com/tshirt',
      store: userProfile.preferredStores[0] || 'Gap',
      description: 'Soft, comfortable cotton t-shirt available in multiple colors.',
      relevanceScore: 80,
      matchReason: 'Matches your clothing preferences at a similar price point.'
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
      matchReason: 'Popular choice that complements your existing wishlist items.'
    });
    
    recommendations.push({
      title: 'Smart Water Bottle',
      imageUrl: 'https://example.com/bottle.jpg',
      price: '$29.99',
      productUrl: 'https://example.com/bottle',
      store: 'FitnessGear',
      description: 'Tracks your hydration and reminds you when to drink water.',
      relevanceScore: 60,
      matchReason: 'Useful everyday item that complements your lifestyle.'
    });
  }
  
  return recommendations.slice(0, limit);
}