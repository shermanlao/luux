import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ORDER_NOTICE_EMAIL, orderNoticeSubject, orderNoticeText, type OrderNoticeInput } from './order-notice';

const order: OrderNoticeInput = {
  number: 'LUUX-1001',
  email: 'ada@example.com',
  phone: '+852 6898 8613',
  subtotal: '1200.00',
  shipping_amount: '80.00',
  shipping_rate_name: 'Hong Kong',
  total: '1280.00',
  shipping_same: '0',
  invoice: {
    name: 'Ada Lovelace',
    company: 'Analytical Engines',
    line1: '1 Lamp Street',
    line2: '',
    city: 'Central',
    region: '',
    postal: '',
    country: 'HK',
  },
  shipping: {
    name: 'Ada Lovelace',
    company: '',
    line1: '9 Harbour Road',
    line2: 'Flat 2',
    city: 'Wan Chai',
    region: '',
    postal: '',
    country: 'HK',
  },
  items: [
    {
      title: 'Oboe - Pendant Lamp',
      variant_title: 'Black',
      sku: 'OB-BLK',
      quantity: 2,
      unit_price: '600.00',
    },
  ],
};

describe('order notice', () => {
  it('addresses the shop mailbox', () => {
    assert.equal(ORDER_NOTICE_EMAIL, 'hello@luuxmart.com');
    assert.equal(orderNoticeSubject(order.number), 'New order LUUX-1001');
  });

  it('lists the paid order, items, and both addresses', () => {
    const text = orderNoticeText(order);
    assert.match(text, /Order LUUX-1001 is paid/);
    assert.match(text, /Email: ada@example.com/);
    assert.match(text, /Phone: \+852 6898 8613/);
    assert.match(text, /2 × Oboe - Pendant Lamp \(Black\) \[OB-BLK\]/);
    assert.match(text, /Shipping \(Hong Kong\)/);
    assert.match(text, /Analytical Engines/);
    assert.match(text, /Hong Kong SAR/);
    assert.match(text, /9 Harbour Road/);
    assert.doesNotMatch(text, /Same as the invoice address/);
  });

  it('says shipping matches the invoice when the customer used one address', () => {
    const text = orderNoticeText({
      ...order,
      shipping_same: '1',
      items: [{ title: 'Oboe', variant_title: 'Default Title', sku: '', quantity: 1, unit_price: '10.00' }],
    });
    assert.match(text, /1 × Oboe — HK\$/);
    assert.match(text, /Same as the invoice address/);
    assert.doesNotMatch(text, /9 Harbour Road/);
  });
});
