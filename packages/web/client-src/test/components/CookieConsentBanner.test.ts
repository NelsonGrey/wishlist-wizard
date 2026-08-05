import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CookieConsentBanner from '@/components/CookieConsentBanner';

// ---------------------------------------------------------------------------
// Mock useConsent so we can control consent state and spy on actions
// ---------------------------------------------------------------------------

const acceptAllMock = vi.fn();
const declineAllMock = vi.fn();
const acceptSelectedMock = vi.fn();

let mockConsentState = { decided: false, analytics: false, marketing: false };

vi.mock('@/hooks/useConsent', () => ({
  useConsent: () => ({
    consent: mockConsentState,
    acceptAll: acceptAllMock,
    declineAll: declineAllMock,
    acceptSelected: acceptSelectedMock,
  }),
}));

// ---------------------------------------------------------------------------
// Mock shadcn/ui primitives with React.createElement (no JSX, avoids the
// "jsx: preserve" / vi.mock transform ordering issue).
// ---------------------------------------------------------------------------

vi.mock('@/components/ui/button', () => ({
  Button: (props: Record<string, unknown>) =>
    React.createElement('button', { onClick: props.onClick as React.MouseEventHandler }, props.children as React.ReactNode),
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: (props: Record<string, unknown>) =>
    React.createElement('input', {
      type: 'checkbox',
      role: 'switch',
      checked: props.checked as boolean,
      disabled: props.disabled as boolean,
      'aria-label': props['aria-label'] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const handler = props.onCheckedChange as ((v: boolean) => void) | undefined;
        if (handler) handler(e.target.checked);
      },
    }),
}));

vi.mock('lucide-react', () => ({
  X: () => React.createElement('span', null, 'X'),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

function renderBanner() {
  return render(React.createElement(CookieConsentBanner));
}

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsentState = { decided: false, analytics: false, marketing: false };
  });

  // ── Visibility ─────────────────────────────────────────────────────────────

  it('renders the consent dialog when consent.decided is false', () => {
    renderBanner();
    expect(screen.getByRole('dialog', { name: /cookie consent/i })).toBeInTheDocument();
  });

  it('returns null (renders nothing) when consent.decided is true', () => {
    mockConsentState = { decided: true, analytics: true, marketing: true };
    const { container } = renderBanner();
    expect(container.firstChild).toBeNull();
  });

  // ── Main banner buttons ───────────────────────────────────────────────────

  it('calls acceptAll when "Accept All" is clicked', () => {
    renderBanner();
    fireEvent.click(screen.getByRole('button', { name: /accept all/i }));
    expect(acceptAllMock).toHaveBeenCalledTimes(1);
  });

  it('calls declineAll when "Decline All" is clicked', () => {
    renderBanner();
    fireEvent.click(screen.getByRole('button', { name: /decline all/i }));
    expect(declineAllMock).toHaveBeenCalledTimes(1);
  });

  it('shows the preferences panel when "Manage Preferences" is clicked', () => {
    renderBanner();
    fireEvent.click(screen.getByRole('button', { name: /manage preferences/i }));
    expect(screen.getByText(/cookie preferences/i)).toBeInTheDocument();
  });

  // ── Privacy policy link ───────────────────────────────────────────────────

  it('includes a Privacy Policy link', () => {
    renderBanner();
    const link = screen.getByRole('link', { name: /privacy policy/i });
    expect(link).toHaveAttribute('href', '/privacy');
  });

  // ── Preferences panel ────────────────────────────────────────────────────

  describe('preferences panel', () => {
    beforeEach(() => {
      renderBanner();
      fireEvent.click(screen.getByRole('button', { name: /manage preferences/i }));
    });

    it('shows Necessary, Analytics, and Marketing rows', () => {
      expect(screen.getByText(/necessary/i)).toBeInTheDocument();
      expect(screen.getByText(/analytics/i)).toBeInTheDocument();
      expect(screen.getByText(/marketing/i)).toBeInTheDocument();
    });

    it('Necessary switch is checked and disabled', () => {
      const necessarySwitch = screen.getByRole('switch', {
        name: /necessary cookies always on/i,
      });
      expect(necessarySwitch).toBeChecked();
      expect(necessarySwitch).toBeDisabled();
    });

    it('Analytics switch starts unchecked and can be toggled', () => {
      const analyticsSwitch = screen.getByRole('switch', {
        name: /analytics cookies/i,
      });
      expect(analyticsSwitch).not.toBeChecked();
      fireEvent.click(analyticsSwitch);
      expect(analyticsSwitch).toBeChecked();
    });

    it('Marketing switch starts unchecked and can be toggled', () => {
      const marketingSwitch = screen.getByRole('switch', {
        name: /marketing cookies/i,
      });
      expect(marketingSwitch).not.toBeChecked();
      fireEvent.click(marketingSwitch);
      expect(marketingSwitch).toBeChecked();
    });

    it('"Save Preferences" calls acceptSelected with current switch values', () => {
      const analyticsSwitch = screen.getByRole('switch', {
        name: /analytics cookies/i,
      });
      fireEvent.click(analyticsSwitch);

      fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));

      expect(acceptSelectedMock).toHaveBeenCalledWith({
        analytics: true,
        marketing: false,
      });
    });

    it('"Save Preferences" with both switches off calls acceptSelected with both false', () => {
      fireEvent.click(screen.getByRole('button', { name: /save preferences/i }));
      expect(acceptSelectedMock).toHaveBeenCalledWith({
        analytics: false,
        marketing: false,
      });
    });

    it('"Decline All" in preferences panel calls declineAll', () => {
      fireEvent.click(screen.getByRole('button', { name: /decline all/i }));
      expect(declineAllMock).toHaveBeenCalledTimes(1);
    });

    it('"Accept All" in preferences panel calls acceptAll', () => {
      const acceptButtons = screen.getAllByRole('button', { name: /accept all/i });
      fireEvent.click(acceptButtons[acceptButtons.length - 1]);
      expect(acceptAllMock).toHaveBeenCalledTimes(1);
    });

    it('close button hides the preferences panel', () => {
      fireEvent.click(screen.getByRole('button', { name: /close preferences/i }));
      expect(screen.queryByText(/cookie preferences/i)).not.toBeInTheDocument();
    });
  });
});
