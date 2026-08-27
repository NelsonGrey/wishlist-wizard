import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActivityInsightsDemo from '@/pages/demos/ActivityInsightsDemo';
import AdvancedUserProfilesDemo from '@/pages/demos/AdvancedUserProfilesDemo';
import BrowserExtensionDemo from '@/pages/demos/BrowserExtensionDemo';
import CalendarIntegrationDemo from '@/pages/demos/CalendarIntegrationDemo';
import MobileAppDemo from '@/pages/demos/MobileAppDemo';
import SocialIntegrationDemo from '@/pages/demos/SocialIntegrationDemo';
import WishlistManagementDemo from '@/pages/demos/WishlistManagementDemo';

// These are all static marketing/feature-showcase pages -- no hooks, no data
// fetching, just JSX over hardcoded arrays. A render-plus-key-content smoke
// test is the right amount of coverage: it catches a broken import, a typo'd
// heading, or a dead/misrouted CTA link without pretending there's business
// logic here to exercise.
const PAGES: Array<{
  name: string;
  Component: React.ComponentType;
  heading: string;
  primaryCtaHref: string;
}> = [
  { name: 'ActivityInsightsDemo', Component: ActivityInsightsDemo, heading: 'Basic Activity Insights', primaryCtaHref: '/app/analytics' },
  { name: 'AdvancedUserProfilesDemo', Component: AdvancedUserProfilesDemo, heading: 'Advanced User Profiles', primaryCtaHref: '/app/user-profile' },
  { name: 'BrowserExtensionDemo', Component: BrowserExtensionDemo, heading: 'Browser Extension', primaryCtaHref: '/extension' },
  { name: 'CalendarIntegrationDemo', Component: CalendarIntegrationDemo, heading: 'Calendar Integration', primaryCtaHref: '/app/calendar' },
  { name: 'MobileAppDemo', Component: MobileAppDemo, heading: 'Mobile App', primaryCtaHref: '/app/wishlists' },
  { name: 'SocialIntegrationDemo', Component: SocialIntegrationDemo, heading: 'Social Integration', primaryCtaHref: '/app/wishlists' },
  { name: 'WishlistManagementDemo', Component: WishlistManagementDemo, heading: 'Wishlist Management', primaryCtaHref: '/app/wishlists' },
];

describe('Demo pages', () => {
  it.each(PAGES)('$name renders its heading and working CTA links', ({ Component, heading, primaryCtaHref }) => {
    render(<Component />);

    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create free account/i })).toHaveAttribute('href', '/register');
    const links = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(links).toContain(primaryCtaHref);
  });
});
