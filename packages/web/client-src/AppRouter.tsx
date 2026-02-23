import { Router, Route, Switch, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Suspense, lazy, useEffect } from "react";
import { useAuth } from "./contexts/AuthContext";
import { initGA } from "./lib/analytics";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { queryClient } from "./lib/queryClient";

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

// Small redirect helper component for wouter routes
function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to);
  }, [to, setLocation]);
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

function AppRouter() {
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
            <LayoutRouter>
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
                    <Route path="/ar-visualization-demo" component={() => <FeatureDemo feature="ar-visualization" />} />
                    <Route path="/social-integration-demo" component={() => <FeatureDemo feature="social-integration" />} />
                    <Route path="/price-tracking-demo" component={() => <Redirect to="/app/price-tracking" />} />
                    <Route path="/calendar-integration-demo" component={() => <Redirect to="/calendar" />} />
                    <Route path="/advanced-user-profiles-demo" component={() => <FeatureDemo feature="advanced-user-profiles" />} />
                    <Route path="/ai-gift-recommendations-demo" component={() => <Redirect to="/recommendations" />} />
                    {/* Redirect legacy marketing route to product feature */}
                    <Route path="/price-tracking" component={() => <Redirect to="/app/price-tracking" />} />

                  {/* Auth Pages */}
                  <Route path="/login" component={Login} />
                  <Route path="/register" component={Register} />
                  <Route path="/forgot-password" component={ForgotPassword} />
                  <Route path="/reset-password" component={ResetPassword} />
                  <Route path="/verify-email" component={VerifyEmail} />

                  {/* App Pages - Authenticated Portal */}
                  <Route
                    path="/dashboard"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <Dashboard />
                      </ProtectedRoute>
                    )}
                  />
                  <Route
                    path="/dashboard-firebase"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <DashboardFirebase />
                      </ProtectedRoute>
                    )}
                  />
                  <Route
                    path="/user-profile"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <UserProfile />
                      </ProtectedRoute>
                    )}
                  />
                  <Route
                    path="/wishlist/:id"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <WishlistDetail />
                      </ProtectedRoute>
                    )}
                  />
                  <Route
                    path="/recommendations"
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
                    path="/calendar"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <Calendar />
                      </ProtectedRoute>
                    )}
                  />
                  <Route
                    path="/notifications"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <Notifications />
                      </ProtectedRoute>
                    )}
                  />
                  <Route
                    path="/privacy-settings"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <PrivacySettings />
                      </ProtectedRoute>
                    )}
                  />
                  <Route path="/shared/:shareId" component={SharedWishlist} />
                  <Route
                    path="/analytics"
                    component={() => (
                      <ProtectedRoute requireAuth>
                        <Analytics />
                      </ProtectedRoute>
                    )}
                  />

                  {/* 404 */}
                  <Route component={NotFound} />
                </Switch>
              </Suspense>
            </LayoutRouter>
          </Router>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default AppRouter;
