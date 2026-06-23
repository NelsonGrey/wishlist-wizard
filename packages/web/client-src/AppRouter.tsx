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

// Layouts
import PublicLayout from "./components/layout/PublicLayout";
import AppLayout from "./components/layout/AppLayout";
import AuthLayout from "./components/layout/AuthLayout";

const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DashboardFirebase = lazy(() => import("./pages/DashboardFirebase"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
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
const Analytics = lazy(() => import("./pages/Analytics"));
const NotFound = lazy(() => import("./pages/not-found"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Subscriptions = lazy(() => import("./pages/Subscriptions"));
const Download = lazy(() => import("./pages/Download"));
const MobileAppDemo = lazy(() => import("./pages/demos/MobileAppDemo"));
const BrowserExtensionDemo = lazy(() => import("./pages/demos/BrowserExtensionDemo"));
const SocialIntegrationDemo = lazy(() => import("./pages/demos/SocialIntegrationDemo"));
const CalendarIntegrationDemo = lazy(() => import("./pages/demos/CalendarIntegrationDemo"));
const WishlistManagementDemo = lazy(() => import("./pages/demos/WishlistManagementDemo"));
const ActivityInsightsDemo = lazy(() => import("./pages/demos/ActivityInsightsDemo"));
const AdvancedUserProfilesDemo = lazy(() => import("./pages/demos/AdvancedUserProfilesDemo"));

// Super-admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const UserDetail = lazy(() => import("./pages/admin/UserDetail"));
const SupportTickets = lazy(() => import("./pages/admin/SupportTickets"));
const AuditLog = lazy(() => import("./pages/admin/AuditLog"));

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
  // All other pages — marketing, demos, legal — always use PublicLayout (traditional
  // browser-window scroll) regardless of auth state.
  const isAppShellPage = location.startsWith('/app/') || location.startsWith('/admin');
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

function AppRouter() {
  const environment = resolveRuntimeEnvironment();
  const isProductionEnvironment = environment === 'production';

  // Analytics is handled by GTM (GTM-KRDC75LR loaded in index.html) + Consent Mode v2.

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router>
            <CookieConsentBanner />
            <AnalyticsRouteTracker />
            <LayoutRouter>
              <NonHomeEnvironmentGate>
                <Suspense fallback={<div className="flex-1 min-h-[60vh]" aria-busy="true" />}>
                  <Switch>
                  {/* Public Pages - Marketing Site */}
                  <Route path="/" component={Home} />
                  <Route path="/extension" component={ExtensionPage} />
                  <Route path="/download" component={Download} />
                  <Route path="/subscriptions" component={Subscriptions} />
                  {/* Legacy redirect — keep for existing links and search indexing */}
                  <Route path="/plans" component={() => <Redirect to="/subscriptions" />} />
                    <Route path="/about" component={About} />
                    {/* Canonical legal/support routes */}
                    <Route path="/terms" component={TermsOfService} />
                    <Route path="/privacy" component={PrivacyPolicy} />
                    <Route path="/cookies" component={CookiePolicy} />
                    <Route path="/support" component={Contact} />
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

                  {!isProductionEnvironment && (
                    <>
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
                        <Dashboard />
                      </ProtectedRoute>
                    )}
                  />
                  <Route
                    path="/app/dashboard-firebase"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <DashboardFirebase />
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
                  <Route path="/shared/:shareId" component={SharedWishlist} />
                  <Route
                    path="/app/analytics"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <Analytics />
                      </ProtectedRoute>
                    )}
                  />

                  {/* Legacy Authenticated Routes -> canonical /app namespace */}
                  <Route path="/dashboard" component={() => <Redirect to="/app/dashboard" />} />
                  <Route path="/wishlists" component={() => <Redirect to="/app/wishlists" />} />
                  <Route path="/dashboard-firebase" component={() => <Redirect to="/app/dashboard-firebase" />} />
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
                  <Route path="/analytics" component={() => <Redirect to="/app/analytics" />} />
                    </>
                  )}

                  {isProductionEnvironment && (
                    <>
                      <Route path="/app/:rest*" component={() => <Redirect to="/" />} />
                      <Route path="/dashboard" component={() => <Redirect to="/" />} />
                      <Route path="/wishlists" component={() => <Redirect to="/" />} />
                      <Route path="/dashboard-firebase" component={() => <Redirect to="/" />} />
                      <Route path="/user-profile" component={() => <Redirect to="/" />} />
                      <Route path="/wishlist/:id" component={() => <Redirect to="/" />} />
                      <Route path="/shared/:shareId" component={() => <Redirect to="/" />} />
                      <Route path="/login" component={() => <Redirect to="/" />} />
                      <Route path="/register" component={() => <Redirect to="/" />} />
                      <Route path="/forgot-password" component={() => <Redirect to="/" />} />
                      <Route path="/reset-password" component={() => <Redirect to="/" />} />
                      <Route path="/verify-email" component={() => <Redirect to="/" />} />
                    </>
                  )}

                  {/* 404 */}
                  <Route component={NotFound} />

                  {/* ──────────────────────────────────────── */}
                  {/* Super-Admin Routes (always registered;   */}
                  {/* pages self-guard via token claim check)  */}
                  {/* ──────────────────────────────────────── */}
                  <Route path="/admin" component={AdminDashboard} />
                  <Route path="/admin/users" component={UserManagement} />
                  <Route path="/admin/users/:uid" component={UserDetail} />
                  <Route path="/admin/tickets" component={SupportTickets} />
                  <Route path="/admin/audit-log" component={AuditLog} />
                  </Switch>
                </Suspense>
              </NonHomeEnvironmentGate>
            </LayoutRouter>
          </Router>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default AppRouter;
