import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateContent } from '@/lib/ai/openai';
import { getKeywordSuggestionsPrompt } from '@/lib/ai/prompts';
import type { LanguageCode } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { brand, country, language, categories } = await request.json();

    const { data: settings } = await supabase
      .from('ai_settings')
      .select('openai_api_key, brand_context')
      .eq('user_id', user.id)
      .single();

    const apiKey =
      settings?.openai_api_key || process.env.OPENAI_API_KEY;

    // Look up brand context from brands table
    let brandContext = settings?.brand_context || '';
    let brandName = brand || '';
    if (brand) {
      const { data: brandRecord } = await supabase
        .from('brands')
        .select('name, brand_context, products, vop, tone_of_voice, target_audience')
        .eq('slug', brand)
        .eq('user_id', user.id)
        .single();
      if (brandRecord) {
        brandName = brandRecord.name;
        brandContext = brandRecord.brand_context || brandContext;

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

        // Cap brand context size
        if (brandContext.length > 15000) {
          brandContext = brandContext.slice(0, 15000) + '\n\n[Brand context truncated due to length]';
        }
      }
    }

    const prompt = getKeywordSuggestionsPrompt({
      brand: brandName || 'the brand',
      brandContext,
      country: country || 'Slovakia',
      language: (language as LanguageCode) || 'sk',
      categories,
    });

    const result = await generateContent({
      system: prompt.system,
      user: prompt.user,
      apiKey,
    });

    // Parse JSON response
    let suggestions;
    try {
      suggestions = JSON.parse(result);
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Keyword suggestion error:', error);
    return NextResponse.json(
      { error: 'Failed to generate keyword suggestions' },
      { status: 500 }
    );
  }
}
