import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../utils';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUseAppOffline = vi.fn();
vi.mock('@/hooks/useAppOffline', () => ({
  useAppOffline: () => mockUseAppOffline(),
}));

describe('ProtectedRoute — app_offline gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('shows AppOfflineNotice instead of children for an authenticated user when app_offline is true', () => {
    mockUseAuth.mockReturnValue({ loading: false, isAuthenticated: true });
    mockUseAppOffline.mockReturnValue(true);

    render(
      <ProtectedRoute requireAuth>
        <div>Protected content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Wishlist Wizard is not available right now')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('shows AppOfflineNotice for an unauthenticated visitor too, without redirecting to login', async () => {
    mockUseAuth.mockReturnValue({ loading: false, isAuthenticated: false });
    mockUseAppOffline.mockReturnValue(true);

    render(
      <ProtectedRoute requireAuth>
        <div>Protected content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Wishlist Wizard is not available right now')).toBeInTheDocument();
    // Give the redirect effect a tick to (not) fire.
    await waitFor(() => expect(sessionStorage.getItem('redirectAfterAuth')).toBeNull());
  });

  it('renders children normally when app_offline is false and the user is authenticated', () => {
    mockUseAuth.mockReturnValue({ loading: false, isAuthenticated: true });
    mockUseAppOffline.mockReturnValue(false);

    render(
      <ProtectedRoute requireAuth>
        <div>Protected content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(screen.queryByText('Wishlist Wizard is not available right now')).not.toBeInTheDocument();
  });

  it('shows the loading state before the app_offline gate, even while offline', () => {
    mockUseAuth.mockReturnValue({ loading: true, isAuthenticated: false });
    mockUseAppOffline.mockReturnValue(true);

    render(
      <ProtectedRoute requireAuth>
        <div>Protected content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Wishlist Wizard is not available right now')).not.toBeInTheDocument();
  });

  it('with no auth flags set (public content), still applies the app_offline gate', () => {
    mockUseAuth.mockReturnValue({ loading: false, isAuthenticated: false });
    mockUseAppOffline.mockReturnValue(true);

    render(
      <ProtectedRoute>
        <div>Public shared content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Wishlist Wizard is not available right now')).toBeInTheDocument();
    expect(screen.queryByText('Public shared content')).not.toBeInTheDocument();
  });
});
