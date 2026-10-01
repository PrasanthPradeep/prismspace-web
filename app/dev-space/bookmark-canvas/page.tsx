/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Metadata } from 'next';
import { BookmarkCanvas } from '@/components/bookmark-canvas/BookmarkCanvas';

export const metadata: Metadata = {
  title: 'Bookmark Canvas — Prism AI Browser Dev Space',
  description:
    'A visual sticky-note bookmark manager for Prism AI Browser. Drag, resize, and organize your bookmarks on an infinite canvas.',
  robots: { index: false, follow: true },
  alternates: { canonical: '/dev-space/bookmark-canvas' },
};

export default function BookmarkCanvasPage() {
  return (
    <main className="w-screen h-screen overflow-hidden bg-[#090c12]">
      <BookmarkCanvas />
    </main>
  );
}
