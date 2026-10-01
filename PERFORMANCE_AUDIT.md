# Performance Audit

## Executive Summary

The application is a statically prerendered Next.js App Router application with a client-heavy interactive home screen, local IndexedDB/localStorage state, API proxy routes, an optional 3D lanyard, and an in-browser SQLite tool.

The largest verified bottleneck was eager client inclusion of the complete panel system. The home route imported Agent Swarm, SQL/WASM tooling, every tool panel, and the settings modal before any of those features were requested. Those features are now deferred behind client-side dynamic imports. A small post-hydration quotes request was also removed, and static background images now use Next image optimization.

Measured production-build result:

| Route | Before | After | Change |
| --- | ---: | ---: | ---: |
| `/` route JavaScript | 181 kB | 82.5 kB | -98.5 kB (-54.4%) |
| `/` First Load JS | 377 kB | 281 kB | -96 kB (-25.5%) |

These are Next.js production build measurements, not Lighthouse or real-user measurements.

## Performance Score / Baseline

No browser automation or Lighthouse binary is installed in the workspace, so LCP, INP, CLS, FCP, TTFB, TBT, request waterfalls, and runtime frame/memory measurements were not available. No scores are invented below.

The production build baseline before changes was `/` at 181 kB route size and 377 kB First Load JS. The post-change build is `/` at 82.5 kB route size and 281 kB First Load JS. The bookmark-canvas route remained approximately 221 kB First Load JS.

## Critical Issues

None identified that block the production build or route generation.

## High Priority Issues

### Eager loading of interaction-only panels — fixed

- File: `app/page.tsx`, `components/PanelManager.tsx`
- Original problem: the home route statically imported the panel manager, which statically imported Agent Swarm, SQL Playground, and every tool panel.
- Root cause: no bundle boundary around features opened only after user interaction.
- Change: moved panel state into `components/use-panel-manager.ts` and dynamically imported `PanelManager` and `SettingsModal` with `ssr: false`.
- Expected impact: less initial JavaScript parsing, compilation, hydration, and network transfer; SQL/WASM and Agent Swarm code are deferred until panel use.
- Measured impact: route size reduced by 98.5 kB and First Load JS by 96 kB in `next build`.

### Static background image bypassed image optimization — fixed

- File: `components/BackgroundManager.tsx`
- Original problem: the background used a raw `<img>` for both static assets and user-provided blob/data URLs.
- Change: static and dynamic backgrounds use `next/image`; `fill`, `sizes="100vw"`, and quality 70 provide responsive optimization. Blob/data URLs remain `unoptimized` because they are not public image assets.
- Expected impact: lower transfer size for static backgrounds and fewer image lint/performance warnings on this path. Browser image metrics were not measured.

## Medium Priority Issues

### Post-hydration quotes request — fixed

- File: `components/MainContainer.tsx`
- Original problem: the small quotes file was fetched after hydration, adding a request and delaying the correct daily quote.
- Change: imported the existing 799-byte JSON at build time and selected the current day locally.
- Expected impact: removes one request and a post-hydration fetch chain; behavior and fallback remain unchanged.

### Large optional assets remain available — not changed

The repository contains large optional assets, including two GIF backgrounds around 6.1 MB and 2.7 MB, a 2.45 MB GLB, and a 1.24 MB SQLite WASM file. These are user-selected or feature-specific assets, so they were not removed or recompressed without visual/functional validation. The panel split ensures SQL/WASM is not part of the initial home feature path.

## Low Priority Issues

- The vendored SQLite manager still has one export-style lint warning; it is not application code.
- `framer-motion` was removed as a direct dependency. The `motion` package still contains `framer-motion` transitively, as required by its package manifest, but application code now consistently imports `motion/react`.
- No browser runtime measurement was possible because Lighthouse, Playwright, Chrome, and Edge were unavailable.

## Fixes Applied

