// Database entity types

export type ProjectType = 'blog' | 'presell';
export type ProjectStatus = 'draft' | 'generating' | 'editing' | 'finalized' | 'translated';
export type BrandSlug = string;

export interface BrandRecord {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  website_url: string | null;
  brand_context: string | null;
  products: string | null;
  vop: string | null;
  tone_of_voice: string | null;
  target_audience: string | null;
  created_at: string;
  updated_at: string;
}

export type KeywordSource = 'gsc' | 'ahrefs_import' | 'ai_suggestion';
export type TemplateSourceType = 'html' | 'url';
export type LanguageCode = 'sk' | 'cs' | 'en' | 'da' | 'hu';

export interface Project {
  id: string;
  user_id: string;
  type: ProjectType;
  title: string;
  status: ProjectStatus;
  language: LanguageCode;
  topic: string | null;
  keywords: string[];
  template_id: string | null;
  ai_model: string;
  ai_prompt: string | null;
  content_html: string | null;
  translated_versions: Record<LanguageCode, string>;
  brand_id: string | null;
  images: ProjectImage[];
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectImage {
  url: string;
  alt: string;
  prompt: string;
}

export interface Template {
  id: string;
  user_id: string;
  name: string;
  type: ProjectType;
  source_type: TemplateSourceType | null;
  source_url: string | null;
  html_structure: string;
  description: string | null;
  created_at: string;
}

export interface KeywordEntry {
  id: string;
  user_id: string;
  brand: BrandSlug | null;
  keyword: string;
  volume: number | null;
  difficulty: number | null;
  source: KeywordSource | null;
  country: string;
  notes: string | null;
  created_at: string;
}

export interface AISettings {
  id: string;
  user_id: string;
  anthropic_api_key: string | null;
  google_api_key: string | null;
  openai_api_key: string | null;
  brand_context: string | null;
  default_ai_model: string;
  default_language: LanguageCode;
}

// AI request/response types

export interface GenerateContentRequest {
  project_type: ProjectType;
  title: string;
  topic: string;
  keywords: string[];
  template_html: string;
  language: LanguageCode;
  custom_prompt?: string;
  brand_id?: string;
  brand_name?: string;
  brand_context?: string;
  image_count?: number;
}

export interface EditSelectionRequest {
  selected_html: string;
  instruction: string;
  context_before: string;
  context_after: string;
  brand_name?: string;
  brand_context?: string;
}

export interface TranslateRequest {
  content_html: string;
  source_language: LanguageCode;
  target_language: LanguageCode;
}

export interface KeywordSuggestion {
  keyword: string;
  estimated_volume: number;
  intent: 'informational' | 'commercial' | 'transactional';
  reasoning: string;
}

// Language config
export const LANGUAGES: Record<LanguageCode, string> = {
  sk: 'Slovenčina',
  cs: 'Čeština',
  en: 'English',
  da: 'Dansk',
  hu: 'Magyar',
};

export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  sk: 'Slovak',
  cs: 'Czech',
  en: 'English',
  da: 'Danish',
  hu: 'Hungarian',
};

// Prompt templates
export interface PromptTemplate {
  id: string;
  name: string;
  prompt: string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'seo-blog',
    name: 'SEO Blog Post',
    prompt: 'Write a comprehensive, SEO-optimized blog post. Use H2 and H3 subheadings naturally. Include a compelling intro, detailed body sections, and a strong conclusion with a call to action.',
  },
  {
    id: 'listicle',
    name: 'Listicle (Top X)',
    prompt: 'Write in a numbered listicle format (e.g. "Top 10..."). Each item should have a bold heading, 2-3 sentences of explanation, and practical tips. Keep it scannable and engaging.',
  },
  {
    id: 'how-to',
    name: 'How-To Guide',
    prompt: 'Write a step-by-step how-to guide. Number each step clearly, explain it in detail, and include practical tips. Add a brief intro explaining what the reader will learn and a summary at the end.',
  },
  {
    id: 'comparison',
    name: 'Product Comparison',
    prompt: 'Write a detailed comparison article. Cover pros and cons of each option, include a comparison table if relevant, and give a clear recommendation at the end. Be balanced but authoritative.',
  },
  {
    id: 'storytelling',
    name: 'Storytelling / Personal',
    prompt: 'Write in a personal, storytelling tone as if sharing a genuine experience. Use first person, include relatable anecdotes, and naturally weave in product mentions. Make it feel authentic, not salesy.',
  },
  {
    id: 'problem-solution',
    name: 'Problem-Solution',
    prompt: 'Start by deeply describing the problem the reader faces (pain points, frustrations). Then present the solution step by step. End with how the product/brand solves this problem specifically.',
  },
];

// Image styles
export interface ImageStyle {
  id: string;
  name: string;
  prompt: string;
}

export const IMAGE_STYLES: ImageStyle[] = [
  {
    id: 'product-photo',
    name: 'Product Photography',
    prompt: 'Professional product photography. Clean white/light background, studio lighting, high-end commercial feel. Sharp focus, minimal props.',
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    prompt: 'Warm lifestyle photography. Natural setting, soft lighting, cozy atmosphere. Shows the product in a real-life context with people or home environment.',
  },
  {
    id: 'minimal',
    name: 'Minimalist',
    prompt: 'Minimalist, clean aesthetic. Lots of white space, simple composition, subtle shadows. Modern and elegant feel.',
  },
  {
    id: 'editorial',
    name: 'Editorial / Magazine',
    prompt: 'High-end editorial style like a magazine spread. Dramatic lighting, artistic composition, premium feel. Fashion/interior design magazine quality.',
  },
  {
    id: 'infographic',
    name: 'Infographic / Illustrative',
    prompt: 'Clean, modern illustration or infographic style. Flat design elements, brand colors, informational yet visually appealing. No photorealistic elements.',
  },
];
