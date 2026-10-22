import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_SESSION_SECRET,
  productionSecretErrors,
  resolveSessionSecret,
} from './production-secrets';

describe('production secrets', () => {
  it('allows defaults outside production', () => {
    assert.deepEqual(productionSecretErrors({ NODE_ENV: 'development' }), []);
    assert.equal(resolveSessionSecret({ NODE_ENV: 'development' }), DEFAULT_SESSION_SECRET);
  });

  it('requires a real session secret in production', () => {
    const errors = productionSecretErrors({ NODE_ENV: 'production', ADMIN_SESSION_SECRET: DEFAULT_SESSION_SECRET });
    assert.equal(errors.length, 1);
  });
});
