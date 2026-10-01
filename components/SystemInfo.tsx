/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

// Specific react-use hooks used (tree-shakeable named imports from package root)
import { useWindowSize, useNetworkState } from 'react-use';
import { useEffect, useState } from 'react';
import { db } from '../lib/db';

// ---------------------------------------------------------------------------
// Lightweight UA parser — no external dependency required.
// Detects the real browser engine + major version from navigator.userAgent.
// Returns a string formatted as "EngineName MajorVersion".
// ---------------------------------------------------------------------------
function detectBrowserEngine(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;

  // Order matters: Edge must come before Chrome; OPR before Chrome.
  const checks: Array<[RegExp, string]> = [
    [/Edg\/(\d+)/,             'Edge'],
    [/OPR\/(\d+)/,             'Opera'],
    [/SamsungBrowser\/(\d+)/,  'Samsung'],
    [/Firefox\/(\d+)/,         'Firefox'],
    [/Chrome\/(\d+)/,          'Chrome'],
    [/Safari\/\d+/,            'Safari'], // version is in a separate Version/x token
    [/Trident\/.*rv:(\d+)/,    'IE'],
  ];

  for (const [pattern, name] of checks) {
    const m = ua.match(pattern);
    if (m) {
      if (name === 'Safari') {
        const versionMatch = ua.match(/Version\/(\d+)/);
        const version = versionMatch ? versionMatch[1] : '';
        return version ? `${name} ${version}` : name;
      }
      return `${name} ${m[1]}`;
    }
  }

  return 'Unknown';
}

export function SystemInfo() {
  // ── Browser (static per session) ─────────────────────────────────────────
  // Initialised to '' so SSR and the first client render both produce the same
  // empty string, avoiding a hydration mismatch. The real value is set inside
  // useEffect, which only runs on the client after hydration.
  const [browser, setBrowser] = useState('');
  const [dbStatus, setDbStatus] = useState('Checking...');
  
  useEffect(() => {
    const engine = detectBrowserEngine();
    setBrowser(`PRISM (${engine})`);

    // Test Dexie connection
    db.open()
      .then(() => db.bookmarks.count())
      .then(count => setDbStatus(`OK (${count} bookmarks)`))
      .catch(err => setDbStatus(`Error: ${err.name}`));
  }, []);

  // ── Mount guard ──────────────────────────────────────────────────────────
  // All hooks below read browser-only APIs (window size, navigator.onLine).
  // `mounted` starts false on both server and client, then flips to true in
  // useEffect (client-only). Gating derived values behind it ensures the
  // server HTML and the initial client render are identical → no hydration error.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // ── Screen (live) ─────────────────────────────────────────────────────────
  // useWindowSize from react-use: re-renders whenever the viewport resizes.
  const { width: winWidth, height: winHeight } = useWindowSize();


  // ── Connection (live) ─────────────────────────────────────────────────────
  // useNetworkState from react-use: listens to online/offline events and
  // reads navigator.connection when available (Chromium-only for effectiveType).
  const networkState = useNetworkState();

  // ── Derived display values ─────────────────────────────────────────────────

  // Screen — only rendered after mount; 'Loading...' matches the server render.
  const screenDisplay = mounted && winWidth && winHeight && isFinite(winWidth) && isFinite(winHeight)
    ? `${winWidth}×${winHeight}`
    : 'Loading...';

  // Connection — default to 'Online' before mount so it matches the server render.
  const onlineStatus  = mounted ? (networkState.online ? 'Online' : 'Offline') : 'Online';
  const effectiveType = mounted ? ((networkState as any).effectiveType as string | undefined) : undefined;
  const connectionDisplay = effectiveType
    ? `${onlineStatus} (${effectiveType.toUpperCase()})`
    : onlineStatus;

  return (
    <div className="fixed top-5 left-0 glass-dark rounded-r-2xl p-5 w-80 text-left z-[100] 
                    border-r-4 border-r-[#00ff88] text-white
                    -translate-x-[calc(100%-30px)] opacity-70
                    transition-all duration-300 ease-in-out
                    hover:translate-x-0 hover:opacity-100">
      <h3 className="mt-0 mb-4 text-lg font-semibold text-center font-sans">
        💻 System Status
      </h3>

      {/* Browser — detected from navigator.userAgent (static per session) */}
      <div className="flex justify-between mb-2 text-sm font-mono">
        <span>Browser:</span>
        <span>{browser}</span>
      </div>

      {/* Screen — fed by useWindowSize() (live, updates on viewport resize) */}
      <div className="flex justify-between mb-2 text-sm font-mono">
        <span>Screen:</span>
        <span>{screenDisplay}</span>
      </div>


      {/* Connection — fed by useNetworkState() (live; online/offline + effectiveType if available) */}
      <div className="flex justify-between mb-2 text-sm font-mono">
        <span>Connection:</span>
        <span>{connectionDisplay}</span>
      </div>

      {/* Database — fed by Dexie connection test */}
      <div className="flex justify-between mb-2 text-sm font-mono">
        <span>Database:</span>
        <span title={dbStatus} className="truncate ml-2 text-right">{dbStatus}</span>
      </div>
    </div>
  );
}
