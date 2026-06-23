import { Helmet } from "react-helmet";
import { Gift, Sparkles, Target, Users } from "lucide-react";

// Update these with real account URLs once created.
const SOCIAL_LINKS = {
  twitter:   "",   // e.g. https://x.com/WishlistWizard
  instagram: "",   // e.g. https://instagram.com/WishlistWizard
  facebook:  "",   // e.g. https://facebook.com/WishlistWizard
  tiktok:    "",   // e.g. https://tiktok.com/@WishlistWizard
  pinterest: "",   // e.g. https://pinterest.com/WishlistWizard
};

const SCHEMA = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Wishlist Wizard",
  "url": "https://wishlist-wizard.com",
  "logo": "https://wishlist-wizard.com/android-chrome-512x512.png",
  "description": "Wishlist Wizard helps people create, manage, and share wishlists with less friction.",
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "support@wishlist-wizard.com",
    "contactType": "customer support",
    "url": "https://wishlist-wizard.com/support",
  },
});

const activeSocialLinks = Object.entries(SOCIAL_LINKS).filter(([, url]) => url !== "");

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  twitter: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.79 1.52V6.79a4.85 4.85 0 0 1-1.02-.1z" />
    </svg>
  ),
  pinterest: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  ),
};

const SOCIAL_LABEL: Record<string, string> = {
  twitter: "X (Twitter)",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  pinterest: "Pinterest",
};

export default function About() {
  return (
    <>
      <Helmet>
        <title>About Wishlist Wizard | Wishlist Wizard</title>
        <meta name="description" content="Learn about Wishlist Wizard and our mission to make gifting and wishlist planning simpler." />
        <meta property="og:title" content="About Wishlist Wizard" />
        <meta property="og:description" content="Learn about Wishlist Wizard and our mission to make gifting and wishlist planning simpler." />
        <meta property="og:url" content="https://wishlist-wizard.com/about" />
        <meta name="twitter:title" content="About Wishlist Wizard" />
        <meta name="twitter:description" content="Learn about Wishlist Wizard and our mission to make gifting and wishlist planning simpler." />
        <script type="application/ld+json">{SCHEMA}</script>
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent">
            About Wishlist Wizard
          </h1>
          <p className="text-gray-600 mt-2">
            Making gifting and wishlist planning simpler.
          </p>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-700 mb-4">
              Wishlist Wizard helps people create, manage, and share wishlists with less friction. We believe everyone should have an easy, reliable way to track the things they want and help friends and family choose the right gifts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Story</h2>
            <p className="text-gray-700 mb-4">
              What started as a simple idea has grown into a comprehensive wishlist platform. We saw the problem: people scattered items across multiple stores, gift coordination was difficult, and list management was more complicated than it should be. So we built Wishlist Wizard.
            </p>
            <p className="text-gray-700">
              Today, Wishlist Wizard helps users organize what they want, share lists with people they trust, and discover relevant products. We continue to improve the product based on real user feedback.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <Gift className="h-6 w-6 text-emerald-800" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">User-Centric</h3>
                  <p className="text-gray-700 text-sm mt-1">Everything we build starts with you. Your needs and feedback shape our decisions.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <Sparkles className="h-6 w-6 text-emerald-800" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Simplicity</h3>
                  <p className="text-gray-700 text-sm mt-1">We believe great products should be intuitive and easy to use.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <Target className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Innovation</h3>
                  <p className="text-gray-700 text-sm mt-1">We're constantly exploring new ways to enhance the wishlist experience.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Community</h3>
                  <p className="text-gray-700 text-sm mt-1">We're building a vibrant community of people who love thoughtful gifting.</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">What We Offer</h2>
            <p className="text-gray-700 mb-4">
              Wishlist Wizard provides a comprehensive suite of tools:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li><strong>Browser Extension:</strong> Save items from any website with a single click</li>
              <li><strong>Web Dashboard:</strong> Manage all your wishlists in one beautiful interface</li>
              <li><strong>Calendar Integration:</strong> Stay on top of birthdays and key gifting milestones</li>
              <li><strong>Social Sharing:</strong> Share wishlists with friends and family</li>
              <li><strong>Social Network Discovery:</strong> Find trusted people and coordinate gift planning</li>
              <li><strong>Basic Activity Insights:</strong> Understand how your lists are viewed and used</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Commitment</h2>
            <p className="text-gray-700 mb-4">
              We are committed to protecting your privacy, maintaining strong security practices, and providing responsive support. Trust is foundational to how we build and operate.
            </p>
            <p className="text-gray-700">
              Thank you for using Wishlist Wizard.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Get in Touch</h2>
            <p className="text-gray-700">
              Have questions or feedback? We'd love to hear from you! Email us at{" "}
              <a href="mailto:support@wishlist-wizard.com" className="text-emerald-700 hover:underline">
                support@wishlist-wizard.com
              </a>{" "}
              or visit our{" "}
              <a href="/support" className="text-emerald-700 hover:underline">support page</a>.
            </p>
          </section>

          {activeSocialLinks.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Follow Us</h2>
              <p className="text-gray-700 mb-4">
                Stay up to date with the latest Wishlist Wizard news, tips, and gift inspiration.
              </p>
              <div className="flex flex-wrap gap-3">
                {activeSocialLinks.map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:border-emerald-400 hover:text-emerald-800 transition-colors text-sm font-medium"
                    aria-label={`Follow us on ${SOCIAL_LABEL[platform]}`}
                  >
                    {SOCIAL_ICONS[platform]}
                    {SOCIAL_LABEL[platform]}
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
