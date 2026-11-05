import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { contactAnswer, receptionIntent, shippingAnswer } from './receptionist';

describe('receptionIntent', () => {
  it('treats a shipping question as one simple intent', () => {
    assert.equal(receptionIntent('How much is shipping to Hong Kong?'), 'shipping');
  });

  it('leaves a mixed question for the AI', () => {
    assert.equal(receptionIntent('What is your email and the shipping rate?'), null);
  });

  it('treats a named lamp as a product question', () => {
    assert.equal(receptionIntent('Do you have the Apollo pendant?'), 'product');
  });
});

describe('simple answers', () => {
  it('quotes the Hong Kong rate', () => {
    const answer = shippingAnswer('shipping to Hong Kong', [
      { name: 'Hong Kong', code: 'hk', amount: '80.00' },
      { name: 'Worldwide', code: 'world', amount: '280.00' },
    ]);
    assert.match(answer || '', /Hong Kong shipping is HK\$80\.00/);
    assert.doesNotMatch(answer || '', /Worldwide/);
  });

  it('leaves the hidden payment-test rate out of a general shipping answer', () => {
    const answer = shippingAnswer('how much is shipping', [
      { name: 'Hong Kong', code: 'hk', amount: '80.00' },
      { name: 'Express', code: 'express', amount: '120.00' },
      { name: 'Payment test', code: 'paytest', amount: '0.00' },
    ]);
    assert.match(answer || '', /Hong Kong shipping is HK\$80\.00/);
    assert.match(answer || '', /Express shipping is HK\$120\.00/);
    assert.doesNotMatch(answer || '', /Payment test/);
  });

  it('quotes the saved contact details', () => {
    const answer = contactAnswer({ contact_email: 'hello@luuxmart.com', contact_phone: '+852 6898 8613', contact_address: 'Hong Kong' });
    assert.match(answer || '', /hello@luuxmart.com/);
  });
});
