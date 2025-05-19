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
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  occasion: text("occasion"), // e.g., "Birthday", "Christmas", "Baby Shower"
  occasionDate: timestamp("occasion_date"), // When the event is happening
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
  items: many(wishlistItems)
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
  occasion: true,
  occasionDate: true,
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

export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;
export type WishlistItem = typeof wishlistItems.$inferSelect;
