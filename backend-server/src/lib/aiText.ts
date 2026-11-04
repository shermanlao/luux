import { chatModel } from './marketing/ai';

export async function requestAiReply(
  ai: { baseUrl: string; apiKey: string; model: string },
  facts: string,
  question: string
): Promise<{ handled: boolean; answer: string }> {
  const base = (ai.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ai.apiKey}`,
    },
    body: JSON.stringify({
      model: chatModel(base, ai.model),
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You answer for the LUUX lighting shop in Hong Kong. Reply with JSON only: {"handled":true,"answer":""}. Set handled to false when the facts do not answer the question. Use only the facts. Do not invent prices, stock, or policies. Do not take payment. Write the answer in English.',
        },
        { role: 'user', content: `${facts}\n\nQuestion:\n${question}` },
      ],
    }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string } | string;
  };
  if (!response.ok) {
    const message = typeof body.error === 'string' ? body.error : body.error?.message;
    throw new Error(message || 'The AI API did not return an answer.');
  }
  const content = String(body.choices?.[0]?.message?.content || '').trim();
  const fenced = content.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const raw = fenced ? fenced[1].trim() : content;
  try {
    const parsed = JSON.parse(raw) as { handled?: boolean; answer?: string };
    const answer = String(parsed.answer || '').trim().slice(0, 4000);
    return { handled: parsed.handled !== false && Boolean(answer), answer };
  } catch {
    return { handled: Boolean(raw) && !/cannot answer/i.test(raw), answer: raw.slice(0, 4000) };
  }
}
