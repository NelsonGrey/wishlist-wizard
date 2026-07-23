import { Link } from "wouter";

type FeatureKey =
  | "mobile-app"
  | "browser-extension"
  | "social-integration"
  | "calendar-integration"
  | "wishlist-management"
  | "basic-activity-insights"
  | "advanced-user-profiles";

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
    appHref: "/app/dashboard"
  },
  "browser-extension": {
    title: "Browser Extension",
    subtitle: "Capture items while you browse",
    description:
      "Save products from online stores in one click and route them directly into the right wishlist.",
    highlights: [
      "Capture products from supported shopping pages",
      "Keep item details organized while browsing",
      "Reduce manual copy-and-paste when building lists"
    ],
    screenshotSrc: "/feature-screenshots/feature-demo.png",
    screenshotAlt: "Browser extension feature screenshot",
    demoCtaLabel: "View Extension Setup",
    appCtaLabel: "Open Extension Guide",
    appHref: "/extension"
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
    appHref: "/app/dashboard"
  },
  "calendar-integration": {
    title: "Calendar Integration",
    subtitle: "Never miss important dates",
    description:
      "Plan ahead with event reminders and timely prompts so birthdays and anniversaries are always covered.",
    highlights: [
      "Track birthdays and milestones",
      "Get reminders before key events",
      "Plan gifts with less last-minute stress"
    ],
    screenshotSrc: "/feature-screenshots/feature-demo.png",
    screenshotAlt: "Calendar integration feature screenshot",
    demoCtaLabel: "View Calendar Demo",
    appCtaLabel: "Open Calendar",
    appHref: "/app/calendar"
  },
  "wishlist-management": {
    title: "Wishlist Management",
    subtitle: "Organize every plan in one place",
    description:
      "Create, structure, and maintain wishlists across events and recipients so gift planning stays fast and clear.",
    highlights: [
      "Create multiple lists by recipient or occasion",
      "Prioritize and organize items with less effort",
      "Keep list details easy to update and share"
    ],
    screenshotSrc: "/feature-screenshots/feature-demo.png",
    screenshotAlt: "Wishlist management feature screenshot",
    demoCtaLabel: "View Wishlist Demo",
    appCtaLabel: "Open Dashboard",
    appHref: "/app/dashboard"
  },
  "basic-activity-insights": {
    title: "Basic Activity Insights",
    subtitle: "Simple visibility into list engagement",
    description:
      "Track key engagement trends so you can improve list quality and timing without complex analytics overhead.",
    highlights: [
      "Monitor list views and interaction patterns",
      "Spot which lists are getting the most attention",
      "Use simple signals to plan updates and sharing"
    ],
    screenshotSrc: "/feature-screenshots/feature-demo.png",
    screenshotAlt: "Basic activity insights feature screenshot",
    demoCtaLabel: "View Insights Demo",
    appCtaLabel: "Open Analytics",
    appHref: "/app/analytics"
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
    appHref: "/app/user-profile"
  }
};

interface FeatureDemoProps {
  feature: FeatureKey;
}

export default function FeatureDemo({ feature }: FeatureDemoProps) {
  const config = featureConfigs[feature];

  return (
    <main className="mx-auto w-full max-w-[var(--site-content-width)] bg-slate-50 py-16 min-h-[calc(100vh-8rem)]">
      <div className="mx-auto px-4 max-w-4xl">
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
