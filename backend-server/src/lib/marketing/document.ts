import { isChannel, type CampaignDraft, type ChannelResult, type MarketingDocument } from './types';

export function toDocument(
  app: string,
  analysis: { summary: string; findings: string[] },
  campaigns: CampaignDraft[]
): MarketingDocument {
  return { app, analysis, campaigns };
}

export function parseResults(raw: string): ChannelResult[] {
  try {
    const value = JSON.parse(raw || '[]');
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const row = item as Record<string, unknown>;
      const channel = String(row.channel || '');
      if (!isChannel(channel)) return [];
      return [{
        channel,
        status: row.status === 'posted' ? 'posted' as const : 'failed' as const,
        external_id: String(row.external_id || ''),
        error: String(row.error || ''),
      }];
    });
  } catch {
    return [];
  }
}
