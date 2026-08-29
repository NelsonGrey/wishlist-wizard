import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Support from '@/pages/Support';

describe('Support', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '' },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });

  it('renders the heading and FAQ section', () => {
    render(<Support />);

    expect(screen.getByRole('heading', { level: 1, name: 'Help & Support' })).toBeInTheDocument();
    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
    expect(screen.getByText('How do I get started?')).toBeInTheDocument();
  });

  it('expands an FAQ item to reveal its answer', async () => {
    render(<Support />);
    expect(screen.queryByText(/Create an account/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'How do I get started?' }));

    expect(screen.getByText(/Create an account/)).toBeInTheDocument();
  });

  it('allows multiple FAQ items open at once', async () => {
    render(<Support />);

    await userEvent.click(screen.getByRole('button', { name: 'How do I get started?' }));
    await userEvent.click(screen.getByRole('button', { name: 'How do I create and manage wishlists?' }));

    expect(screen.getByText(/Create an account/)).toBeInTheDocument();
    expect(screen.getByText(/categorize, prioritize, and sort items as needed/)).toBeInTheDocument();
  });

  it('submits the contact form as a mailto: link and shows a confirmation', () => {
    render(<Support />);

    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Mark Nelson' } });
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: 'mark@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('What is this about?'), { target: { value: 'Billing question' } });
    fireEvent.change(screen.getByPlaceholderText("Tell us what's on your mind..."), { target: { value: 'Help please' } });

    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));

    expect(window.location.href).toBe(
      'mailto:support@wishlist-wizard.com?subject=%5BWishlist%20Wizard%5D%20Billing%20question&body=Name%3A%20Mark%20Nelson%0AEmail%3A%20mark%40example.com%0A%0AHelp%20please'
    );
    expect(screen.getByText('Your email client is ready.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send Message' })).not.toBeInTheDocument();
  });

  it('trims whitespace from form fields before building the mailto link', () => {
    render(<Support />);

    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: '  Mark  ' } });
    fireEvent.change(screen.getByPlaceholderText('your@email.com'), { target: { value: '  mark@example.com  ' } });
    fireEvent.change(screen.getByPlaceholderText('What is this about?'), { target: { value: '  Question  ' } });
    fireEvent.change(screen.getByPlaceholderText("Tell us what's on your mind..."), { target: { value: '  Hi  ' } });

    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));

    expect(window.location.href).toContain('subject=%5BWishlist%20Wizard%5D%20Question');
    expect(window.location.href).toContain('Name%3A%20Mark');
    expect(window.location.href).not.toContain('Mark%20%20'); // no trailing whitespace baked in
  });
});
