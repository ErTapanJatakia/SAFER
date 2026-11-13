import { describe, expect, it } from 'vitest';
import { evaluateBudgetPolicy } from './budgetPolicy.ts';

describe('evaluateBudgetPolicy', () => {
  it('accepts a reviewed no-cost Firebase Spark declaration', () => {
    expect(evaluateBudgetPolicy({ provider: 'Firebase', plan: 'Spark', expectedMonthlyCostInr: 0 }).verdict)
      .toBe('within-policy');
  });

  it('normalizes provider and plan casing and surrounding whitespace', () => {
    expect(evaluateBudgetPolicy({ provider: ' Vercel ', plan: ' HOBBY ' }).verdict)
      .toBe('within-policy');
  });

  it('rejects paid billing even when the named plan is on the allowlist', () => {
    expect(evaluateBudgetPolicy({ provider: 'Firebase', plan: 'Spark', billingEnabled: true }).verdict)
      .toBe('out-of-policy');
  });

  it('rejects a declared non-zero monthly cost', () => {
    expect(evaluateBudgetPolicy({ provider: 'GitHub', plan: 'Free', expectedMonthlyCostInr: 1 }).verdict)
      .toBe('out-of-policy');
  });

  it('does not treat unknown providers as free', () => {
    expect(evaluateBudgetPolicy({ provider: 'Unknown Cloud', plan: 'Free' }).verdict)
      .toBe('manual-review');
  });

  it('rejects unreviewed plans for known providers', () => {
    expect(evaluateBudgetPolicy({ provider: 'Firebase', plan: 'Blaze' }).verdict)
      .toBe('out-of-policy');
  });

  it('requires provider and plan information', () => {
    expect(evaluateBudgetPolicy({ provider: '', plan: 'Free' }).verdict)
      .toBe('manual-review');
  });

  it('flags invalid monthly cost values for review', () => {
    expect(evaluateBudgetPolicy({ provider: 'Firebase', plan: 'Spark', expectedMonthlyCostInr: Number.NaN }).verdict)
      .toBe('manual-review');
    expect(evaluateBudgetPolicy({ provider: 'Firebase', plan: 'Spark', expectedMonthlyCostInr: -1 }).verdict)
      .toBe('manual-review');
  });
});
