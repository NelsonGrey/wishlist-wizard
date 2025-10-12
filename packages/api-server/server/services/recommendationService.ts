import OpenAI from "openai";
import { db } from "../db";
import { eq, and, desc, sql, gte, inArray } from "drizzle-orm";
import { 
  wishlistItems, 
  wishlists, 
  recommendations,
  users,
  beneficiaries,
  insertRecommendationSchema
} from "@wishlist-wizard/shared";

// Initialize the OpenAI client conditionally
// The newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
let openai: OpenAI | null = null;

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
  console.warn('⚠️  OpenAI API key not found. AI recommendations will be disabled.');
}

// Rate limiting and cost controls
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

interface CostTrackingEntry {
  userId: number;
  tokens: number;
  cost: number;
  timestamp: number;
  model: string;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

class RecommendationCache {
  private cache: Map<string, CacheEntry> = new Map();
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private costTracking: CostTrackingEntry[] = [];
  
  // Configuration
  private readonly MAX_REQUESTS_PER_USER_HOUR = 10;
  private readonly MAX_REQUESTS_PER_USER_DAY = 50;
  private readonly CACHE_TTL_HOURS = 6; // Cache recommendations for 6 hours
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
  private readonly MAX_COST_PER_USER_DAY = 1.00; // $1.00 per user per day
  private readonly COST_TRACKING_RETENTION_HOURS = 24; // Keep cost data for 24 hours
  
  constructor() {
    // Periodic cleanup of expired entries
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }
  
  /**
   * Check if user has exceeded rate limits
   */
  checkRateLimit(userId: number): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const hourlyKey = `${userId}:hour:${Math.floor(now / (60 * 60 * 1000))}`;
    const dailyKey = `${userId}:day:${Math.floor(now / (24 * 60 * 60 * 1000))}`;
    
    const hourlyEntry = this.rateLimits.get(hourlyKey);
    const dailyEntry = this.rateLimits.get(dailyKey);
    
    // Check hourly limit
    if (hourlyEntry && hourlyEntry.count >= this.MAX_REQUESTS_PER_USER_HOUR) {
      return { 
        allowed: false, 
        reason: `Rate limit exceeded: ${this.MAX_REQUESTS_PER_USER_HOUR} requests per hour` 
      };
    }
    
    // Check daily limit
    if (dailyEntry && dailyEntry.count >= this.MAX_REQUESTS_PER_USER_DAY) {
      return { 
        allowed: false, 
        reason: `Rate limit exceeded: ${this.MAX_REQUESTS_PER_USER_DAY} requests per day` 
      };
    }
    
    // Check cost limit
    const dailyCost = this.getUserDailyCost(userId);
    if (dailyCost >= this.MAX_COST_PER_USER_DAY) {
      return {
        allowed: false,
        reason: `Cost limit exceeded: $${this.MAX_COST_PER_USER_DAY.toFixed(2)} per day`
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Check if user has exceeded cost limits
   */
  checkCostLimit(userId: number): { allowed: boolean; currentCost: number; limit: number } {
    const currentCost = this.getUserDailyCost(userId);
    return {
      allowed: currentCost < this.MAX_COST_PER_USER_DAY,
      currentCost,
      limit: this.MAX_COST_PER_USER_DAY
    };
  }
  
  /**
   * Get user's daily cost
   */
  getUserDailyCost(userId: number): number {
    const now = Date.now();
    const dayStart = new Date(now).setHours(0, 0, 0, 0);
    
    return this.costTracking
      .filter(entry => 
        entry.userId === userId && 
        entry.timestamp >= dayStart
      )
      .reduce((total, entry) => total + entry.cost, 0);
  }
  
  /**
   * Track API cost for a user
   */
  trackCost(userId: number, tokens: number, model: string = 'gpt-4o'): void {
    // Estimate cost based on model and tokens
    // GPT-4o pricing: $2.50 per 1M input tokens, $10.00 per 1M output tokens
    // Using average of $6.25 per 1M tokens for estimation
    const costPerMillionTokens = 6.25;
    const estimatedCost = (tokens / 1000000) * costPerMillionTokens;
    
    this.costTracking.push({
      userId,
      tokens,
      cost: estimatedCost,
      timestamp: Date.now(),
      model
    });
    
    // Clean up old cost tracking data
    this.cleanupCostTracking();
  }
  
  /**
   * Record a request for rate limiting
   */
  recordRequest(userId: number): void {
    const now = Date.now();
    const hourlyKey = `${userId}:hour:${Math.floor(now / (60 * 60 * 1000))}`;
    const dailyKey = `${userId}:day:${Math.floor(now / (24 * 60 * 60 * 1000))}`;
    
    // Update hourly count
    const hourlyEntry = this.rateLimits.get(hourlyKey) || { count: 0, resetTime: now + 60 * 60 * 1000 };
    hourlyEntry.count++;
    this.rateLimits.set(hourlyKey, hourlyEntry);
    
    // Update daily count
    const dailyEntry = this.rateLimits.get(dailyKey) || { count: 0, resetTime: now + 24 * 60 * 60 * 1000 };
    dailyEntry.count++;
    this.rateLimits.set(dailyKey, dailyEntry);
  }
  
  /**
   * Get cached recommendations
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  /**
   * Cache recommendations
   */
  set(key: string, data: any, ttlHours?: number): void {
    const ttl = (ttlHours || this.CACHE_TTL_HOURS) * 60 * 60 * 1000;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    
    // Clean cache
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
      }
    }
    
    // Clean rate limits
    for (const [key, entry] of this.rateLimits.entries()) {
      if (now > entry.resetTime) {
        this.rateLimits.delete(key);
      }
    }
    
    // Clean cost tracking
    this.cleanupCostTracking();
  }
  
