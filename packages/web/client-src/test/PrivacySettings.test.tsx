import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PrivacySettings from '@/pages/PrivacySettings';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/queryClient', () => ({ apiRequest }));

// A tiny in-memory backend so mutation -> invalidate -> refetch round-trips
// behave like the real server: this is what actually exercises whether the
// dialog's `selectedEntity` snapshot goes stale after a successful update.
type Store = Record<string, Record<string, unknown>>;
let privacyStore: Store;

function keyFor(type: string, id: number | string) {
  return `${type}-${id}`;
}

function setupApiRequest() {
  privacyStore = {};
  apiRequest.mockImplementation((url: string, opts?: { method?: string; body?: string }) => {
    if (url === '/api/wishlists') {
      return Promise.resolve([{ id: 1, name: 'Birthday List', userId: 1 }]);
    }
    if (url === '/api/wishlist-items') {
      return Promise.resolve([{ id: 2, title: 'Lego Set', wishlist: { userId: 1 } }]);
    }
    const getMatch = url.match(/^\/api\/privacy\/settings\/(wishlist|item)\/(\d+)$/);
    if (getMatch && (!opts || !opts.method || opts.method === 'GET')) {
      const key = keyFor(getMatch[1], getMatch[2]);
      return privacyStore[key] ? Promise.resolve(privacyStore[key]) : Promise.reject(new Error('not found'));
    }
    if (getMatch && opts?.method === 'DELETE') {
      const key = keyFor(getMatch[1], getMatch[2]);
      delete privacyStore[key];
      return Promise.resolve({});
    }
    if (url === '/api/privacy/settings' && opts?.method === 'POST') {
      const body = JSON.parse(opts.body as string);
      const key = keyFor(body.entityType, body.entityId);
      privacyStore[key] = { ...privacyStore[key], ...body };
      return Promise.resolve({});
    }
    const accessMatch = url.match(/^\/api\/privacy\/settings\/(wishlist|item)\/(\d+)\/access-list$/);
    if (accessMatch && opts?.method === 'PUT') {
      const key = keyFor(accessMatch[1], accessMatch[2]);
      const body = JSON.parse(opts.body as string);
      privacyStore[key] = { ...privacyStore[key], customAccessList: body.userIds };
      return Promise.resolve({});
    }
    if (url.startsWith('/api/users/search')) {
      return Promise.resolve({ users: [{ id: 'u1', username: 'markn', displayName: 'Mark Nelson', photoURL: null }] });
    }
    return Promise.reject(new Error(`Unhandled apiRequest call: ${url}`));
  });
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PrivacySettings />
    </QueryClientProvider>
  );
}

async function openEntitiesTab() {
  renderPage();
  await waitFor(() => expect(screen.getByTestId('privacy-settings-title')).toBeInTheDocument());
  await userEvent.click(screen.getByRole('tab', { name: 'Manage Entities' }));
  await waitFor(() => expect(screen.getByText('Birthday List')).toBeInTheDocument());
}

