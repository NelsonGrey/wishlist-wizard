import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils';
import { ConnectCalendarDialog } from '@/components/calendar/ConnectCalendarDialog';
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
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('ConnectCalendarDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any).mockImplementation(({ queryKey }: { queryKey: string[] }) => {
      if (queryKey?.[0] === '/api/calendar/auth/google') {
        return {
          data: { provider: 'google', authUrl: 'https://example.com/google-auth', supported: true },
          isLoading: false,
        };
      }

      if (queryKey?.[0] === '/api/calendar/auth/outlook') {
        return {
          data: { provider: 'outlook', authUrl: 'https://example.com/outlook-auth', supported: true },
          isLoading: false,
        };
      }

      if (queryKey?.[0] === '/api/calendar/auth/apple') {
        return {
          data: { provider: 'apple', message: 'Apple calendar subscriptions are read-only.', supported: true },
          isLoading: false,
        };
      }

      if (queryKey?.[0] === '/api/calendar/auth/facebook') {
        return {
          data: { provider: 'facebook', authUrl: 'https://example.com/facebook-auth', supported: true },
          isLoading: false,
        };
      }

      return {
        data: undefined,
        isLoading: false,
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useMutation as any).mockReturnValue({
      mutate: vi.fn(),
    });
  });

  it('shows Google, Outlook, Apple, and Facebook connection tabs', async () => {
    render(<ConnectCalendarDialog />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Connect Calendar' }));

    expect(await screen.findByRole('tab', { name: 'Google' })).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: 'Outlook' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Apple' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Facebook' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect Google Calendar' })).toBeInTheDocument();
  });
});
