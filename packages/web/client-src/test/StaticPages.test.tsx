import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import CookiePolicy from '@/pages/CookiePolicy';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import TermsOfService from '@/pages/TermsOfService';
import NotFound from '@/pages/not-found';

// Static legal/error pages -- no hooks, no data fetching. A render-plus-
// heading smoke test catches a broken import or typo'd heading without
// pretending there's business logic here to exercise.
describe('Static pages', () => {
  it.each([
    { name: 'CookiePolicy', Component: CookiePolicy, heading: 'Cookie Policy' },
    { name: 'PrivacyPolicy', Component: PrivacyPolicy, heading: 'Privacy Policy' },
    { name: 'TermsOfService', Component: TermsOfService, heading: 'Terms of Service' },
  ])('$name renders its heading', ({ Component, heading }) => {
    render(<Component />);
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
  });

  it('NotFound renders a 404 message', () => {
    render(<NotFound />);
    expect(screen.getByText('404 Page Not Found')).toBeInTheDocument();
  });
});
