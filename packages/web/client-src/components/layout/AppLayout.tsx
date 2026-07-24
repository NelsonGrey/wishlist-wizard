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
  Puzzle,
  Gift
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useLockShellHeight } from "@/hooks/use-lock-shell-height";
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
  const shellRef = useRef<HTMLDivElement>(null);
  useLockShellHeight(shellRef);

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
    { name: 'Wishlists', href: '/app/wishlists', icon: <Gift className="h-5 w-5" />, activePaths: ['/app/wishlists', '/app/wishlist', '/dashboard', '/wishlists', '/wishlist'] },
    { name: 'Dashboard', href: '/app/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, activePaths: ['/app/dashboard'] },
    { name: 'Calendar', href: '/app/calendar', icon: <Calendar className="h-5 w-5" />, activePaths: ['/app/calendar', '/calendar'] },
    { name: 'Extension', href: '/extension', icon: <Puzzle className="h-5 w-5" />, activePaths: ['/extension'] },
  ];

  return (
    <div ref={shellRef} className="h-screen flex flex-col overflow-hidden bg-white">
      {/* App Header */}
      <header className="bg-white border-b border-emerald-100 sticky top-0 z-10 shadow-sm">
        <div className="site-container flex items-center justify-between py-2.5 2xl:py-3">
          {/* Logo */}
          <Link href="/app/wishlists" className="flex items-center hover:scale-105 transition-transform duration-200">
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
          </nav>

          {/* User menu */}
          <div className="flex items-center">
            {currentUser ? (
              <>
                {/* Notifications */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/app/notifications" aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`} className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
                      <Bell className="h-5 w-5 text-gray-700" aria-hidden="true" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
                </Tooltip>

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
                      <Link href="/app/settings" className="flex w-full cursor-pointer items-center">
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                      <Menu className="h-6 w-6" aria-hidden="true" />
                    </Button>
                  </SheetTrigger>
                </TooltipTrigger>
                <TooltipContent>Open navigation menu</TooltipContent>
              </Tooltip>
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
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <GlobalAdSlot placement="top" />

      {/* Main content — scrolls within viewport so footer stays pinned */}
      <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto bg-white">
        <div className="mx-auto min-h-full w-full max-w-[var(--site-content-width)] bg-gray-50">
          {children}
        </div>
      </main>

      <GlobalAdSlot placement="bottom" />
      <Footer />
    </div>
  );
}
