import React, { useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Calendar,
  ChevronDown,
  LogOut,
  Settings,
  User,
  Menu,
  LayoutDashboard,
  Users,
  Smartphone,
  Puzzle,
  BarChart3,
  WalletCards
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/Footer";
import { GlobalAdSlot } from "@/components/ads";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { user, signOut } = useAuth();
  const mainRef = useRef<HTMLElement>(null);

  // Scroll to top when location changes
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location]);

  const currentUser = user;

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const { data: notificationData } = useQuery<{
    unreadCount: number;
  }>({
    queryKey: ["/api/notifications"],
    enabled: !!currentUser,
    refetchInterval: 60000,
  });
  const unreadCount = notificationData?.unreadCount ?? 0;

  const isActivePath = (paths: string[]) => paths.some((path) => location === path || location.startsWith(`${path}/`));

  const primaryNavItems = [
    { name: 'Dashboard', href: '/app/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, activePaths: ['/app/dashboard', '/app/wishlists', '/app/wishlist', '/dashboard', '/wishlists', '/wishlist'] },
    { name: 'Calendar', href: '/app/calendar', icon: <Calendar className="h-5 w-5" />, activePaths: ['/app/calendar', '/calendar'] },
    { name: 'Analytics', href: '/app/analytics', icon: <BarChart3 className="h-5 w-5" />, activePaths: ['/app/analytics', '/analytics'] },
    { name: 'Creator Dashboard', href: '/app/creator-dashboard', icon: <WalletCards className="h-5 w-5" />, activePaths: ['/app/creator-dashboard'] },
  ];

  const featureNavItems = [
    { name: 'Mobile App', href: '/app/dashboard', icon: <Smartphone className="h-4 w-4" />, description: 'Synced wishlists across devices' },
    { name: 'Social Network & Discovery', href: '/app/dashboard', icon: <Users className="h-4 w-4" />, description: 'Discover and collaborate with trusted contacts' },
    { name: 'Calendar Integration', href: '/app/calendar', icon: <Calendar className="h-4 w-4" />, description: 'Event reminders and planning' },
    { name: 'Browser Extension', href: '/extension', icon: <Puzzle className="h-4 w-4" />, description: 'Capture products from any website' },
    { name: 'Advanced User Profiles', href: '/app/user-profile', icon: <User className="h-4 w-4" />, description: 'Personalized gifting preferences' },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* App Header */}
      <header className="bg-white border-b border-emerald-100 sticky top-0 z-10 shadow-sm">
        <div className="site-container flex items-center justify-between py-2.5 2xl:py-3">
          {/* Logo */}
          <Link href="/app/dashboard" className="flex items-center hover:scale-105 transition-transform duration-200">
            <img src="/logo.svg" alt="Wishlist Wizard" className="h-8 w-8 mr-2.5" />
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-emerald-800 to-green-800 bg-clip-text text-transparent">Wishlist Wizard</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {primaryNavItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm flex items-center font-medium transition-all ${
                  isActivePath(item.activePaths)
                    ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 shadow-sm'
                    : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-800'
                }`}
              >
                {item.icon}
                <span className="ml-2">{item.name}</span>
              </Link>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="px-3 py-2 rounded-lg text-sm flex items-center font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-800" aria-label="Open features menu">
                  <Puzzle className="h-5 w-5" />
                  <span className="ml-2">Features</span>
                  <ChevronDown className="h-4 w-4 ml-2 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80">
                {featureNavItems.map((item) => (
                  <DropdownMenuItem key={item.name} asChild>
                    <Link href={item.href} className="flex w-full cursor-pointer items-start gap-3 py-2">
                      <span className="mt-0.5 text-emerald-700">{item.icon}</span>
                      <span>
                        <span className="block font-medium text-slate-900">{item.name}</span>
                        <span className="block text-xs text-slate-500">{item.description}</span>
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* User menu */}
          <div className="flex items-center">
            {currentUser ? (
              <>
                {/* Notifications */}
                <Link href="/app/notifications" aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`} className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
                  <Bell className="h-5 w-5 text-gray-700" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* User dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2 flex items-center" aria-label="Open account menu">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={currentUser?.photoURL || undefined} />
                        <AvatarFallback>
                          {currentUser?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-3 py-2">
                      <div className="font-medium">{currentUser?.displayName || currentUser?.email}</div>
                      <div className="text-xs text-gray-500">{currentUser?.email}</div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/app/user-profile" className="flex w-full cursor-pointer items-center">
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/app/privacy-settings" className="flex w-full cursor-pointer items-center">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md">
                  Login
                </Link>
                <Link href="/register" className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-700 to-green-700 hover:from-emerald-800 hover:to-green-800 rounded-md transition-all">
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden ml-4">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                  <Menu className="h-6 w-6" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <nav className="flex flex-col gap-4 mt-8">
                  {primaryNavItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-2 text-lg font-medium hover:text-emerald-700"
                    >
                      {item.icon}
                      {item.name}
                    </Link>
                  ))}

                  <div className="mt-4 border-t pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Features</p>
                    <div className="flex flex-col gap-3">
                      {featureNavItems.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-start gap-2 text-sm font-medium hover:text-emerald-700"
                        >
                          <span className="mt-0.5">{item.icon}</span>
                          <span>{item.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <GlobalAdSlot placement="top" />

      {/* Main content — scrolls within viewport so footer stays pinned */}
      <main ref={mainRef} className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>

      <GlobalAdSlot placement="bottom" />
      <Footer />
    </div>
  );
}
