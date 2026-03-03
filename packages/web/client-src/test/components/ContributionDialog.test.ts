import { describe, expect, it } from 'vitest';
import {
  getContributionLimit,
  MAX_CONTRIBUTION_AMOUNT,
  MIN_CONTRIBUTION_AMOUNT,
} from '@/components/ContributionDialog';

describe('ContributionDialog budget guardrails', () => {
  it('caps contribution by remaining amount when goal is not reached', () => {
    expect(getContributionLimit(100, 35.25)).toBe(64.75);
  });

  it('falls back to global max when goal is already reached', () => {
    expect(getContributionLimit(100, 150)).toBe(MAX_CONTRIBUTION_AMOUNT);
  });

  it('respects hard max even with very high target', () => {
    expect(getContributionLimit(50000, 100)).toBe(MAX_CONTRIBUTION_AMOUNT);
  });

  it('never returns less than minimum contribution', () => {
    expect(getContributionLimit(0.1, 0)).toBe(MIN_CONTRIBUTION_AMOUNT);
  });
});
