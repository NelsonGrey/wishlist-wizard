import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="flex-none bg-emerald-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Wishlist Wizard" className="h-6 w-6" />
            <span className="font-semibold text-sm">Wishlist Wizard</span>
          </div>

          {/* Main nav */}
          <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-emerald-200">
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link href="/plans" className="hover:text-white transition-colors">Plans</Link>
            <Link href="/extension" className="hover:text-white transition-colors">Extension</Link>
            <Link href="/support" className="hover:text-white transition-colors">Support</Link>
          </nav>

          {/* Legal */}
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-300">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
          </nav>
        </div>

        <div className="mt-3 pt-3 border-t border-emerald-800 text-xs text-emerald-400 text-center sm:text-left">
          © {new Date().getFullYear()} Wishlist Wizard. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
