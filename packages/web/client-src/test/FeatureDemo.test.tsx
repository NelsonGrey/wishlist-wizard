import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import FeatureDemo from '@/pages/FeatureDemo';

const FEATURES: Array<{ key: Parameters<typeof FeatureDemo>[0]['feature']; title: string; appHref: string }> = [
  { key: 'mobile-app', title: 'Mobile App', appHref: '/app/wishlists' },
  { key: 'browser-extension', title: 'Browser Extension', appHref: '/extension' },
  { key: 'social-integration', title: 'Social Integration', appHref: '/app/wishlists' },
  { key: 'calendar-integration', title: 'Calendar Integration', appHref: '/app/calendar' },
  { key: 'wishlist-management', title: 'Wishlist Management', appHref: '/app/wishlists' },
  { key: 'basic-activity-insights', title: 'Basic Activity Insights', appHref: '/app/analytics' },
  { key: 'advanced-user-profiles', title: 'Advanced User Profiles', appHref: '/app/user-profile' },
];

describe('FeatureDemo', () => {
  it.each(FEATURES)('renders the $key config correctly', ({ key, title, appHref }) => {
    render(<FeatureDemo feature={key} />);

    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    const links = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(links).toContain(appHref);
    expect(links).toContain('/register');
  });

  it('renders a screenshot with feature-specific alt text', () => {
    render(<FeatureDemo feature="calendar-integration" />);
    expect(screen.getByAltText('Calendar integration feature screenshot')).toBeInTheDocument();
  });
});
