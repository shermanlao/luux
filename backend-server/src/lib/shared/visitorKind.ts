export const VISITOR_KINDS = ['Human', 'AI', 'Web scraping'] as const;

export type VisitorKind = (typeof VISITOR_KINDS)[number];

const AI_TOKENS = [
  'gptbot',
  'chatgpt-user',
  'oai-searchbot',
  'oai-operator',
  'claudebot',
  'claude-user',
  'claude-searchbot',
  'claude-web',
  'anthropic-ai',
  'google-extended',
  'google-cloudvertexbot',
  'gemini-deep-research',
  'perplexitybot',
  'perplexity-user',
  'applebot-extended',
  'bytespider',
  'ccbot',
  'meta-externalagent',
  'facebookbot',
  'cohere-ai',
  'cohere-training',
  'youbot',
  'diffbot',
  'imagesiftbot',
  'duckassistbot',
  'phindbot',
  'iaskbot',
  'iaskspider',
  'mistralai-user',
  'deepseekbot',
  'grokbot',
  'xai-bot',
  'ai2bot',
  'amazonbot',
  'timpibot',
  'kangaroobot',
  'velenpublicwebcrawler',
  'webzio-extended',
  'novaact',
];

const SCRAPE_TOKENS = [
  'googlebot',
  'googleother',
  'bingbot',
  'bingpreview',
  'msnbot',
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'slurp',
  'sogou',
  'exabot',
  'facebot',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'slackbot',
  'telegrambot',
  'discordbot',
  'pinterestbot',
  'redditbot',
  'ahrefsbot',
  'semrushbot',
  'mj12bot',
  'dotbot',
  'petalbot',
  'applebot',
  'ia_archiver',
  'screaming frog',
  'headlesschrome',
  'phantomjs',
  'selenium',
  'puppeteer',
  'playwright',
  'httrack',
  'python-requests',
  'python-urllib',
  'scrapy',
  'go-http-client',
  'okhttp',
  'node-fetch',
  'axios/',
  'libcurl',
  'curl/',
  'wget/',
  'httpx/',
  'aiohttp',
  'fasthttp',
  'guzzlehttp',
  'mechanize',
  'colly',
  'nutch',
  'postmanruntime',
  'lighthouse',
  'java/',
  'libwww',
  'httpclient',
];

const GENERIC_BOT = /(?:^|[^a-z0-9])bot(?:[^a-z0-9]|$)/;
const BROWSER_ENGINE = /(chrome|safari|firefox|edg\/|opr\/|samsungbrowser)/;

function hasToken(ua: string, tokens: string[]): boolean {
  return tokens.some((token) => ua.includes(token));
}

function looksLikeBrowser(ua: string): boolean {
  return ua.includes('mozilla/5.0') && BROWSER_ENGINE.test(ua);
}

export function visitorKind(userAgent: string): VisitorKind {
  const ua = String(userAgent || '').trim().toLowerCase().slice(0, 400);
  if (ua.length < 12) return 'Web scraping';
  if (hasToken(ua, AI_TOKENS)) return 'AI';
  if (hasToken(ua, SCRAPE_TOKENS) || ua.includes('bot/') || GENERIC_BOT.test(ua)) return 'Web scraping';
  if (looksLikeBrowser(ua)) return 'Human';
  return 'Web scraping';
}
