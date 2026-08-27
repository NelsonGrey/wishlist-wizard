import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExtensionPage from '@/pages/ExtensionPage';

describe('ExtensionPage', () => {
  it('renders the heading and defaults to the Chrome install tab', () => {
    render(<ExtensionPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Save gift ideas from any store' })).toBeInTheDocument();
    expect(screen.getByText('Google Chrome and other Chromium-based browsers')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /install for chrome/i })).toHaveAttribute(
      'href',
      'https://chromewebstore.google.com/'
    );
  });

  it('switches to the Firefox tab and shows its install link', async () => {
    render(<ExtensionPage />);

    await userEvent.click(screen.getByRole('tab', { name: /firefox/i }));

    expect(screen.getByText('Mozilla Firefox browser')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /install from mozilla add-ons/i })).toHaveAttribute(
      'href',
      'https://addons.mozilla.org/en-US/firefox/addon/wishlist-wizard/'
    );
  });

  it('switches to the Edge tab and shows its install link', async () => {
    render(<ExtensionPage />);

    await userEvent.click(screen.getByRole('tab', { name: /edge/i }));

    expect(screen.getByText('Microsoft Edge browser')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /install for edge/i })).toHaveAttribute(
      'href',
      'https://microsoftedge.microsoft.com/addons/'
    );
  });

  it('switches to the Safari tab and shows its install link', async () => {
    render(<ExtensionPage />);

    await userEvent.click(screen.getByRole('tab', { name: /safari/i }));

    expect(screen.getByText('Apple Safari on macOS and iOS')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /install for safari/i })).toHaveAttribute('href', 'https://apps.apple.com/');
  });

  it('renders the FAQ section with a working sign-up link', () => {
    render(<ExtensionPage />);

    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
    expect(screen.getByText('Is the Wishlist Wizard extension free?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up for free' })).toHaveAttribute('href', '/register');
  });
});
