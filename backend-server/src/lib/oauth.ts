import crypto from 'crypto';
import type { Response } from 'express';
import { cookieIsSecure, hmacHex, safeEqual } from './shared/hmac';
import { resolveSessionSecret } from './shared/production-secrets';

export const OAUTH_STATE_COOKIE = 'luux_oauth_state';

export type OAuthProvider = 'google' | 'facebook';

export type OAuthProfile = {
  provider: OAuthProvider;
  subject: string;
  email: string;
  first_name: string;
  last_name: string;
};

const STATE_MS = 10 * 60 * 1000;

export function parseOAuthProvider(value: string): OAuthProvider | null {
  if (value === 'google' || value === 'facebook') return value;
  return null;
}

export function oauthProviderLabel(provider: OAuthProvider): string {
  return provider === 'google' ? 'Google' : 'Facebook';
}

export function oauthConfigured(provider: OAuthProvider): boolean {
  if (provider === 'google') {
    return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
  }
  return Boolean(process.env.FACEBOOK_APP_ID?.trim() && process.env.FACEBOOK_APP_SECRET?.trim());
}

export function oauthCallbackUrl(provider: OAuthProvider): string {
  const origin = String(process.env.SITE_ORIGIN || 'http://localhost:3000').replace(/\/$/, '');
  return `${origin}/api/account/oauth/${provider}/callback`;
}

export async function issueOAuthState(provider: OAuthProvider): Promise<string> {
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${provider}.${nonce}`;
  const sig = await hmacHex(resolveSessionSecret(), payload);
  return `${payload}.${sig}`;
}

export async function verifyOAuthState(provider: OAuthProvider, state: string): Promise<boolean> {
  const parts = state.split('.');
  if (parts.length !== 3) return false;
  const [gotProvider, nonce, sig] = parts;
  if (gotProvider !== provider || !/^[a-f0-9]{32}$/.test(nonce) || !sig) return false;
  const expected = await hmacHex(resolveSessionSecret(), `${gotProvider}.${nonce}`);
  return safeEqual(sig, expected);
}

export function setOAuthStateCookie(res: Response, value: string): void {
  res.cookie(OAUTH_STATE_COOKIE, value, {
    httpOnly: true,
    secure: cookieIsSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge: STATE_MS,
  });
}

export function clearOAuthStateCookie(res: Response): void {
  res.clearCookie(OAUTH_STATE_COOKIE, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieIsSecure(),
  });
}

export function oauthAuthorizationUrl(provider: OAuthProvider, state: string): string {
  const redirectUri = oauthCallbackUrl(provider);
  if (provider === 'google') {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', String(process.env.GOOGLE_CLIENT_ID || '').trim());
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', state);
    url.searchParams.set('prompt', 'select_account');
    return url.toString();
  }
  const url = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  url.searchParams.set('client_id', String(process.env.FACEBOOK_APP_ID || '').trim());
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('scope', 'email,public_profile');
  return url.toString();
}

async function readJson(response: globalThis.Response): Promise<Record<string, unknown>> {
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return data;
}

export async function fetchOAuthProfile(provider: OAuthProvider, code: string): Promise<OAuthProfile> {
  const redirectUri = oauthCallbackUrl(provider);
  if (provider === 'google') {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: String(process.env.GOOGLE_CLIENT_ID || '').trim(),
        client_secret: String(process.env.GOOGLE_CLIENT_SECRET || '').trim(),
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const token = await readJson(tokenRes);
    const accessToken = typeof token.access_token === 'string' ? token.access_token : '';
    if (!tokenRes.ok || !accessToken) throw new Error('Google sign-in failed.');
    const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const info = await readJson(infoRes);
    const subject = typeof info.sub === 'string' ? info.sub : '';
    const email = typeof info.email === 'string' ? info.email.trim().toLowerCase() : '';
    if (!infoRes.ok || !subject || !email || info.email_verified !== true) {
      throw new Error('Google did not confirm this email.');
    }
    return {
      provider,
      subject,
      email,
      first_name: typeof info.given_name === 'string' ? info.given_name.trim() : '',
      last_name: typeof info.family_name === 'string' ? info.family_name.trim() : '',
    };
  }

  const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', String(process.env.FACEBOOK_APP_ID || '').trim());
  tokenUrl.searchParams.set('client_secret', String(process.env.FACEBOOK_APP_SECRET || '').trim());
  tokenUrl.searchParams.set('redirect_uri', redirectUri);
  tokenUrl.searchParams.set('code', code);
  const tokenRes = await fetch(tokenUrl);
  const token = await readJson(tokenRes);
  const accessToken = typeof token.access_token === 'string' ? token.access_token : '';
  if (!tokenRes.ok || !accessToken) throw new Error('Facebook sign-in failed.');
  const infoUrl = new URL('https://graph.facebook.com/v21.0/me');
  infoUrl.searchParams.set('fields', 'id,email,first_name,last_name');
  infoUrl.searchParams.set('access_token', accessToken);
  const infoRes = await fetch(infoUrl);
  const info = await readJson(infoRes);
  const subject = typeof info.id === 'string' ? info.id : '';
  const email = typeof info.email === 'string' ? info.email.trim().toLowerCase() : '';
  if (!infoRes.ok || !subject || !email) throw new Error('Facebook did not share an email address.');
  return {
    provider,
    subject,
    email,
    first_name: typeof info.first_name === 'string' ? info.first_name.trim() : '',
    last_name: typeof info.last_name === 'string' ? info.last_name.trim() : '',
  };
}
