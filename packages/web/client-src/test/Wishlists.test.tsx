import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import Wishlists from '@/pages/Wishlists';
// This import resolves to the vi.mock factory below (that's how vi.mock
// works -- it replaces what every importer of the path sees, including this
// file's own import), giving the test a direct handle on the exact
// `queryClient` instance the component itself invalidates against. The
// factory below only references imported bindings (QueryClient, vi.fn) --
// never a locally-declared `const` -- since referencing one there previously
// hit a hoisting TDZ error (see useAchievements.test.tsx for the same fix
// via vi.hoisted).
import { apiRequest as apiRequestImport, queryClient as testQueryClient } from '@/lib/queryClient';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
  queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
}));

const apiRequest = vi.mocked(apiRequestImport);

vi.mock('@/components/WishlistCard', () => ({
  default: ({ wishlist }: { wishlist: { id: string | number; name: string } }) => (
    <div data-testid={`stub-wishlist-card-${wishlist.id}`}>{wishlist.name}</div>
  ),
}));
vi.mock('@/components/WishlistListView', () => ({
  default: ({ wishlists }: { wishlists: Array<{ id: string | number; name: string }> }) => (
    <div data-testid="stub-wishlist-list-view">{wishlists.map((w) => w.name).join(', ')}</div>
  ),
}));
vi.mock('@/components/CreateWishlistDialog', () => ({
  default: ({ open, onCreateWishlist }: { open: boolean; onCreateWishlist: (v: unknown) => void }) =>
    open ? (
      <div data-testid="stub-create-dialog">
        <button
          type="button"
          onClick={() =>
            onCreateWishlist({
              name: '  Birthday Wishes  ',
              recipientType: 'group',
              recipientMembers: 'Alice, Bob ,,Carol',
              occasion: '  Birthday  ',
              occasionDate: '2026-12-25',
              isRecurring: true,
              recurrence: 'yearly',
              reminderDays: 7,
              isPublic: true,
            })
          }
        >
          Submit
        </button>
      </div>
    ) : null,
}));

