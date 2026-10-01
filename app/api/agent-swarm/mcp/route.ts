/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * app/api/agent-swarm/mcp/route.ts
 * GET  /api/agent-swarm/mcp  - list MCP servers with masked token status
 * POST /api/agent-swarm/mcp  - save/update an MCP token
 */
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SWARM_URL = process.env.HIVE_API_URL ?? 'http://localhost:7433';

export async function GET() {
  try {
    const res = await fetch(`${SWARM_URL}/api/mcp`, { cache: 'no-store' });
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
    const res = await fetch(`${SWARM_URL}/api/mcp/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: 'Agent Swarm backend unavailable', detail: String(err) },
      { status: 503 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${SWARM_URL}/api/mcp/tokens`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: 'Agent Swarm backend unavailable', detail: String(err) },
      { status: 503 },
    );
  }
}
