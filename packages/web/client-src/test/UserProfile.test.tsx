import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UserProfile from '@/pages/UserProfile';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

const apiRequest = vi.hoisted(() => vi.fn());
const testQueryClient = vi.hoisted(() => ({ invalidateQueries: vi.fn() }));
vi.mock('@/lib/queryClient', () => ({ apiRequest, queryClient: testQueryClient }));

const uploadAvatar = vi.hoisted(() => vi.fn());
vi.mock('@/lib/firebase', () => ({ uploadAvatar }));

const mockUser = {
  uid: '1',
  email: 'mark@example.com',
  displayName: 'Mark Nelson',
  photoURL: null,
  // Noon UTC, not midnight -- avoids the date rolling back a day in a
  // negative-UTC-offset local timezone when formatted below.
  metadata: { creationTime: '2026-01-15T12:00:00.000Z' },
};
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

let mockAchievementsData: unknown;
vi.mock('@/hooks/use-achievements', () => ({
  useAchievements: () => ({ data: mockAchievementsData }),
}));

let mockSubStatus: unknown;
vi.mock('@/hooks/use-subscription-status', () => ({
  useSubscriptionStatus: () => ({ data: mockSubStatus }),
}));

const REMOTE_PROFILE = { displayName: 'Mark Nelson', bio: 'I love gadgets', location: 'Austin', interests: ['Hiking'] };

