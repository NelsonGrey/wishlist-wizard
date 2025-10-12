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
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import VerifyEmail from "@/pages/VerifyEmail";
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
import PrivacySettings from "@/pages/PrivacySettings";
import { useEffect } from "react";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import { initFirebase } from "./lib/firebase";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

function Router() {
  // Track page views when routes change
  useAnalytics();
  
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/shared/:shareId" component={SharedWishlist} />
      
      {/* Auth routes - redirect authenticated users */}
      <Route path="/login">
        <ProtectedRoute requireUnauth>
          <Login />
        </ProtectedRoute>
      </Route>
      <Route path="/register">
        <ProtectedRoute requireUnauth>
          <Register />
        </ProtectedRoute>
      </Route>
      <Route path="/forgot-password">
        <ProtectedRoute requireUnauth>
          <ForgotPassword />
        </ProtectedRoute>
      </Route>
      <Route path="/reset-password/:token">
        <ProtectedRoute requireUnauth>
          <ResetPassword />
        </ProtectedRoute>
      </Route>
      <Route path="/verify-email/:token">
        <ProtectedRoute requireUnauth>
          <VerifyEmail />
        </ProtectedRoute>
      </Route>
      
      {/* Protected routes - require authentication */}
      <Route path="/dashboard">
        <ProtectedRoute requireAuth>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/wishlist/:id">
        <ProtectedRoute requireAuth>
          <WishlistDetail />
        </ProtectedRoute>
      </Route>
      <Route path="/notifications">
        <ProtectedRoute requireAuth>
          <Notifications />
        </ProtectedRoute>
      </Route>
      <Route path="/user-profile">
        <ProtectedRoute requireAuth>
          <UserProfile />
        </ProtectedRoute>
      </Route>
      <Route path="/price-tracking">
        <ProtectedRoute requireAuth>
          <PriceTracking />
        </ProtectedRoute>
      </Route>
      <Route path="/recommendations">
        <ProtectedRoute requireAuth>
          <Recommendations />
        </ProtectedRoute>
      </Route>
      <Route path="/calendar">
        <ProtectedRoute requireAuth>
          <Calendar />
        </ProtectedRoute>
      </Route>
      <Route path="/analytics">
        <ProtectedRoute requireAuth>
          <Analytics />
        </ProtectedRoute>
      </Route>
      
      <Route path="/privacy-settings">
        <ProtectedRoute requireAuth>
          <PrivacySettings />
        </ProtectedRoute>
      </Route>
      
      {/* Demo routes - public for now */}
      <Route path="/extension" component={ExtensionPage} />
      <Route path="/extension-welcome" component={ExtensionPage} />
      <Route path="/mobile-demo" component={MobileAppDemo} />
      <Route path="/ar-visualizer" component={ArVisualizerDemo} />
      <Route path="/social-sharing" component={SocialSharingDemo} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Initialize GA if key is provided (no warning if missing)
    initGA();

    // Firebase initialization is now handled by AuthProvider
    // to ensure proper Auth initialization timing
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