function renderPage() {
  testQueryClient.clear();
  // The real app always renders inside AppRouter.tsx's <TooltipProvider>;
  // reproduce that here since the "Dismiss getting started tips" button
  // uses <Tooltip>.
  return render(
    <QueryClientProvider client={testQueryClient}>
      <TooltipProvider>
        <Wishlists />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

const OWNED = [{ id: 'w1', name: 'Birthday List', itemCount: 3 }];
const SHARED = [{ id: 'w2', name: "Friend's List", itemCount: 5 }];

describe('Wishlists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    apiRequest.mockImplementation((url: string) => {
      if (url === '/api/wishlists') return Promise.resolve(OWNED);
      if (url === '/api/wishlists/shared-with-me') return Promise.resolve(SHARED);
      return Promise.resolve([]);
    });
    // Wishlists.tsx's useQuery calls omit queryFn, relying on react-query's
    // default queryFn (configured once, globally, in the real
    // queryClient.ts). Since the whole module is mocked here, supply an
    // equivalent default queryFn on the test's own QueryClient instance.
    testQueryClient.setDefaultOptions({
      queries: {
        retry: false,
        queryFn: ({ queryKey }) => apiRequest(queryKey[0] as string),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a loading skeleton, then the owned wishlists in card view by default', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByTestId('stub-wishlist-card-w1')).toBeInTheDocument());
    expect(screen.getByText('Birthday List')).toBeInTheDocument();
    expect(screen.queryByTestId('stub-wishlist-list-view')).not.toBeInTheDocument();
  });

  it('switches to list view and persists the choice to localStorage', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('stub-wishlist-card-w1')).toBeInTheDocument());

    await userEvent.click(screen.getByTestId('wishlists-view-mode-list'));

    expect(screen.getByTestId('stub-wishlist-list-view')).toBeInTheDocument();
    expect(localStorage.getItem('wishlists.viewMode')).toBe('list');
  });

  it('restores the persisted view mode on mount', async () => {
    localStorage.setItem('wishlists.viewMode', 'list');
    renderPage();

    await waitFor(() => expect(screen.getByTestId('stub-wishlist-list-view')).toBeInTheDocument());
  });

  it('switches to the Shared with Me scope and fetches its own query', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId('stub-wishlist-card-w1')).toBeInTheDocument());

    await userEvent.click(screen.getByTestId('wishlists-scope-shared'));

    await waitFor(() => expect(screen.getByText("Friend's List")).toBeInTheDocument());
    expect(apiRequest).toHaveBeenCalledWith('/api/wishlists/shared-with-me');
  });

  it('shows a distinct empty state for an empty Shared with Me scope', async () => {
    apiRequest.mockImplementation((url: string) => Promise.resolve(url === '/api/wishlists' ? OWNED : []));
    renderPage();
    await waitFor(() => expect(screen.getByTestId('stub-wishlist-card-w1')).toBeInTheDocument());

    await userEvent.click(screen.getByTestId('wishlists-scope-shared'));

    await waitFor(() => expect(screen.getByText('Nothing shared with you yet')).toBeInTheDocument());
  });

  it('shows the empty state with a create CTA when there are no owned wishlists', async () => {
    apiRequest.mockResolvedValue([]);
    renderPage();

    await waitFor(() => expect(screen.getByText('No wishlists yet')).toBeInTheDocument());
    expect(screen.getByTestId('wishlists-empty-create-wishlist')).toBeInTheDocument();
  });

  it('shows an error state with a Retry button that re-fetches', async () => {
    apiRequest.mockRejectedValue(new Error('Server error'));
    renderPage();

    await waitFor(() => expect(screen.getByText('Failed to load wishlists. Please try again.')).toBeInTheDocument());

    apiRequest.mockResolvedValue(OWNED);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.getByText('Birthday List')).toBeInTheDocument());
  });

  describe('Getting Started card', () => {
    it('is expanded by default when there are no owned wishlists, with no dismiss button', async () => {
      apiRequest.mockResolvedValue([]);
      renderPage();

      await waitFor(() => expect(screen.getByTestId('wishlists-getting-started')).toBeInTheDocument());
      expect(screen.queryByTestId('wishlists-getting-started-dismiss')).not.toBeInTheDocument();
    });

    it('can be dismissed once there are owned wishlists, and stays dismissed via localStorage', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByTestId('wishlists-getting-started-dismiss')).toBeInTheDocument());

      fireEvent.click(screen.getByTestId('wishlists-getting-started-dismiss'));

      expect(screen.queryByTestId('wishlists-getting-started')).not.toBeInTheDocument();
      expect(localStorage.getItem('wishlists.gettingStartedDismissed')).toBe('true');
    });

    it('stays dismissed across a remount when localStorage already records it', async () => {
      localStorage.setItem('wishlists.gettingStartedDismissed', 'true');
      renderPage();

      await waitFor(() => expect(screen.getByTestId('stub-wishlist-card-w1')).toBeInTheDocument());
      expect(screen.queryByTestId('wishlists-getting-started')).not.toBeInTheDocument();
    });
  });

  describe('Create wishlist', () => {
    it('normalizes and submits the create form, then shows a success toast and closes the dialog', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByTestId('stub-wishlist-card-w1')).toBeInTheDocument());
      fireEvent.click(screen.getByTestId('wishlists-create-wishlist'));

      apiRequest.mockResolvedValueOnce({ id: 'w3' }); // the create call itself
      fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: 'Success!', description: 'Wishlist created successfully' }));
      expect(apiRequest).toHaveBeenCalledWith('/api/wishlists', {
        method: 'POST',
        body: expect.objectContaining({
          name: 'Birthday Wishes', // trimmed
          recipientMembers: ['Alice', 'Bob', 'Carol'], // split, trimmed, blanks dropped
          occasion: 'Birthday', // trimmed
          occasionDate: new Date('2026-12-25T12:00:00').toISOString(), // local noon -> UTC, machine-timezone-dependent
          recurrence: 'yearly',
          reminderDays: 7,
          isPublic: true,
        }),
      });
      expect(screen.queryByTestId('stub-create-dialog')).not.toBeInTheDocument();
    });

    it('shows an error toast when creation fails', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByTestId('stub-wishlist-card-w1')).toBeInTheDocument());
      fireEvent.click(screen.getByTestId('wishlists-create-wishlist'));

      apiRequest.mockRejectedValueOnce(new Error('Quota exceeded'));
      fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith({ title: 'Error', description: 'Quota exceeded', variant: 'destructive' })
      );
      expect(screen.getByTestId('stub-create-dialog')).toBeInTheDocument(); // stays open on failure
    });
  });
});
