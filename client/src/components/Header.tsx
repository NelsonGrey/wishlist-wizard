import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Header() {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isHome = location === "/";
  const isLoggedIn = true; // Always true for demo

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Link href="/">
              <a className="text-2xl font-bold text-primary">WishKeeper</a>
            </Link>
          </div>
          
          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/">
              <a className="text-gray-600 hover:text-gray-900 font-medium">Home</a>
            </Link>
            {isLoggedIn ? (
              <>
                <Link href="/dashboard">
                  <a className="text-gray-600 hover:text-gray-900 font-medium">My Wishlists</a>
                </Link>
                {isHome ? (
                  <Button
                    onClick={() => window.location.href = "/dashboard"}
                    className="bg-primary hover:bg-indigo-700 text-white"
                  >
                    Dashboard
                  </Button>
                ) : (
                  <a 
                    href="https://chrome.google.com/webstore/detail/wishkeeper/placeholder"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-primary hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium text-sm transition inline-block"
                  >
                    Download Extension
                  </a>
                )}
              </>
            ) : (
              <>
                <a href="#" className="text-gray-600 hover:text-gray-900 font-medium">How It Works</a>
                <a 
                  href="https://chrome.google.com/webstore/detail/wishkeeper/placeholder"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Download Extension
                </a>
                <Button className="bg-primary hover:bg-indigo-700 text-white">
                  Log In
                </Button>
              </>
            )}
          </div>
          
          {/* Mobile menu */}
          <div className="md:hidden">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <nav className="flex flex-col gap-4 mt-8">
                  <Link href="/">
                    <a 
                      className="text-lg font-medium hover:text-primary" 
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Home
                    </a>
                  </Link>
                  {isLoggedIn ? (
                    <>
                      <Link href="/dashboard">
                        <a 
                          className="text-lg font-medium hover:text-primary"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          My Wishlists
                        </a>
                      </Link>
                      <a 
                        href="https://chrome.google.com/webstore/detail/wishkeeper/placeholder"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-medium hover:text-primary"
                      >
                        Download Extension
                      </a>
                    </>
                  ) : (
                    <>
                      <a href="#" className="text-lg font-medium hover:text-primary">How It Works</a>
                      <a 
                        href="https://chrome.google.com/webstore/detail/wishkeeper/placeholder"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-medium hover:text-primary"
                      >
                        Download Extension
                      </a>
                      <Button className="bg-primary hover:bg-indigo-700 text-white w-full mt-4">
                        Log In
                      </Button>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
