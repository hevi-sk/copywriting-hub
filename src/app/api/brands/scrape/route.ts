import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status}` },
        { status: 400 }
      );
    }

    const rawHtml = await response.text();
    const $ = cheerio.load(rawHtml);

    const parts: string[] = [];

    // 1. Extract JSON-LD structured data
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '');
        const items = Array.isArray(json) ? json : [json];
        for (const item of items) {
          if (item['@type'] === 'Organization' || item['@type'] === 'WebSite') {
            if (item.name) parts.push(`Brand: ${item.name}`);
            if (item.description) parts.push(`Description: ${item.description}`);
          }
          if (item['@type'] === 'Product' || item['@type'] === 'ProductGroup') {
            const name = item.name || '';
            const desc = item.description?.slice(0, 150) || '';
            parts.push(`Product: ${name}${desc ? ' - ' + desc : ''}`);
          }
          // Handle @graph arrays (common in Yoast SEO, Shopify)
          if (item['@graph']) {
            for (const node of item['@graph']) {
              if (node['@type'] === 'Organization' || node['@type'] === 'WebSite') {
                if (node.name) parts.push(`Brand: ${node.name}`);
                if (node.description) parts.push(`Description: ${node.description}`);
              }
            }
          }
        }
      } catch {
        // Skip invalid JSON-LD
      }
    });

    // 2. Meta tags
    const metaDesc =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      '';
    const siteName = $('meta[property="og:site_name"]').attr('content') || '';
    const pageTitle = $('title').text().trim();

    if (siteName && !parts.some((p) => p.includes(siteName))) {
      parts.push(`Brand: ${siteName}`);
    }
    if (pageTitle && !parts.length) {
      parts.push(`Page: ${pageTitle}`);
    }
    if (metaDesc) {
      parts.push(`About: ${metaDesc.slice(0, 300)}`);
    }

    // 3. Product selectors - common e-commerce patterns
    const productNames: string[] = [];
    const productSelectors = [
      '.product-title',
      '.product-name',
      '.product-card h2',
      '.product-card h3',
      '.product-item h2',
      '.product-item h3',
      '[data-product-title]',
      '.woocommerce-loop-product__title',
      '.product-tile__name',
      'h2.product__title',
      '.product-card__title',
    ];

    for (const selector of productSelectors) {
      $(selector).each((_, el) => {
        const name = $(el).text().trim();
        if (name && name.length < 100 && !productNames.includes(name)) {
          productNames.push(name);
        }
      });
      if (productNames.length > 0) break;
    }

    if (productNames.length > 0) {
      parts.push(`Products: ${productNames.slice(0, 15).join(', ')}`);
    }

    // 4. Category/navigation links
    const categories: string[] = [];
    $('nav a, .nav a, .menu a, .categories a').each((_, el) => {
      const text = $(el).text().trim();
      if (
        text &&
        text.length > 2 &&
        text.length < 40 &&
        !categories.includes(text) &&
        !['Home', 'About', 'Contact', 'Cart', 'Login', 'Sign in', 'Blog'].includes(text)
      ) {
        categories.push(text);
      }
    });
    if (categories.length > 0) {
      parts.push(`Categories: ${categories.slice(0, 10).join(', ')}`);
    }

    // 5. Fallback: first meaningful paragraphs
    if (parts.length < 3) {
      $('main p, article p, .content p, body p')
        .slice(0, 3)
        .each((_, el) => {
          const text = $(el).text().trim();
          if (text.length > 50) {
            parts.push(text.slice(0, 200));
          }
        });
    }

    // Combine and truncate
    const brandContext = parts
      .filter(Boolean)
      .join('\n')
      .slice(0, 2000);

    return NextResponse.json({ brand_context: brandContext });
  } catch (error) {
    console.error('Brand scrape error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape brand URL' },
      { status: 500 }
    );
  }
}
