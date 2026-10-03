/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
import { PostHog } from 'posthog-node';
import type { NextRequest } from 'next/server';

type ServerEventProperties = Record<string, string | number | boolean | null | undefined>;

/** Capture a server event without allowing analytics failures to affect requests. */
export async function captureServerPrismEvent(
  request: NextRequest,
  event: string,
  properties: ServerEventProperties = {},
): Promise<void> {
  const token = process.env.POSTHOG_PROJECT_TOKEN || process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!token) return;

  const distinctId = request.headers.get('x-posthog-distinct-id') || crypto.randomUUID();
  const client = new PostHog(token, {
    host: process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  });

  try {
    client.capture({ distinctId, event, properties });
    await client.shutdown();
  } catch {
    // Analytics must never turn a successful product request into a failure.
    try {
      await client.shutdown();
    } catch {
      // Ignore shutdown failures as well.
    }
  }
}
