import { Router, Route, Switch, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Suspense, lazy, useEffect, useRef } from "react";
import { getAnalyticsTracker } from "@shared/firebase-utils";
import { useAuth } from "./contexts/AuthContext";
import { trackPageView } from "./lib/analytics";
import CookieConsentBanner from "./components/CookieConsentBanner";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { queryClient } from "./lib/queryClient";
import EnvironmentPasswordGate from "./components/security/EnvironmentPasswordGate";
import MarketingHoldingPage from "./pages/MarketingHoldingPage";
import { useMarketingOffline } from "./hooks/useMarketingOffline";
import { marketingHoldingPageRoutes } from "./lib/marketingRoutes";

// Layouts
import PublicLayout from "./components/layout/PublicLayout";
import AppLayout from "./components/layout/AppLayout";
import AuthLayout from "./components/layout/AuthLayout";

const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Wishlists = lazy(() => import("./pages/Wishlists"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Settings = lazy(() => import("./pages/Settings"));
const AchievementsGuide = lazy(() => import("./pages/AchievementsGuide"));
const Subscription = lazy(() => import("./pages/Subscription"));
const WishlistDetail = lazy(() => import("./pages/WishlistDetail"));
const Recommendations = lazy(() => import("./pages/Recommendations"));
const PriceTracking = lazy(() => import("./pages/PriceTracking"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Notifications = lazy(() => import("./pages/Notifications"));
const ExtensionPage = lazy(() => import("./pages/ExtensionPage"));
const PrivacySettings = lazy(() => import("./pages/PrivacySettings"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const SharedWishlist = lazy(() => import("./pages/SharedWishlist"));
const NotFound = lazy(() => import("./pages/not-found"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const About = lazy(() => import("./pages/About"));
const Support = lazy(() => import("./pages/Support"));
const Subscriptions = lazy(() => import("./pages/Subscriptions"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const AffiliateCommissions = lazy(() => import("./pages/AffiliateCommissions"));
const CreatorProgram = lazy(() => import("./pages/CreatorProgram"));
const Download = lazy(() => import("./pages/Download"));
const MobileAppDemo = lazy(() => import("./pages/demos/MobileAppDemo"));
const BrowserExtensionDemo = lazy(() => import("./pages/demos/BrowserExtensionDemo"));
const SocialIntegrationDemo = lazy(() => import("./pages/demos/SocialIntegrationDemo"));
const CalendarIntegrationDemo = lazy(() => import("./pages/demos/CalendarIntegrationDemo"));
const WishlistManagementDemo = lazy(() => import("./pages/demos/WishlistManagementDemo"));
const ActivityInsightsDemo = lazy(() => import("./pages/demos/ActivityInsightsDemo"));
const AdvancedUserProfilesDemo = lazy(() => import("./pages/demos/AdvancedUserProfilesDemo"));

// Super-admin pages
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const UserDetail = lazy(() => import("./pages/admin/UserDetail"));
const SupportTickets = lazy(() => import("./pages/admin/SupportTickets"));
const AuditLog = lazy(() => import("./pages/admin/AuditLog"));
const AffiliateAdmin = lazy(() => import("./pages/admin/AffiliateAdmin"));

function resolveRuntimeEnvironment(): 'development' | 'staging' | 'production' {
  const processEnvironment =
    typeof process !== 'undefined' && process.env
      ? String(process.env.VITE_ENVIRONMENT || '')
      : '';
  const explicitEnvironment = String(import.meta.env.VITE_ENVIRONMENT || processEnvironment || '').toLowerCase();
  if (explicitEnvironment === 'development' || explicitEnvironment === 'staging' || explicitEnvironment === 'production') {
    return explicitEnvironment;
  }

  if (typeof window !== 'undefined') {
    const hostname = String(window.location?.hostname || '').toLowerCase();

    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('wishlist-wizard-dev.web.app')) {
      return 'development';
    }

    if (hostname.includes('wishlist-wizard-staging.web.app')) {
      return 'staging';
    }

    if (
      hostname === 'wishlist-wizard-prod.web.app' ||
      hostname === 'wishlist-wizard.web.app' ||
      hostname === 'wishlist-wizard.com' ||
      hostname === 'www.wishlist-wizard.com'
    ) {
      return 'production';
    }
  }

  return 'development';
}

// Small redirect helper component for wouter routes
function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to);
  }, [to, setLocation]);
  return null;
}

function AnalyticsRouteTracker() {
  const [location] = useLocation();
  const hasTrackedInitialRoute = useRef(false);

  useEffect(() => {
    if (!hasTrackedInitialRoute.current) {
      hasTrackedInitialRoute.current = true;
      return;
    }

    getAnalyticsTracker().logPageView(location, document.title);
    trackPageView(location);
  }, [location]);

  return null;
}

// Determine which layout to use based on current route
function LayoutRouter({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Auth pages - use AuthLayout
  const authPages = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
  if (authPages.some(page => location.startsWith(page))) {
    return <AuthLayout>{children}</AuthLayout>;
  }

  // Authenticated app pages (/app/* and /admin/*) use AppLayout (app-shell scroll).
  // /extension is also in-app nav item — an authenticated user clicking it from
  // AppLayout should keep the app shell rather than dropping into the marketing
  // site's PublicLayout. Anonymous visitors (e.g. from marketing links) still
  // get PublicLayout. All other pages — marketing, demos, legal — always use
  // PublicLayout regardless of auth state.
  const isAppShellPage = location.startsWith('/app/') || location.startsWith('/admin') || location === '/extension';
  if (!authLoading && isAuthenticated && isAppShellPage) {
    return <AppLayout>{children}</AppLayout>;
  }

  return <PublicLayout>{children}</PublicLayout>;
}

function NonHomeEnvironmentGate({ children }: { children: React.ReactNode }) {
  const environment = resolveRuntimeEnvironment();
  const nonProdPassword = String(import.meta.env.VITE_NON_PROD_SITE_PASSWORD || '');

  return (
    <EnvironmentPasswordGate environment={environment} requiredPassword={nonProdPassword}>
      {children}
    </EnvironmentPasswordGate>
  );
}

// Gates the marketing route group behind the marketing_offline Remote
// Config flag (see hooks/useMarketingOffline and lib/marketingRoutes).
// Independent of app_offline — legal/support pages, auth pages, and the app
// itself are never affected by this. Renders full-bleed, outside
// LayoutRouter, so the holding page isn't wrapped in PublicLayout's own
// header/footer chrome.
function MarketingRoutesGate({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isMarketingOffline = useMarketingOffline();

  if (isMarketingOffline && marketingHoldingPageRoutes.includes(location)) {
    return <MarketingHoldingPage />;
  }

  return <>{children}</>;
}

function AppRouter() {
  // Analytics is handled by GTM (GTM-KRDC75LR loaded in index.html) + Consent Mode v2.

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router>
            <CookieConsentBanner />
            <AnalyticsRouteTracker />
            <MarketingRoutesGate>
            <LayoutRouter>
              <NonHomeEnvironmentGate>
                <Suspense fallback={<div className="flex-1 min-h-[60vh]" aria-busy="true" />}>
                  <Switch>
                  {/* Public Pages - Marketing Site */}
                  <Route path="/" component={Home} />
                  <Route path="/extension" component={ExtensionPage} />
                  <Route path="/download" component={Download} />
                  <Route path="/subscriptions" component={Subscriptions} />
                  <Route path="/how-it-works" component={HowItWorks} />
                  <Route path="/affiliate-commissions" component={AffiliateCommissions} />
                  <Route path="/creator-program" component={CreatorProgram} />
                  {/* Legacy redirect — keep for existing links and search indexing */}
                  <Route path="/plans" component={() => <Redirect to="/subscriptions" />} />
                    <Route path="/about" component={About} />
                    {/* Canonical legal/support routes */}
                    <Route path="/terms" component={TermsOfService} />
                    <Route path="/privacy" component={PrivacyPolicy} />
                    <Route path="/cookies" component={CookiePolicy} />
                    <Route path="/support" component={Support} />
                    {/* Legacy URL redirects — keep for backlinks / indexed pages */}
                    <Route path="/privacy-policy" component={() => <Redirect to="/privacy" />} />
                    <Route path="/cookie-policy" component={() => <Redirect to="/cookies" />} />
                    <Route path="/contact" component={() => <Redirect to="/support" />} />
                    <Route path="/mobile-app-demo" component={MobileAppDemo} />
                    <Route path="/browser-extension-demo" component={BrowserExtensionDemo} />
                    <Route path="/social-integration-demo" component={SocialIntegrationDemo} />
                    <Route path="/calendar-integration-demo" component={CalendarIntegrationDemo} />
                    <Route path="/wishlist-management-demo" component={WishlistManagementDemo} />
                    <Route path="/basic-activity-insights-demo" component={ActivityInsightsDemo} />
                    <Route path="/advanced-user-profiles-demo" component={AdvancedUserProfilesDemo} />
                    {/* Redirect legacy marketing route to homepage */}
                    <Route path="/price-tracking" component={() => <Redirect to="/" />} />

                  {/* Auth Pages */}
                  <Route path="/login" component={Login} />
                  <Route path="/register" component={Register} />
                  <Route path="/forgot-password" component={ForgotPassword} />
                  <Route path="/reset-password" component={ResetPassword} />
                  <Route path="/verify-email" component={VerifyEmail} />

                  {/* App Pages - Authenticated Portal */}
                  <Route
                    path="/app/dashboard"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <Dashboard />
                      </ProtectedRoute>
                    )}
                  />
                  <Route
                    path="/app/wishlists"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <Wishlists />
                      </ProtectedRoute>
                    )}
                  />
                  <Route
                    path="/app/user-profile"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <UserProfile />
                      </ProtectedRoute>
                    )}
                  />
                  <Route
                    path="/app/subscription"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <Subscription />
                      </ProtectedRoute>
                    )}
                  />
                  <Route
                    path="/app/wishlist/:id"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <WishlistDetail />
                      </ProtectedRoute>
                    )}
                  />
                  <Route
                    path="/app/wishlists/:id"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <WishlistDetail />
                      </ProtectedRoute>
                    )}
                  />
                  <Route
                    path="/app/recommendations"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <Recommendations />
                      </ProtectedRoute>
                    )}
                  />
                  <Route
                    path="/app/price-tracking"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <PriceTracking />
                      </ProtectedRoute>
                    )}
                  />
                  {/* Creator Dashboard folded into the unified Dashboard's Creator tab */}
                  <Route path="/app/creator-dashboard" component={() => <Redirect to="/app/dashboard?tab=creator" />} />
                  <Route
                    path="/app/calendar"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <Calendar />
                      </ProtectedRoute>
                    )}
                  />
                  <Route
                    path="/app/notifications"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <Notifications />
                      </ProtectedRoute>
                    )}
                  />
                  <Route
                    path="/app/privacy-settings"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <PrivacySettings />
                      </ProtectedRoute>
                    )}
                  />
                  <Route
                    path="/app/settings"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <Settings />
                      </ProtectedRoute>
                    )}
                  />
                  <Route
                    path="/app/achievements"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <AchievementsGuide />
                      </ProtectedRoute>
                    )}
                  />
                  <Route
                    path="/shared/:shareId"
                    component={() => (
                      // Public/unauthenticated, but still real app content —
                      // governed by app_offline, not marketing_offline.
                      // ProtectedRoute with no auth flags just applies the
                      // app_offline gate here without requiring a login.
                      <ProtectedRoute>
                        <SharedWishlist />
                      </ProtectedRoute>
                    )}
                  />
                  {/* Analytics folded into the unified Dashboard's Analytics tab */}
                  <Route path="/app/analytics" component={() => <Redirect to="/app/dashboard?tab=analytics" />} />

                  {/* Legacy Authenticated Routes -> canonical /app namespace */}
                  <Route path="/dashboard" component={() => <Redirect to="/app/wishlists" />} />
                  <Route path="/wishlists" component={() => <Redirect to="/app/wishlists" />} />
                  <Route path="/dashboard-firebase" component={() => <Redirect to="/app/wishlists" />} />
                  <Route path="/user-profile" component={() => <Redirect to="/app/user-profile" />} />
                  <Route
                    path="/wishlist/:id"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <WishlistDetail />
                      </ProtectedRoute>
                    )}
                  />
                  <Route
                    path="/wishlists/:id"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <WishlistDetail />
                      </ProtectedRoute>
                    )}
                  />
                  <Route path="/recommendations" component={() => <Redirect to="/app/recommendations" />} />
                  <Route path="/calendar" component={() => <Redirect to="/app/calendar" />} />
                  <Route path="/notifications" component={() => <Redirect to="/app/notifications" />} />
                  <Route path="/privacy-settings" component={() => <Redirect to="/app/privacy-settings" />} />
                  <Route path="/analytics" component={() => <Redirect to="/app/dashboard?tab=analytics" />} />

                  {/* ──────────────────────────────────────── */}
                  {/* Super-Admin Routes (deeper pages always  */}
                  {/* registered; self-guard via token claim   */}
                  {/* check. The overview folded into the      */}
                  {/* unified Dashboard's Admin tab.)          */}
                  {/* ──────────────────────────────────────── */}
                  <Route path="/admin" component={() => <Redirect to="/app/dashboard?tab=admin" />} />
                  <Route path="/admin/users" component={UserManagement} />
                  <Route path="/admin/users/:uid" component={UserDetail} />
                  <Route path="/admin/tickets" component={SupportTickets} />
                  <Route path="/admin/audit-log" component={AuditLog} />
                  <Route path="/admin/affiliate" component={AffiliateAdmin} />

                  {/* 404 — must stay last: wouter's path-less Route always matches */}
                  <Route component={NotFound} />
                  </Switch>
                </Suspense>
              </NonHomeEnvironmentGate>
            </LayoutRouter>
            </MarketingRoutesGate>
          </Router>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default AppRouter;
