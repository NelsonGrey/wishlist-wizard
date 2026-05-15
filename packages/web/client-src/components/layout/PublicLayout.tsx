import React, { useEffect } from "react";
import { Link, useLocation } from "wouter";
import Footer from "@/components/Footer";
import { GlobalAdSlot } from "@/components/ads";

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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50/30 via-white to-green-50/30">
      {/* Marketing Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo - acts as home button */}
          <Link href="/">
            <span className="flex items-center hover:scale-105 transition-transform duration-200">
              <img src="/logo.svg" alt="Wishlist Wizard" className="h-9 w-9 mr-2.5" />
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent">Wishlist Wizard</span>
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/extension" className="text-gray-700 hover:text-emerald-700 font-medium transition-colors">
              How It Works
            </Link>
            <a href="/#plans" className="text-gray-700 hover:text-emerald-700 font-medium transition-colors">
              Plans
            </a>
            <Link href="/about" className="text-gray-700 hover:text-emerald-700 font-medium transition-colors">
              About
            </Link>
            <Link href="/blog" className="text-gray-700 hover:text-emerald-700 font-medium transition-colors">
              Blog
            </Link>
            <Link href="/login" className="px-5 py-2 text-gray-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg font-medium transition-all">
              Sign In
            </Link>
            <Link href="/register" className="px-6 py-2.5 bg-gradient-to-r from-emerald-700 to-green-700 text-white hover:from-emerald-800 hover:to-green-800 rounded-lg font-medium shadow-md hover:shadow-lg transition-all">
              Sign Up
            </Link>
          </nav>

          {/* Mobile menu */}
          <div className="md:hidden flex items-center gap-3">
            <a href="/#plans" className="text-gray-700 hover:text-emerald-800 font-medium">
              Plans
            </a>
            <Link href="/login" className="text-gray-700 hover:text-emerald-800 font-medium">
              Sign In
            </Link>
            <Link href="/register" className="px-4 py-2 bg-gradient-to-r from-emerald-700 to-green-700 text-white rounded-lg shadow-md">
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <GlobalAdSlot />

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
