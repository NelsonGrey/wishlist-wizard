import { Helmet } from "react-helmet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, User } from "lucide-react";
import { Link } from "wouter";

export default function Blog() {
  const blogPosts = [
    {
      id: 1,
      title: "Getting Started with Wishlist Wizard",
      description: "Learn how to create your first wishlist and start saving items from your favorite stores.",
      author: "Wishlist Wizard Team",
      date: "Coming Soon",
      category: "Getting Started"
    },
    {
      id: 2,
      title: "Price Tracking 101: Never Miss a Deal",
      description: "Discover how price tracking can help you save money on the items you want.",
      author: "Wishlist Wizard Team",
      date: "Coming Soon",
      category: "Features"
    },
    {
      id: 3,
      title: "Gift Giving Made Easy",
      description: "How to use shared wishlists to make gift giving simpler and more meaningful.",
      author: "Wishlist Wizard Team",
      date: "Coming Soon",
      category: "Tips & Tricks"
    },
    {
      id: 4,
      title: "Browser Extension Tips and Tricks",
      description: "Maximize your productivity with our browser extension. Learn advanced features.",
      author: "Wishlist Wizard Team",
      date: "Coming Soon",
      category: "Features"
    }
  ];

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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent">
            Blog
          </h1>
          <p className="text-gray-600 mt-2">
            Tips, tricks, and stories about wishlists, gift giving, and more.
          </p>
        </div>

        <div className="space-y-8">
          {blogPosts.length > 0 ? (
            <div className="grid gap-6">
              {blogPosts.map((post) => (
                <Card key={post.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                        {post.category}
                      </span>
                      <div className="flex items-center text-sm text-gray-500">
                        <CalendarDays className="h-4 w-4 mr-1" />
                        {post.date}
                      </div>
                    </div>
                    <CardTitle className="text-xl md:text-2xl">{post.title}</CardTitle>
                    <CardDescription className="text-base">{post.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="h-4 w-4 mr-2" />
                      {post.author}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Blog Coming Soon</CardTitle>
                <CardDescription>
                  We're working on creating helpful articles and tips for the Wishlist Wizard community.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <section className="mt-12 pt-8 border-t">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Subscribe to Our Newsletter</h2>
            <p className="text-gray-700 mb-4">
              Get the latest tips, features, and stories delivered to your inbox.
            </p>
            <form className="flex gap-2 max-w-md">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-emerald-700 to-green-700 text-white rounded-lg hover:from-emerald-800 hover:to-green-800 transition-all shadow-md hover:shadow-lg"
              >
                Subscribe
              </button>
            </form>
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
