import { pgTable, text, serial, integer, boolean, timestamp, varchar, primaryKey } from "drizzle-orm/pg-core";
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
  imageUrl: text("image_url").notNull(),
  productUrl: text("product_url").notNull(),
  store: text("store").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reservedByUserId: integer("reserved_by_user_id").references(() => users.id), // Optional - when someone intends to purchase the item
  purchasedByUserId: integer("purchased_by_user_id").references(() => users.id), // Optional - when someone has purchased the item
  purchasedAt: timestamp("purchased_at"), // When the item was marked as purchased
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
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  displayName: true,
  avatarUrl: true,
  role: true,
  emailVerified: true,
  verificationToken: true,
  verificationExpires: true,
  passwordResetToken: true,
  passwordResetExpires: true,
  active: true,
  twoFactorEnabled: true,
  twoFactorSecret: true,
});

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
