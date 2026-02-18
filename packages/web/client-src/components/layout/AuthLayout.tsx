import React, { useEffect } from "react";
import { Link, useLocation } from "wouter";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const [location] = useLocation();

  // Scroll to top when location changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-green-50">
      {/* Minimal Auth Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo - links back to public site */}
          <Link href="/">
            <a className="flex items-center hover:scale-105 transition-transform duration-200">
              <img src="/logo.svg" alt="Wishlist Wizard" className="h-8 w-8 mr-2.5" />
              <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent">Wishlist Wizard</span>
            </a>
          </Link>

          {/* Help text */}
          <div className="hidden md:flex items-center text-sm text-gray-600">
            <span>Need help? </span>
            <Link href="/contact" className="text-emerald-700 hover:text-emerald-800 ml-1 font-medium transition-colors">
              Contact us
            </Link>
          </div>
        </div>
      </header>

      {/* Main content - centered, compact */}
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="bg-white border-t py-6 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-gray-600">
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-4">
            <Link href="/about" className="text-gray-600 hover:text-emerald-700">
              About
            </Link>
            <Link href="/terms" className="text-gray-600 hover:text-emerald-700">
              Terms
            </Link>
            <Link href="/privacy-policy" className="text-gray-600 hover:text-emerald-700">
              Privacy
            </Link>
            <Link href="/contact" className="text-gray-600 hover:text-emerald-700">
              Contact
            </Link>
          </div>
          <p>© {new Date().getFullYear()} Wishlist Wizard. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
