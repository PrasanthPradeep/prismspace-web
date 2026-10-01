/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * app/api/agent-swarm/health/route.ts
 * Proxies the health check from the Python Agent Swarm backend.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SWARM_URL = process.env.HIVE_API_URL ?? 'http://localhost:7433';

export async function GET() {
  try {
    const res = await fetch(`${SWARM_URL}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    return NextResponse.json({ ...data, backend: SWARM_URL }, { status: res.status });
  } catch {
    return NextResponse.json(
      { status: 'offline', error: 'Agent Swarm backend is not reachable', backend: SWARM_URL },
      { status: 503 },
    );
  }
}
