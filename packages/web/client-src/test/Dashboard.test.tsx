import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Dashboard from '@/pages/Dashboard';

let mockSubStatus: unknown;
let mockAchievementsData: unknown;
let mockIsAdmin: boolean | null;

vi.mock('@/hooks/use-subscription-status', () => ({
  useSubscriptionStatus: () => ({ data: mockSubStatus }),
}));
vi.mock('@/hooks/use-achievements', () => ({
  useAchievements: () => ({ data: mockAchievementsData }),
}));
vi.mock('@/hooks/use-is-admin', () => ({
  useIsAdmin: () => mockIsAdmin,
}));
vi.mock('@/components/dashboard/AnalyticsOverview', () => ({
  default: () => <div data-testid="stub-analytics-overview" />,
}));
vi.mock('@/components/dashboard/CreatorOverview', () => ({
  default: () => <div data-testid="stub-creator-overview" />,
}));
vi.mock('@/components/dashboard/AdminOverview', () => ({
  default: () => <div data-testid="stub-admin-overview" />,
}));

function setUrl(search: string) {
  window.history.pushState({}, '', `/app/dashboard${search}`);
}

describe('Dashboard', () => {
  beforeEach(() => {
    mockSubStatus = { usage: { wishlistsOwned: 3 }, limits: {} };
    mockAchievementsData = { achievements: { 'welcome-aboard': { earned: true, tier: 0, count: 0 } } };
    mockIsAdmin = false;
    setUrl('');
  });

  afterEach(() => {
    setUrl('');
  });

  it('defaults to the Overview tab and shows real usage/achievement stats', () => {
    render(<Dashboard />);

    expect(screen.getByTestId('dashboard-tab-overview')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('3')).toBeInTheDocument(); // wishlistsOwned stat
    expect(screen.getByText(/1 of \d+/)).toBeInTheDocument(); // earned achievements stat
  });

  it('reads the initial tab from the ?tab= URL param', () => {
    setUrl('?tab=analytics');
    render(<Dashboard />);

    expect(screen.getByTestId('dashboard-tab-analytics')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('stub-analytics-overview')).toBeInTheDocument();
  });

  it('falls back to Overview for an invalid ?tab= value', () => {
    setUrl('?tab=not-a-real-tab');
    render(<Dashboard />);

    expect(screen.getByTestId('dashboard-tab-overview')).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches tabs on click and reflects the change in the URL', () => {
    render(<Dashboard />);

    fireEvent.click(screen.getByTestId('dashboard-tab-creator'));

    expect(screen.getByTestId('stub-creator-overview')).toBeInTheDocument();
    expect(window.location.search).toContain('tab=creator');
  });

  it('shows a "Pro" badge on the Creator tab when the creator dashboard is not enabled', () => {
    mockSubStatus = { usage: {}, limits: { creatorDashboardEnabled: false } };
    render(<Dashboard />);

    expect(screen.getByTestId('dashboard-tab-creator')).toHaveTextContent('Pro');
  });

  it('does not show a badge on the Creator tab when the creator dashboard is enabled', () => {
    mockSubStatus = { usage: {}, limits: { creatorDashboardEnabled: true } };
    render(<Dashboard />);

    expect(screen.getByTestId('dashboard-tab-creator')).not.toHaveTextContent('Pro');
  });

  it('does not render an Admin tab for a non-admin user', () => {
    mockIsAdmin = false;
    render(<Dashboard />);

    expect(screen.queryByTestId('dashboard-tab-admin')).not.toBeInTheDocument();
  });

  it('renders and allows selecting the Admin tab for an admin user', () => {
    mockIsAdmin = true;
    render(<Dashboard />);

    fireEvent.click(screen.getByTestId('dashboard-tab-admin'));

    expect(screen.getByTestId('stub-admin-overview')).toBeInTheDocument();
  });

  it('redirects a stale ?tab=admin URL back to Overview once isAdmin resolves false', () => {
    mockIsAdmin = null; // still resolving
    setUrl('?tab=admin');
    const { rerender } = render(<Dashboard />);
    expect(screen.queryByTestId('stub-admin-overview')).not.toBeInTheDocument();

    mockIsAdmin = false;
    rerender(<Dashboard />);

    expect(screen.getByTestId('dashboard-tab-overview')).toHaveAttribute('aria-pressed', 'true');
  });

  it('updates the selected tab in response to browser back/forward navigation', () => {
    render(<Dashboard />);
    expect(screen.getByTestId('dashboard-tab-overview')).toHaveAttribute('aria-pressed', 'true');

    setUrl('?tab=analytics');
    fireEvent(window, new PopStateEvent('popstate'));

    expect(screen.getByTestId('dashboard-tab-analytics')).toHaveAttribute('aria-pressed', 'true');
  });
});