function setupApiRequest() {
  apiRequest.mockImplementation((url: string, opts?: { method?: string; body?: unknown }) => {
    if (url === '/api/profile' && (!opts || !opts.method)) return Promise.resolve(REMOTE_PROFILE);
    if (url === '/api/profile' && opts?.method === 'PATCH') return Promise.resolve({});
    if (url === '/api/connections') return Promise.resolve({ connections: [] });
    if (url === '/api/connections/pending') return Promise.resolve({ incoming: [], outgoing: [] });
    if (url.startsWith('/api/users/search')) return Promise.resolve({ users: [] });
    if (url === '/api/contacts/external') return Promise.resolve({ contacts: [], providerStatuses: [] });
    if (url === '/api/connections/request') return Promise.resolve({ status: 'pending' });
    if (/^\/api\/connections\/[\w-]+\/respond$/.test(url)) return Promise.resolve({ success: true, status: 'accepted' });
    if (/^\/api\/connections\/[\w-]+$/.test(url) && opts?.method === 'DELETE') return Promise.resolve({ success: true });
    return Promise.reject(new Error(`Unhandled apiRequest call: ${url}`));
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // UserProfile.tsx's useQuery calls for /api/profile, /api/connections,
        // and /api/connections/pending omit queryFn, relying on react-query's
        // default queryFn (configured once, globally, in the real
        // queryClient.ts). Supply an equivalent here.
        queryFn: ({ queryKey }) => apiRequest(queryKey[0] as string),
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <UserProfile />
    </QueryClientProvider>
  );
}

describe('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupApiRequest();
    mockAchievementsData = { achievements: {} };
    mockSubStatus = { usage: { wishlistsOwned: 0 } };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the profile tab by default, merging remote profile data with the Firebase user', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('I love gadgets')).toBeInTheDocument());
    expect(screen.getByText('Austin')).toBeInTheDocument();
    expect(screen.getByText('Hiking')).toBeInTheDocument();
    expect(screen.getByText('mark@example.com')).toBeInTheDocument();
    expect(screen.getByText('Member since January 2026')).toBeInTheDocument();
  });

  it('navigates between sidebar sections', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('My Profile')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Open Gift Preferences section' }));
    expect(screen.getByText('Customize your gifting experience')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open Connections section' }));
    expect(screen.getByText(/Your Connections/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open Stats and Achievements section' }));
    expect(screen.getByText('Activity Stats')).toBeInTheDocument();
  });

  describe('Profile editing', () => {
    it('enters edit mode and saves changes, sending the normalized displayName', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('I love gadgets')).toBeInTheDocument());

      fireEvent.click(screen.getByTestId('user-profile-edit-toggle'));
      fireEvent.change(screen.getByTestId('user-profile-first-name-input'), { target: { value: 'Marcus' } });

      fireEvent.click(screen.getByTestId('user-profile-save'));

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith({
          title: 'Profile Updated',
          description: 'Your profile has been successfully updated.',
          duration: 3000,
        })
      );
      expect(apiRequest).toHaveBeenCalledWith('/api/profile', {
        method: 'PATCH',
        body: expect.objectContaining({ displayName: 'Marcus Nelson', bio: 'I love gadgets' }),
      });
    });

    it('discards edits on Cancel', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('I love gadgets')).toBeInTheDocument());

      fireEvent.click(screen.getByTestId('user-profile-edit-toggle'));
      fireEvent.change(screen.getByTestId('user-profile-first-name-input'), { target: { value: 'Someone Else' } });
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.getByText('mark@example.com')).toBeInTheDocument(); // back to view mode
      fireEvent.click(screen.getByTestId('user-profile-edit-toggle'));
      expect(screen.getByTestId('user-profile-first-name-input')).toHaveValue('Mark'); // not "Someone Else"
    });

    it('shows an error toast when saving fails', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('I love gadgets')).toBeInTheDocument());
      fireEvent.click(screen.getByTestId('user-profile-edit-toggle'));

      apiRequest.mockImplementationOnce(() => Promise.reject(new Error('Network error')));
      fireEvent.click(screen.getByTestId('user-profile-save'));

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith({ title: 'Error', description: 'Network error', variant: 'destructive' })
      );
    });

    it('adds and removes interests', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('I love gadgets')).toBeInTheDocument());
      fireEvent.click(screen.getByTestId('user-profile-edit-toggle'));

      const interestInput = screen.getByPlaceholderText('Add interest...');
      fireEvent.change(interestInput, { target: { value: 'Cooking' } });
      fireEvent.keyDown(interestInput, { key: 'Enter' });

      expect(screen.getByText('Cooking')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Remove interest Hiking' }));
      expect(screen.queryByText('Hiking')).not.toBeInTheDocument();
    });

    it('uploads an avatar', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('I love gadgets')).toBeInTheDocument());
      fireEvent.click(screen.getByTestId('user-profile-edit-toggle'));

      uploadAvatar.mockResolvedValue('https://storage.example.com/avatar.jpg');
      const file = new File(['fake'], 'avatar.jpg', { type: 'image/jpeg' });
      const fileInput = document.getElementById('avatar-file-input') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => expect(uploadAvatar).toHaveBeenCalledWith('1', file));
    });

    it('shows an error toast when avatar upload fails', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('I love gadgets')).toBeInTheDocument());
      fireEvent.click(screen.getByTestId('user-profile-edit-toggle'));

      uploadAvatar.mockRejectedValue(new Error('Upload rejected'));
      const file = new File(['fake'], 'avatar.jpg', { type: 'image/jpeg' });
      const fileInput = document.getElementById('avatar-file-input') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith({ title: 'Error', description: 'Upload rejected', variant: 'destructive' })
      );
    });
  });

  describe('Gift Preferences', () => {
    async function openPreferencesTab() {
      renderPage();
      await waitFor(() => expect(screen.getByText('My Profile')).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: 'Open Gift Preferences section' }));
      await waitFor(() => expect(screen.getByText('Sizes')).toBeInTheDocument());
    }

    it('shows default sizes in view mode', async () => {
      await openPreferencesTab();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('US 8')).toBeInTheDocument();
    });

    it('changes clothing/shoe size in edit mode', async () => {
      await openPreferencesTab();
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

      fireEvent.change(screen.getByLabelText('Clothing Size'), { target: { value: 'XL' } });
      expect(screen.getByLabelText('Clothing Size')).toHaveValue('XL');
    });

    it('adds and removes a favorite color', async () => {
      await openPreferencesTab();
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

      const colorInput = screen.getByPlaceholderText('Add a color...');
      fireEvent.change(colorInput, { target: { value: 'Teal' } });
      fireEvent.keyDown(colorInput, { key: 'Enter' });
      expect(screen.getByText('Teal')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Remove favorite color Teal' }));
      expect(screen.queryByText('Teal')).not.toBeInTheDocument();
    });

    it('adds a do-not-want item and a favorite store', async () => {
      await openPreferencesTab();
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

      const doNotWantInput = screen.getByPlaceholderText('Add an item...');
      fireEvent.change(doNotWantInput, { target: { value: 'Socks' } });
      fireEvent.keyDown(doNotWantInput, { key: 'Enter' });
      expect(screen.getByText('Socks')).toBeInTheDocument();

      const storeInput = screen.getByPlaceholderText('Add a store...');
      fireEvent.change(storeInput, { target: { value: 'REI' } });
      fireEvent.keyDown(storeInput, { key: 'Enter' });
      expect(screen.getByText('REI')).toBeInTheDocument();
    });

    it('saves preference changes via the same profile PATCH mutation', async () => {
      await openPreferencesTab();
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      fireEvent.change(screen.getByLabelText('Clothing Size'), { target: { value: 'XL' } });

      fireEvent.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() =>
        expect(apiRequest).toHaveBeenCalledWith('/api/profile', {
          method: 'PATCH',
          body: expect.objectContaining({ giftPreferences: expect.objectContaining({ sizes: { clothing: 'XL', shoes: 'US 8' } }) }),
        })
      );
    });
  });

  describe('Connections', () => {
    async function openConnectionsTab() {
      renderPage();
      await waitFor(() => expect(screen.getByText('My Profile')).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: 'Open Connections section' }));
      await waitFor(() => expect(screen.getByText(/Your Connections/)).toBeInTheDocument());
    }

    it('shows an empty state when there are no connections', async () => {
      await openConnectionsTab();
      await waitFor(() => expect(screen.getByText('No connections yet. Find friends below to get started.')).toBeInTheDocument());
    });

    it('lists connections and removes one', async () => {
      apiRequest.mockImplementation((url: string, opts?: { method?: string }) => {
        if (url === '/api/connections') {
          return Promise.resolve({
            connections: [{ connectionId: 'c1', user: { uid: 'u2', displayName: 'Alice', username: 'alice', photoURL: null } }],
          });
        }
        if (url === '/api/connections/pending') return Promise.resolve({ incoming: [], outgoing: [] });
        if (url === '/api/connections/c1' && opts?.method === 'DELETE') return Promise.resolve({ success: true });
        if (url === '/api/profile') return Promise.resolve(REMOTE_PROFILE);
        return Promise.reject(new Error(`unhandled ${url}`));
      });
      await openConnectionsTab();
      await waitFor(() => expect(screen.getByTestId('connection-c1')).toBeInTheDocument());

      await userEvent.click(within(screen.getByTestId('connection-c1')).getByRole('button', { name: /open actions for alice/i }));
      await userEvent.click(screen.getByText('Remove Connection'));

      await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: 'Connection removed' }));
      expect(apiRequest).toHaveBeenCalledWith('/api/connections/c1', { method: 'DELETE' });
    });

    it('shows and responds to an incoming connection request', async () => {
      apiRequest.mockImplementation((url: string, opts?: { method?: string }) => {
        if (url === '/api/connections') return Promise.resolve({ connections: [] });
        if (url === '/api/connections/pending') {
          return Promise.resolve({
            incoming: [{ connectionId: 'req1', user: { uid: 'u3', displayName: 'Bob', username: null, photoURL: null } }],
            outgoing: [],
          });
        }
        if (url === '/api/connections/req1/respond' && opts?.method === 'POST') return Promise.resolve({ success: true, status: 'accepted' });
        if (url === '/api/profile') return Promise.resolve(REMOTE_PROFILE);
        return Promise.reject(new Error(`unhandled ${url}`));
      });
      await openConnectionsTab();
      await waitFor(() => expect(screen.getByTestId('incoming-request-req1')).toBeInTheDocument());

      fireEvent.click(within(screen.getByTestId('incoming-request-req1')).getByRole('button', { name: /accept/i }));

      await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: 'Connection accepted' }));
      expect(apiRequest).toHaveBeenCalledWith('/api/connections/req1/respond', { method: 'POST', body: { accept: true } });
    });

    it('searches for a user by name and sends a connection request', async () => {
      apiRequest.mockImplementation((url: string, opts?: { method?: string; body?: unknown }) => {
        if (url === '/api/connections') return Promise.resolve({ connections: [] });
        if (url === '/api/connections/pending') return Promise.resolve({ incoming: [], outgoing: [] });
        if (url === '/api/profile') return Promise.resolve(REMOTE_PROFILE);
        if (url.startsWith('/api/users/search')) {
          return Promise.resolve({ users: [{ id: 'u5', username: 'sam', displayName: 'Sam Rivera', photoURL: null }] });
        }
        if (url === '/api/connections/request' && opts?.method === 'POST') return Promise.resolve({ status: 'pending' });
        return Promise.reject(new Error(`unhandled ${url}`));
      });
      vi.useFakeTimers({ shouldAdvanceTime: true });
      await openConnectionsTab();

      fireEvent.change(screen.getByTestId('find-friends-search-input'), { target: { value: 'sam' } });
      await vi.advanceTimersByTimeAsync(300);

      await waitFor(() => expect(screen.getByTestId('find-friends-result-u5')).toBeInTheDocument());
      fireEvent.click(within(screen.getByTestId('find-friends-result-u5')).getByRole('button', { name: /connect/i }));

      await waitFor(() =>
        expect(apiRequest).toHaveBeenCalledWith('/api/connections/request', { method: 'POST', body: { targetUserId: 'u5' } })
      );
      vi.useRealTimers();
    });

    it('sends a connection request by email', async () => {
      await openConnectionsTab();
      await userEvent.click(screen.getByTestId('find-friends-mode-email'));

      fireEvent.change(screen.getByTestId('find-friends-email-input'), { target: { value: 'friend@example.com' } });
      fireEvent.click(screen.getByTestId('find-friends-email-submit'));

      await waitFor(() =>
        expect(apiRequest).toHaveBeenCalledWith('/api/connections/request', {
          method: 'POST',
          body: { email: 'friend@example.com' },
        })
      );
    });

    it('shows a validation error for an invalid email', async () => {
      await openConnectionsTab();
      await userEvent.click(screen.getByTestId('find-friends-mode-email'));

      fireEvent.change(screen.getByTestId('find-friends-email-input'), { target: { value: 'not-an-email' } });
      fireEvent.click(screen.getByTestId('find-friends-email-submit'));

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith({ title: 'Error', description: 'Enter a valid email address.', variant: 'destructive' })
      );
    });

    it('shows the contacts panel prompt when no providers are connected', async () => {
      await openConnectionsTab();
      await userEvent.click(screen.getByTestId('find-friends-mode-contacts'));

      await waitFor(() =>
        expect(screen.getByText(/No contact sources connected yet/)).toBeInTheDocument()
      );
    });
  });

  describe('Stats & Achievements', () => {
    async function openStatsTab() {
      renderPage();
      await waitFor(() => expect(screen.getByText('My Profile')).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: 'Open Stats and Achievements section' }));
      await waitFor(() => expect(screen.getByText('Activity Stats')).toBeInTheDocument());
    }

    it('shows a call to action when no achievements are earned yet', async () => {
      await openStatsTab();
      expect(screen.getByText(/No achievements earned yet/)).toBeInTheDocument();
    });

    it('renders earned achievements in the trophy case, including a tier badge', async () => {
      mockAchievementsData = { achievements: { 'welcome-aboard': { earned: true, tier: 0, count: 0 }, tracker: { earned: true, tier: 2, count: 8 } } };
      await openStatsTab();

      expect(screen.getByText('Welcome Aboard')).toBeInTheDocument();
      expect(screen.getByText('Tracker')).toBeInTheDocument();
      expect(screen.getByText('Adept')).toBeInTheDocument(); // tier 2 name
    });

    it('reflects live stats from achievements and subscription usage', async () => {
      mockAchievementsData = { achievements: { tracker: { earned: true, tier: 1, count: 3 }, 'gift-giver': { earned: true, tier: 1, count: 2 } } };
      mockSubStatus = { usage: { wishlistsOwned: 4 } };
      await openStatsTab();

      // Each stat is shown twice: once in the big stats-tab card, once in
      // the sidebar's compact "My Stats" summary -- both visible at once.
      expect(screen.getAllByText('3').length).toBeGreaterThan(0); // Items Tracked
      expect(screen.getAllByText('4').length).toBeGreaterThan(0); // Wishlists Created
      expect(screen.getAllByText('2').length).toBeGreaterThan(0); // Gifts Purchased
    });
  });
});
