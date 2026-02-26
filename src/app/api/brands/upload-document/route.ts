import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt', 'md'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
    const brandId = formData.get('brand_id') as string;

    if (!file || !brandId) {
      return NextResponse.json(
        { error: 'File and brand_id are required' },
        { status: 400 }
      );
    }

    const fileName = file.name;
    const ext = fileName.split('.').pop()?.toLowerCase();

    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Use PDF, DOCX, TXT, or MD.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum 10MB.' },
        { status: 400 }
      );
    }

    let contentText: string;

    if (ext === 'txt' || ext === 'md') {
      contentText = await file.text();
    } else if (ext === 'docx') {
      const mammoth = await import('mammoth');
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer });
      contentText = result.value;
    } else {
      // pdf
      const { PDFParse } = await import('pdf-parse');
      const buffer = Buffer.from(await file.arrayBuffer());
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      contentText = result.text;
      await parser.destroy();
    }

    contentText = contentText.trim();
    if (!contentText) {
      return NextResponse.json(
        { error: 'No text content could be extracted from this file.' },
        { status: 400 }
      );
    }

    const { data: doc, error } = await supabase
      .from('brand_documents')
      .insert({
        brand_id: brandId,
        user_id: user.id,
        file_name: fileName,
        file_type: ext,
        content_text: contentText,
        char_count: contentText.length,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to save document' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: doc.id,
      file_name: doc.file_name,
      file_type: doc.file_type,
      char_count: doc.char_count,
      created_at: doc.created_at,
    });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    );
  }
}