describe('PrivacySettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupApiRequest();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a loading spinner while entities load', () => {
    apiRequest.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByTestId('privacy-settings-page').querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders the overview tab by default with per-visibility counts at 0 (no privacy settings saved yet)', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('privacy-settings-title')).toBeInTheDocument());

    expect(screen.getByText('Public Items')).toBeInTheDocument();
    // Both entities load with no saved privacy settings (GET 404s), so
    // every visibility-level count starts at 0.
    const counts = screen.getAllByText('0');
    expect(counts.length).toBeGreaterThanOrEqual(4);
  });

  it('reflects entities that already have saved privacy settings in the overview counts', async () => {
    privacyStore[keyFor('wishlist', 1)] = { visibilityLevel: 'friends', allowComments: true, allowReservations: true, requireApproval: false };
    renderPage();
    await waitFor(() => expect(screen.getByTestId('privacy-settings-title')).toBeInTheDocument());

    const friendsCard = screen.getByText('Friends Only').closest('div');
    expect(within(friendsCard!.parentElement!).getByText('1')).toBeInTheDocument();
  });

  it('"Manage Individual Items" quick action switches to the Entities tab', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('privacy-settings-title')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /manage individual items/i }));

    expect(screen.getByPlaceholderText('Search wishlists and items...')).toBeInTheDocument();
  });

  describe('Manage Entities tab', () => {
    it('lists wishlists and items with a default Public badge', async () => {
      await openEntitiesTab();

      expect(screen.getByText('Birthday List')).toBeInTheDocument();
      expect(screen.getByText('Lego Set')).toBeInTheDocument();
      expect(screen.getAllByText('Public')).toHaveLength(2);
    });

    it('filters entities by name search', async () => {
      await openEntitiesTab();

      fireEvent.change(screen.getByPlaceholderText('Search wishlists and items...'), { target: { value: 'lego' } });

      expect(screen.queryByText('Birthday List')).not.toBeInTheDocument();
      expect(screen.getByText('Lego Set')).toBeInTheDocument();
    });

    it('shows the empty state with search-specific messaging when a filter matches nothing', async () => {
      await openEntitiesTab();

      fireEvent.change(screen.getByPlaceholderText('Search wishlists and items...'), { target: { value: 'nonexistent' } });

      expect(screen.getByText('No items found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filter criteria')).toBeInTheDocument();
    });
  });

  describe('Entity privacy dialog', () => {
    async function openDialogFor(name: string) {
      await openEntitiesTab();
      const card = screen.getByText(name).closest('.pt-6') as HTMLElement;
      await userEvent.click(within(card).getByRole('button', { name: 'Manage' }));
      await waitFor(() => expect(screen.getByText(`Privacy Settings for ${name}`)).toBeInTheDocument());
    }

    it('opens with Public selected by default and updates visibility on selection, reflected live in the dialog', async () => {
      await openDialogFor('Birthday List');

      expect(screen.getByRole('radio', { name: /public/i })).toBeChecked();

      await userEvent.click(screen.getByRole('radio', { name: /friends only/i }));

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith({
          title: 'Privacy settings updated',
          description: 'Your privacy settings have been saved successfully.',
        })
      );
      // The dialog's own RadioGroup should reflect the just-saved value once
      // the invalidated query refetches -- not stay showing the pre-update
      // snapshot captured when "Manage" was first clicked.
      await waitFor(() => expect(screen.getByRole('radio', { name: /friends only/i })).toBeChecked());
    });

    it('shows the Custom Access List section only once Custom Access is selected', async () => {
      await openDialogFor('Birthday List');
      expect(screen.queryByText('Custom Access List')).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('radio', { name: /custom access/i }));

      await waitFor(() => expect(screen.getByText('Custom Access List')).toBeInTheDocument());
      expect(screen.getByText('No users have custom access yet')).toBeInTheDocument();
    });

    it('toggles interaction permission switches', async () => {
      await openDialogFor('Birthday List');

      const commentsSwitch = screen.getByRole('switch', { name: 'Allow Comments' });
      expect(commentsSwitch).toBeChecked(); // defaults true

      await userEvent.click(commentsSwitch);

      await waitFor(() =>
        expect(apiRequest).toHaveBeenCalledWith('/api/privacy/settings', {
          method: 'POST',
          body: JSON.stringify({ entityType: 'wishlist', entityId: 1, allowComments: false }),
        })
      );
    });

    it('resets to default via the delete endpoint', async () => {
      privacyStore[keyFor('wishlist', 1)] = { visibilityLevel: 'private' };
      await openDialogFor('Birthday List');
      expect(screen.getByRole('radio', { name: /^private/i })).toBeChecked();

      await userEvent.click(screen.getByRole('button', { name: 'Reset to Default' }));

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith({
          title: 'Privacy settings reset',
          description: 'Privacy settings have been reset to default.',
        })
      );
    });

    it('closes via the Close button', async () => {
      await openDialogFor('Birthday List');

      // Radix's DialogContent also renders its own X button with an
      // sr-only "Close" label -- get the explicit footer button specifically.
      const [footerCloseButton] = screen.getAllByRole('button', { name: 'Close' });
      await userEvent.click(footerCloseButton);

      expect(screen.queryByText('Privacy Settings for Birthday List')).not.toBeInTheDocument();
    });
  });

  describe('Add user to custom access list', () => {
    async function openAddUserDialog() {
      await openEntitiesTab();
      const card = screen.getByText('Birthday List').closest('.pt-6') as HTMLElement;
      await userEvent.click(within(card).getByRole('button', { name: 'Manage' }));
      await waitFor(() => expect(screen.getByText('Privacy Settings for Birthday List')).toBeInTheDocument());
      await userEvent.click(screen.getByRole('radio', { name: /custom access/i }));
      await waitFor(() => expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument());
      await userEvent.click(screen.getByRole('button', { name: /add user/i }));
      await waitFor(() => expect(screen.getByText('Add User to Access List')).toBeInTheDocument());
    }

    it('requires at least 2 characters before searching', async () => {
      await openAddUserDialog();
      expect(screen.getByText('Type at least 2 characters to search.')).toBeInTheDocument();

      fireEvent.change(screen.getByPlaceholderText('Enter a username or name...'), { target: { value: 'm' } });
      expect(screen.getByText('Type at least 2 characters to search.')).toBeInTheDocument();
    });

    it('debounces the search, then shows results and adds a user to the access list', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      await openAddUserDialog();

      fireEvent.change(screen.getByPlaceholderText('Enter a username or name...'), { target: { value: 'mark' } });
      await vi.advanceTimersByTimeAsync(300);

      await waitFor(() => expect(screen.getByText('Mark Nelson')).toBeInTheDocument());
      expect(apiRequest).toHaveBeenCalledWith('/api/users/search?q=mark');

      fireEvent.click(screen.getByRole('button', { name: 'Add' }));

      await waitFor(() =>
        expect(apiRequest).toHaveBeenCalledWith('/api/privacy/settings/wishlist/1/access-list', {
          method: 'PUT',
          body: JSON.stringify({ userIds: ['u1'] }),
        })
      );
      vi.useRealTimers();
    });
  });
});
