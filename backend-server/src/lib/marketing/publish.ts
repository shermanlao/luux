import { captionWithTrackedUrl, trackedLinkForPost } from '../shared/marketing-funnel';
import type { CampaignDraft, ChannelResult, ChannelTokens, MarketingChannel } from './types';

const CAPTION_CHANNELS = new Set<MarketingChannel>(['instagram', 'threads']);

async function graph(url: string, body: Record<string, string>): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const error = data.error && typeof data.error === 'object' ? (data.error as { message?: string }).message : '';
    throw new Error(error || 'The social network rejected the post.');
  }
  return data;
}

async function postFacebook(draft: CampaignDraft, tokens: ChannelTokens): Promise<ChannelResult> {
  if (!tokens.facebook_page_id || !tokens.facebook_page_token) {
    return { channel: 'facebook', status: 'failed', external_id: '', error: 'Facebook Page id and token are not saved.' };
  }
  const data = await graph(`https://graph.facebook.com/v21.0/${encodeURIComponent(tokens.facebook_page_id)}/feed`, {
    message: draft.caption,
    link: draft.link,
    access_token: tokens.facebook_page_token,
  });
  return { channel: 'facebook', status: 'posted', external_id: String(data.id || ''), error: '' };
}

async function postInstagram(draft: CampaignDraft, tokens: ChannelTokens): Promise<ChannelResult> {
  if (!tokens.instagram_account_id || !tokens.instagram_token) {
    return { channel: 'instagram', status: 'failed', external_id: '', error: 'Instagram account id and token are not saved.' };
  }
  if (!draft.image_url.startsWith('https://')) {
    return { channel: 'instagram', status: 'failed', external_id: '', error: 'Instagram needs a public https image. A local draft can be saved, and a live post needs the public site.' };
  }
  const created = await graph(`https://graph.facebook.com/v21.0/${encodeURIComponent(tokens.instagram_account_id)}/media`, {
    image_url: draft.image_url,
    caption: draft.caption,
    access_token: tokens.instagram_token,
  });
  const creationId = String(created.id || '');
  if (!creationId) throw new Error('Instagram did not return a media id.');
  const published = await graph(`https://graph.facebook.com/v21.0/${encodeURIComponent(tokens.instagram_account_id)}/media_publish`, {
    creation_id: creationId,
    access_token: tokens.instagram_token,
  });
  return { channel: 'instagram', status: 'posted', external_id: String(published.id || creationId), error: '' };
}

async function postThreads(draft: CampaignDraft, tokens: ChannelTokens): Promise<ChannelResult> {
  if (!tokens.threads_user_id || !tokens.threads_token) {
    return { channel: 'threads', status: 'failed', external_id: '', error: 'Threads user id and token are not saved.' };
  }
  const created = await graph(`https://graph.threads.net/v1.0/${encodeURIComponent(tokens.threads_user_id)}/threads`, {
    media_type: 'TEXT',
    text: draft.caption.slice(0, 500),
    access_token: tokens.threads_token,
  });
  const creationId = String(created.id || '');
  if (!creationId) throw new Error('Threads did not return a post id.');
  const published = await graph(`https://graph.threads.net/v1.0/${encodeURIComponent(tokens.threads_user_id)}/threads_publish`, {
    creation_id: creationId,
    access_token: tokens.threads_token,
  });
  return { channel: 'threads', status: 'posted', external_id: String(published.id || creationId), error: '' };
}

async function postPinterest(draft: CampaignDraft, tokens: ChannelTokens): Promise<ChannelResult> {
  if (!tokens.pinterest_board_id || !tokens.pinterest_token) {
    return { channel: 'pinterest', status: 'failed', external_id: '', error: 'Pinterest board id and token are not saved.' };
  }
  if (!draft.image_url.startsWith('https://')) {
    return { channel: 'pinterest', status: 'failed', external_id: '', error: 'Pinterest needs a public https image. A local draft can be saved, and a live pin needs the public site.' };
  }
  const caption = draft.caption.trim();
  const title = (caption.split('\n').find((line) => line.trim()) || 'LUUX').trim().slice(0, 100);
  const body: Record<string, string | Record<string, string>> = {
    board_id: tokens.pinterest_board_id,
    title,
    description: caption.slice(0, 800),
    media_source: { source_type: 'image_url', url: draft.image_url },
  };
  if (draft.link.startsWith('http://') || draft.link.startsWith('https://')) body.link = draft.link.slice(0, 2048);
  const response = await fetch('https://api.pinterest.com/v5/pins', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokens.pinterest_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof data.message === 'string' ? data.message : '';
    throw new Error(message || 'Pinterest rejected the pin.');
  }
  return { channel: 'pinterest', status: 'posted', external_id: String(data.id || ''), error: '' };
}

const POSTERS: Record<MarketingChannel, (draft: CampaignDraft, tokens: ChannelTokens) => Promise<ChannelResult>> = {
  facebook: postFacebook,
  instagram: postInstagram,
  threads: postThreads,
  pinterest: postPinterest,
};

export type PublishOutcome = {
  results: ChannelResult[];
  link: string;
  caption: string;
};

export async function publishDraft(
  draft: CampaignDraft,
  tokens: ChannelTokens,
  previous: ChannelResult[] = [],
  meta: { app: string } = { app: 'luux' }
): Promise<PublishOutcome> {
  const results: ChannelResult[] = [];
  let link = draft.link;
  let caption = draft.caption;
  for (const channel of draft.channels) {
    const already = previous.find((item) => item.channel === channel && item.status === 'posted');
    const external = previous.find((item) => item.channel === channel && item.external_id)?.external_id || '';
    const destination = draft.link.trim()
      ? trackedLinkForPost(draft.link, meta.app, draft.id, channel, external, draft.channels)
      : draft.link;
    const channelCaption = CAPTION_CHANNELS.has(channel)
      ? captionWithTrackedUrl(draft.caption, destination, draft.link, channel === 'threads' ? 500 : 2200)
      : draft.caption;
    if (link === draft.link && destination) link = destination;
    if (caption === draft.caption && CAPTION_CHANNELS.has(channel) && channelCaption) caption = channelCaption;
    if (already) {
      results.push(already);
      continue;
    }
    try {
      const result = await POSTERS[channel]({ ...draft, link: destination, caption: channelCaption }, tokens);
      results.push(result);
      if (result.status === 'posted' && destination) link = destination;
    } catch (error) {
      results.push({
        channel,
        status: 'failed',
        external_id: '',
        error: error instanceof Error ? error.message : 'The post failed.',
      });
    }
  }
  return { results, link, caption };
}
