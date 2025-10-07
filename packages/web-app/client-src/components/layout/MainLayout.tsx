import React from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Calendar,
  ChevronDown,
  Gift,
  Home,
  LineChart,
  LogOut,
  Settings,
  Sparkles,
  User
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { User as DbUser } from "@wishlist-wizard/shared";

// Type for the current user with additional UI properties
type CurrentUser = Pick<DbUser, 'id' | 'username' | 'email' | 'displayName' | 'avatarUrl'>;

// Type for notifications
type Notification = {
  id: number;
  read: boolean;
  title: string;
  message: string;
  createdAt: Date;
};

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [location] = useLocation();
  
  // Fetch current user
  const { data: currentUser } = useQuery<CurrentUser | null>({
    queryKey: ['/api/auth/me'],
  });
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  // Get notification count
  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: !!currentUser,
  });
  
  const unreadCount = notifications?.filter((n: Notification) => !n.read)?.length || 0;
  
  // Define navigation items
  const navItems = [
    { name: 'Home', href: '/dashboard', icon: <Home className="h-5 w-5" /> },
    { name: 'Recommendations', href: '/recommendations', icon: <Sparkles className="h-5 w-5" /> },
    { name: 'Price Tracking', href: '/price-tracking', icon: <LineChart className="h-5 w-5" /> },
    { name: 'Calendar', href: '/calendar', icon: <Calendar className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <a className="flex items-center">
              <Gift className="h-6 w-6 text-primary mr-2" />
              <span className="font-bold text-xl tracking-tight">WishKeeper</span>
            </a>
          </Link>
          
          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link key={item.name} href={item.href}>
                <a className={`px-3 py-2 rounded-md text-sm flex items-center font-medium ${
                  location === item.href 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}>
                  {item.icon}
                  <span className="ml-2">{item.name}</span>
                </a>
              </Link>
            ))}
          </nav>
          
          {/* User menu */}
          <div className="flex items-center">
            {currentUser ? (
              <>
                {/* Notifications */}
                <Link href="/notifications">
                  <a className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <Bell className="h-5 w-5 text-gray-700" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </a>
                </Link>
                
                {/* User dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2 flex items-center">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={currentUser.avatarUrl || undefined} alt={currentUser.displayName || currentUser.username} />
                        <AvatarFallback>
                          {currentUser.displayName?.charAt(0) || currentUser.username?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-3 py-2">
                      <div className="font-medium">{currentUser.displayName || currentUser.username}</div>
                      <div className="text-xs text-muted-foreground truncate">{currentUser.email}</div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/user-profile">
                        <a className="flex w-full cursor-pointer items-center">
                          <User className="h-4 w-4 mr-2 opacity-70" />
                          Profile
                        </a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">
                        <a className="flex w-full cursor-pointer items-center">
                          <Settings className="h-4 w-4 mr-2 opacity-70" />
                          Settings
                        </a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                      <LogOut className="h-4 w-4 mr-2 opacity-70" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <a className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">
                    Login
                  </a>
                </Link>
                <Link href="/register">
                  <a className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md">
                    Register
                  </a>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-1 bg-gray-50">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-4 md:mb-0">
              <Link href="/">
                <a className="flex items-center">
                  <Gift className="h-5 w-5 text-primary mr-2" />
                  <span className="font-bold text-lg">WishKeeper</span>
                </a>
              </Link>
              <p className="mt-2 text-sm text-gray-600">
                Keep track of all your wishes in one place
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-sm font-semibold mb-3">Features</h3>
                <ul className="space-y-2">
                  <li><Link href="/recommendations"><a className="text-sm text-gray-600 hover:text-primary">Gift Recommendations</a></Link></li>
                  <li><Link href="/price-tracking"><a className="text-sm text-gray-600 hover:text-primary">Price Tracking</a></Link></li>
                  <li><Link href="/extension"><a className="text-sm text-gray-600 hover:text-primary">Browser Extension</a></Link></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold mb-3">Company</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-sm text-gray-600 hover:text-primary">About Us</a></li>
                  <li><a href="#" className="text-sm text-gray-600 hover:text-primary">Careers</a></li>
                  <li><a href="#" className="text-sm text-gray-600 hover:text-primary">Contact</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold mb-3">Legal</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-sm text-gray-600 hover:text-primary">Privacy Policy</a></li>
                  <li><a href="#" className="text-sm text-gray-600 hover:text-primary">Terms of Service</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t text-sm text-center text-gray-600">
            © {new Date().getFullYear()} WishKeeper. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}