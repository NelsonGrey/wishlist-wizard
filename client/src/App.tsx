import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import WishlistDetail from "@/pages/WishlistDetail";
import SharedWishlist from "@/pages/SharedWishlist";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ExtensionPage from "@/pages/ExtensionPage";
import Notifications from "@/pages/Notifications";
import MobileAppDemo from "@/pages/MobileAppDemo";
import ArVisualizerDemo from "@/pages/ArVisualizerDemo";
import SocialSharingDemo from "@/pages/SocialSharingDemo";
import PriceTracking from "@/pages/PriceTracking";
import UserProfile from "@/pages/UserProfile";
import Recommendations from "@/pages/Recommendations";
import Calendar from "@/pages/Calendar";
import Analytics from "@/pages/Analytics";
import { useEffect } from "react";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import { initFirebase } from "./lib/firebase";

function Router() {
  // Track page views when routes change
  useAnalytics();
  
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/wishlist/:id" component={WishlistDetail} />
      <Route path="/shared/:shareId" component={SharedWishlist} />
      <Route path="/extension" component={ExtensionPage} />
      <Route path="/extension-welcome" component={ExtensionPage} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/mobile-demo" component={MobileAppDemo} />
      <Route path="/ar-visualizer" component={ArVisualizerDemo} />
      <Route path="/social-sharing" component={SocialSharingDemo} />
      <Route path="/price-tracking" component={PriceTracking} />
      <Route path="/user-profile" component={UserProfile} />
      <Route path="/recommendations" component={Recommendations} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/analytics" component={Analytics} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Verify required environment variable is present
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }

    // Initialize Firebase (only if env vars provided)
    initFirebase({ enableAnalytics: true, enableMessaging: false });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
