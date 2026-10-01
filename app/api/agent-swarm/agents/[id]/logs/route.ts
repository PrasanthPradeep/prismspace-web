/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * app/api/agent-swarm/agents/[id]/logs/route.ts
 * GET /api/agent-swarm/agents/:id/logs
 *
 * Transparently proxies the Server-Sent Events stream from the Python backend.
 */
import { NextRequest } from 'next/server';

const SWARM_URL = process.env.HIVE_API_URL ?? 'http://localhost:7433';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const since = req.nextUrl.searchParams.get('since') ?? '0';

  let upstream: Response;
  try {
    upstream = await fetch(`${SWARM_URL}/api/agents/${id}/logs?since=${since}`, {
      headers: { Accept: 'text/event-stream' },
    });
  } catch {
    return new Response('data: {"error":"Agent Swarm backend unavailable"}\n\n', {
      status: 503,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
