import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../../contexts/AuthContext';

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
  const [location, setLocation] = useLocation();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (requireAuth && !isAuthenticated && !loading) {
      // Store current location for post-login redirect
      sessionStorage.setItem('redirectAfterAuth', location);
      setLocation('/login');
    }
  }, [requireAuth, isAuthenticated, loading, location, setLocation]);

  // Redirect authenticated users away from auth pages
  useEffect(() => {
    if (requireUnauth && isAuthenticated && !loading) {
      // Check if there's a stored destination from login redirect
      const storedRedirect = sessionStorage.getItem('redirectAfterAuth');
      const redirectTo = storedRedirect || fallbackPath;
      sessionStorage.removeItem('redirectAfterAuth');
      setLocation(redirectTo);
    }
  }, [requireUnauth, isAuthenticated, loading, fallbackPath, setLocation]);

  // Show loading state while Firebase Auth initializes
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700"></div>
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
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