  /**
   * Clean up old cost tracking data
   */
  private cleanupCostTracking(): void {
    const cutoffTime = Date.now() - (this.COST_TRACKING_RETENTION_HOURS * 60 * 60 * 1000);
    this.costTracking = this.costTracking.filter(entry => entry.timestamp >= cutoffTime);
  }
  
  /**
   * Generate cache key for user recommendations
   */
  generateUserKey(userId: number, limit: number): string {
    return `user:${userId}:limit:${limit}`;
  }
  
  /**
   * Generate cache key for beneficiary recommendations
   */
  generateBeneficiaryKey(userId: number, beneficiaryId: number, limit: number): string {
    return `beneficiary:${userId}:${beneficiaryId}:limit:${limit}`;
  }
  
  /**
   * Get usage statistics for a user
   */
  getUserStats(userId: number): {
    requestsToday: number;
    requestsThisHour: number;
    costToday: number;
    costLimit: number;
  } {
    const now = Date.now();
    const hourStart = Math.floor(now / (60 * 60 * 1000));
    const dayStart = Math.floor(now / (24 * 60 * 60 * 1000));
    
    const hourlyKey = `${userId}:hour:${hourStart}`;
    const dailyKey = `${userId}:day:${dayStart}`;
    
    const hourlyEntry = this.rateLimits.get(hourlyKey);
    const dailyEntry = this.rateLimits.get(dailyKey);
    
    return {
      requestsToday: dailyEntry?.count || 0,
      requestsThisHour: hourlyEntry?.count || 0,
      costToday: this.getUserDailyCost(userId),
      costLimit: this.MAX_COST_PER_USER_DAY
    };
  }
}

// Circuit breaker for OpenAI API calls
class CircuitBreaker {
  private state: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: 'CLOSED'
  };
  
  private readonly FAILURE_THRESHOLD = 5; // Open circuit after 5 failures
  private readonly TIMEOUT_MS = 60000; // 1 minute timeout
  private readonly RESET_TIMEOUT_MS = 300000; // 5 minutes before trying again
  
  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state.state === 'OPEN') {
      if (Date.now() - this.state.lastFailureTime > this.RESET_TIMEOUT_MS) {
        this.state.state = 'HALF_OPEN';
        console.log('Circuit breaker: Moving to HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN - OpenAI API temporarily unavailable');
      }
    }
    
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Circuit breaker timeout')), this.TIMEOUT_MS)
        )
      ]);
      
      // Success - reset failure count
      if (this.state.state === 'HALF_OPEN') {
        this.state.state = 'CLOSED';
        this.state.failures = 0;
        console.log('Circuit breaker: Recovered, moving to CLOSED state');
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  /**
   * Record a failure
   */
  private recordFailure(): void {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();
    
    if (this.state.failures >= this.FAILURE_THRESHOLD) {
      this.state.state = 'OPEN';
      console.warn(`Circuit breaker: OPEN after ${this.state.failures} failures`);
    }
  }
  
  /**
   * Get current circuit breaker status
   */
  getStatus(): CircuitBreakerState {
    return { ...this.state };
  }
}

