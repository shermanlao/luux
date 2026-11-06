import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { addressReady, addressTouched, cleanTrackingUrl, orderStatusLabel, personName, phoneOk, profileError, readPostal } from './address';

const EMPTY = {
  first_name: '',
  last_name: '',
  company: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  region: '',
  postal: '',
  country: '',
};

describe('postal address', () => {
  it('joins a name and accepts a complete address', () => {
    const address = { ...EMPTY, first_name: 'Ada', last_name: 'Lovelace', line1: '1 Lamp Street', city: 'Central', country: 'HK' };
    assert.equal(personName(address), 'Ada Lovelace');
    assert.equal(addressReady(address), true);
    assert.equal(addressTouched(EMPTY), false);
  });

  it('splits a single name field', () => {
    const address = readPostal({ invoice_name: 'Ada Lovelace' }, 'invoice');
    assert.equal(address.first_name, 'Ada');
    assert.equal(address.last_name, 'Lovelace');
  });

  it('asks for the rest of a started address', () => {
    const invoice = { ...EMPTY, line1: '1 Lamp Street' };
    assert.equal(profileError({ phone: '', invoice, shipping: EMPTY, shippingSame: true }), 'Enter the invoice name, address, city, and country.');
    assert.equal(phoneOk('12345'), false);
    assert.equal(phoneOk('+852 6898 8613'), true);
  });
});

describe('tracking', () => {
  it('keeps an http link and names each order status', () => {
    assert.equal(cleanTrackingUrl(''), '');
    assert.equal(cleanTrackingUrl('https://track.example/LUUX'), 'https://track.example/LUUX');
    assert.equal(cleanTrackingUrl('notaurl'), null);
    assert.equal(orderStatusLabel('paid'), 'Paid, preparing to ship');
    assert.equal(orderStatusLabel('fulfilled'), 'Shipped');
  });
});
