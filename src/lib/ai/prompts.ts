import { LanguageCode, LANGUAGE_NAMES } from '@/types';

const HTML_RULES = `
---
HTML OUTPUT RULES (non-negotiable):
- Output ONLY clean HTML. No markdown, no code fences, no explanations.
- NEVER use **asterisks** for bold — use <strong> tags. NEVER use *asterisks* for italic — use <em> tags.
- Use ONLY these HTML elements: h1, h2, h3, h4, p, ul, ol, li, strong, em, a, blockquote, hr, img.
- Do NOT use div, table, span, iframe, or inline style attributes — they will be stripped by the editor.
- For tips/info boxes, use <blockquote>. For data comparisons, use <ul> or <ol>.`;

function getImageRule(count: number) {
  return `- Include exactly ${count} image placeholders as: <img data-ai-generate="true" data-section="description of what image should show" alt="descriptive alt text" />`;
}

function buildUserMessage(params: {
  title?: string;
  brandName: string;
  brandContext: string;
  templateHtml: string;
  topic: string;
  keywords: string[];
  language: LanguageCode;
  contentType: 'blog post' | 'presell page';
}) {
  const parts: string[] = [];

  if (params.title) parts.push(`Title: ${params.title}`);
  parts.push(`Topic: ${params.topic}`);
  parts.push(`Keywords: ${params.keywords.join(', ')}`);
  parts.push(`Language: ${LANGUAGE_NAMES[params.language]}`);
  parts.push(`Brand: ${params.brandName}`);
  if (params.brandContext) parts.push(`Brand context: ${params.brandContext}`);
  if (params.templateHtml) {
    parts.push(`\nHTML template structure:\n<template>\n${params.templateHtml}\n</template>`);
  }
  parts.push(`\nWrite the complete ${params.contentType} now as clean HTML.`);

  return parts.join('\n');
}

export function getBlogGenerationPrompt(params: {
  title?: string;
  brandName: string;
  brandContext: string;
  templateHtml: string;
  topic: string;
  keywords: string[];
  language: LanguageCode;
  customPrompt?: string;
  imageCount: number;
}) {
  const imageRule = getImageRule(params.imageCount);

  if (params.customPrompt) {
    return {
      system: `${params.customPrompt}
${HTML_RULES}
${imageRule}`,

      user: buildUserMessage({ ...params, contentType: 'blog post' }),
    };
  }

  return {
    system: `You are an expert SEO content writer for ${params.brandName}. You write engaging, well-researched blog posts that rank well in search engines while providing genuine value to readers.

Rules:
- Write naturally, weaving keywords in organically — never keyword-stuff
- Place image placeholders at logical positions between sections
- Target word count: 1200-2000 words
- Write in ${LANGUAGE_NAMES[params.language]}
${HTML_RULES}
${imageRule}`,

    user: buildUserMessage({ ...params, contentType: 'blog post' }),
  };
}

export function getPresellGenerationPrompt(params: {
  title?: string;
  brandName: string;
  brandContext: string;
  templateHtml: string;
  topic: string;
  keywords: string[];
  language: LanguageCode;
  customPrompt?: string;
  imageCount: number;
}) {
  const imageRule = getImageRule(params.imageCount);

  if (params.customPrompt) {
    return {
      system: `${params.customPrompt}
${HTML_RULES}
${imageRule}`,

      user: buildUserMessage({ ...params, contentType: 'presell page' }),
    };
  }

  return {
    system: `You are an expert conversion copywriter for ${params.brandName}. You write persuasive advertorial/presell pages that convert readers into customers while feeling authentic and trustworthy.

Rules:
- Use a listicle format with numbered reasons (like "7 reasons why...")
- Structure: Hook headline → numbered reasons with emotional hooks → product showcase → urgency/scarcity → CTA
- Write as if from a real person sharing their genuine experience (first person)
- Include social proof elements (statistics, testimonial-style content)
- Make it persuasive but authentic — not overly salesy
- Target word count: 800-1500 words
- Write in ${LANGUAGE_NAMES[params.language]}
${HTML_RULES}
${imageRule}`,

    user: buildUserMessage({ ...params, contentType: 'presell page' }),
  };
}

