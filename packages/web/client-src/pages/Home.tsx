import { Helmet } from "react-helmet";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Subscriptions from "@/components/Subscriptions";

const SCHEMA = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "name": "Wishlist Wizard",
      "url": "https://wishlist-wizard.com",
      "description": "Create, share, and manage wishlists with price tracking, calendar reminders, and gift coordination.",
      "applicationCategory": "LifestyleApplication",
      "operatingSystem": "Web, iOS",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    },
    {
      "@type": "Organization",
      "name": "Wishlist Wizard",
      "url": "https://wishlist-wizard.com",
      "logo": "https://wishlist-wizard.com/android-chrome-512x512.png",
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "support@wishlist-wizard.com",
        "contactType": "customer support",
      },
    },
  ],
});

export default function Home() {
  return (
    <>
      <Helmet>
        <title>Wishlist Wizard - Smart Wishlist Management</title>
        <meta name="description" content="Create, share, and manage wishlists with price tracking, calendar reminders, and gift coordination. Free to get started." />
        <meta property="og:title" content="Wishlist Wizard - Smart Wishlist Management" />
        <meta property="og:description" content="Create, share, and manage wishlists with price tracking, calendar reminders, and gift coordination. Free to get started." />
        <meta property="og:url" content="https://wishlist-wizard.com/" />
        <meta name="twitter:title" content="Wishlist Wizard - Smart Wishlist Management" />
        <meta name="twitter:description" content="Create, share, and manage wishlists with price tracking, calendar reminders, and gift coordination." />
        <script type="application/ld+json">{SCHEMA}</script>
      </Helmet>
      <div className="flex flex-col">
        <Hero />
        <Features />
        <Subscriptions variant="preview" />
      </div>
    </>
  );
}
