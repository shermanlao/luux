export const MARKETING_CHANNELS = ['facebook', 'instagram', 'threads'] as const;

export type MarketingChannel = (typeof MARKETING_CHANNELS)[number];

export type CatalogItem = {
  title: string;
  url: string;
  image: string;
  price: string;
};

export type DailyCount = {
  day: string;
  path?: string;
  count: number;
  total?: string;
};

export type MarketingInput = {
  app: string;
  catalog: CatalogItem[];
  page_views: Array<{ day: string; path: string; count: number }>;
  orders: Array<{ day: string; total: string; count: number }>;
  channels: MarketingChannel[];
};

export type ChannelResult = {
  channel: MarketingChannel;
  status: 'posted' | 'failed';
  external_id: string;
  error: string;
};

export type CampaignDraft = {
  id: number;
  status: 'draft' | 'posted' | 'failed';
  caption: string;
  image_url: string;
  link: string;
  channels: MarketingChannel[];
  rationale: string;
  results: ChannelResult[];
};

export type MarketingDocument = {
  app: string;
  analysis: { summary: string; findings: string[] };
  campaigns: CampaignDraft[];
};

export type ChannelTokens = {
  facebook_page_id: string;
  facebook_page_token: string;
  instagram_account_id: string;
  instagram_token: string;
  threads_user_id: string;
  threads_token: string;
};

export function isChannel(value: string): value is MarketingChannel {
  return (MARKETING_CHANNELS as readonly string[]).includes(value);
}
