import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../../contexts/AuthContext';
import { useAppOffline } from '../../hooks/useAppOffline';
import AppOfflineNotice from '../AppOfflineNotice';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireUnauth?: boolean;
  fallbackPath?: string;
}

/**
 * Protected Route Component for Firebase Auth
 *
 * Features:
 * - app_offline: shows AppOfflineNotice instead of children — a real
 *   maintenance mode, covers already-authenticated users too, not just new
 *   signups (see hooks/useAppOffline)
 * - requireAuth: Redirects unauthenticated users to login
 * - requireUnauth: Redirects authenticated users (for login/signup pages)
 * - Loading state handling during auth initialization
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = false,
  requireUnauth = false,
  fallbackPath = '/'
}) => {
  const { loading, isAuthenticated } = useAuth();
  const isAppOffline = useAppOffline();
  const [location, setLocation] = useLocation();

  // Redirect unauthenticated users to login — skipped while app_offline, so
  // a visitor sees AppOfflineNotice directly rather than being bounced to a
  // sign-in form that's itself gated offline.
  useEffect(() => {
    if (requireAuth && !isAuthenticated && !loading && !isAppOffline) {
      // Store current location for post-login redirect
      sessionStorage.setItem('redirectAfterAuth', location);
      setLocation('/login');
    }
  }, [requireAuth, isAuthenticated, loading, isAppOffline, location, setLocation]);

  // Redirect authenticated users away from auth pages
  useEffect(() => {
    if (requireUnauth && isAuthenticated && !loading && !isAppOffline) {
      // Check if there's a stored destination from login redirect
      const storedRedirect = sessionStorage.getItem('redirectAfterAuth');
      const redirectTo = storedRedirect || fallbackPath;
      sessionStorage.removeItem('redirectAfterAuth');
      setLocation(redirectTo);
    }
  }, [requireUnauth, isAuthenticated, loading, isAppOffline, fallbackPath, setLocation]);

  // Show loading state while Firebase Auth initializes
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  // Full maintenance mode: gates already-authenticated users too, not just
  // new sign-ins — takes priority over the requireAuth/requireUnauth checks
  // below.
  if (isAppOffline) {
    return <AppOfflineNotice />;
  }

  // Don't render children if redirecting
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  if (requireUnauth && isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};

export const withAuthProtection = <P extends object>(
  Component: React.ComponentType<P>,
  options: { requireAuth?: boolean; requireUnauth?: boolean; fallbackPath?: string } = {}
) => {
  const ProtectedComponent = (props: P) => (
    <ProtectedRoute {...options}>
      <Component {...props} />
    </ProtectedRoute>
  );
  
  ProtectedComponent.displayName = `withAuthProtection(${Component.displayName || Component.name || 'Component'})`;
  
  return ProtectedComponent;
};

export default ProtectedRoute;