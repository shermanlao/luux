import type { CampaignDraft, ChannelResult, ChannelTokens, MarketingChannel } from './types';

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

const POSTERS: Record<MarketingChannel, (draft: CampaignDraft, tokens: ChannelTokens) => Promise<ChannelResult>> = {
  facebook: postFacebook,
  instagram: postInstagram,
  threads: postThreads,
};

export async function publishDraft(
  draft: CampaignDraft,
  tokens: ChannelTokens,
  previous: ChannelResult[] = []
): Promise<ChannelResult[]> {
  const results: ChannelResult[] = [];
  for (const channel of draft.channels) {
    const already = previous.find((item) => item.channel === channel && item.status === 'posted');
    if (already) {
      results.push(already);
      continue;
    }
    try {
      results.push(await POSTERS[channel](draft, tokens));
    } catch (error) {
      results.push({
        channel,
        status: 'failed',
        external_id: '',
        error: error instanceof Error ? error.message : 'The post failed.',
      });
    }
  }
  return results;
}
