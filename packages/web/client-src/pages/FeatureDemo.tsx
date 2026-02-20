import { Link } from "wouter";

type FeatureKey =
  | "mobile-app"
  | "ar-visualization"
  | "social-integration"
  | "price-tracking"
  | "calendar-integration"
  | "advanced-user-profiles"
  | "ai-gift-recommendations";

type FeatureConfig = {
  title: string;
  subtitle: string;
  description: string;
  highlights: string[];
  screenshotSrc: string;
  screenshotAlt: string;
  demoCtaLabel: string;
  appCtaLabel: string;
  appHref: string;
};

const featureConfigs: Record<FeatureKey, FeatureConfig> = {
  "mobile-app": {
    title: "Mobile App",
    subtitle: "Wishlist access on the go",
    description:
      "Use Wishlist Wizard from your phone with synced lists, quick item capture, and seamless access across devices.",
    highlights: [
      "Sync wishlists across web and mobile",
      "Capture products quickly while shopping",
      "Keep your lists available wherever you are"
    ],
    screenshotSrc: "/feature-screenshots/feature-demo.png",
    screenshotAlt: "Mobile app feature screenshot",
    demoCtaLabel: "Explore Mobile Demo",
    appCtaLabel: "Open App Dashboard",
    appHref: "/dashboard"
  },
  "ar-visualization": {
    title: "AR Visualization",
    subtitle: "Preview items in your space",
    description:
      "See how products look before you buy with immersive visualization that helps avoid sizing and style surprises.",
    highlights: [
      "Preview furniture and decor placement",
      "Improve confidence before purchase",
      "Reduce returns from fit mismatches"
    ],
    screenshotSrc: "/feature-screenshots/feature-demo.png",
    screenshotAlt: "AR visualization feature screenshot",
    demoCtaLabel: "See AR Demo",
    appCtaLabel: "Open Recommendations",
    appHref: "/recommendations"
  },
  "social-integration": {
    title: "Social Integration",
    subtitle: "Coordinate gifts together",
    description:
      "Share wishlists with friends and family, coordinate group gifts, and keep planning collaborative and organized.",
    highlights: [
      "Share lists with secure links",
      "Coordinate gift selection as a group",
      "Avoid duplicate purchases"
    ],
    screenshotSrc: "/feature-screenshots/feature-demo.png",
    screenshotAlt: "Social integration feature screenshot",
    demoCtaLabel: "View Social Demo",
    appCtaLabel: "Open Dashboard",
    appHref: "/dashboard"
  },
  "price-tracking": {
    title: "Price Tracking",
    subtitle: "Catch every deal",
    description:
      "Track price changes automatically and get notified when items hit your target price so you can buy at the right time.",
    highlights: [
      "Monitor item prices automatically",
      "Get alerts on meaningful drops",
      "Track savings over time"
    ],
    screenshotSrc: "/feature-screenshots/feature-demo.png",
    screenshotAlt: "Price tracking feature screenshot",
    demoCtaLabel: "View Price Tracking Demo",
    appCtaLabel: "Open Price Tracking",
    appHref: "/app/price-tracking"
  },
  "calendar-integration": {
    title: "Calendar Integration",
    subtitle: "Never miss important dates",
    description:
      "Plan ahead with occasion reminders and timely prompts so birthdays and anniversaries are always covered.",
    highlights: [
      "Track birthdays and milestones",
      "Get reminders before key events",
      "Plan gifts with less last-minute stress"
    ],
    screenshotSrc: "/feature-screenshots/feature-demo.png",
    screenshotAlt: "Calendar integration feature screenshot",
    demoCtaLabel: "View Calendar Demo",
    appCtaLabel: "Open Calendar",
    appHref: "/calendar"
  },
  "advanced-user-profiles": {
    title: "Advanced User Profiles",
    subtitle: "Personalized preferences and insights",
    description:
      "Maintain detailed gift preferences, profile insights, and personalization data to improve recommendations and planning.",
    highlights: [
      "Store gift preferences by person",
      "Improve recommendation quality",
      "Customize your gifting workflow"
    ],
    screenshotSrc: "/feature-screenshots/feature-demo.png",
    screenshotAlt: "Advanced user profiles feature screenshot",
    demoCtaLabel: "View Profile Demo",
    appCtaLabel: "Open User Profile",
    appHref: "/user-profile"
  },
  "ai-gift-recommendations": {
    title: "AI Gift Recommendations",
    subtitle: "Smarter suggestions, faster decisions",
    description:
      "Use AI-powered ideas tailored to preferences and behavior so you can find thoughtful gifts quickly.",
    highlights: [
      "Get personalized gift suggestions",
      "Discover new items with better relevance",
      "Spend less time searching"
    ],
    screenshotSrc: "/feature-screenshots/feature-demo.png",
    screenshotAlt: "AI gift recommendations feature screenshot",
    demoCtaLabel: "View AI Demo",
    appCtaLabel: "Open Recommendations",
    appHref: "/recommendations"
  }
};

interface FeatureDemoProps {
  feature: FeatureKey;
}

export default function FeatureDemo({ feature }: FeatureDemoProps) {
  const config = featureConfigs[feature];

  return (
    <main className="py-16 bg-slate-50 min-h-[calc(100vh-8rem)]">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 md:p-10 shadow-sm">
          <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3">Feature Demonstration</p>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">{config.title}</h1>
          <p className="text-lg text-slate-600 mb-6">{config.subtitle}</p>

          <p className="text-slate-700 leading-relaxed mb-6">{config.description}</p>

          <ul className="space-y-2 mb-8">
            {config.highlights.map((highlight) => (
              <li key={highlight} className="text-slate-700 flex items-start gap-2">
                <span className="text-emerald-700 mt-1">•</span>
                <span>{highlight}</span>
              </li>
            ))}
          </ul>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-3">Feature Screenshot</h2>
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
              <img
                src={config.screenshotSrc}
                alt={config.screenshotAlt}
                className="w-full h-auto object-contain"
                loading="lazy"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href={config.appHref} className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-5 py-3 text-white font-medium hover:bg-emerald-800 transition-colors">
              {config.appCtaLabel}
            </Link>
            <Link href="/register" className="inline-flex items-center justify-center rounded-lg border border-emerald-700 px-5 py-3 text-emerald-700 font-medium hover:bg-emerald-50 transition-colors">
              {config.demoCtaLabel}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
