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

    // Remove scripts, styles, nav, footer, header, and other non-content elements
    $(
      'script, style, nav, footer, header, iframe, noscript, svg, form, [role="navigation"], [role="banner"], [role="contentinfo"]'
    ).remove();

    // Try to find main content area
    let contentHtml = '';
    const mainSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.post-content',
      '.entry-content',
      '.article-content',
      '.blog-content',
      '#content',
      '.content',
    ];

    for (const selector of mainSelectors) {
      const el = $(selector);
      if (el.length > 0) {
        contentHtml = el.html()?.trim() || '';
        break;
      }
    }

    // Fallback to body
    if (!contentHtml) {
      contentHtml = $('body').html()?.trim() || '';
    }

    // Clean up extra whitespace
    contentHtml = contentHtml
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();

    return NextResponse.json({ html: contentHtml });
  } catch (error) {
    console.error('Scrape error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape URL' },
      { status: 500 }
    );
  }
}
