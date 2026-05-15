import { Router, Route, Switch, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Suspense, lazy, useEffect, useRef } from "react";
import { getAnalyticsTracker } from "@shared/firebase-utils";
import { useAuth } from "./contexts/AuthContext";
import { initGA, trackPageView } from "./lib/analytics";
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
const Blog = lazy(() => import("./pages/Blog"));
const Contact = lazy(() => import("./pages/Contact"));
const FeatureDemo = lazy(() => import("./pages/FeatureDemo"));

// Super-admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const SupportTickets = lazy(() => import("./pages/admin/SupportTickets"));
const AuditLog = lazy(() => import("./pages/admin/AuditLog"));

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
  const isAuthPage = authPages.some(page => location.startsWith(page));

  if (isAuthPage) {
    return <AuthLayout>{children}</AuthLayout>;
  }

  // Once authenticated, always use AppLayout on non-auth pages
  // so navigation updates to solution-specific functionality.
  if (!authLoading && isAuthenticated) {
    return <AppLayout>{children}</AppLayout>;
  }

  return <PublicLayout>{children}</PublicLayout>;
}

function NonHomeEnvironmentGate({ children }: { children: React.ReactNode }) {
  const environment = String(import.meta.env.VITE_ENVIRONMENT || import.meta.env.MODE || 'development').toLowerCase();
  const nonProdPassword = String(import.meta.env.VITE_NON_PROD_SITE_PASSWORD || '');

  return (
    <EnvironmentPasswordGate environment={environment} requiredPassword={nonProdPassword}>
      {children}
    </EnvironmentPasswordGate>
  );
}

function AppRouter() {
  const environment = String(import.meta.env.VITE_ENVIRONMENT || import.meta.env.MODE || 'development').toLowerCase();
  const isProductionEnvironment = environment === 'production';

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
          <Router>
            <AnalyticsRouteTracker />
            <LayoutRouter>
              <NonHomeEnvironmentGate>
                <Suspense fallback={null}>
                  <Switch>
                  {/* Public Pages - Marketing Site */}
                  <Route path="/" component={Home} />
                  <Route path="/extension" component={ExtensionPage} />
                    <Route path="/about" component={About} />
                    <Route path="/blog" component={Blog} />
                    <Route path="/contact" component={Contact} />
                    <Route path="/terms" component={TermsOfService} />
                    <Route path="/privacy-policy" component={PrivacyPolicy} />
                    <Route path="/cookie-policy" component={CookiePolicy} />
                    <Route path="/mobile-app-demo" component={() => <FeatureDemo feature="mobile-app" />} />
                    <Route path="/browser-extension-demo" component={() => <FeatureDemo feature="browser-extension" />} />
                    <Route path="/social-integration-demo" component={() => <FeatureDemo feature="social-integration" />} />
                    <Route path="/calendar-integration-demo" component={() => <FeatureDemo feature="calendar-integration" />} />
                    <Route path="/wishlist-management-demo" component={() => <FeatureDemo feature="wishlist-management" />} />
                    <Route path="/basic-activity-insights-demo" component={() => <FeatureDemo feature="basic-activity-insights" />} />
                    <Route path="/advanced-user-profiles-demo" component={() => <FeatureDemo feature="advanced-user-profiles" />} />
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
