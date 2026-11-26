/**
 * Asserts homepage HTML contains canonical / og:url with a trailing slash (not only helper output).
 * Run: SITE_ORIGIN=https://luuxmart.com node --test src/lib/homepage-canonical-emission.test.mjs
 * Requires: next build already done; backend API on 3333 while next start serves 3000.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, before, after } from 'node:test';

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const SITE = (process.env.SITE_ORIGIN || 'https://luuxmart.com').replace(/\/$/, '');
const CANONICAL = `${SITE}/`;
const PORT = process.env.HOMEPAGE_TEST_PORT || '3301';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHttp(url, attempts = 40, logFn) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.ok) return res;
    } catch {
      /* retry */
    }
    await sleep(500);
  }
  const log = logFn?.() ?? '';
  throw new Error(`Server not ready: ${url}${log ? `\n${log}` : ''}`);
}

describe('homepage canonical emission', { timeout: 120_000 }, () => {
  /** @type {import('node:child_process').ChildProcess | undefined} */
  let nextProcess;

  before(async () => {
    let nextLog = '';
    nextProcess = spawn('npm', ['run', 'start', '--', '-H', '127.0.0.1', '-p', PORT], {
      cwd: frontendRoot,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        SITE_ORIGIN: SITE,
        NEXT_PUBLIC_SITE_URL: SITE,
        API_ORIGIN: process.env.API_ORIGIN || 'http://127.0.0.1:3333',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    nextProcess.stderr?.on('data', (chunk) => {
      nextLog += chunk.toString();
    });
    nextProcess.stdout?.on('data', (chunk) => {
      nextLog += chunk.toString();
    });
    await waitForHttp(`http://127.0.0.1:${PORT}/`, 40, () => nextLog);
  });

  after(() => {
    if (nextProcess && !nextProcess.killed) {
      nextProcess.kill('SIGTERM');
    }
  });

  it('emits rel=canonical and og:url with trailing slash in HTML', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/`);
    assert.equal(res.ok, true);
    const html = await res.text();

    const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*>/i);
    assert.ok(canonicalMatch, 'expected a canonical link tag');
    const canonicalTag = canonicalMatch[0];
    assert.match(
      canonicalTag,
      new RegExp(`href=["']${CANONICAL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`),
      `canonical href must be ${CANONICAL}`,
    );
    assert.doesNotMatch(
      canonicalTag,
      new RegExp(`href=["']${SITE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`),
      'canonical must not omit trailing slash',
    );

    const ogMatch = html.match(/<meta[^>]*property=["']og:url["'][^>]*>/i);
    assert.ok(ogMatch, 'expected og:url meta tag');
    const ogTag = ogMatch[0];
    assert.match(
      ogTag,
      new RegExp(`content=["']${CANONICAL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`),
      `og:url must be ${CANONICAL}`,
    );
  });
});