export async function generateImage(params: {
  prompt: string;
  apiKey?: string;
}): Promise<{ base64: string; mimeType: string } | null> {
  const apiKey = params.apiKey || process.env.GOOGLE_API_KEY;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: params.prompt }],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    console.error('Gemini API error:', response.status, await response.text());
    return null;
  }

  const data = await response.json();

  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts) return null;

  for (const part of parts) {
    if (part.inlineData) {
      return {
        base64: part.inlineData.data,
        mimeType: part.inlineData.mimeType || 'image/png',
      };
    }
  }

  return null;
}

export async function generateBlogImages(params: {
  htmlContent: string;
  brandName: string;
  apiKey?: string;
}): Promise<{ placeholder: string; imageUrl: string; alt: string }[]> {
  const placeholderRegex =
    /<img\s+data-ai-generate="true"\s+data-section="([^"]*)"\s+alt="([^"]*)"\s*\/?>/g;
  const placeholders: { fullMatch: string; section: string; alt: string }[] =
    [];

  let match;
  while ((match = placeholderRegex.exec(params.htmlContent)) !== null) {
    placeholders.push({
      fullMatch: match[0],
      section: match[1],
      alt: match[2],
    });
  }

  const results = await Promise.allSettled(
    placeholders.map(async (placeholder) => {
      const prompt = `Create a professional, clean product/lifestyle photo for ${params.brandName}, a sleep and wellness brand.

Scene: ${placeholder.section}
Description: ${placeholder.alt}

Style: Modern, bright, warm lighting, clean background. Commercial product photography feel. High quality, realistic. No text or watermarks in the image.`;

      const image = await generateImage({
        prompt,
        apiKey: params.apiKey,
      });

      return {
        placeholder: placeholder.fullMatch,
        image,
        alt: placeholder.alt,
      };
    })
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<any> =>
        r.status === 'fulfilled' && r.value.image !== null
    )
    .map((r) => ({
      placeholder: r.value.placeholder,
      imageUrl: `data:${r.value.image.mimeType};base64,${r.value.image.base64}`,
      alt: r.value.alt,
    }));
}
