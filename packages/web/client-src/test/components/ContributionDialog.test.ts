import { describe, expect, it } from 'vitest';
import {
  getContributionLimit,
  MAX_CONTRIBUTION_AMOUNT,
} from '@/components/ContributionDialog';

describe('ContributionDialog budget guardrails', () => {
  it('caps contribution by remaining amount when goal is not reached', () => {
    expect(getContributionLimit(100, 35.25)).toBe(64.75);
  });

  it('disables contributions when goal is already reached', () => {
    expect(getContributionLimit(100, 150)).toBe(0);
  });

  it('respects hard max even with very high target', () => {
    expect(getContributionLimit(50000, 100)).toBe(MAX_CONTRIBUTION_AMOUNT);
  });

  it('allows sub-minimum remaining values without overfunding', () => {
    expect(getContributionLimit(0.1, 0)).toBe(0.1);
  });
});
