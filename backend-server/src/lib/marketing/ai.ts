import { isChannel, type MarketingChannel, type MarketingInput } from './types';

export type AiDraft = {
  summary: string;
  findings: string[];
  campaigns: Array<{
    caption: string;
    image_url: string;
    link: string;
    channels: MarketingChannel[];
    rationale: string;
  }>;
};

function stripFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

export function parseAiDraft(text: string, allowed: MarketingChannel[]): AiDraft {
  const parsed = JSON.parse(stripFence(text)) as Record<string, unknown>;
  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
  const findings = Array.isArray(parsed.findings)
    ? parsed.findings.map((item) => String(item).trim()).filter(Boolean).slice(0, 8)
    : [];
  const rawCampaigns = Array.isArray(parsed.campaigns) ? parsed.campaigns : [];
  const campaigns = rawCampaigns.slice(0, 4).map((item) => {
    const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const channels = Array.isArray(row.channels)
      ? row.channels.map((channel) => String(channel)).filter(isChannel).filter((channel) => allowed.includes(channel))
      : [];
    return {
      caption: typeof row.caption === 'string' ? row.caption.trim() : '',
      image_url: typeof row.image_url === 'string' ? row.image_url.trim() : '',
      link: typeof row.link === 'string' ? row.link.trim() : '',
      channels,
      rationale: typeof row.rationale === 'string' ? row.rationale.trim() : '',
    };
  }).filter((row) => row.caption);
  return { summary, findings, campaigns };
}

export function chatModel(baseUrl: string, model: string): string {
  const chosen = String(model || '').trim();
  if (chosen) return chosen;
  try {
    if (new URL(baseUrl || 'https://api.openai.com/v1').host === 'api.x.ai') return 'grok-4.7';
  } catch {
    /* an unreadable base URL keeps the OpenAI default */
  }
  return 'gpt-4o-mini';
}

export async function requestAiDraft(input: MarketingInput, ai: { baseUrl: string; apiKey: string; model: string }): Promise<AiDraft> {
  const base = (ai.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ai.apiKey}`,
    },
    body: JSON.stringify({
      model: chatModel(base, ai.model),
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            'You plan short social posts for a shop. Reply with JSON only: {"summary":"","findings":[""],"campaigns":[{"caption":"","image_url":"","link":"","channels":["facebook"],"rationale":""}]}. Use only the channels listed in the input. Use catalog image and url values when they fit the post.',
        },
        { role: 'user', content: JSON.stringify(input) },
      ],
    }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string } | string;
  };
  if (!response.ok) {
    const message = typeof body.error === 'string' ? body.error : body.error?.message;
    throw new Error(message || 'The AI API did not return a draft.');
  }
  const content = body.choices?.[0]?.message?.content || '';
  if (!content) throw new Error('The AI API returned an empty draft.');
  return parseAiDraft(content, input.channels);
}

