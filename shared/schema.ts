import { pgTable, text, serial, integer, boolean, timestamp, varchar, primaryKey, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
export type { InferSelectModel } from 'drizzle-orm';

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  role: text("role").default("user").notNull(), // 'user', 'admin', 'moderator'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  verificationToken: text("verification_token"),
  verificationExpires: timestamp("verification_expires"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  active: boolean("active").default(true).notNull(),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  twoFactorSecret: text("two_factor_secret"),
});

export const usersRelations = relations(users, ({ many }) => ({
  beneficiaries: many(beneficiaries),
  wishlists: many(wishlists)
}));

// Beneficiaries are people (like children) for whom a user can manage wishlists
export const beneficiaries = pgTable("beneficiaries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id").notNull().references(() => users.id), // User who manages this beneficiary
  relationship: text("relationship"), // e.g., "Child", "Parent", "Friend"
  birthdate: timestamp("birthdate"), // Optional for age-appropriate gifts
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const beneficiariesRelations = relations(beneficiaries, ({ one, many }) => ({
  owner: one(users, {
    fields: [beneficiaries.ownerId],
    references: [users.id]
  }),
  wishlists: many(wishlists)
}));

export const wishlists = pgTable("wishlists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").notNull(), // The user who created & manages the wishlist
  beneficiaryId: integer("beneficiary_id").references(() => beneficiaries.id), // Optional - if set, this list is for the beneficiary
  shareId: varchar("share_id", { length: 36 }).notNull().unique(),
  isPublic: boolean("is_public").default(false).notNull(), // Make accessible to the public without login
  isCollaborative: boolean("is_collaborative").default(false).notNull(), // Allow collaborative editing
  createdAt: timestamp("created_at").defaultNow().notNull(),
  occasion: text("occasion"), // e.g., "Birthday", "Christmas", "Baby Shower"
  occasionDate: timestamp("occasion_date"), // When the event is happening
  description: text("description"), // Additional description for the wishlist
});

// Table for wishlist collaborators (for group gifting)
export const wishlistCollaborators = pgTable("wishlist_collaborators", {
  id: serial("id").primaryKey(),
  wishlistId: integer("wishlist_id").notNull().references(() => wishlists.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role").default("editor").notNull(), // "editor", "viewer", etc.
  addedAt: timestamp("added_at").defaultNow().notNull(),
  addedBy: integer("added_by").references(() => users.id), // Who added this collaborator
  lastActive: timestamp("last_active"), // When they last interacted with the wishlist
}, (table) => {
  return {
    // Unique constraint to prevent duplicate collaborators
    unique_collaborator: primaryKey({ columns: [table.wishlistId, table.userId] }),
  }
});

export const wishlistsRelations = relations(wishlists, ({ one, many }) => ({
  owner: one(users, {
    fields: [wishlists.userId],
    references: [users.id]
  }),
  beneficiary: one(beneficiaries, {
    fields: [wishlists.beneficiaryId],
    references: [beneficiaries.id]
  }),
  items: many(wishlistItems),
  collaborators: many(wishlistCollaborators)
}));

export const wishlistCollaboratorsRelations = relations(wishlistCollaborators, ({ one }) => ({
  wishlist: one(wishlists, {
    fields: [wishlistCollaborators.wishlistId],
    references: [wishlists.id]
  }),
  user: one(users, {
    fields: [wishlistCollaborators.userId],
    references: [users.id]
  }),
  addedByUser: one(users, {
    fields: [wishlistCollaborators.addedBy],
    references: [users.id]
  })
}));

export const wishlistItems = pgTable("wishlist_items", {
  id: serial("id").primaryKey(),
  wishlistId: integer("wishlist_id").notNull().references(() => wishlists.id),
  title: text("title").notNull(),
  price: text("price").notNull(),
  numericPrice: decimal("numeric_price", { precision: 10, scale: 2 }), // For price tracking and comparisons
  imageUrl: text("image_url").notNull(),
  productUrl: text("product_url").notNull(),
  store: text("store").notNull(),
  note: text("note"),
  category: text("category"), // For better recommendation and categorization
  brand: text("brand"), // For brand recognition and filtering
  priceHistory: jsonb("price_history").default('[]'), // To track price changes over time
  metadata: jsonb("metadata").default('{}'), // For additional product data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reservedByUserId: integer("reserved_by_user_id").references(() => users.id), // Optional - when someone intends to purchase the item
  reservedAt: timestamp("reserved_at"), // When the item was reserved
  purchasedByUserId: integer("purchased_by_user_id").references(() => users.id), // Optional - when someone has purchased the item
  purchasedAt: timestamp("purchased_at"), // When the item was marked as purchased
  popularity: integer("popularity").default(0), // For recommendation algorithms
  productIdentifier: text("product_identifier"), // SKU, ASIN, or other product identifier
});

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  wishlist: one(wishlists, {
    fields: [wishlistItems.wishlistId],
    references: [wishlists.id]
  }),
  reservedBy: one(users, {
    fields: [wishlistItems.reservedByUserId],
    references: [users.id]
  }),
  purchasedBy: one(users, {
    fields: [wishlistItems.purchasedByUserId],
    references: [users.id]
  })
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true, 
  createdAt: true 
});

