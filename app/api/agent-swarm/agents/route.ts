/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * app/api/agent-swarm/agents/route.ts
 * GET  /api/agent-swarm/agents   — list all agents
 * POST /api/agent-swarm/agents   — create a new agent
 */
import { NextRequest, NextResponse } from 'next/server';
import { captureServerPrismEvent } from '@/lib/posthog-server';

export const dynamic = 'force-dynamic';

const SWARM_URL = process.env.HIVE_API_URL ?? 'http://localhost:7433';

export async function GET() {
  try {
    const res = await fetch(`${SWARM_URL}/api/agents`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: 'Agent Swarm backend unavailable', detail: String(err) },
      { status: 503 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${SWARM_URL}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      await captureServerPrismEvent(req, 'agent_created', {
        provider: typeof body.provider === 'string' ? body.provider : null,
        model: typeof body.model === 'string' ? body.model : null,
        max_agents: typeof body.max_agents === 'number' ? body.max_agents : null,
        human_in_loop: Boolean(body.human_in_loop),
      });
    }
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: 'Agent Swarm backend unavailable', detail: String(err) },
      { status: 503 },
    );
  }
}
