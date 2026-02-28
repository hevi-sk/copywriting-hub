import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';

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

    const { html_content, brand_name, brand_context, image_style } = await request.json();

    const stylePrompt =
      image_style ||
      'Warm lifestyle photography. Natural setting, soft lighting, cozy atmosphere.';

    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'No Google API key configured' },
        { status: 400 }
      );
    }

    // Parse image placeholders from generated HTML
    const placeholderRegex =
      /<img\s+data-ai-generate="true"\s+data-section="([^"]*)"\s+alt="([^"]*)"\s*\/?>/g;
    const placeholders: { fullMatch: string; section: string; alt: string }[] =
      [];

    let match;
    while ((match = placeholderRegex.exec(html_content)) !== null) {
      placeholders.push({
        fullMatch: match[0],
        section: match[1],
        alt: match[2],
      });
    }

    if (placeholders.length === 0) {
      return NextResponse.json({ images: [] });
    }

    const ai = new GoogleGenAI({ apiKey });

    const results = await Promise.allSettled(
      placeholders.map(async (placeholder) => {
        const brandDesc = brand_context ? brand_context.slice(0, 200) : '';
        const prompt = `Image for ${brand_name || 'the brand'}${brandDesc ? `. ${brandDesc}` : ''}. Scene: ${placeholder.section}. Description: ${placeholder.alt}. Style: ${stylePrompt}. High quality, photorealistic. CRITICAL: The image must contain absolutely NO text, NO words, NO letters, NO numbers, NO logos, and NO watermarks of any kind.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: prompt,
          config: {
            responseModalities: ['image', 'text'],
            imageConfig: {
              aspectRatio: '16:9',
            },
          },
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find((p) => p.inlineData?.data);

        if (!imagePart?.inlineData) {
          throw new Error('No image data in response');
        }

        const base64Data = imagePart.inlineData.data!;
        const mimeType = imagePart.inlineData.mimeType!;
        const dataUrl = `data:${mimeType};base64,${base64Data}`;

        return {
          placeholder: placeholder.fullMatch,
          imageUrl: dataUrl,
          alt: placeholder.alt,
        };
      })
    );

    const images = results
      .filter(
        (
          r
        ): r is PromiseFulfilledResult<{
          placeholder: string;
          imageUrl: string;
          alt: string;
        }> => r.status === 'fulfilled' && !!r.value.imageUrl
      )
      .map((r) => r.value);

    return NextResponse.json({ images });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate images' },
      { status: 500 }
    );
  }
}
