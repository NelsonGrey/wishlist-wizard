import React, { useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { GlobalAdSlot } from "@/components/ads";
import Footer from "@/components/Footer";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const [location] = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  // Scroll the main content area to top on route change.
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-green-50">
      {/* Minimal Auth Header */}
      <header className="flex-none bg-white/95 backdrop-blur-sm border-b border-emerald-100 shadow-sm">
        <div className="site-container flex items-center justify-between py-3 2xl:py-4">
          {/* Logo - links back to public site */}
          <Link href="/" className="flex items-center hover:scale-105 transition-transform duration-200">
            <img src="/logo.svg" alt="Wishlist Wizard" className="h-8 w-8 mr-2.5" />
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent">Wishlist Wizard</span>
          </Link>

          {/* Help text */}
          <div className="hidden md:flex items-center text-sm text-gray-600">
            <span>Need help? </span>
            <Link href="/support" className="text-emerald-700 hover:text-emerald-800 ml-1 font-medium transition-colors">
              Contact us
            </Link>
          </div>
        </div>
      </header>

      <GlobalAdSlot placement="top" />

      {/* Main content - aligned closer to top, scrolls within viewport so footer stays pinned */}
      <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto flex items-start justify-center pt-3 pb-12 px-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      <GlobalAdSlot placement="bottom" />

      <Footer />
    </div>
  );
}
