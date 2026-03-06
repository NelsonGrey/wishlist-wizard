import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../utils';
import { CalendarSettings } from '@/components/calendar/CalendarSettings';
import { useMutation, useQuery } from '@tanstack/react-query';

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('CalendarSettings external source redesign', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useMutation as any).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any).mockImplementation(({ queryKey }: { queryKey: string[] }) => {
      if (queryKey?.[0] === '/api/calendar/connections') {
        return {
          data: {},
          isLoading: false,
          refetch: vi.fn(),
        };
      }

      if (queryKey?.[0] === '/api/contacts/external-preview') {
        return {
          data: {
            contacts: [
              {
                id: 'contact-1',
                name: 'Ada Lovelace',
                primarySource: 'google',
                sources: [{ provider: 'google', sourceContactId: 'g-1' }],
              },
              {
                id: 'contact-2',
                name: 'Grace Hopper',
                primarySource: 'outlook',
                sources: [{ provider: 'outlook', sourceContactId: 'o-1' }],
              },
            ],
            providerStatuses: [
              { provider: 'google', connected: true, supported: true },
              { provider: 'outlook', connected: false, supported: true },
            ],
            metadata: {
              storageMode: 'ephemeral',
            },
          },
          isLoading: false,
          refetch: vi.fn(),
        };
      }

      return {
        data: [],
        isLoading: false,
      };
    });
  });

  it('renders source access statuses and remains stable with non-array query payloads', async () => {
    render(<CalendarSettings />, { pathname: '/app/user-profile' });

    expect(await screen.findByText('Recipient Source Access')).toBeInTheDocument();
    expect(screen.getAllByText('Google').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Outlook').length).toBeGreaterThan(0);
    expect(screen.getByText('No calendars connected')).toBeInTheDocument();
    expect(screen.getByText('2 matches')).toBeInTheDocument();
    expect(screen.getByText('External Contact Preview')).toBeInTheDocument();
  });
});
