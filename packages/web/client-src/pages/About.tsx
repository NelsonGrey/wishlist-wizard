import { Helmet } from "react-helmet";
import { Gift, Sparkles, Target, Users } from "lucide-react";

export default function About() {
  return (
    <>
      <Helmet>
        <title>About Wishlist Wizard | Wishlist Wizard</title>
        <meta 
          name="description" 
          content="Learn about Wishlist Wizard and our mission to make gifting and wishlist planning simpler."
        />
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
              Have questions or feedback? We'd love to hear from you! Email us at support@wishlist-wizard.com or visit our contact page.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
