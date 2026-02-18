import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Papa from 'papaparse';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const brand = formData.get('brand') as string;
    const country = formData.get('country') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const text = await file.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

    if (parsed.errors.length > 0) {
      return NextResponse.json(
        { error: 'CSV parsing error', details: parsed.errors },
        { status: 400 }
      );
    }

    // Map Ahrefs columns to our schema
    const keywords = parsed.data.map((row: any) => ({
      user_id: user.id,
      keyword:
        row['Keyword'] || row['keyword'] || row['Query'] || row['query'] || '',
      volume: parseInt(
        row['Volume'] || row['volume'] || row['Search Volume'] || '0',
        10
      ),
      difficulty: parseInt(
        row['KD'] ||
          row['kd'] ||
          row['Keyword Difficulty'] ||
          row['Difficulty'] ||
          '0',
        10
      ),
      source: 'ahrefs_import' as const,
      brand: brand || null,
      country: country || 'sk',
    }));

    // Filter out empty keywords
    const validKeywords = keywords.filter((k) => k.keyword.trim() !== '');

    if (validKeywords.length === 0) {
      return NextResponse.json(
        { error: 'No valid keywords found in CSV' },
        { status: 400 }
      );
    }

    // Insert in batches of 100
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < validKeywords.length; i += batchSize) {
      const batch = validKeywords.slice(i, i + batchSize);
      const { error } = await supabase
        .from('keyword_research')
        .insert(batch);

      if (error) {
        console.error('Insert error:', error);
      } else {
        inserted += batch.length;
      }
    }

    return NextResponse.json({
      imported: inserted,
      total: validKeywords.length,
    });
  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json(
      { error: 'Failed to import CSV' },
      { status: 500 }
    );
  }
}
