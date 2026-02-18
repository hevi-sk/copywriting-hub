import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateContent } from '@/lib/ai/openai';
import { getTranslationPrompt } from '@/lib/ai/prompts';
import type { TranslateRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: TranslateRequest = await request.json();

    const { data: settings } = await supabase
      .from('ai_settings')
      .select('openai_api_key')
      .eq('user_id', user.id)
      .single();

    const apiKey =
      settings?.openai_api_key || process.env.OPENAI_API_KEY;

    // Fetch user's brand names for translation preservation
    const { data: brands } = await supabase
      .from('brands')
      .select('name')
      .eq('user_id', user.id);

    const prompt = getTranslationPrompt({
      contentHtml: body.content_html,
      sourceLanguage: body.source_language,
      targetLanguage: body.target_language,
      brandNames: brands?.map((b) => b.name) || [],
    });

    const result = await generateContent({
      system: prompt.system,
      user: prompt.user,
      apiKey,
    });

    return NextResponse.json({ html: result });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Failed to translate content' },
      { status: 500 }
    );
  }
}
