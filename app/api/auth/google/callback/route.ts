/**
 * Copyright 2026 Prism AI Labs.
 * SPDX-License-Identifier: Apache-2.0
 */
import { NextRequest, NextResponse } from 'next/server';
const SWARM_URL = process.env.HIVE_API_URL ?? 'http://localhost:7433';
// Frontend redirects here as /api/auth/google/callback?code=...&state=...
// Proxies to FastAPI, then redirects home with ?gmail_user_id=...&gmail_email=...
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') ?? '';
  const state = req.nextUrl.searchParams.get('state') ?? '';
  const home = new URL('/', req.url);
  const fail = (message: string) => {
    home.searchParams.set('gmail_error', message.slice(0, 200));
    return NextResponse.redirect(home);
  };
  try {
    const res = await fetch(
      `${SWARM_URL}/api/auth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
      { cache: 'no-store' },
    );
    let data: Record<string, unknown> = {};
    try {
      data = await res.json();
    } catch {
      data = { detail: `Unexpected response (${res.status})` };
    }
    if (!res.ok) return fail(String(data.detail ?? data.error ?? 'Gmail connection failed'));
    home.searchParams.set('gmail_user_id', String(data.user_id ?? ''));
    home.searchParams.set('gmail_email', String(data.email ?? ''));
    return NextResponse.redirect(home);
  } catch (err) {
    return fail(`Backend unavailable: ${String(err)}`);
  }
}
