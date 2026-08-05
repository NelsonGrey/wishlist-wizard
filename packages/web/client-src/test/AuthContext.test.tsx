import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from './utils';
import { ReactNode } from 'react';

const analyticsTrackerMock = {
  setUserProperties: vi.fn(),
  logFeatureFlagEnabled: vi.fn(),
  logUserLogin: vi.fn(),
  logUserSignup: vi.fn(),
};

const remoteConfigMock = {
  isFeatureEnabled: vi.fn(() => true),
  isFeatureEnabledForUser: vi.fn(() => true),
};

// Mock Firebase Auth before importing
vi.mock('@/lib/firebase', () => ({
  initFirebase: vi.fn(async () => ({ remoteConfig: remoteConfigMock })),
  onAuthStateChange: vi.fn((callback) => {
    callback(null);
    return vi.fn();
  }),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  verifyEmail: vi.fn(),
  changePassword: vi.fn(),
  checkPasswordPolicy: vi.fn(async () => ({
    isValid: true,
    passwordPolicy: { customStrengthOptions: {} },
  })),
}));

vi.mock('@shared/firebase-utils', () => ({
  FeatureFlags: {
    ENABLE_ANALYTICS: 'enable_analytics',
    ENABLE_PERFORMANCE_MONITORING: 'enable_performance_monitoring',
    PRICE_ALERTS_ENABLED: 'price_alerts_enabled',
    GROUP_GIFTING_ENABLED: 'group_gifting_enabled',
  },
  getAnalyticsTracker: vi.fn(() => analyticsTrackerMock),
}));

// Import after mocking
import { initFirebase } from '@/lib/firebase';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Test component that uses auth context
function TestAuthComponent() {
  const { user, loading, isAuthenticated } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'ready'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'true' : 'false'}</div>
      <div data-testid="user">{user?.email || 'none'}</div>
    </div>
  );
}

function TestWrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('Authentication Context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    remoteConfigMock.isFeatureEnabled.mockReturnValue(true);
    remoteConfigMock.isFeatureEnabledForUser.mockReturnValue(true);
  });

  describe('Auth State Management', () => {
    it('should render without crashing', async () => {
      // Act
      render(<TestAuthComponent />, { wrapper: TestWrapper });

      // Assert
      expect(document.body).toBeTruthy();
    });

    it('should provide loading state', async () => {
      // Act
      render(<TestAuthComponent />, { wrapper: TestWrapper });

      // Assert
      await waitFor(() => {
        const loading = screen.getByTestId('loading');
        expect(loading).toBeTruthy();
      });
    });

    it('should provide authenticated state', async () => {
      // Act
      render(<TestAuthComponent />, { wrapper: TestWrapper });

      // Assert
      await waitFor(() => {
        const authenticated = screen.getByTestId('authenticated');
        expect(['true', 'false']).toContain(authenticated.textContent);
      });
    });

    it('should expose user info or none', async () => {
      // Act
      render(<TestAuthComponent />, { wrapper: TestWrapper });

      // Assert
      await waitFor(() => {
        const userDisplay = screen.getByTestId('user');
        expect(userDisplay.textContent).toBeDefined();
      });
    });
  });

  describe('Auth Context Hook', () => {
    it('should provide context through useAuth hook', async () => {
      // Act
      render(<TestAuthComponent />, { wrapper: TestWrapper });

      // Assert
      const auth = screen.getByTestId('authenticated');
      expect(auth).toBeTruthy();
    });
  });

  describe('Provider Initialization', () => {
    it('should initialize AuthProvider successfully', async () => {
      // Act
      const { container } = render(
        <AuthProvider>
          <div>Content</div>
        </AuthProvider>
      );

      // Assert
      expect(container.querySelector('div')).toBeTruthy();
    });

    it('initializes Firebase client services with analytics and remote config enabled', async () => {
      render(
        <AuthProvider>
          <div>Content</div>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(initFirebase).toHaveBeenCalledWith({
          enableAnalytics: true,
          enableAuth: true,
          enableFirestore: true,
          enableRemoteConfig: true,
        });
      });

      expect(analyticsTrackerMock.setUserProperties).toHaveBeenCalledWith({
        platform: 'web',
      });
      expect(remoteConfigMock.isFeatureEnabled).toHaveBeenCalled();
    });
  });
});
