import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateContent } from '@/lib/ai/openai';
import { getEditSelectionPrompt } from '@/lib/ai/prompts';
import type { EditSelectionRequest } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: EditSelectionRequest = await request.json();

    const { data: settings } = await supabase
      .from('ai_settings')
      .select('openai_api_key, brand_context')
      .eq('user_id', user.id)
      .single();

    const apiKey =
      settings?.openai_api_key || process.env.OPENAI_API_KEY;

    const prompt = getEditSelectionPrompt({
      selectedHtml: body.selected_html,
      instruction: body.instruction,
      contextBefore: body.context_before,
      contextAfter: body.context_after,
      brandName: body.brand_name,
    });

    const result = await generateContent({
      system: prompt.system,
      user: prompt.user,
      apiKey,
    });

    return NextResponse.json({ html: result });
  } catch (error) {
    console.error('Edit selection error:', error);
    return NextResponse.json(
      { error: 'Failed to edit selection' },
      { status: 500 }
    );
  }
}
