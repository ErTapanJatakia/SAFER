/**
 * SAFER zero-cost operating policy.
 *
 * This is a local advisory guardrail, not a billing-control integration.
 * Provider pricing and free-tier terms can change; verify them before use.
 */
export type BudgetPolicyVerdict = 'within-policy' | 'out-of-policy' | 'manual-review';

export interface BudgetServiceInput {
  provider: string;
  plan: string;
  billingEnabled?: boolean;
  expectedMonthlyCostInr?: number;
}

export interface BudgetPolicyResult {
  verdict: BudgetPolicyVerdict;
  reason: string;
  provider: string;
}

const FREE_PLAN_ALLOWLIST: Record<string, readonly string[]> = {
  'cloudflare pages': ['free'],
  firebase: ['spark'],
  github: ['free'],
  vercel: ['hobby'],
};

const normalize = (value: string) => value.trim().toLowerCase();

export function evaluateBudgetPolicy(input: BudgetServiceInput): BudgetPolicyResult {
  const provider = typeof input.provider === 'string' ? input.provider.trim() : '';
  const plan = typeof input.plan === 'string' ? normalize(input.plan) : '';
  const cost = input.expectedMonthlyCostInr;
  const billingEnabled = input.billingEnabled === true;

  if (!provider || !plan) {
    return {
      verdict: 'manual-review',
      reason: 'Provider and plan must be identified before this service can be assessed.',
      provider: provider || 'Unspecified service',
    };
  }

  if (cost !== undefined && (!Number.isFinite(cost) || cost < 0)) {
    return {
      verdict: 'manual-review',
      reason: 'The expected monthly cost is invalid; verify the amount before proceeding.',
      provider,
    };
  }

  if (billingEnabled || (cost !== undefined && cost > 0)) {
    return {
      verdict: 'out-of-policy',
      reason: 'Paid billing is enabled or a non-zero monthly cost is expected. This conflicts with SAFER’s INR 0 operating constraint.',
      provider,
    };
  }

  const allowedPlans = FREE_PLAN_ALLOWLIST[normalize(provider)];
  if (!allowedPlans) {
    return {
      verdict: 'manual-review',
      reason: 'This provider is not in SAFER’s reviewed free-plan allowlist. Do not assume it is free.',
      provider,
    };
  }

  if (!allowedPlans.includes(plan)) {
    return {
      verdict: 'out-of-policy',
      reason: 'This plan is not the reviewed free plan for this provider.',
      provider,
    };
  }

  return {
    verdict: 'within-policy',
    reason: 'The named plan is on SAFER’s free-plan allowlist and no paid billing or non-zero cost was declared. Verify current terms and usage limits independently.',
    provider,
  };
}

export const SAFER_FREE_PLAN_REFERENCE = [
  { provider: 'GitHub', plan: 'Free', purpose: 'Source control and public repository workflows' },
  { provider: 'Vercel', plan: 'Hobby', purpose: 'Personal, non-commercial hosting within plan limits' },
  { provider: 'Firebase', plan: 'Spark', purpose: 'No-cost Firebase services within Spark quotas' },
  { provider: 'Cloudflare Pages', plan: 'Free', purpose: 'Static hosting within Free plan limits' },
] as const;
