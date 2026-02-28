import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createOpenAIClient } from '@/lib/ai/openai';
import {
  getBlogGenerationPrompt,
  getPresellGenerationPrompt,
} from '@/lib/ai/prompts';
import type { GenerateContentRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body: GenerateContentRequest = await request.json();

    const { data: settings } = await supabase
      .from('ai_settings')
      .select('openai_api_key, brand_context')
      .eq('user_id', user.id)
      .single();

    const apiKey =
      settings?.openai_api_key || process.env.OPENAI_API_KEY;
    let brandContext =
      body.brand_context || settings?.brand_context || 'No brand context set';

    // Append structured brand fields if a brand is selected
    if (body.brand_id) {
      const { data: brandRecord } = await supabase
        .from('brands')
        .select('products, vop, tone_of_voice, target_audience')
        .eq('id', body.brand_id)
        .eq('user_id', user.id)
        .single();

      if (brandRecord) {
        const fields = [
          { label: 'Products / Services', value: brandRecord.products },
          { label: 'Tone of Voice', value: brandRecord.tone_of_voice },
          { label: 'Target Audience', value: brandRecord.target_audience },
          { label: 'VOP (Conditions)', value: brandRecord.vop },
        ];
        const extras = fields
          .filter((f) => f.value)
          .map((f) => `${f.label}: ${f.value}`)
          .join('\n\n');
        if (extras) {
          brandContext = `${brandContext}\n\n${extras}`;
        }
      }
    }

    // Cap brand context to avoid excessive prompt size
    const MAX_BRAND_CONTEXT_CHARS = 15000;
    if (brandContext.length > MAX_BRAND_CONTEXT_CHARS) {
      brandContext = brandContext.slice(0, MAX_BRAND_CONTEXT_CHARS) + '\n\n[Brand context truncated due to length]';
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'No OpenAI API key configured. Add it in Settings or .env.local.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const promptParams = {
      title: body.title,
      brandName: body.brand_name || 'the brand',
      brandContext,
      templateHtml: body.template_html || '<article><h1>Title</h1><p>Content here</p></article>',
      topic: body.topic,
      keywords: body.keywords,
      language: body.language,
      customPrompt: body.custom_prompt,
      imageCount: body.image_count || 2,
    };

    const prompt =
      body.project_type === 'presell'
        ? getPresellGenerationPrompt(promptParams)
        : getBlogGenerationPrompt(promptParams);

    const client = createOpenAIClient(apiKey);

    const stream = await client.chat.completions.create({
      model: 'gpt-4o-latest',
      max_tokens: 16000,
      stream: true,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Generate content error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate content' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
