import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyTouch,
  assembleFunnel,
  attributionMetadata,
  buildTrackedUrl,
  captionWithTrackedUrl,
  publicPurchase,
  reportWindow,
  sanitizeAttribution,
  touchExpired,
  trackedLinkForPost,
  trafficSourceLabel,
  visitTouch,
  type StoredTouch,
} from './marketing-funnel';

const NOW = new Date('2026-11-10T12:00:00.000Z');

function touch(patch: Partial<StoredTouch> = {}): StoredTouch {
  return {
    app: 'luux',
    source: 'instagram',
    medium: 'organic_social',
    campaign: 'luux-4',
    content: 'instagram-4',
    term: '',
    campaign_id: 4,
    channel: 'instagram',
    landing_path: '/products/oboe',
    first_touch_at: '2026-11-01T00:00:00.000Z',
    last_touch_at: '2026-11-01T00:00:00.000Z',
    ...patch,
  };
}

describe('marketing funnel', () => {
  it('fills missing tracking parameters and keeps the rest of the url', () => {
    const url = buildTrackedUrl('https://luuxmart.com/products/oboe?color=white#photo', {
      source: 'Instagram',
      medium: 'organic_social',
      campaign: 'luux-4',
      content: 'instagram-4',
      term: '',
    });
    assert.match(url, /color=white/);
    assert.match(url, /utm_source=instagram/);
    assert.match(url, /utm_medium=organic_social/);
    assert.match(url, /utm_campaign=luux-4/);
    assert.match(url, /utm_content=instagram-4/);
    assert.equal(url.includes('utm_term'), false);
    assert.equal(url.endsWith('#photo'), true);
  });

  it('does not overwrite tracking parameters that are already set', () => {
    const url = buildTrackedUrl('https://luuxmart.com/a?utm_source=newsletter&utm_medium=email&x=1', {
      source: 'facebook',
      medium: 'organic_social',
      campaign: 'luux-1',
      content: 'facebook-1',
    });
    assert.match(url, /utm_source=newsletter/);
    assert.match(url, /utm_medium=email/);
    assert.match(url, /utm_campaign=luux-1/);
    assert.match(url, /utm_content=facebook-1/);
    assert.match(url, /x=1/);
  });

  it('builds a different destination for each channel and keeps a custom source', () => {
    const link = 'https://luuxmart.com/products/oboe';
    const facebook = trackedLinkForPost(link, 'luux', 4, 'facebook', '99', ['facebook', 'instagram']);
    const instagram = trackedLinkForPost(link, 'luux', 4, 'instagram', '', ['facebook', 'instagram']);
    assert.match(facebook, /utm_source=facebook/);
    assert.match(facebook, /utm_content=facebook-99/);
    assert.match(instagram, /utm_source=instagram/);
    assert.match(instagram, /utm_content=instagram-4/);
    assert.match(facebook, /utm_campaign=luux-4/);
    assert.match(instagram, /utm_campaign=luux-4/);

    const custom = trackedLinkForPost(`${link}?utm_source=newsletter&utm_medium=email`, 'luux', 4, 'facebook', '', ['facebook']);
    assert.match(custom, /utm_source=newsletter/);
    assert.match(custom, /utm_medium=email/);
    assert.match(custom, /utm_campaign=luux-4/);
  });

  it('puts the tracked url in a caption without cutting it off', () => {
    const tracked = 'https://luuxmart.com/products/oboe?utm_source=threads';
    const replaced = captionWithTrackedUrl('See https://luuxmart.com/products/oboe today', tracked, 'https://luuxmart.com/products/oboe');
    assert.match(replaced, /utm_source=threads/);
    assert.equal(replaced.includes('https://luuxmart.com/products/oboe today'), false);
    const limited = captionWithTrackedUrl('A long caption about a lamp for the living room', tracked, '', 80);
    assert.equal(limited.length <= 80, true);
    assert.equal(limited.endsWith(tracked), true);
  });

  it('keeps the short source list used by shop-wide traffic', () => {
    assert.equal(trafficSourceLabel('ig', '', 'luuxmart.com'), 'Instagram');
    assert.equal(trafficSourceLabel('', '', 'luuxmart.com'), 'Direct');
    assert.equal(trafficSourceLabel('', 'https://www.luuxmart.com/products/a', 'luuxmart.com'), '');
    assert.equal(trafficSourceLabel('', 'https://l.instagram.com/x', 'www.luuxmart.com'), 'Instagram');
    assert.equal(trafficSourceLabel('newsletter', '', 'luuxmart.com'), 'Direct');
    assert.equal(trafficSourceLabel('newsletter', 'https://google.com/search', 'luuxmart.com'), 'Google');
  });

  it('stores a non-direct utm source that is outside the short list', () => {
    const visit = visitTouch({
      app: 'luux',
      utm: { source: 'newsletter', medium: 'email', campaign: 'luux-9', content: 'letter-1', term: 'oboe lamp' },
      referrer: '',
      pageHost: 'luuxmart.com',
      path: '/products/oboe?utm_source=newsletter',
    });
    assert.equal(visit?.source, 'newsletter');
    assert.equal(visit?.medium, 'email');
    assert.equal(visit?.campaign_id, 9);
    assert.equal(visit?.term, 'oboe-lamp');
    assert.equal(visit?.landing_path, '/products/oboe');
  });

  it('credits the last non-direct click and keeps a direct return for 30 days', () => {
    const first = touch();
    const later = applyTouch(first, {
      app: 'luux',
      source: 'pinterest',
      medium: 'organic_social',
      campaign: 'luux-8',
      content: 'pinterest-8',
      term: '',
      campaign_id: 8,
      channel: 'pinterest',
      landing_path: '/products/laputa',
    }, NOW);
    assert.equal(later?.source, 'pinterest');
    assert.equal(later?.campaign_id, 8);
    assert.equal(later?.first_touch_at, first.first_touch_at);
    assert.equal(later?.last_touch_at, NOW.toISOString());
    const direct = applyTouch(later, null, NOW);
    assert.equal(direct?.campaign, 'luux-8');
    assert.equal(touchExpired(touch({ last_touch_at: '2026-10-10T12:00:00.000Z' }), NOW), true);
    assert.equal(applyTouch(touch({ last_touch_at: '2026-10-10T12:00:00.000Z' }), null, NOW), null);
  });

  it('drops contact details from attribution and payment metadata', () => {
    assert.equal(sanitizeAttribution({ source: 'buyer@example.com', campaign: 'luux-1' }, 'luux', NOW), null);
    const clean = sanitizeAttribution({
      source: 'instagram',
      medium: 'organic_social',
      campaign: 'luux-4',
      content: 'instagram-4',
      email: 'buyer@example.com',
      landing_path: '/products/oboe',
      last_touch_at: NOW.toISOString(),
      first_touch_at: NOW.toISOString(),
    }, 'luux', NOW);
    assert.equal(clean?.source, 'instagram');
    assert.equal(JSON.stringify(clean).includes('buyer@'), false);
    const meta = attributionMetadata(clean);
    assert.deepEqual(Object.keys(meta).sort(), ['campaign_id', 'channel', 'landing_path', 'utm_campaign', 'utm_content', 'utm_medium', 'utm_source']);
    const purchase = publicPurchase({
      number: 'L1001',
      total: '10.00',
      currency: 'HKD',
      source: 'instagram',
      medium: 'organic_social',
      campaign: 'luux-4',
      content: 'instagram-4',
      channel: 'instagram',
    });
    assert.equal('email' in purchase, false);
    assert.equal('address' in purchase, false);
  });

  it('assembles campaign, channel, and unattributed rows without using purchase events as revenue', () => {
    const report = assembleFunnel({
      app: 'luux',
      range: '30d',
      currency: 'HKD',
      events: [
        { event: 'landing', source: 'instagram', medium: 'organic_social', campaign: 'luux-4', content: 'instagram-4', channel: 'instagram', campaign_id: 4, count: 4, revenue_cents: 0 },
        { event: 'product_view', source: 'instagram', medium: 'organic_social', campaign: 'luux-4', content: 'instagram-4', channel: 'instagram', campaign_id: 4, count: 2, revenue_cents: 0 },
        { event: 'landing', source: '', medium: '', campaign: '', content: '', channel: '', campaign_id: 0, count: 3, revenue_cents: 0 },
        { event: 'purchase', source: 'instagram', medium: 'organic_social', campaign: 'luux-4', content: 'instagram-4', channel: 'instagram', campaign_id: 4, count: 1, revenue_cents: 99900 },
      ],
      orders: [
        { source: 'instagram', medium: 'organic_social', campaign: 'luux-4', content: 'instagram-4', channel: 'instagram', campaign_id: 4, total_cents: 25000 },
        { source: '', medium: '', campaign: '', content: '', channel: '', campaign_id: 0, total_cents: 1000 },
      ],
    });
    assert.equal(report.model, 'last_non_direct');
    assert.equal(report.window_days, 30);
    assert.equal(report.totals.landings, 7);
    assert.equal(report.totals.orders, 2);
    assert.equal(report.totals.revenue, '260.00');
    assert.equal(report.totals.currency, 'HKD');
    assert.equal(report.totals.conversion_rate, 0.2857);
    assert.equal(report.campaigns[0].campaign_id, 4);
    assert.equal(report.campaigns[0].orders, 1);
    assert.equal(report.campaigns[0].revenue, '250.00');
    assert.deepEqual(report.campaigns[0].channels, ['instagram']);
    assert.equal(report.channels[0].label, 'Instagram');
    assert.equal(report.unattributed.landings, 3);
    assert.equal(report.unattributed.orders, 1);
    assert.equal(report.unattributed.revenue, '10.00');
    assert.equal(report.totals.average_order_value, '130.00');
  });

  it('uses the same day windows as the visitors chart', () => {
    const week = reportWindow('7d', NOW);
    assert.equal(week.keys.length, 7);
    assert.equal(week.keys[6], '2026-11-10');
    assert.equal(week.bucket, 'day');
    const year = reportWindow('12m', NOW);
    assert.equal(year.keys.length, 12);
    assert.equal(year.bucket, 'month');
    assert.equal(year.keys[11], '2026-11');
    assert.equal(year.sinceDay, `${year.keys[0]}-01`);
  });
});