// Partial schema for fields that can be updated
export const updateUserSchema = insertUserSchema.partial();

export const insertBeneficiarySchema = createInsertSchema(beneficiaries).pick({
  name: true,
  ownerId: true,
  relationship: true,
  birthdate: true,
  notes: true,
});

export const insertWishlistSchema = createInsertSchema(wishlists).pick({
  name: true,
  userId: true,
  shareId: true,
  beneficiaryId: true,
  isPublic: true,
  isCollaborative: true,
  occasion: true,
  occasionDate: true,
  description: true,
});

export const insertWishlistCollaboratorSchema = createInsertSchema(wishlistCollaborators).pick({
  wishlistId: true,
  userId: true,
  role: true,
  addedBy: true,
  lastActive: true,
});

export const insertWishlistItemSchema = createInsertSchema(wishlistItems).pick({
  wishlistId: true,
  title: true,
  price: true,
  imageUrl: true,
  productUrl: true,
  store: true,
  note: true,
  reservedByUserId: true,
  purchasedByUserId: true,
  purchasedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertBeneficiary = z.infer<typeof insertBeneficiarySchema>;
export type Beneficiary = typeof beneficiaries.$inferSelect;

export type InsertWishlist = z.infer<typeof insertWishlistSchema>;
export type Wishlist = typeof wishlists.$inferSelect;

// Notifications table to track activities in the system
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // e.g., "wishlist_updated", "item_added", "collaborator_added"
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedEntityId: integer("related_entity_id"), // ID of the related wishlist, item, etc.
  relatedEntityType: text("related_entity_type"), // "wishlist", "item", "collaborator", etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  actionUrl: text("action_url"), // URL to direct users to when they click on the notification
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  })
}));

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  type: true,
  title: true,
  message: true,
  relatedEntityId: true,
  relatedEntityType: true,
  isRead: true,
  actionUrl: true,
});

export type InsertWishlistCollaborator = z.infer<typeof insertWishlistCollaboratorSchema>;
export type WishlistCollaborator = typeof wishlistCollaborators.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;
export type WishlistItem = typeof wishlistItems.$inferSelect;

