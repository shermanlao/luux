import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { chooseMailbox } from './mail-api';

const hello = { resourceId: 'AChello', address: 'hello@luuxmart.com' };
const shop = { resourceId: 'ACshop', address: 'shop@luuxmart.com' };

describe('chooseMailbox', () => {
  it('picks the preferred address when the token can reach several mailboxes', () => {
    const chosen = chooseMailbox([shop, hello], ['', 'Hello@luuxmart.com']);
    assert.equal(chosen?.resourceId, 'AChello');
  });

  it('uses the only mailbox when no preferred address matches', () => {
    const chosen = chooseMailbox([hello], ['other@example.com']);
    assert.equal(chosen?.address, 'hello@luuxmart.com');
  });

  it('returns nothing when several mailboxes remain and none is preferred', () => {
    assert.equal(chooseMailbox([hello, shop], ['other@example.com']), null);
  });
});
