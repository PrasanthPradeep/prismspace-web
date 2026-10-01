/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
import { NextRequest, NextResponse } from 'next/server';
import { scrapeDocs, scrapeResultToCsv, ScrapeMode, ScrapeOutputFormat } from '@/lib/scrape-docs';

interface ScrapeRequestBody {
  url?: string;
  mode?: ScrapeMode;
  format?: ScrapeOutputFormat;
  maxPages?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ScrapeRequestBody;
    const url = body.url?.trim();
    const format = body.format ?? 'json';

    if (!url) {
      return NextResponse.json({ error: 'Paste a link to scrape.' }, { status: 400 });
    }

    if (!['json', 'csv'].includes(format)) {
      return NextResponse.json({ error: 'Format must be json or csv.' }, { status: 400 });
    }

    const data = await scrapeDocs({
      url,
      mode: body.mode === 'crawl' ? 'crawl' : 'single',
      maxPages: body.maxPages,
    });

    if (format === 'csv') {
      return new NextResponse(scrapeResultToCsv(data), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
        },
      });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scrape failed.' },
      { status: 500 },
    );
  }
}