// Price tracking table
export const priceAlerts = pgTable("price_alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  itemId: integer("item_id").notNull().references(() => wishlistItems.id),
  targetPrice: decimal("target_price", { precision: 10, scale: 2 }).notNull(),
  notified: boolean("notified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

export const priceAlertsRelations = relations(priceAlerts, ({ one }) => ({
  user: one(users, {
    fields: [priceAlerts.userId],
    references: [users.id]
  }),
  item: one(wishlistItems, {
    fields: [priceAlerts.itemId],
    references: [wishlistItems.id]
  })
}));

export const insertPriceAlertSchema = createInsertSchema(priceAlerts).pick({
  userId: true,
  itemId: true,
  targetPrice: true,
  expiresAt: true
});

export type InsertPriceAlert = z.infer<typeof insertPriceAlertSchema>;
export type PriceAlert = typeof priceAlerts.$inferSelect;

// User preferences for recommendations
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  favoriteCategories: jsonb("favorite_categories").default('[]'),
  favoriteBrands: jsonb("favorite_brands").default('[]'),
  priceRanges: jsonb("price_ranges").default('{}'),
  excludedCategories: jsonb("excluded_categories").default('[]'),
  excludedBrands: jsonb("excluded_brands").default('[]'),
  personalInterests: jsonb("personal_interests").default('[]'),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id]
  })
}));

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).pick({
  userId: true,
  favoriteCategories: true,
  favoriteBrands: true,
  priceRanges: true,
  excludedCategories: true,
  excludedBrands: true,
  personalInterests: true
});

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;

// AI-driven gift recommendations
export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  targetBeneficiaryId: integer("target_beneficiary_id").references(() => beneficiaries.id),
  targetWishlistId: integer("target_wishlist_id").references(() => wishlists.id),
  itemTitle: text("item_title").notNull(),
  itemDescription: text("item_description"),
  imageUrl: text("image_url"),
  productUrl: text("product_url"),
  price: text("price"),
  store: text("store"),
  category: text("category"),
  confidence: decimal("confidence", { precision: 5, scale: 2 }), // How confident the AI is in this recommendation (0-1)
  reasoningText: text("reasoning_text"), // Why the AI is recommending this
  source: text("source").notNull(), // Where the recommendation came from ("ai", "popularity", "similar_users")
  isViewed: boolean("is_viewed").default(false).notNull(),
  isSaved: boolean("is_saved").default(false).notNull(),
  isRejected: boolean("is_rejected").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  metadata: jsonb("metadata").default('{}'),
});

export const recommendationsRelations = relations(recommendations, ({ one }) => ({
  user: one(users, {
    fields: [recommendations.userId],
    references: [users.id]
  }),
  beneficiary: one(beneficiaries, {
    fields: [recommendations.targetBeneficiaryId],
    references: [beneficiaries.id]
  }),
  wishlist: one(wishlists, {
    fields: [recommendations.targetWishlistId],
    references: [wishlists.id]
  })
}));

export const insertRecommendationSchema = createInsertSchema(recommendations).pick({
  userId: true,
  targetBeneficiaryId: true,
  targetWishlistId: true,
  itemTitle: true,
  itemDescription: true,
  imageUrl: true,
  productUrl: true,
  price: true,
  store: true,
  category: true,
  confidence: true,
  reasoningText: true,
  source: true,
  metadata: true
});

export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendations.$inferSelect;

// Group Gifting Tables
export const groupGifts = pgTable("group_gifts", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => wishlistItems.id),
  initiatedByUserId: integer("initiated_by_user_id").notNull().references(() => users.id),
  targetAmount: decimal("target_amount", { precision: 10, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  status: text("status").default("active").notNull(), // active, completed, cancelled
  expiresAt: timestamp("expires_at"),
  completedAt: timestamp("completed_at"),
  message: text("message"), // Group message to recipient
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isAnonymous: boolean("is_anonymous").default(false).notNull(), // Whether contributor names are hidden
  metadata: jsonb("metadata").default('{}'),
});

export const groupGiftsRelations = relations(groupGifts, ({ one, many }) => ({
  item: one(wishlistItems, {
    fields: [groupGifts.itemId],
    references: [wishlistItems.id]
  }),
  initiator: one(users, {
    fields: [groupGifts.initiatedByUserId],
    references: [users.id]
  }),
  contributions: many(groupGiftContributions)
}));

export const groupGiftContributions = pgTable("group_gift_contributions", {
  id: serial("id").primaryKey(),
  groupGiftId: integer("group_gift_id").notNull().references(() => groupGifts.id),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  message: text("message"),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  paymentStatus: text("payment_status").default("pending").notNull(), // pending, completed, refunded
  paymentMethod: text("payment_method"),
  transactionId: text("transaction_id"),
});

