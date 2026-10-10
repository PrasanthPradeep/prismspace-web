/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
import posthog from 'posthog-js';

export type PrismEventProperties = Record<string, string | number | boolean | null | undefined>;

export function capturePrismEvent(event: string, properties?: PrismEventProperties): void {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return;
  posthog.capture(event, properties);
}
