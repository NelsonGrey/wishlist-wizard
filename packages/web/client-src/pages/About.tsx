import { Helmet } from "react-helmet";
import { Gift, Sparkles, Target, Users } from "lucide-react";

export default function About() {
  return (
    <>
      <Helmet>
        <title>About Wishlist Wizard | Wishlist Wizard</title>
        <meta 
          name="description" 
          content="Learn about Wishlist Wizard and our mission to make wishlist management magical."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent">
            About Wishlist Wizard
          </h1>
          <p className="text-gray-600 mt-2">
            Making wishlist management magical, one item at a time
          </p>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-700 mb-4">
              Wishlist Wizard is dedicated to revolutionizing how people create, manage, and share their wishlists. We believe that everyone deserves an easy, delightful way to keep track of the things they want and to help their friends and family find the perfect gifts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Story</h2>
            <p className="text-gray-700 mb-4">
              What started as a simple idea has grown into a comprehensive platform for wishlist management. We saw the problem: people scattered their wants across multiple platforms, friends and family had trouble finding the right gifts, and managing wishlists was unnecessarily complicated. So we built Wishlist Wizard.
            </p>
            <p className="text-gray-700">
              Today, Wishlist Wizard helps countless users organize their desires, share their wishlists with loved ones, and discover amazing new products they'll love. We're just getting started, and the future is bright.
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
              <li><strong>Price Tracking:</strong> Get notified when prices drop on items you want</li>
              <li><strong>Social Sharing:</strong> Share wishlists with friends and family</li>
              <li><strong>AI Recommendations:</strong> Discover new items you'll love</li>
              <li><strong>Group Gifting:</strong> Coordinate group gifts and avoid duplicates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Our Commitment</h2>
            <p className="text-gray-700 mb-4">
              We're committed to protecting your privacy, maintaining the highest standards of security, and providing outstanding customer support. Your trust is everything to us, and we work tirelessly to earn it every single day.
            </p>
            <p className="text-gray-700">
              Thank you for being part of the Wishlist Wizard community. We can't wait to help you discover, manage, and share the things you love.
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
