export interface Achievement {
  id: number;
  name: string;
  description: string;
  rule: string;
  earned: boolean;
  icon: string;
}

// TODO: this is placeholder demo data — earned flags are hardcoded, not
// computed from real activity (see the achievements program follow-up).
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 1,
    name: "Wishlist Wizard",
    description: "Created 10+ wishlists",
    rule: "Create 10 or more wishlists to earn this badge.",
    earned: true,
    icon: "🌟",
  },
  {
    id: 2,
    name: "Gifting Guru",
    description: "Purchased 25+ gifts",
    rule: "Mark 25 or more items as purchased for other people's wishlists to earn this badge.",
    earned: true,
    icon: "🎁",
  },
  {
    id: 3,
    name: "Savings Expert",
    description: "Saved over $250 with smart wishlist planning",
    rule: "Save a combined $250 or more across your tracked items' price drops to earn this badge.",
    earned: true,
    icon: "💰",
  },
  {
    id: 4,
    name: "Social Butterfly",
    description: "Connected with 20+ friends",
    rule: "Connect with 20 or more friends to earn this badge.",
    earned: false,
    icon: "🦋",
  },
  {
    id: 5,
    name: "Review Enthusiast",
    description: "Wrote 15+ product reviews",
    rule: "Write 15 or more product reviews to earn this badge.",
    earned: false,
    icon: "✍️",
  },
];
