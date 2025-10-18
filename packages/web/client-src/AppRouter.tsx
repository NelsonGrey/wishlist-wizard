import { Router, Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { initGA } from "./lib/analytics";
import { initFirebase } from "./lib/firebase";
import { AuthProvider } from "./contexts/AuthContext";
import { queryClient } from "./lib/queryClient";

// Pages
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import DashboardFirebase from "./pages/DashboardFirebase";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserProfile from "./pages/UserProfile";
import WishlistDetail from "./pages/WishlistDetail";
import Recommendations from "./pages/Recommendations";
import PriceTracking from "./pages/PriceTracking";
import PriceTrackingDemo from "./pages/PriceTrackingDemo";
import Calendar from "./pages/Calendar";
import Notifications from "./pages/Notifications";
import ExtensionPage from "./pages/ExtensionPage";
import SocialSharingDemo from "./pages/SocialSharingDemo";
import MobileAppDemo from "./pages/MobileAppDemo";
import ArVisualizerDemo from "./pages/ArVisualizerDemo";
import PrivacySettings from "./pages/PrivacySettings";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import SharedWishlist from "./pages/SharedWishlist";
import Analytics from "./pages/Analytics";
import MainLayout from "./components/layout/MainLayout";
import ComingSoon from "./pages/ComingSoon";
import NotFound from "./pages/not-found";

function AppRouter() {
  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Initialize GA if key is provided (no warning if missing)
    initGA();

    // Firebase initialization is now handled by AuthProvider
    // to ensure proper Auth initialization timing
  }, []);

  // Check if Coming Soon mode is enabled
  const isComingSoonEnabled = import.meta.env.VITE_SHOW_COMING_SOON_DEVELOPMENT === 'true';

  if (isComingSoonEnabled) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <ComingSoon />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router>
            <MainLayout>
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/dashboard-firebase" component={DashboardFirebase} />
                <Route path="/login" component={Login} />
                <Route path="/register" component={Register} />
                <Route path="/user-profile" component={UserProfile} />
                <Route path="/wishlist/:id" component={WishlistDetail} />
                <Route path="/recommendations" component={Recommendations} />
                <Route path="/price-tracking" component={PriceTracking} />
                <Route path="/price-tracking-demo" component={PriceTrackingDemo} />
                <Route path="/calendar" component={Calendar} />
                <Route path="/notifications" component={Notifications} />
                <Route path="/extension" component={ExtensionPage} />
                <Route path="/social-sharing-demo" component={SocialSharingDemo} />
                <Route path="/mobile-app-demo" component={MobileAppDemo} />
                <Route path="/ar-visualizer-demo" component={ArVisualizerDemo} />
                <Route path="/privacy-settings" component={PrivacySettings} />
                <Route path="/forgot-password" component={ForgotPassword} />
                <Route path="/reset-password" component={ResetPassword} />
                <Route path="/verify-email" component={VerifyEmail} />
                <Route path="/shared/:shareId" component={SharedWishlist} />
                <Route path="/analytics" component={Analytics} />
                <Route component={NotFound} />
              </Switch>
            </MainLayout>
          </Router>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default AppRouter;