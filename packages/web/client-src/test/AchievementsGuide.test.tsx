import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AchievementsGuide from '@/pages/AchievementsGuide';
import type { AchievementsResponse } from '@/hooks/use-achievements';

let mockData: AchievementsResponse | undefined;
vi.mock('@/hooks/use-achievements', () => ({
  useAchievements: () => ({ data: mockData }),
}));

describe('AchievementsGuide', () => {
  it('renders every achievement definition, even with no data loaded yet', () => {
    mockData = undefined;
    render(<AchievementsGuide />);

    expect(screen.getByTestId('achievements-guide-item-welcome-aboard')).toBeInTheDocument();
    expect(screen.getByTestId('achievements-guide-item-tracker')).toBeInTheDocument();
    expect(screen.queryByText('Earned')).not.toBeInTheDocument();
  });

  it('shows an "Earned" badge for an earned one-time achievement', () => {
    mockData = {
      achievements: { 'welcome-aboard': { earned: true, tier: 0, count: 0 } },
      computedAt: '2026-08-27T00:00:00.000Z',
    };
    render(<AchievementsGuide />);

    const card = screen.getByTestId('achievements-guide-item-welcome-aboard');
    expect(card).toHaveTextContent('Earned');
  });

  it('shows the tier name and progress toward the next tier for a tiered achievement', () => {
    mockData = {
      achievements: { tracker: { earned: true, tier: 2, count: 8 } },
      computedAt: '2026-08-27T00:00:00.000Z',
    };
    render(<AchievementsGuide />);

    const card = screen.getByTestId('achievements-guide-item-tracker');
    expect(card).toHaveTextContent('Adept'); // tier 2 name
    expect(card).toHaveTextContent('8 / 15 toward Sorcerer'); // progress toward tier 3
  });

  it('applies the Wizard-tier gradient treatment and sparkle at the max tier', () => {
    mockData = {
      achievements: { tracker: { earned: true, tier: 5, count: 90 } },
      computedAt: '2026-08-27T00:00:00.000Z',
    };
    render(<AchievementsGuide />);

    const card = screen.getByTestId('achievements-guide-item-tracker');
    expect(card.className).toContain('from-amber-50');
    expect(card).toHaveTextContent('✨ Wizard');
    expect(card).toHaveTextContent('90 — Wizard tier reached');
  });
});