| File | Change | Measured impact |
| --- | --- | --- |
| `app/page.tsx` | Dynamic import settings and panel UI; keep only lightweight panel state in the initial bundle | `/` First Load JS: 377 kB → 281 kB |
| `components/use-panel-manager.ts` | New lightweight client hook for panel state | Enables the panel bundle boundary |
| `components/panel-types.ts` | Shared panel type without importing panel implementations | Keeps initial state module small |
| `components/PanelManager.tsx` | Reuse shared type and remove duplicated hook | Supports deferred loading |
| `components/MainContainer.tsx` | Bundle the existing small quotes JSON instead of fetching it after hydration | One request removed; no browser timing available |
| `components/BackgroundManager.tsx` | Use responsive Next image optimization for static backgrounds | No browser transfer measurement available |
| `components/AvatarPicker.tsx` | Replace the fixed-size avatar `<img>` with `next/image` | Removed image lint warning |
| `components/ProfileCard.jsx` | Replace the user avatar `<img>` with a dimensioned unoptimized `next/image` | Removed image lint warning |
| `components/SettingsModal.tsx` | Dimension wallpaper previews and preserve blob support with `next/image` | Removed image lint warnings |
| `components/bookmark-canvas/BookmarkCard.tsx` | Dimension and safely keep external favicon URLs unoptimized | Removed image lint warning |
| `components/tools/BookmarkManager.tsx` | Dimension and safely keep external favicon URLs unoptimized | Removed image lint warning |
| `components/MatrixDisplay.tsx`, `components/tools/MatrixDisplay.tsx` | Removed unused duplicate MatrixDisplay implementations and the barrel export | Removed dead code and its hook dependency warnings |
| `components/ui/stateful-button.tsx` | Memoize animation callbacks and include them in effect dependencies | Removed hook dependency warnings |
| `package.json`, `package-lock.json`, animation imports | Standardize app imports on `motion/react` and remove direct `framer-motion` dependency | `npm ls --depth=0` shows only direct `motion` |

## Core Web Vitals

| Metric | Before | After | Status |
| ------ | -----: | ----: | ------ |
| LCP | Not measured | Not measured | Browser tooling unavailable |
| INP | Not measured | Not measured | Browser tooling unavailable |
| CLS | Not measured | Not measured | Browser tooling unavailable |
| FCP | Not measured | Not measured | Browser tooling unavailable |
| TTFB | Not measured | Not measured | Browser tooling unavailable |

## Bundle Analysis

The built-in Next.js route report is the available bundle analysis. After the change, `/` is 82.5 kB with 281 kB First Load JS; `/dev-space/bookmark-canvas` is 30.7 kB with 221 kB First Load JS. The generated client chunks include deferred chunks for the panel/features, but no bundle analyzer package is installed to attribute minified chunks to individual dependencies.

The largest source-level optional feature areas identified were Agent Swarm (143 kB source), Settings Modal (76 kB), SQL Playground (66 kB), and the vendored SQLite runtime (about 201 kB source plus the public WASM asset). These are now outside the initial panel import path.

## Remaining Issues

The remaining issues are the vendored SQLite lint warning, optional large assets, and lack of browser tooling for CWV measurement. The application image and hook warnings listed in the original audit have been fixed.

## Validation Results

- `npm run lint`: passed with one remaining warning in the vendored SQLite manager.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed; all 12 static pages generated successfully.
- `node tests/test_openrouter_byok.mjs`: passed; its optional live endpoint check reported no running dev server.
- `node tests/test_byok_and_chat_history.mjs`: passed.
- `git diff --check`: passed after removing the extra EOF blank line.
- Lighthouse: unavailable; command not installed.
- Playwright/browser runtime audit: unavailable; browser tooling not installed.
- Performance skill second pass: completed with Vercel React/Next and Impeccable optimization guidance; deferred boundaries, image handling, request removal, and remaining client-heavy paths were rechecked.

## Files Changed

- `app/page.tsx`
- `components/BackgroundManager.tsx`
- `components/MainContainer.tsx`
- `components/PanelManager.tsx`
- `components/panel-types.ts`
- `components/use-panel-manager.ts`
- `PERFORMANCE_AUDIT.md`