export const groupGiftContributionsRelations = relations(groupGiftContributions, ({ one }) => ({
  groupGift: one(groupGifts, {
    fields: [groupGiftContributions.groupGiftId],
    references: [groupGifts.id]
  }),
  contributor: one(users, {
    fields: [groupGiftContributions.userId],
    references: [users.id]
  })
}));

// Gift reservations for Social Gifting Coordination
export const giftReservations = pgTable("gift_reservations", {
  id: serial("id").primaryKey(),
  wishlistItemId: integer("wishlist_item_id").notNull().references(() => wishlistItems.id),
  userId: integer("user_id").notNull().references(() => users.id),
  contributionAmount: decimal("contribution_amount", { precision: 10, scale: 2 }).notNull(),
  message: text("message"),
  status: text("status").default("active").notNull(), // active, ready, purchased, cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
});

export const giftReservationsRelations = relations(giftReservations, ({ one }) => ({
  item: one(wishlistItems, {
    fields: [giftReservations.wishlistItemId],
    references: [wishlistItems.id]
  }),
  user: one(users, {
    fields: [giftReservations.userId],
    references: [users.id]
  })
}));

export const insertGiftReservationSchema = createInsertSchema(giftReservations).pick({
  wishlistItemId: true,
  userId: true,
  contributionAmount: true,
  message: true,
  status: true
});

export type InsertGiftReservation = z.infer<typeof insertGiftReservationSchema>;
export type GiftReservation = typeof giftReservations.$inferSelect;

// Insert schemas for group gifting
export const insertGroupGiftSchema = createInsertSchema(groupGifts).pick({
  itemId: true,
  initiatedByUserId: true,
  targetAmount: true,
  message: true,
  expiresAt: true,
  isAnonymous: true,
  metadata: true
});

export const insertGroupGiftContributionSchema = createInsertSchema(groupGiftContributions).pick({
  groupGiftId: true,
  userId: true,
  amount: true,
  message: true,
  isAnonymous: true,
  paymentMethod: true
});

export type InsertGroupGift = z.infer<typeof insertGroupGiftSchema>;
export type GroupGift = typeof groupGifts.$inferSelect;

export type InsertGroupGiftContribution = z.infer<typeof insertGroupGiftContributionSchema>;
export type GroupGiftContribution = typeof groupGiftContributions.$inferSelect;

