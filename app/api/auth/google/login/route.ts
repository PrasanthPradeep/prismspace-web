import { NextResponse } from 'next/server';
const SWARM_URL = process.env.HIVE_API_URL ?? 'http://localhost:7433';
export async function GET() {
  try {
    const res = await fetch(`${SWARM_URL}/api/auth/google/login`, { cache: 'no-store' });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: 'Backend unavailable', detail: String(err) }, { status: 503 });
  }
}
