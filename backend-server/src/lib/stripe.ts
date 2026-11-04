import Stripe from 'stripe';
import SiteSetting from '../models/SiteSetting';

async function savedOrEnv(column: 'stripe_secret_key' | 'stripe_webhook_secret', envName: string): Promise<string> {
  const site = await SiteSetting.findByPk(1);
  const saved = String(site?.[column] || '').trim();
  if (saved) return saved;
  return String(process.env[envName] || '').trim();
}

export async function stripeSecretKey(): Promise<string> {
  return savedOrEnv('stripe_secret_key', 'STRIPE_SECRET_KEY');
}

export async function stripeWebhookSecret(): Promise<string> {
  return savedOrEnv('stripe_webhook_secret', 'STRIPE_WEBHOOK_SECRET');
}

export async function getStripe(): Promise<Stripe> {
  const key = await stripeSecretKey();
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
