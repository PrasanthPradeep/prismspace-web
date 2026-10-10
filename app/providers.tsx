'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from '@posthog/react';

let initialized = false;

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    if (!token || initialized) return;

    initialized = true;
    posthog.init(token, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      defaults: '2026-05-30',
      capture_pageview: true,
      capture_pageleave: true,
      // Explicit events keep prompts, API keys, and arbitrary DOM text out of analytics.
      autocapture: false,
      disable_session_recording: true,
      tracing_headers: [window.location.hostname],
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
