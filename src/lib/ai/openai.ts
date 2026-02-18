import OpenAI from 'openai';

export function createOpenAIClient(apiKey?: string) {
  return new OpenAI({
    apiKey: apiKey || process.env.OPENAI_API_KEY,
  });
}

export async function generateContent(params: {
  system: string;
  user: string;
  apiKey?: string;
}) {
  const client = createOpenAIClient(params.apiKey);

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 8000,
    messages: [
      { role: 'system', content: params.system },
      { role: 'user', content: params.user },
    ],
  });

  return response.choices[0]?.message?.content || '';
}

export async function* streamContent(params: {
  system: string;
  user: string;
  apiKey?: string;
}) {
  const client = createOpenAIClient(params.apiKey);

  const stream = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 8000,
    stream: true,
    messages: [
      { role: 'system', content: params.system },
      { role: 'user', content: params.user },
    ],
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) {
      yield text;
    }
  }
}
