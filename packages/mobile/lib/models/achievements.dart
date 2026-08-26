/// Achievement definitions — a manually-kept-in-sync Dart port of
/// packages/shared/src/achievements.ts (the TS shared package isn't
/// consumable from Flutter). Keep ids/names/descriptions/icons/thresholds
/// identical to the source of truth; the server (packages/functions/src/api/
/// achievements.ts) evaluates against the same definitions and is what
/// actually gates `earned`/`tier`/`count`, so a drift here only affects
/// display, not correctness.
library;

enum AchievementCategory { foundation, depth, generosity }

class AchievementDefinition {
  final String id;
  final AchievementCategory category;
  final String name;
  final String description;
  final String icon;
  final bool tiered;

  /// Five thresholds, one per tier (Apprentice -> Wizard). Only set when [tiered] is true.
  final List<int>? thresholds;

  const AchievementDefinition({
    required this.id,
    required this.category,
    required this.name,
    required this.description,
    required this.icon,
    required this.tiered,
    this.thresholds,
  });
}

const List<String> achievementTierNames = [
  'Apprentice',
  'Adept',
  'Sorcerer',
  'Archmage',
  'Wizard',
];

/// Highest tier index (Wizard) -- the brand-callback tier that gets distinct reward treatment.
const int wizardTier = 5;

const List<AchievementDefinition> achievementDefinitions = [
  // Foundation -- one-time, setup/onboarding
  AchievementDefinition(
    id: 'welcome-aboard',
    category: AchievementCategory.foundation,
    name: 'Welcome Aboard',
    description: 'Created your Wishlist Wizard account',
    icon: '👋',
    tiered: false,
  ),
  AchievementDefinition(
    id: 'verified',
    category: AchievementCategory.foundation,
    name: 'Verified',
    description: 'Verified your email address',
    icon: '✅',
    tiered: false,
  ),
  AchievementDefinition(
    id: 'first-wish',
    category: AchievementCategory.foundation,
    name: 'First Wish',
    description: 'Created your first wishlist',
    icon: '🌟',
    tiered: false,
  ),
  AchievementDefinition(
    id: 'dialed-in',
    category: AchievementCategory.foundation,
    name: 'Dialed In',
    description: 'Enabled push notifications',
    icon: '🔔',
    tiered: false,
  ),
  AchievementDefinition(
    id: 'connected',
    category: AchievementCategory.foundation,
    name: 'Connected',
    description: 'Used the browser extension at least once',
    icon: '🔌',
    tiered: false,
  ),
  AchievementDefinition(
    id: 'leveled-up',
    category: AchievementCategory.foundation,
    name: 'Leveled Up',
    description: 'Subscribed to a paid tier',
    icon: '⬆️',
    tiered: false,
  ),
  AchievementDefinition(
    id: 'ad-free',
    category: AchievementCategory.foundation,
    name: 'Ad-Free',
    description: 'Reached a tier with ads disabled',
    icon: '🚫',
    tiered: false,
  ),

  // Depth of Usage -- tiered, repeated engagement
  AchievementDefinition(
    id: 'tracker',
    category: AchievementCategory.depth,
    name: 'Tracker',
    description: 'Active price alerts',
    icon: '📉',
    tiered: true,
    thresholds: [1, 5, 15, 40, 75],
  ),
  AchievementDefinition(
    id: 'extension-power-user',
    category: AchievementCategory.depth,
    name: 'Extension Power User',
    description: 'Items added via the browser extension',
    icon: '🧩',
    tiered: true,
    thresholds: [1, 10, 50, 150, 500],
  ),

  // Generosity & Community -- tiered, relational
  AchievementDefinition(
    id: 'gift-giver',
    category: AchievementCategory.generosity,
    name: 'Gift Giver',
    description: 'Items purchased for someone else',
    icon: '🎁',
    tiered: true,
    thresholds: [1, 5, 15, 40, 100],
  ),
  AchievementDefinition(
    id: 'well-loved',
    category: AchievementCategory.generosity,
    name: 'Well-Loved',
    description: 'Items others reserved or purchased for you',
    icon: '💝',
    tiered: true,
    thresholds: [1, 5, 15, 40, 100],
  ),
  AchievementDefinition(
    id: 'sharer',
    category: AchievementCategory.generosity,
    name: 'Sharer',
    description: 'Wishlists made public or shared via link',
    icon: '🔗',
    tiered: true,
    thresholds: [1, 3, 10, 25, 50],
  ),
];
