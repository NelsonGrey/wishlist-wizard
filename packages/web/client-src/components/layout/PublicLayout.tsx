import React, { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Gift } from "lucide-react";
import Footer from "@/components/Footer";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const [location] = useLocation();

  // Scroll to top when location changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Marketing Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <a className="flex items-center">
              <Gift className="h-6 w-6 text-indigo-600 mr-2" />
              <span className="font-bold text-xl tracking-tight">Wishlist Wizard</span>
            </a>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-gray-700 hover:text-gray-900 font-medium">
              Home
            </Link>
            <Link href="/extension" className="text-gray-700 hover:text-gray-900 font-medium">
              How It Works
            </Link>
            <Link href="/about" className="text-gray-700 hover:text-gray-900 font-medium">
              About
            </Link>
            <Link href="/blog" className="text-gray-700 hover:text-gray-900 font-medium">
              Blog
            </Link>
            <Link href="/login">
              <button className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md font-medium">
                Sign In
              </button>
            </Link>
            <Link href="/register">
              <button className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md font-medium">
                Sign Up
              </button>
            </Link>
          </nav>

          {/* Mobile menu */}
          <div className="md:hidden">
            <Link href="/login">
              <button className="text-gray-700 hover:text-gray-900 mr-4">Sign In</button>
            </Link>
            <Link href="/register">
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-md">Sign Up</button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 bg-white">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
