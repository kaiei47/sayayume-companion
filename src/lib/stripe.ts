import Stripe from 'stripe';

// Lazy initialization to avoid module-level crashes during build
// (STRIPE_SECRET_KEY is a runtime env var, not available at build time)
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return _stripe;
}
// Backwards-compat: allow `stripe` usage as a callable or direct object
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});

// Re-export plans for server-side usage
export { PLANS, type PlanType } from './plans';

// Stripe Price IDs (server-only)
export const STRIPE_PRICE_IDS = {
  basic: process.env.STRIPE_BASIC_PRICE_ID!,
  premium: process.env.STRIPE_PREMIUM_PRICE_ID!,
} as const;
