import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth'; // Assuming this hook exists
import { apiRequest } from '@/lib/queryClient';

// Mock the API client
vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
  queryClient: {
    invalidateQueries: vi.fn()
  }
}));

// Custom wrapper with query client for testing hooks
const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should initialize with no user and loading state', () => {
    // Arrange & Act
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    // Assert
    expect(result.current.user).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isLoggedIn).toBe(false);
  });
  
  it('should handle successful login', async () => {
    // Arrange
    const loginCredentials = {
      username: 'testuser',
      password: 'password123'
    };
    
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com'
    };
    
    (apiRequest as any).mockResolvedValueOnce({
      json: () => Promise.resolve(mockUser),
      ok: true
    });
    
    // Act
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.login(loginCredentials);
    });
    
    // Assert
    expect(apiRequest).toHaveBeenCalledWith(
      'POST',
      '/api/auth/login',
      loginCredentials
    );
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.error).toBeNull();
  });
  
  it('should handle login failure', async () => {
    // Arrange
    const loginCredentials = {
      username: 'testuser',
      password: 'wrongpassword'
    };
    
    const errorResponse = {
      error: 'Invalid credentials'
    };
    
    (apiRequest as any).mockRejectedValueOnce(new Error('Invalid credentials'));
    
    // Act
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.login(loginCredentials);
    });
    
    // Assert
    expect(apiRequest).toHaveBeenCalledWith(
      'POST',
      '/api/auth/login',
      loginCredentials
    );
    expect(result.current.user).toBeNull();
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.error).toMatch(/invalid credentials/i);
  });
  
  it('should handle logout', async () => {
    // Arrange
    const mockUser = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com'
    };
    
    // Mock initial state as logged in
    (apiRequest as any)
      // First for the initial auth check
      .mockResolvedValueOnce({
        json: () => Promise.resolve(mockUser),
        ok: true
      })
      // Then for the logout request
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
        ok: true
      });
    
    // Act
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    // First we need to set the initial state to logged in
    await act(async () => {
      // Manually set auth state for testing
      if (result.current.setAuthState) {
        result.current.setAuthState({
          user: mockUser,
          isLoggedIn: true,
          isLoading: false,
          error: null
        });
      }
    });
    
    // Then perform logout
    await act(async () => {
      await result.current.logout();
    });
    
    // Assert
    expect(apiRequest).toHaveBeenCalledWith('POST', '/api/auth/logout');
    expect(result.current.user).toBeNull();
    expect(result.current.isLoggedIn).toBe(false);
  });
  
  it('should handle registration', async () => {
    // Arrange
    const registerData = {
      username: 'newuser',
      email: 'new@example.com',
      password: 'newpassword123'
    };
    
    const mockUser = {
      id: 2,
      username: 'newuser',
      email: 'new@example.com'
    };
    
    (apiRequest as any).mockResolvedValueOnce({
      json: () => Promise.resolve(mockUser),
      ok: true
    });
    
    // Act
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.register(registerData);
    });
    
    // Assert
    expect(apiRequest).toHaveBeenCalledWith(
      'POST',
      '/api/auth/register',
      registerData
    );
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.error).toBeNull();
  });
});