// Global instances
const cache = new RecommendationCache();
const circuitBreaker = new CircuitBreaker();

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
    // Check rate limits
    const rateLimitCheck = cache.checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      console.warn(`Rate limit exceeded for user ${userId}: ${rateLimitCheck.reason}`);
      // Return cached or database recommendations instead of generating new ones
      return await getCachedOrStoredRecommendations(userId, limit);
    }

    // Check cache first
    const cacheKey = cache.generateUserKey(userId, limit);
    const cachedRecommendations = cache.get(cacheKey);
    if (cachedRecommendations) {
      console.log(`Returning cached recommendations for user ${userId}`);
      return cachedRecommendations;
    }

    // Check if we have recent recommendations in the database
    const existingRecommendations = await db!
      .select()
      .from(recommendations)
      .where(
        and(
          eq(recommendations.userId, userId),
          eq(recommendations.isRejected, false),
          gte(recommendations.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
        )
      )
      .orderBy(desc(recommendations.createdAt))
      .limit(limit);

    // If we have enough recent recommendations, return and cache those
    if (existingRecommendations.length >= limit) {
      console.log(`Found ${existingRecommendations.length} existing recommendations for user ${userId}`);
      
      const formattedRecommendations = existingRecommendations.map((rec: any) => ({
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

      // Cache the recommendations
      cache.set(cacheKey, formattedRecommendations);
      return formattedRecommendations;
    }

    // Record the API request for rate limiting
    cache.recordRequest(userId);
    
    // Get all of the user's wishlist IDs
    const userWishlists = await db!
      .select({ id: wishlists.id })
      .from(wishlists)
      .where(eq(wishlists.userId, userId));

    const wishlistIds = userWishlists.map((wl: any) => wl.id);

    if (wishlistIds.length === 0) {
      // Return empty array but cache it to avoid repeated calls
      cache.set(cacheKey, []);
      return [];
    }

    // Get the user's wishlist items
    const items = await db!
      .select({
        title: wishlistItems.title,
        price: wishlistItems.price,
        store: wishlistItems.store,
        category: wishlistItems.category,
        brand: wishlistItems.brand,
        metadata: wishlistItems.metadata
      })
      .from(wishlistItems)
      .where(eq(wishlistItems.wishlistId, wishlistIds[0])) // Use first wishlist for now
      .limit(20); // Limit to recent items to analyze

    if (items.length === 0) {
      // Generate generic recommendations for new users
      const genericRecommendations = generateBasicRecommendations({}, [], limit);
      const savedRecommendations = await saveRecommendations(userId, genericRecommendations);
      cache.set(cacheKey, savedRecommendations);
      return savedRecommendations;
    }

    // Create a user profile based on wishlist items
    const userProfile = analyzeWishlistItems(items);

    // Get recommendations based on the user profile using AI
    const aiRecommendations = await generateRecommendationsWithAI(userProfile, items, limit);
    
    // Store the new recommendations in the database
    const savedRecommendations = await saveRecommendations(userId, aiRecommendations);
    
    // Cache the results
    cache.set(cacheKey, savedRecommendations);
    
    return savedRecommendations;
  } catch (error) {
    console.error('Error getting recommendations:', error);
    
    // Fallback: try to return cached or stored recommendations
    try {
      return await getCachedOrStoredRecommendations(userId, limit);
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      // Return basic recommendations as last resort
      const basicRecs = generateBasicGiftRecommendations({ name: 'User', relationship: 'self' }, limit);
      return basicRecs.map((rec: RecommendedProduct) => ({
        ...rec,
        userId,
        isViewed: false,
        isSaved: false,
        isRejected: false,
        createdAt: new Date(),
        targetWishlistId: null
      }));
    }
  }
}

/**
 * Get cached or stored recommendations as a fallback
 */
async function getCachedOrStoredRecommendations(userId: number, limit: number): Promise<RecommendationWithMetadata[]> {
  // First try cache
  const cacheKey = cache.generateUserKey(userId, limit);
  const cachedRecommendations = cache.get(cacheKey);
  if (cachedRecommendations) {
    return cachedRecommendations;
  }

  // Then try database (expand time window)
  try {
    const storedRecommendations = await db!
      .select()
      .from(recommendations)
      .where(
        and(
          eq(recommendations.userId, userId),
          eq(recommendations.isRejected, false),
          gte(recommendations.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
        )
      )
      .orderBy(desc(recommendations.createdAt))
      .limit(limit);

    if (storedRecommendations.length > 0) {
      const formattedRecommendations = storedRecommendations.map((rec: any) => ({
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

      // Cache for future use
      cache.set(cacheKey, formattedRecommendations, 1); // Short cache for fallback
      return formattedRecommendations;
    }
  } catch (error) {
    console.error('Error getting stored recommendations:', error);
  }

  // Last resort: return empty array
  return [];
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
          eq(beneficiaries.ownerId, userId)
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
      return existingRecommendations.map((rec: any) => ({
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
      
    const wishlistIds = beneficiaryWishlists.map((wl: any) => wl.id);
    
    // Get items from those wishlists
    const items = await db
      .select()
      .from(wishlistItems)
      .where(
        wishlistIds.length === 1
          ? eq(wishlistItems.wishlistId, wishlistIds[0])
          : inArray(wishlistItems.wishlistId, wishlistIds)
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
    // Create an enhanced prompt based on beneficiary information and relationship context
    const relationshipContext = beneficiary.relationship || 'friend/family';
    const ageRange = beneficiary.ageRange || 'adult';
    const interests = beneficiary.interests || 'general interests';
    const occasion = beneficiary.nextOccasion || 'general gifting';

    const prompt = `
      I need thoughtful gift recommendations for ${beneficiary.name}, who is my ${relationshipContext}.
      They are in the ${ageRange} age range and have interests in: ${interests}.
      The occasion is: ${occasion}.

      Please suggest ${limit} personalized gift ideas that would be meaningful and appreciated. Consider:
      - Their relationship to me (${relationshipContext})
      - Their age group (${ageRange})
      - Their interests (${interests})
      - The occasion (${occasion})
      - Appropriate price range for the relationship and occasion

      Focus on gifts that show thoughtfulness and consideration rather than generic items.

      For each gift idea, provide:
      1. A specific product title
      2. A realistic product URL (use actual retailer domains like amazon.com, target.com, etc.)
      3. A realistic image URL (use actual product image URLs or placeholder services)
      4. A reasonable price appropriate for the relationship
      5. A real store or retailer name
      6. A detailed description explaining why this would be a good gift
      7. A relevance score from 70-95 (higher for more personalized gifts)
      8. A specific reason why this gift matches their profile and relationship

      Return as JSON with a "recommendations" array containing exactly ${limit} objects with fields: title, productUrl, imageUrl, price, store, description, relevanceScore, matchReason, category.

      Examples of good gifts based on relationship:
      - For family: Personalized items, comfort items, shared experience gifts
      - For friends: Fun, trendy items, hobby-related gifts, inside joke items
      - For colleagues: Professional but personal items, desk accessories, coffee/tea related
      - For romantic partners: Sentimental items, experience gifts, luxury items
    `;

    const response = await openai!.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert gift recommender who creates thoughtful, personalized gift suggestions based on relationship context, interests, and occasions. Always return valid JSON." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8, // Higher creativity for gift ideas
      max_tokens: 2500
    });

    const content = response.choices[0].message.content;

    if (!content) {
      throw new Error("No content in OpenAI response");
    }

    try {
      const data = JSON.parse(content);
      const recommendations = data.recommendations || [];

      // Validate and enhance the recommendations
      const validRecommendations = recommendations
        .filter((rec: any) => rec.title && rec.price)
        .slice(0, limit)
        .map((rec: any) => ({
          title: String(rec.title).substring(0, 200),
          imageUrl: String(rec.imageUrl || rec.image || 'https://via.placeholder.com/300x300'),
          price: String(rec.price),
          productUrl: String(rec.productUrl || rec.url || 'https://example.com/product'),
          store: String(rec.store || 'Online Store'),
          description: String(rec.description || '').substring(0, 500),
          relevanceScore: Math.min(95, Math.max(70, Number(rec.relevanceScore) || 80)),
          matchReason: String(rec.matchReason || rec.reason || `Thoughtful gift for ${beneficiary.name} based on their ${relationshipContext} relationship`),
          category: String(rec.category || 'Gifts')
        }));

      if (validRecommendations.length === 0) {
        throw new Error("No valid gift recommendations generated");
      }

      console.log(`Generated ${validRecommendations.length} personalized gift recommendations for ${beneficiary.name}`);
      return validRecommendations;

    } catch (error) {
      console.error("Error parsing OpenAI response for generic recommendations:", error);
      return generateBasicGiftRecommendations(beneficiary, limit);
    }
  } catch (error) {
    console.error("Error generating generic gift recommendations:", error);
    return generateBasicGiftRecommendations(beneficiary, limit);
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
  const categories: Record<string, number> = {};
  const brands: Record<string, number> = {};
  const stores: Record<string, number> = {};
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
    .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
    .map(([category]) => category);
    
  const sortedBrands = Object.entries(brands)
    .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
    .map(([brand]) => brand);
    
  const sortedStores = Object.entries(stores)
    .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
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
 * Create a structured prompt for AI recommendations
 */
function createRecommendationPrompt(userProfile: any, existingItems: any[], limit: number): string {
  const existingTitles = existingItems.map(item => item.title);
  const existingBrands = existingItems
    .filter(item => item.brand)
    .map(item => item.brand);
    
  const itemDescriptions = existingItems.map(item => 
    `- ${item.title}${item.brand ? ` by ${item.brand}` : ''}${item.price ? ` (${item.price})` : ''}`
  ).join('\n');
  
  return `I need to recommend ${limit} products to a user based on their wishlist. Here's what I know about their preferences:

Top product categories: ${userProfile.topCategories?.join(', ') || 'Not enough data'}
Preferred brands: ${userProfile.topBrands?.join(', ') || 'Not enough data'}
Preferred stores: ${userProfile.preferredStores?.join(', ') || 'Various online stores'}
Average price point: $${userProfile.averagePrice?.toFixed(2) || '50.00'}

Their current wishlist items include:
${itemDescriptions || 'No items yet'}

Please recommend exactly ${limit} products that would appeal to this user based on their preferences. The recommendations should be different from what they already have, but complementary or similar in style/theme/function.

IMPORTANT: Return the response as a JSON object with a "recommendations" array containing exactly ${limit} objects, each with these fields:
- title: A realistic product title
- productUrl: A plausible product URL (use actual retailer domains)
- imageUrl: A plausible image URL (can be placeholder but realistic)
- price: A realistic price string (e.g., "$29.99")
- store: A store name that exists
- description: A brief product description
- relevanceScore: A number from 50-95 indicating relevance
- matchReason: A brief explanation of why this was recommended
- category: A product category (e.g., "Electronics", "Clothing", "Home & Garden")`;
}

/**
 * Generate product recommendations using OpenAI API with enhanced error handling and cost controls
 */
async function generateRecommendationsWithAI(
  userProfile: any, 
  existingItems: any[], 
  limit: number,
  userId?: number
): Promise<RecommendedProduct[]> {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second base delay
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Generating AI recommendations (attempt ${attempt}/${maxRetries})`);
      
      // Use circuit breaker to protect against API failures
      const aiResponse = await circuitBreaker.execute(async () => {
        const prompt = createRecommendationPrompt(userProfile, existingItems, limit);
        
        // Create promise with timeout
        const aiPromise = openai!.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are a personalized shopping recommendation assistant. Always return valid JSON with the exact structure requested." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: 2000, // Limit tokens to control costs
        });
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('OpenAI request timeout')), 30000);
        });
        
        return await Promise.race([aiPromise, timeoutPromise]) as any;
      });
      
      const content = aiResponse.choices[0].message.content;
      
      if (!content) {
        throw new Error("No content in OpenAI response");
      }
      
      // Track cost if userId provided
      if (userId && aiResponse.usage) {
        cache.trackCost(userId, aiResponse.usage.total_tokens || 0, 'gpt-4o');
      }
      
      try {
        const data = JSON.parse(content);
        const recommendations = data.recommendations || data.products || [];
        
        if (!Array.isArray(recommendations)) {
          throw new Error("AI response is not an array");
        }
        
        // Validate and clean up recommendations
        const validRecommendations = recommendations
          .filter((rec: any) => rec.title && rec.price)
          .slice(0, limit)
          .map((rec: any) => ({
            title: String(rec.title).substring(0, 200),
            imageUrl: String(rec.imageUrl || rec.image || 'https://via.placeholder.com/300x300'),
            price: String(rec.price),
            productUrl: String(rec.productUrl || rec.url || 'https://example.com/product'),
            store: String(rec.store || 'Online Store'),
            description: String(rec.description || '').substring(0, 500),
            relevanceScore: Math.min(95, Math.max(50, Number(rec.relevanceScore) || 70)),
            matchReason: String(rec.matchReason || rec.reason || 'Based on your preferences'),
            category: String(rec.category || 'General')
          }));
        
        if (validRecommendations.length === 0) {
          throw new Error("No valid recommendations from AI");
        }
        
        console.log(`Successfully generated ${validRecommendations.length} AI recommendations`);
        return validRecommendations;
        
      } catch (parseError) {
        console.error("Error parsing OpenAI response:", parseError);
        console.log("Raw response:", content);
        
        if (attempt === maxRetries) {
          throw new Error("Failed to parse AI recommendations after retries");
        }
        // Continue to retry
      }
      
    } catch (error: any) {
      console.error(`AI recommendation attempt ${attempt} failed:`, error.message);
      
      // Check if it's a rate limit or quota error
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        console.warn('OpenAI rate limit or quota exceeded, using fallback immediately');
        return generateBasicGiftRecommendations({ name: 'User', relationship: 'self' }, limit);
      }
      
      if (attempt === maxRetries) {
        console.log("All AI attempts failed, falling back to basic recommendations");
        return generateBasicGiftRecommendations({ name: 'User', relationship: 'self' }, limit);
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.log(`Waiting ${Math.round(delay)}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached, but just in case
  return generateBasicGiftRecommendations({ name: 'User', relationship: 'self' }, limit);
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

/**
 * Generate basic gift recommendations as a fallback when AI fails
 */
function generateBasicGiftRecommendations(
  beneficiary: any,
  limit: number
): RecommendedProduct[] {
  const relationshipContext = beneficiary.relationship || 'friend';
  const recommendations: RecommendedProduct[] = [];

  // Relationship-based gift recommendations
  if (relationshipContext.includes('family') || relationshipContext.includes('parent')) {
    recommendations.push({
      title: 'Personalized Photo Frame',
      imageUrl: 'https://example.com/photo-frame.jpg',
      price: '$24.99',
      productUrl: 'https://example.com/photo-frame',
      store: 'Bed Bath & Beyond',
      description: 'Beautiful wooden photo frame perfect for displaying family memories.',
      relevanceScore: 85,
      matchReason: `Thoughtful family gift that shows you care about ${beneficiary.name}'s memories.`,
      category: 'Home & Garden'
    });
  }

  if (relationshipContext.includes('friend') || relationshipContext.includes('best friend')) {
    recommendations.push({
      title: 'Gourmet Coffee Sampler',
      imageUrl: 'https://example.com/coffee-sampler.jpg',
      price: '$34.99',
      productUrl: 'https://example.com/coffee-sampler',
      store: 'Williams Sonoma',
      description: 'Assortment of premium coffees from around the world for the coffee lover.',
      relevanceScore: 80,
      matchReason: `Fun and delicious gift for ${beneficiary.name} to enjoy their favorite beverage.`,
      category: 'Food & Drink'
    });
  }

  if (relationshipContext.includes('romantic') || relationshipContext.includes('partner')) {
    recommendations.push({
      title: 'Scented Candle Gift Set',
      imageUrl: 'https://example.com/candle-set.jpg',
      price: '$39.99',
      productUrl: 'https://example.com/candle-set',
      store: 'Bath & Body Works',
      description: 'Luxurious scented candles in romantic fragrances to create a cozy atmosphere.',
      relevanceScore: 88,
      matchReason: `Romantic and thoughtful gift to help ${beneficiary.name} relax and feel special.`,
      category: 'Home & Garden'
    });
  }

  // Generic thoughtful gifts
  if (recommendations.length < limit) {
    recommendations.push({
      title: 'Wireless Charging Pad',
      imageUrl: 'https://example.com/charger.jpg',
      price: '$19.99',
      productUrl: 'https://example.com/charger',
      store: 'Amazon',
      description: 'Convenient wireless charger compatible with most smartphones.',
      relevanceScore: 75,
      matchReason: `Practical tech gift that ${beneficiary.name} will use every day.`,
      category: 'Electronics'
    });

    recommendations.push({
      title: 'Premium Notebook Set',
      imageUrl: 'https://example.com/notebook.jpg',
      price: '$16.99',
      productUrl: 'https://example.com/notebook',
      store: 'Paper Source',
      description: 'High-quality notebooks and journals for writing, planning, or creativity.',
      relevanceScore: 70,
      matchReason: `Versatile gift for ${beneficiary.name}'s organizational or creative needs.`,
      category: 'Office Supplies'
    });

    recommendations.push({
      title: 'Bluetooth Wireless Earbuds',
      imageUrl: 'https://example.com/earbuds.jpg',
      price: '$49.99',
      productUrl: 'https://example.com/earbuds',
      store: 'Best Buy',
      description: 'Comfortable wireless earbuds with good sound quality for music and calls.',
      relevanceScore: 78,
      matchReason: `Modern tech gift that enhances ${beneficiary.name}'s daily audio experience.`,
      category: 'Electronics'
    });
  }

  return recommendations.slice(0, limit);
}