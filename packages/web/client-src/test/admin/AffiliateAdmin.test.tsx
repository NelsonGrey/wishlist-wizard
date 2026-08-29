import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AffiliateAdmin from '@/pages/admin/AffiliateAdmin';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/queryClient', () => ({ apiRequest }));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AffiliateAdmin />
    </QueryClientProvider>
  );
}

const IMPORT_JOB = {
  id: 'imp1',
  network: 'Amazon Associates',
  status: 'completed' as const,
  rowCount: 100,
  matchedCount: 90,
  unmatchedCount: 10,
  newEntriesCount: 5,
  updatedEntriesCount: 85,
  reversalsDetectedCount: 1,
  createdAt: '2026-08-01T12:00:00.000Z',
};

describe('AffiliateAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Every tab's initial GET-style query resolves empty by default; tests
    // override with mockResolvedValueOnce as needed per call order.
    apiRequest.mockResolvedValue({ imports: [], ids: [], batches: [] });
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the three tabs, defaulting to Imports', () => {
    renderPage();

    expect(screen.getByTestId('affiliate-admin-title')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Imports', selected: true })).toBeInTheDocument();
  });

  describe('Imports tab', () => {
    it('shows a loading state, then the import history table', async () => {
      apiRequest.mockResolvedValue({ imports: [IMPORT_JOB] });
      renderPage();

      expect(screen.getByText('Loading…')).toBeInTheDocument();
      await waitFor(() => expect(screen.getByText('completed')).toBeInTheDocument());
      expect(screen.getByText('100')).toBeInTheDocument(); // rowCount
    });

    it('shows an empty state when there are no imports', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('No imports yet.')).toBeInTheDocument());
    });

    it('retries a failed import job', async () => {
      apiRequest.mockResolvedValueOnce({ imports: [{ ...IMPORT_JOB, status: 'failed' }] });
      renderPage();
      await waitFor(() => expect(screen.getByText('failed')).toBeInTheDocument());

      apiRequest.mockResolvedValueOnce(undefined); // the retry call itself
      apiRequest.mockResolvedValueOnce({ imports: [{ ...IMPORT_JOB, status: 'processing' }] }); // refetch after invalidate
      fireEvent.click(screen.getByRole('button', { name: '' })); // icon-only retry button

      await waitFor(() =>
        expect(apiRequest).toHaveBeenCalledWith('/api/admin/affiliate/imports/retry', {
          method: 'POST',
          body: { importId: 'imp1' },
        })
      );
    });

    it('shows an error toast when retry fails', async () => {
      apiRequest.mockResolvedValueOnce({ imports: [{ ...IMPORT_JOB, status: 'failed' }] });
      renderPage();
      await waitFor(() => expect(screen.getByText('failed')).toBeInTheDocument());

      apiRequest.mockRejectedValueOnce(new Error('Not authorized'));
      fireEvent.click(screen.getByRole('button', { name: '' }));

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith({ title: 'Retry failed', description: 'Not authorized', variant: 'destructive' })
      );
    });

    it('uploads a CSV: requests an upload URL, PUTs the file, and shows a success toast', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('No imports yet.')).toBeInTheDocument());

      apiRequest.mockResolvedValueOnce({ uploadUrl: 'https://storage.example.com/upload?sig=abc', importId: 'imp2' });
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      const file = new File(['a,b,c'], 'report.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith({
          title: 'Upload started',
          description: 'The report is being reconciled — this list refreshes automatically.',
        })
      );
      expect(apiRequest).toHaveBeenCalledWith('/api/admin/affiliate/imports/request-upload-url', {
        method: 'POST',
        body: { network: 'Amazon Associates', filename: 'report.csv' },
      });
      expect(global.fetch).toHaveBeenCalledWith('https://storage.example.com/upload?sig=abc', {
        method: 'PUT',
        headers: { 'Content-Type': 'text/csv' },
        body: file,
      });
    });

    it('shows an upload-failed toast when the PUT to storage fails', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('No imports yet.')).toBeInTheDocument());

      apiRequest.mockResolvedValueOnce({ uploadUrl: 'https://storage.example.com/upload', importId: 'imp3' });
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 413 });

      const file = new File(['a,b,c'], 'report.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith({ title: 'Upload failed', description: 'Upload failed (413)', variant: 'destructive' })
      );
    });

    it('shows an upload-failed toast when requesting the upload URL itself fails', async () => {
      renderPage();
      await waitFor(() => expect(screen.getByText('No imports yet.')).toBeInTheDocument());

      apiRequest.mockRejectedValueOnce(new Error('Quota exceeded'));

      const file = new File(['a,b,c'], 'report.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith({ title: 'Upload failed', description: 'Quota exceeded', variant: 'destructive' })
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Tracking IDs tab', () => {
    async function openTrackingTab() {
      renderPage();
      await userEvent.click(screen.getByRole('tab', { name: 'Tracking IDs' }));
      await waitFor(() => expect(screen.getByText(/Pool status/)).toBeInTheDocument());
    }

    it('shows available/assigned counts and the pool table', async () => {
      apiRequest.mockResolvedValue({
        ids: [
          { id: 'p1', trackingId: 'wishlistwiz-01-20', status: 'available', assignedToUid: null },
          { id: 'p2', trackingId: 'wishlistwiz-02-20', status: 'assigned', assignedToUid: 'creator-1' },
        ],
      });
      await openTrackingTab();

      expect(screen.getByText('Pool status — 1 available, 1 assigned')).toBeInTheDocument();
      expect(screen.getByText('wishlistwiz-01-20')).toBeInTheDocument();
      expect(screen.getByText('creator-1')).toBeInTheDocument();
    });

    it('shows an empty state with 0/0 counts when the pool is empty', async () => {
      await openTrackingTab();
      expect(screen.getByText('Pool status — 0 available, 0 assigned')).toBeInTheDocument();
      expect(screen.getByText('No tracking IDs in the pool yet.')).toBeInTheDocument();
    });

    it('disables "Add to pool" until text is entered, then submits split/trimmed IDs', async () => {
      await openTrackingTab();
      const addButton = screen.getByRole('button', { name: 'Add to pool' });
      expect(addButton).toBeDisabled();

      const textarea = screen.getByPlaceholderText(/One tracking ID per line/);
      fireEvent.change(textarea, { target: { value: 'id-1, id-2\nid-3\n' } });
      expect(addButton).not.toBeDisabled();

      apiRequest.mockResolvedValueOnce({ added: 2, skippedExisting: 1 });
      fireEvent.click(addButton);

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith({ title: 'Tracking IDs added', description: '2 added, 1 already in the pool.' })
      );
      expect(apiRequest).toHaveBeenCalledWith('/api/admin/affiliate/tracking-pool/add', {
        method: 'POST',
        body: { network: 'Amazon Associates', trackingIds: ['id-1', 'id-2', 'id-3'] },
      });
    });

    it('shows an error toast when adding IDs fails', async () => {
      await openTrackingTab();
      fireEvent.change(screen.getByPlaceholderText(/One tracking ID per line/), { target: { value: 'id-1' } });

      apiRequest.mockRejectedValueOnce(new Error('Duplicate network'));
      fireEvent.click(screen.getByRole('button', { name: 'Add to pool' }));

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith({ title: 'Failed to add tracking IDs', description: 'Duplicate network', variant: 'destructive' })
      );
    });
  });

  describe('Payout batches tab', () => {
    async function openPayoutsTab() {
      renderPage();
      await userEvent.click(screen.getByRole('tab', { name: 'Payout batches' }));
      await waitFor(() => expect(screen.getByText(/Created automatically on the monthly payout run/)).toBeInTheDocument());
    }

    const FAILED_BATCH = {
      id: 'b1',
      creatorUserId: 'creator-1',
      state: 'Failed',
      totalAmountUsd: 42.5,
      periodLabel: 'July 2026',
      createdAt: '2026-08-01T00:00:00.000Z',
    };

    it('shows an empty state when there are no batches', async () => {
      await openPayoutsTab();
      await waitFor(() => expect(screen.getByText('No payout batches yet.')).toBeInTheDocument());
    });

    it('renders batches with a formatted dollar amount, and only shows Retry for Failed batches', async () => {
      apiRequest.mockResolvedValue({
        batches: [FAILED_BATCH, { ...FAILED_BATCH, id: 'b2', state: 'Completed' }],
      });
      await openPayoutsTab();

      await waitFor(() => expect(screen.getAllByText('July 2026')).toHaveLength(2));
      expect(screen.getAllByText('$42.50')).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: 'Retry' })).toHaveLength(1); // only the Failed one
    });

    it('processes (retries) a failed batch', async () => {
      // mockResolvedValue (not -Once): ImportsTab's own query fires and
      // consumes the first resolved value the instant AffiliateAdmin
      // mounts, before the Payout batches tab is even selected -- an
      // -Once value here would be consumed by the wrong query.
      apiRequest.mockResolvedValue({ batches: [FAILED_BATCH] });
      await openPayoutsTab();
      await waitFor(() => expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument());

      apiRequest.mockResolvedValueOnce(undefined);
      apiRequest.mockResolvedValueOnce({ batches: [{ ...FAILED_BATCH, state: 'Completed' }] });
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

      await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: 'Batch processed' }));
      expect(apiRequest).toHaveBeenCalledWith('/api/admin/affiliate/payout-batches/process', {
        method: 'POST',
        body: { batchId: 'b1' },
      });
    });

    it('shows an error toast when processing fails', async () => {
      apiRequest.mockResolvedValue({ batches: [FAILED_BATCH] });
      await openPayoutsTab();
      await waitFor(() => expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument());

      apiRequest.mockRejectedValueOnce(new Error('Stripe Connect error'));
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith({ title: 'Batch processing failed', description: 'Stripe Connect error', variant: 'destructive' })
      );
    });
  });
});
