import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Download from '@/pages/Download';

describe('Download', () => {
  it('renders the heading and a working App Store link', () => {
    render(<Download />);

    expect(screen.getByRole('heading', { level: 1, name: 'Take your wishlists with you' })).toBeInTheDocument();
    const appStoreLink = screen.getByRole('link', { name: /download on the app store/i });
    expect(appStoreLink).toHaveAttribute('href', expect.stringContaining('apps.apple.com'));
    expect(appStoreLink).toHaveAttribute('target', '_blank');
  });

  it('marks the Android link as disabled and prevents navigation on click', () => {
    render(<Download />);

    const androidLink = screen.getByRole('link', { name: /coming soon on google play/i });
    expect(androidLink).toHaveAttribute('aria-disabled', 'true');

    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');
    androidLink.dispatchEvent(clickEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
