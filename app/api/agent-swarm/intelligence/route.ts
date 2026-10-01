/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SWARM_URL = process.env.HIVE_API_URL ?? 'http://localhost:7433';

export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get('text')?.trim();
  if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 });

  try {
    const res = await fetch(`${SWARM_URL}/api/intelligence?text=${encodeURIComponent(text)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: 'Agent Swarm backend unavailable', detail: String(err) }, { status: 503 });
  }
}
