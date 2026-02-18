import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const siteUrl = searchParams.get('site_url');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const accessToken = searchParams.get('access_token');

    if (!siteUrl || !accessToken) {
      return NextResponse.json(
        { error: 'site_url and access_token are required' },
        { status: 400 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ access_token: accessToken });

    const searchconsole = google.searchconsole({
      version: 'v1',
      auth: oauth2Client,
    });

    const response = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: startDate || getDateDaysAgo(28),
        endDate: endDate || getDateDaysAgo(0),
        dimensions: ['query'],
        rowLimit: 100,
        type: 'web',
      },
    });

    const rows = response.data.rows || [];
    const keywords = rows.map((row) => ({
      keyword: row.keys?.[0] || '',
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    }));

    return NextResponse.json({ keywords });
  } catch (error) {
    console.error('GSC error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GSC data' },
      { status: 500 }
    );
  }
}

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}
