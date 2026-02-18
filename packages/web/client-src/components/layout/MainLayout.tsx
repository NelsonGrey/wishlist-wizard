import React from "react";
import { Link, useLocation } from "wouter";
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
import Footer from "@/components/Footer";

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
  
  // Skip user API calls until backend is deployed
  const currentUser = null as CurrentUser | null;
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  // Skip notifications API calls until backend is deployed
  const notifications: Notification[] = [];
  
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
              <span className="font-bold text-xl tracking-tight">Wishlist Wizard</span>
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
                        <AvatarImage src={currentUser?.avatarUrl || undefined} alt={currentUser?.displayName || currentUser?.username || 'User'} />
                        <AvatarFallback>
                          {currentUser?.displayName?.charAt(0) || currentUser?.username?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-3 py-2">
                      <div className="font-medium">{currentUser?.displayName || currentUser?.username}</div>
                      <div className="text-xs text-muted-foreground truncate">{currentUser?.email}</div>
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
                      <Link href="/privacy-settings">
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
      <Footer />
    </div>
  );
}