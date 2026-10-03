/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import { useEffect, type ReactNode } from 'react';
import posthog from 'posthog-js';

let initialized = false;

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    if (!token || initialized) return;

    initialized = true;
    posthog.init(token, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      capture_pageview: true,
      capture_pageleave: true,
      // Explicit events keep prompts, API keys, and arbitrary DOM text out of analytics.
      autocapture: false,
      disable_session_recording: true,
      tracing_headers: [window.location.hostname],
    });
  }, []);

  return children;
}
