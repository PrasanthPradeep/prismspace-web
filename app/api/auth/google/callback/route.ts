import { NextRequest, NextResponse } from 'next/server';
const SWARM_URL = process.env.HIVE_API_URL ?? 'http://localhost:7433';
// Frontend redirects here as /api/auth/google/callback?code=...&state=...
// Proxies to FastAPI, then redirects home with ?gmail_user_id=...&gmail_email=...
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') ?? '';
  const state = req.nextUrl.searchParams.get('state') ?? '';
  try {
    const res = await fetch(
      `${SWARM_URL}/api/auth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
      { cache: 'no-store' },
    );
    const data = await res.json();
    if (!res.ok) return NextResponse.json(data, { status: res.status });
    const home = new URL('/', req.url);
    home.searchParams.set('gmail_user_id', data.user_id ?? '');
    home.searchParams.set('gmail_email', data.email ?? '');
    return NextResponse.redirect(home);
  } catch (err) {
    return NextResponse.json({ error: 'Backend unavailable', detail: String(err) }, { status: 503 });
  }
}
