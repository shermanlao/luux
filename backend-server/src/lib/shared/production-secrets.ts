export const DEFAULT_SESSION_SECRET = 'luux-dev-admin-session';
export const DEFAULT_ADMIN_PASSWORD = 'abc4321';

export function isProductionEnv(nodeEnv = process.env.NODE_ENV): boolean {
  return nodeEnv === 'production';
}

export function productionSecretErrors(env: NodeJS.ProcessEnv = process.env): string[] {
  if (env.NODE_ENV !== 'production') return [];
  const errors: string[] = [];
  const session = String(env.ADMIN_SESSION_SECRET || '').trim();
  if (!session || session === DEFAULT_SESSION_SECRET) {
    errors.push('ADMIN_SESSION_SECRET must be set to a non-default value');
  }
  return errors;
}

export function assertProductionSecrets(env: NodeJS.ProcessEnv = process.env): void {
  const errors = productionSecretErrors(env);
  if (errors.length === 0) return;
  throw new Error(`Refusing to start in production: ${errors.join('; ')}`);
}

export function resolveSessionSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = String(env.ADMIN_SESSION_SECRET || '').trim();
  if (env.NODE_ENV === 'production') {
    if (!secret || secret === DEFAULT_SESSION_SECRET) {
      throw new Error('ADMIN_SESSION_SECRET must be set to a non-default value in production');
    }
    return secret;
  }
  return secret || DEFAULT_SESSION_SECRET;
}
