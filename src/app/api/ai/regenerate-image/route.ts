import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, original_alt } = await request.json();

    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'No Google API key configured' },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const fullPrompt = `${prompt}. ${original_alt ? `Context: ${original_alt}.` : ''} High quality, photorealistic. No text or watermarks.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: fullPrompt,
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
      return NextResponse.json(
        { error: 'Failed to generate image' },
        { status: 500 }
      );
    }

    const base64Data = imagePart.inlineData.data!;
    const mimeType = imagePart.inlineData.mimeType!;
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    return NextResponse.json({
      imageUrl: dataUrl,
      alt: original_alt || prompt,
    });
  } catch (error) {
    console.error('Image regeneration error:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate image' },
      { status: 500 }
    );
  }
}
