import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { createContext, useContext } from 'react';
import { render } from '../utils';
import CreateWishlistDialog from '@/components/CreateWishlistDialog';
import { useQuery } from '@tanstack/react-query';

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

type SelectContextValue = {
  onValueChange?: (value: string) => void;
};

const SelectContext = createContext<SelectContextValue>({});

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: { children: React.ReactNode; onValueChange?: (value: string) => void }) => (
    <SelectContext.Provider value={{ onValueChange }}>
      <div>{children}</div>
    </SelectContext.Provider>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder || 'select'}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => {
    const { onValueChange } = useContext(SelectContext);
    return (
      <button type="button" onClick={() => onValueChange?.(value)}>
        {children}
      </button>
    );
  },
}));

describe('CreateWishlistDialog external source mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips the connected-sources picker entirely when no provider is connected, going straight to manual entry', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any).mockReturnValue({
      data: {
        contacts: [],
        providerStatuses: [
          { provider: 'google', connected: false, supported: true },
          { provider: 'outlook', connected: false, supported: true },
          { provider: 'apple', connected: false, supported: true },
          { provider: 'facebook', connected: false, supported: false },
        ],
      },
      isFetching: false,
    });

    const onCreateWishlist = vi.fn();
    render(
      <CreateWishlistDialog
        open
        onClose={vi.fn()}
        onCreateWishlist={onCreateWishlist}
        isPending={false}
      />,
      { pathname: '/app/dashboard' }
    );

    const user = userEvent.setup();

    await user.type(screen.getByTestId('create-wishlist-name-input'), 'Birthday Picks');
    await user.click(screen.getByRole('button', { name: 'Specific person' }));

    // No source-vs-manual choice, and no dead-end warning — just the manual name field.
    expect(screen.queryByRole('button', { name: 'Select from connected sources' })).not.toBeInTheDocument();
    expect(screen.queryByText(/No connected contact sources are available/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText('Recipient name'), 'Emma Kincaid');
    await user.click(screen.getByTestId('create-wishlist-submit'));

    expect(onCreateWishlist).toHaveBeenCalledTimes(1);
    expect(onCreateWishlist).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Birthday Picks',
        recipientType: 'person',
        recipientInputMode: 'manual',
        recipientName: 'Emma Kincaid',
      })
    );
  });

  it('uses selected source contact as recipient when submitted', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useQuery as any).mockReturnValue({
      data: {
        contacts: [
          {
            id: 'email:alex@example.com',
            name: 'Alex Rivera',
            primarySource: 'google',
            sources: [{ provider: 'google', sourceContactId: 'abc123' }],
            duplicateSourceCount: 1,
            quality: { level: 'high', score: 88, factors: ['has_name'] },
          },
        ],
        providerStatuses: [
          { provider: 'google', connected: true, supported: true },
          { provider: 'outlook', connected: false, supported: true },
        ],
      },
      isFetching: false,
    });

    const onCreateWishlist = vi.fn();
    render(
      <CreateWishlistDialog
        open
        onClose={vi.fn()}
        onCreateWishlist={onCreateWishlist}
        isPending={false}
      />,
      { pathname: '/app/dashboard' }
    );

    const user = userEvent.setup();

    await user.type(screen.getByTestId('create-wishlist-name-input'), 'Birthday Picks');

    await user.click(screen.getByRole('button', { name: 'Specific person' }));
    await user.click(screen.getByRole('button', { name: 'Select from connected sources' }));
    await user.click(screen.getByRole('button', { name: /Alex Rivera/i }));

    await user.click(screen.getByTestId('create-wishlist-submit'));

    expect(onCreateWishlist).toHaveBeenCalledTimes(1);
    expect(onCreateWishlist).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Birthday Picks',
        recipientType: 'person',
        recipientInputMode: 'source',
        recipientName: 'Alex Rivera',
      })
    );
  });
});
