import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { messagePreview, replySubject } from './mail-text';

describe('mail text', () => {
  it('adds Re: once', () => {
    assert.equal(replySubject('Lamp question'), 'Re: Lamp question');
    assert.equal(replySubject('Re: Lamp question'), 'Re: Lamp question');
    assert.equal(replySubject('  '), 'Re: (no subject)');
  });

  it('shortens a message to one line', () => {
    assert.equal(messagePreview('Hello\nthere'), 'Hello there');
    assert.equal(messagePreview('a'.repeat(120)), 'a'.repeat(120));
    assert.equal(messagePreview('a'.repeat(121)).length, 118);
    assert.equal(messagePreview('a'.repeat(121)).endsWith('…'), true);
  });
});
