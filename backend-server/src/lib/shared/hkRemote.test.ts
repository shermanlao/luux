import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isRemoteHongKongDelivery } from './hkRemote';
import { shippingRateEligible } from './shipping';

describe('Hong Kong remote delivery', () => {
  it('flags named remote areas', () => {
    assert.equal(isRemoteHongKongDelivery({ city: 'Tung Chung' }), true);
    assert.equal(isRemoteHongKongDelivery({ line1: '12 Discovery Bay Road' }), true);
    assert.equal(isRemoteHongKongDelivery({ city: 'Kowloon', line1: '88 Nathan Road' }), false);
  });

  it('picks the standard or remote HK rate', () => {
    const hk = { code: 'hk', countries: 'HK' };
    const remote = { code: 'hk-remote', countries: 'HK' };
    const world = { code: 'world', countries: '*' };
    const standard = { city: 'Hong Kong', line1: 'Central' };
    const remoteAddr = { city: 'Lantau', line1: 'Mui Wo' };
    assert.equal(shippingRateEligible(hk, 'HK', standard), true);
    assert.equal(shippingRateEligible(hk, 'HK', remoteAddr), false);
    assert.equal(shippingRateEligible(remote, 'HK', remoteAddr), true);
    assert.equal(shippingRateEligible(world, 'US', {}), true);
    assert.equal(shippingRateEligible(world, 'HK', standard), false);
  });
});