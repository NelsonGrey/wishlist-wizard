import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SubscriptionsSection from '@/components/Subscriptions';

vi.mock('@/lib/queryClient', () => ({ apiRequest: vi.fn() }));
vi.mock('@/hooks/useAppOffline', () => ({ useAppOffline: () => false }));

describe('Subscriptions marketing section', () => {
  it('replaces the checkout CTA with a Coming soon + notify control for gated tiers', () => {
    render(<SubscriptionsSection />);

    // Free / Starter / Plus keep their normal call-to-action links.
    expect(screen.getByText('Start Free')).toBeInTheDocument();
    expect(screen.getByText('Choose Starter')).toBeInTheDocument();
    expect(screen.getByText('Choose Plus')).toBeInTheDocument();

    // Creator / Business no longer offer a direct "choose this plan" action.
    expect(screen.queryByText('Choose Creator Pro')).not.toBeInTheDocument();
    expect(screen.queryByText('Choose Business')).not.toBeInTheDocument();

    // ...and instead show the Coming soon badge + email capture.
    expect(screen.getAllByText('Coming soon')).toHaveLength(2);
    expect(screen.getAllByPlaceholderText('you@example.com')).toHaveLength(2);
    expect(
      screen.getAllByRole('button', { name: /notify me when it launches/i }),
    ).toHaveLength(2);
  });
});
