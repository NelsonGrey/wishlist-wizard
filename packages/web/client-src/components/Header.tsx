import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NotificationDropdown } from "@/components/ui/NotificationDropdown";

export default function Header() {
  const [location, setLocation] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isHome = location === "/";
  
  // Skip auth API calls until backend is deployed
  const currentUser = null;
  const isLoading = false;
  
  /* This code is disabled until backend APIs are deployed
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.status === 401) return null;
        if (!res.ok) {
          // Silently return null for API unavailability
          return null;
        }
        
        // Check if response is JSON
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return res.json();
        } else {
          // If not JSON (HTML 404 page), return null silently
          return null;
        }
      } catch (error) {
        // Silently handle auth errors in development
        return null;
      }
    }
  });
  */
  
  const isLoggedIn = !!currentUser;
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
      
      // Redirect to home
      setLocation("/");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: "There was an error logging out",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-primary">
              Wishlist Wizard
            </Link>
          </div>
          
          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900 font-medium">
              Home
            </Link>
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 font-medium">
                  My Wishlists
                </Link>
                {isLoggedIn && <NotificationDropdown />}
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
                    className="text-gray-600 hover:text-gray-900 font-medium"
                  >
                    Download Extension
                  </a>
                )}
                <Button 
                  onClick={handleLogout}
                  variant="outline"
                  className="flex items-center gap-1 ml-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
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
                <Link href="/login">
                  <Button className="bg-primary hover:bg-indigo-700 text-white">
                    Log In
                  </Button>
                </Link>
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
                  <Link 
                    href="/"
                    className="text-lg font-medium hover:text-primary" 
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Home
                  </Link>
                  {isLoggedIn ? (
                    <>
                      <Link 
                        href="/dashboard"
                        className="text-lg font-medium hover:text-primary"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        My Wishlists
                      </Link>
                      <Link 
                        href="/notifications"
                        className="text-lg font-medium hover:text-primary flex items-center gap-2"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Notifications
                      </Link>
                      <a 
                        href="https://chrome.google.com/webstore/detail/wishkeeper/placeholder"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-medium hover:text-primary"
                      >
                        Download Extension
                      </a>
                      <div className="mt-4">
                        <Button 
                          onClick={() => {
                            handleLogout();
                            setIsMenuOpen(false);
                          }}
                          variant="outline"
                          className="flex items-center gap-1 w-full"
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </Button>
                      </div>
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
                      <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                        <Button className="bg-primary hover:bg-indigo-700 text-white w-full mt-4">
                          Log In
                        </Button>
                      </Link>
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
