import Anthropic from '@anthropic-ai/sdk';

export function createAnthropicClient(apiKey?: string) {
  return new Anthropic({
    apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
  });
}

export async function generateContent(params: {
  system: string;
  user: string;
  apiKey?: string;
}) {
  const client = createAnthropicClient(params.apiKey);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    system: params.system,
    messages: [{ role: 'user', content: params.user }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock?.text || '';
}

export async function* streamContent(params: {
  system: string;
  user: string;
  apiKey?: string;
}) {
  const client = createAnthropicClient(params.apiKey);

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    system: params.system,
    messages: [{ role: 'user', content: params.user }],
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      yield event.delta.text;
    }
  }
}