// Enhanced Privacy Controls
export const privacySettings = pgTable("privacy_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  entityType: text("entity_type").notNull(), // wishlist, item, user_profile
  entityId: integer("entity_id").notNull(),
  visibilityLevel: text("visibility_level").default("public").notNull(), // public, friends, private, custom
  customAccessList: jsonb("custom_access_list").default('[]'), // User IDs with custom access
  expirationDate: timestamp("expiration_date"), // When shared access should expire
  allowComments: boolean("allow_comments").default(true).notNull(),
  allowReservations: boolean("allow_reservations").default(true).notNull(),
  requireApproval: boolean("require_approval").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const privacySettingsRelations = relations(privacySettings, ({ one }) => ({
  user: one(users, {
    fields: [privacySettings.userId],
    references: [users.id]
  })
}));

export const insertPrivacySettingsSchema = createInsertSchema(privacySettings).pick({
  userId: true,
  entityType: true,
  entityId: true,
  visibilityLevel: true,
  customAccessList: true,
  expirationDate: true,
  allowComments: true,
  allowReservations: true,
  requireApproval: true
});

export type InsertPrivacySettings = z.infer<typeof insertPrivacySettingsSchema>;
export type PrivacySettings = typeof privacySettings.$inferSelect;

// Cross-Platform Synchronization & Mobile Support
export const userDevices = pgTable("user_devices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  deviceType: text("device_type").notNull(), // mobile, tablet, desktop, browser_extension
  deviceToken: text("device_token"), // For push notifications
  deviceName: text("device_name"),
  osType: text("os_type"), // iOS, Android, Windows, macOS, etc.
  osVersion: text("os_version"),
  appVersion: text("app_version"),
  lastSyncedAt: timestamp("last_synced_at").defaultNow().notNull(),
  lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  settings: jsonb("settings").default('{}'), // Device-specific settings
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userDevicesRelations = relations(userDevices, ({ one }) => ({
  user: one(users, {
    fields: [userDevices.userId],
    references: [users.id]
  })
}));

export const syncLogs = pgTable("sync_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  deviceId: integer("device_id").references(() => userDevices.id),
  entityType: text("entity_type").notNull(), // wishlist, item, user_preferences, etc.
  entityId: integer("entity_id"),
  action: text("action").notNull(), // create, update, delete
  syncStatus: text("sync_status").notNull(), // pending, completed, failed
  errorMessage: text("error_message"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
  details: jsonb("details").default('{}'),
});

export const syncLogsRelations = relations(syncLogs, ({ one }) => ({
  user: one(users, {
    fields: [syncLogs.userId],
    references: [users.id]
  }),
  device: one(userDevices, {
    fields: [syncLogs.deviceId],
    references: [userDevices.id]
  })
}));

// Calendar Integration
export const userCalendars = pgTable("user_calendars", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  calendarType: text("calendar_type").notNull(), // google, apple, outlook, etc.
  calendarId: text("calendar_id").notNull(), // External ID of the calendar
  displayName: text("display_name").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  isActive: boolean("is_active").default(true).notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  settings: jsonb("settings").default('{}'),
});

export const userCalendarsRelations = relations(userCalendars, ({ one }) => ({
  user: one(users, {
    fields: [userCalendars.userId],
    references: [users.id]
  })
}));

// Simple calendar events table
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  location: text("location"),
  isAllDay: boolean("is_all_day").default(false).notNull(),
  eventType: text("event_type").notNull(), // birthday, anniversary, wishlist_deadline, etc.
  reminderDays: integer("reminder_days"), // How many days before to remind
  color: text("color").default('#6366F1'),
  recurrence: text("recurrence"), // yearly, monthly, etc.
  beneficiaryId: integer("beneficiary_id").references(() => beneficiaries.id),
  wishlistId: integer("wishlist_id").references(() => wishlists.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  metadata: jsonb("metadata").default('{}'),
});

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  user: one(users, {
    fields: [calendarEvents.userId],
    references: [users.id]
  }),
  beneficiary: one(beneficiaries, {
    fields: [calendarEvents.beneficiaryId],
    references: [beneficiaries.id]
  }),
  wishlist: one(wishlists, {
    fields: [calendarEvents.wishlistId],
    references: [wishlists.id]
  })
}));

// Insert schemas for synchronization
export const insertUserDeviceSchema = createInsertSchema(userDevices).pick({
  userId: true,
  deviceType: true,
  deviceToken: true,
  deviceName: true,
  osType: true,
  osVersion: true,
  appVersion: true,
  settings: true
});

export const insertSyncLogSchema = createInsertSchema(syncLogs).pick({
  userId: true,
  deviceId: true,
  entityType: true,
  entityId: true,
  action: true,
  syncStatus: true,
  errorMessage: true,
  details: true
});

// Insert schemas for calendar integration
export const insertUserCalendarSchema = createInsertSchema(userCalendars).pick({
  userId: true,
  calendarType: true,
  calendarId: true,
  displayName: true,
  accessToken: true,
  refreshToken: true,
  tokenExpiry: true,
  settings: true
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).pick({
  userId: true,
  title: true,
  description: true,
  startDate: true,
  endDate: true,
  location: true,
  isAllDay: true,
  eventType: true,
  reminderDays: true,
  color: true,
  recurrence: true,
  beneficiaryId: true,
  wishlistId: true,
  metadata: true
});

// Types for the new additions
export type InsertUserDevice = z.infer<typeof insertUserDeviceSchema>;
export type UserDevice = typeof userDevices.$inferSelect;

export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;
export type SyncLog = typeof syncLogs.$inferSelect;

export type InsertUserCalendar = z.infer<typeof insertUserCalendarSchema>;
export type UserCalendar = typeof userCalendars.$inferSelect;

export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
