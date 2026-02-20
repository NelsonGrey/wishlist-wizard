import { Helmet } from "react-helmet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

export default function Blog() {
  return (
    <>
      <Helmet>
        <title>Blog | Wishlist Wizard</title>
        <meta 
          name="description" 
          content="Read articles and tips about wishlist management, gift giving, and more."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent">
            Blog
          </h1>
          <p className="text-gray-600 mt-2">
            Tips, tricks, and stories about wishlists, gift giving, and more.
          </p>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>No posts published yet</CardTitle>
              <CardDescription>
                We publish product updates and guides here when new content is available.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a
                href="mailto:support@wishlist-wizard-prod.web.app?subject=Blog%20Update%20Notifications"
                className="text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
              >
                Request blog update notifications
              </a>
            </CardContent>
          </Card>

          <section className="mt-12 pt-8 border-t">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Subscribe to Our Newsletter</h2>
            <p className="text-gray-700 mb-4">
              For release updates, contact our team directly.
            </p>
            <a
              href="mailto:support@wishlist-wizard-prod.web.app?subject=Wishlist%20Wizard%20Newsletter"
              className="text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
            >
              Contact support for updates
            </a>
          </section>

          <section className="text-center py-8">
            <p className="text-gray-600 mb-4">
              Want to stay updated on new blog posts? 
            </p>
            <Link href="/">
              <a className="text-emerald-700 hover:text-emerald-800 font-medium transition-colors">
                Go back home →
              </a>
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
