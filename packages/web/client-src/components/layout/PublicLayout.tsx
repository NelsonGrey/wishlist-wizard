import React, { useEffect } from "react";
import { Link, useLocation } from "wouter";
import Footer from "@/components/Footer";
import { GlobalAdSlot } from "@/components/ads";
import { useAuth } from "@/contexts/AuthContext";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();

  // Scroll the browser window to top on route change (traditional model).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header — sticky so it stays visible while the page scrolls */}
      <header className="sticky top-0 z-50 flex-none bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/">
            <span className="flex items-center hover:scale-105 transition-transform duration-200">
              <img src="/logo.svg" alt="Wishlist Wizard" className="h-9 w-9 mr-2.5" />
              <span className="font-bold text-xl tracking-tight text-emerald-800">Wishlist Wizard</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/extension" className="text-gray-700 hover:text-emerald-700 font-medium transition-colors">
              Browser Extension
            </Link>
            <Link href="/subscriptions" className="text-gray-700 hover:text-emerald-700 font-medium transition-colors">
              Subscriptions
            </Link>
            <Link href="/download" className="text-gray-700 hover:text-emerald-700 font-medium transition-colors">
              Download
            </Link>
            <Link href="/about" className="text-gray-700 hover:text-emerald-700 font-medium transition-colors">
              About
            </Link>
            {isAuthenticated ? (
              <Link href="/app/dashboard" className="px-6 py-2.5 bg-emerald-800 text-white hover:bg-emerald-900 rounded-lg font-medium shadow-md hover:shadow-lg transition-all">
                Go to App
              </Link>
            ) : (
              <>
                <Link href="/login" className="px-5 py-2 text-gray-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg font-medium transition-all">
                  Sign In
                </Link>
                <Link href="/register" className="px-6 py-2.5 bg-emerald-800 text-white hover:bg-emerald-900 rounded-lg font-medium shadow-md hover:shadow-lg transition-all">
                  Sign Up
                </Link>
              </>
            )}
          </nav>

          <div className="md:hidden flex items-center gap-3">
            <Link href="/subscriptions" className="text-gray-700 hover:text-emerald-800 font-medium">
              Subscriptions
            </Link>
            {isAuthenticated ? (
              <Link href="/app/dashboard" className="px-4 py-2 bg-emerald-800 text-white rounded-lg shadow-md">
                Go to App
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-gray-700 hover:text-emerald-800 font-medium">
                  Sign In
                </Link>
                <Link href="/register" className="px-4 py-2 bg-emerald-800 text-white rounded-lg shadow-md">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main content — takes remaining vertical space so footer is always at bottom */}
      <main className="flex-1 bg-white">
        <GlobalAdSlot placement="top" />
        {children}
        <GlobalAdSlot placement="bottom" />
      </main>

      <Footer />
    </div>
  );
}
