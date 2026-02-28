import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createOpenAIClient } from '@/lib/ai/openai';
import { getSeoMetadataPrompt } from '@/lib/ai/prompts';
import type { LanguageCode } from '@/types';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content_html, title, keywords, language, brand_name } =
      await request.json();

    const { data: settings } = await supabase
      .from('ai_settings')
      .select('openai_api_key')
      .eq('user_id', user.id)
      .single();

    const apiKey = settings?.openai_api_key || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'No OpenAI API key configured' },
        { status: 400 }
      );
    }

    const prompt = getSeoMetadataPrompt({
      contentHtml: content_html,
      title: title || '',
      keywords: keywords || [],
      language: (language as LanguageCode) || 'sk',
      brandName: brand_name,
    });

    const client = createOpenAIClient(apiKey);

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 500,
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
    });

    const text = response.choices[0]?.message?.content || '';

    // Parse the JSON response
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({
      seo_title: parsed.seo_title || '',
      seo_description: parsed.seo_description || '',
    });
  } catch (error) {
    console.error('SEO generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate SEO metadata' },
      { status: 500 }
    );
  }
}
