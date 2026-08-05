export type {
  AchievementCategory,
  AchievementDefinition,
  AchievementTierName,
} from "@wishlist-wizard/shared";
export {
  ACHIEVEMENT_DEFINITIONS,
  ACHIEVEMENT_TIER_NAMES,
} from "@wishlist-wizard/shared";

/** Highest tier index (Wizard) — the brand-callback tier that gets distinct reward treatment. */
export const WIZARD_TIER = 5;

/** Badge classes per tier (1-indexed: Apprentice..Wizard). Cosmetic only, never gates functionality. */
export const ACHIEVEMENT_TIER_BADGE_CLASSES: Record<number, string> = {
  1: "bg-slate-100 text-slate-700 border-slate-300",
  2: "bg-emerald-100 text-emerald-700 border-emerald-300",
  3: "bg-blue-100 text-blue-700 border-blue-300",
  4: "bg-purple-100 text-purple-700 border-purple-300",
  5: "bg-gradient-to-r from-amber-200 to-yellow-100 text-amber-900 border-amber-400",
};
