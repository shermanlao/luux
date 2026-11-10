/**
 * Luux adapter for the general marketing funnel.
 * Replace this file when another app imports the plan.
 * Rules live in marketing-funnel.ts (GENERAL FUNCTION — Marketing Funnel).
 */
import { cleanPath } from './marketing-funnel';

export const FUNNEL_APP = 'luux';
export const FUNNEL_CURRENCY = 'HKD';

export function isProductPath(path: string): boolean {
  return /^\/products\/[^/]+$/.test(cleanPath(path));
}

export function isCheckoutStart(path: string): boolean {
  return cleanPath(path) === '/checkout';
}
