/**
 * Wishlist Wizard — Achievements & Rewards Definitions
 *
 * This is the single source of truth for what achievements exist, what
 * category they belong to, and (for tiered tracks) what thresholds each
 * tier requires. Both client-side (display) and server-side (evaluation
 * in packages/functions/src/api/achievements.ts) import from here.
 *
 * v1 scope per docs/Achievements_And_Rewards_Design.md — Foundation (all 7,
 * one-time) + Tracker + Extension Power User (Depth of Usage, tiered) +
 * Gift Giver + Well-Loved + Sharer (Generosity & Community, tiered).
 * Deferred to v2: Bargain Hunter, Wishlist Builder, Group Organizer, Chip In,
 * Collaborator-anything, and the full Creator track — see the design doc's
 * "Open decisions" section for why each is on hold.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AchievementCategory = 'foundation' | 'depth' | 'generosity';

export interface AchievementDefinition {
  id: string;
  category: AchievementCategory;
  name: string;
  description: string;
  icon: string;
  tiered: boolean;
  /** Five thresholds, one per tier (Apprentice → Wizard). Only set when tiered is true. */
  thresholds?: [number, number, number, number, number];
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier ladder
// ─────────────────────────────────────────────────────────────────────────────

export const ACHIEVEMENT_TIER_NAMES = ['Apprentice', 'Adept', 'Sorcerer', 'Archmage', 'Wizard'] as const;

export type AchievementTierName = (typeof ACHIEVEMENT_TIER_NAMES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Achievement definitions
// ─────────────────────────────────────────────────────────────────────────────

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Foundation — one-time, setup/onboarding
  {
    id: 'welcome-aboard',
    category: 'foundation',
    name: 'Welcome Aboard',
    description: 'Created your Wishlist Wizard account',
    icon: '👋',
    tiered: false,
  },
  {
    id: 'verified',
    category: 'foundation',
    name: 'Verified',
    description: 'Verified your email address',
    icon: '✅',
    tiered: false,
  },
  {
    id: 'first-wish',
    category: 'foundation',
    name: 'First Wish',
    description: 'Created your first wishlist',
    icon: '🌟',
    tiered: false,
  },
  {
    id: 'dialed-in',
    category: 'foundation',
    name: 'Dialed In',
    description: 'Enabled push notifications',
    icon: '🔔',
    tiered: false,
  },
  {
    id: 'connected',
    category: 'foundation',
    name: 'Connected',
    description: 'Used the browser extension at least once',
    icon: '🔌',
    tiered: false,
  },
  {
    id: 'leveled-up',
    category: 'foundation',
    name: 'Leveled Up',
    description: 'Subscribed to a paid tier',
    icon: '⬆️',
    tiered: false,
  },
  {
    id: 'ad-free',
    category: 'foundation',
    name: 'Ad-Free',
    description: 'Reached a tier with ads disabled',
    icon: '🚫',
    tiered: false,
  },

  // Depth of Usage — tiered, repeated engagement
  {
    id: 'tracker',
    category: 'depth',
    name: 'Tracker',
    description: 'Active price alerts',
    icon: '📉',
    tiered: true,
    thresholds: [1, 5, 15, 40, 75],
  },
  {
    id: 'extension-power-user',
    category: 'depth',
    name: 'Extension Power User',
    description: 'Items added via the browser extension',
    icon: '🧩',
    tiered: true,
    thresholds: [1, 10, 50, 150, 500],
  },

  // Generosity & Community — tiered, relational
  {
    id: 'gift-giver',
    category: 'generosity',
    name: 'Gift Giver',
    description: 'Items purchased for someone else',
    icon: '🎁',
    tiered: true,
    thresholds: [1, 5, 15, 40, 100],
  },
  {
    id: 'well-loved',
    category: 'generosity',
    name: 'Well-Loved',
    description: 'Items others reserved or purchased for you',
    icon: '💝',
    tiered: true,
    thresholds: [1, 5, 15, 40, 100],
  },
  {
    id: 'sharer',
    category: 'generosity',
    name: 'Sharer',
    description: 'Wishlists made public or shared via link',
    icon: '🔗',
    tiered: true,
    thresholds: [1, 3, 10, 25, 50],
  },
];
