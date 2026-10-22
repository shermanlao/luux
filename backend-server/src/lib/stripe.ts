import Stripe from 'stripe';

export function getStripe(): Stripe {
  const key = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!key) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.');
  }
  return new Stripe(key);
}

export function siteOrigin(): string {
  return String(process.env.SITE_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(
    /\/$/,
    ''
  );
}
