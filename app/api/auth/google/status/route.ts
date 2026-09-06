import { NextRequest, NextResponse } from 'next/server';
const SWARM_URL = process.env.HIVE_API_URL ?? 'http://localhost:7433';
export async function GET(req: NextRequest) {
  const user_id = req.nextUrl.searchParams.get('user_id') ?? '';
  try {
    const res = await fetch(`${SWARM_URL}/api/gmail/status?user_id=${encodeURIComponent(user_id)}`, { cache: 'no-store' });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: 'Backend unavailable', detail: String(err) }, { status: 503 });
  }
}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${SWARM_URL}/api/gmail/disconnect`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: 'Backend unavailable', detail: String(err) }, { status: 503 });
  }
}