export function getEditSelectionPrompt(params: {
  selectedHtml: string;
  instruction: string;
  contextBefore: string;
  contextAfter: string;
  brandName?: string;
}) {
  return {
    system: `You are editing a specific section of HTML content${params.brandName ? ` for ${params.brandName}` : ''}.

CRITICAL RULES:
- Rewrite ONLY the selected HTML according to the instruction
- You MUST preserve the EXACT same HTML tag structure. If the input is <li> elements, output <li> elements. If it's <p> tags, output <p> tags. Do NOT change the wrapping tags.
- Do NOT add new wrapping tags (e.g. don't wrap <li> items in a new <ul>)
- Do NOT remove structural tags
- Output ONLY the rewritten HTML fragment — nothing else, no explanations, no markdown code fences`,

    user: `Selected HTML to edit:
${params.selectedHtml}

Instruction: ${params.instruction}

Context before (for reference only, do NOT include in output):
${params.contextBefore}

Context after (for reference only, do NOT include in output):
${params.contextAfter}`
  };
}

export function getContinueWritingPrompt(params: {
  lastContent: string;
  projectType: 'blog' | 'presell';
  brandName?: string;
}) {
  return {
    system: `You are continuing to write a ${params.projectType}${params.brandName ? ` for ${params.brandName}` : ''}.
Continue naturally from where the content left off.
Write 2-3 paragraphs of clean HTML.
Match the existing tone and style.
Output ONLY HTML — no explanations.`,

    user: `Here is the end of the current content. Continue writing from here:

${params.lastContent}`
  };
}

export function getTranslationPrompt(params: {
  contentHtml: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  brandNames?: string[];
}) {
  const brandList = params.brandNames?.length
    ? params.brandNames.map((n) => `"${n}"`).join(', ')
    : '"Hevisleep", "StretchFit"';

  return {
    system: `You are a professional translator specializing in marketing and e-commerce content.
Translate content from ${LANGUAGE_NAMES[params.sourceLanguage]} to ${LANGUAGE_NAMES[params.targetLanguage]}.

Rules:
- Preserve ALL HTML tags, attributes, structure, and formatting exactly as-is
- Translate ONLY the visible text content between tags
- Maintain SEO-friendly, natural phrasing in ${LANGUAGE_NAMES[params.targetLanguage]}
- Brand names ${brandList} must NOT be translated
- Product names should remain in their original form unless there's a well-known local equivalent
- Maintain the tone and persuasive style of the original
- Output ONLY the translated HTML — nothing else`,

    user: params.contentHtml
  };
}

export function getKeywordSuggestionsPrompt(params: {
  brand: string;
  brandContext: string;
  country: string;
  language: LanguageCode;
  categories?: string;
}) {
  return {
    system: `You are an SEO keyword research expert specializing in the ${params.country} market.
You understand search intent and know what keywords drive traffic for e-commerce brands.`,

    user: `Suggest 20 keyword ideas for the ${params.brand} brand.

Brand context: ${params.brandContext}
${params.categories ? `Product categories: ${params.categories}` : ''}
Target market: ${params.country}
Language: ${LANGUAGE_NAMES[params.language]}

For each keyword, provide:
- The keyword in ${LANGUAGE_NAMES[params.language]}
- Estimated monthly search volume (be realistic)
- Search intent: informational (blog-worthy), commercial (comparison/review), or transactional (buy-intent)
- Brief reasoning for why this keyword is valuable

Output as a JSON array:
[{"keyword": "...", "estimated_volume": number, "intent": "informational|commercial|transactional", "reasoning": "..."}]

Output ONLY the JSON array — no explanations or code fences.`
  };
}

export function getSeoMetadataPrompt(params: {
  contentHtml: string;
  title: string;
  keywords: string[];
  language: LanguageCode;
  brandName?: string;
}) {
  return {
    system: `You are an SEO specialist. Generate optimized SEO title and meta description for web content.

Rules:
- SEO Title: Max 60 characters. Include the primary keyword near the beginning. Make it compelling and click-worthy.
- SEO Description: 140-155 characters. Summarize the content value proposition. Include 1-2 keywords naturally. End with a call-to-action or benefit.
- Write in ${LANGUAGE_NAMES[params.language]}
- Output ONLY valid JSON: {"seo_title": "...", "seo_description": "..."}
- No markdown, no code fences, no explanations.`,

    user: `Generate SEO title and meta description for this content:

Title: ${params.title}
Target keywords: ${params.keywords.join(', ')}
${params.brandName ? `Brand: ${params.brandName}` : ''}

Content (first 1500 chars):
${params.contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500)}

Output as JSON: {"seo_title": "...", "seo_description": "..."}`
  };
}

export function getImagePrompt(params: {
  section: string;
  alt: string;
  brandName: string;
}) {
  return `Create a professional, clean product/lifestyle photo for ${params.brandName}, a sleep and wellness brand.

Scene: ${params.section}
Description: ${params.alt}

Style: Modern, bright, warm lighting, clean background. Commercial product photography feel.
High quality, realistic. No text or watermarks in the image.`;
}
