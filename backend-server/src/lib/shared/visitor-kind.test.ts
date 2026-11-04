import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { visitorKind } from './visitorKind';

describe('visitor kind', () => {
  it('counts a normal browser as human', () => {
    assert.equal(
      visitorKind('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'),
      'Human'
    );
    assert.equal(
      visitorKind('Mozilla/5.0 (Linux; Android 10; CUBOT) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'),
      'Human'
    );
    assert.equal(
      visitorKind('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'),
      'Human'
    );
  });

  it('counts known model crawlers as AI', () => {
    assert.equal(visitorKind('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot'), 'AI');
    assert.equal(visitorKind('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot'), 'AI');
    assert.equal(visitorKind('Mozilla/5.0 (compatible; ClaudeBot/1.0; +frank.g@example.org)'), 'AI');
    assert.equal(visitorKind('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot'), 'AI');
    assert.equal(visitorKind('Mozilla/5.0 (compatible; Google-Extended)'), 'AI');
    assert.equal(visitorKind('Mozilla/5.0 (compatible; Applebot-Extended/1.0) Chrome/120.0.0.0 Safari/537.36'), 'AI');
    assert.equal(visitorKind('Mozilla/5.0 (compatible; Bytespider; https://zhanzhang.toutiao.com/)'), 'AI');
  });

  it('counts search crawlers and scripts as web scraping', () => {
    assert.equal(visitorKind('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'), 'Web scraping');
    assert.equal(
      visitorKind('Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'),
      'Web scraping'
    );
    assert.equal(visitorKind('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'), 'Web scraping');
    assert.equal(visitorKind('Mozilla/5.0 (compatible; Applebot/0.1; +http://www.apple.com/go/applebot)'), 'Web scraping');
    assert.equal(visitorKind('curl/8.6.0'), 'Web scraping');
    assert.equal(visitorKind('python-requests/2.31.0'), 'Web scraping');
    assert.equal(visitorKind('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36'), 'Web scraping');
    assert.equal(visitorKind('facebookexternalhit/1.1'), 'Web scraping');
    assert.equal(
      visitorKind('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SomeBot/1.0'),
      'Web scraping'
    );
    assert.equal(visitorKind(''), 'Web scraping');
    assert.equal(visitorKind('Bot/1.0'), 'Web scraping');
  });
});
