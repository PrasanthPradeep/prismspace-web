/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useRef, useState } from 'react';
import { db } from '@/lib/bookmark-canvas/db';
import {
  type Bookmark,
  type BookmarkFormData,
  DEFAULT_CARD_WIDTH,
  DEFAULT_CARD_HEIGHT,
  STICKY_COLORS,
} from '@/lib/bookmark-canvas/types';
import { getFaviconUrl, isValidUrl, exportBookmarks, downloadFile } from '@/lib/bookmark-canvas/utils';
import toast from 'react-hot-toast';

const DEFAULT_COLOR = STICKY_COLORS[0].value;
const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;
const MAX_IMPORTED_BOOKMARKS = 1000;
const MAX_TITLE_LENGTH = 200;
const MAX_URL_LENGTH = 2048;
const MAX_NOTES_LENGTH = 5000;
const MAX_CATEGORY_LENGTH = 50;

function boundedString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function safeDate(value: unknown, fallback: Date): Date {
  const date = new Date(typeof value === 'number' || typeof value === 'string' ? value : '');
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function sanitizeImportedBookmark(value: unknown, now: Date): Omit<Bookmark, 'id'> | null {
  if (!value || typeof value !== 'object') return null;

  const source = value as Record<string, unknown>;
  const rawUrl = boundedString(source.url, MAX_URL_LENGTH);
  const url = rawUrl ? (rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`) : '';
  if (!isValidUrl(url)) return null;

  const title = boundedString(source.title, MAX_TITLE_LENGTH) || new URL(url).hostname;
  const color = boundedString(source.color, 20);
  const safeColor = /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_COLOR;
  const numberOr = (candidate: unknown, fallback: number, min: number, max: number) => {
    const number = typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : fallback;
    return Math.max(min, Math.min(max, number));
  };

  return {
    title,
    url,
    favicon: getFaviconUrl(url),
    notes: boundedString(source.notes, MAX_NOTES_LENGTH),
    color: safeColor,
    favorite: source.favorite === true,
    pinned: source.pinned === true,
    category: boundedString(source.category, MAX_CATEGORY_LENGTH),
    x: numberOr(source.x, 100, -1_000_000, 1_000_000),
    y: numberOr(source.y, 100, -1_000_000, 1_000_000),
    width: numberOr(source.width, DEFAULT_CARD_WIDTH, 200, 600),
    height: numberOr(source.height, DEFAULT_CARD_HEIGHT, 150, 800),
    createdAt: safeDate(source.createdAt, now),
    updatedAt: now,
    lastVisited: source.lastVisited ? safeDate(source.lastVisited, now) : undefined,
    visitCount: Math.floor(numberOr(source.visitCount, 0, 0, 1_000_000)),
  };
}

export function useBookmarks() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const undoRef = useRef<Bookmark | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reactively fetch all bookmarks
  const allBookmarks = useLiveQuery(() => db.bookmarks.toArray(), []);

  // Derived filtered list
  const filteredBookmarks = (allBookmarks ?? []).filter((bm) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      bm.title.toLowerCase().includes(q) ||
      bm.url.toLowerCase().includes(q) ||
      bm.notes.toLowerCase().includes(q) ||
      bm.category.toLowerCase().includes(q);

    const matchesCategory =
      categoryFilter === 'all' || bm.category === categoryFilter;

    const matchesFavorite = !showFavoritesOnly || bm.favorite;

    return matchesSearch && matchesCategory && matchesFavorite;
  });

  // All unique categories
  const categories = Array.from(
    new Set((allBookmarks ?? []).map((bm) => bm.category).filter(Boolean))
  );

  // Add a new bookmark
  const addBookmark = useCallback(
    async (
      formData: BookmarkFormData,
      position?: { x: number; y: number }
    ): Promise<number | null> => {
      const url = formData.url.startsWith('http') ? formData.url : `https://${formData.url}`;

      if (!isValidUrl(url)) {
        toast.error('Please enter a valid URL');
        return null;
      }

      const existing = await db.bookmarks.where('url').equals(url).first();
      if (existing) {
        toast.error('This URL is already bookmarked');
        return null;
      }

      const now = new Date();
      const id = await db.bookmarks.add({
        title: formData.title || url,
        url,
        favicon: getFaviconUrl(url),
        notes: formData.notes,
        color: formData.color || DEFAULT_COLOR,
        favorite: formData.favorite,
        pinned: false,
        category: formData.category,
        x: position?.x ?? Math.random() * 400 + 100,
        y: position?.y ?? Math.random() * 300 + 100,
        width: DEFAULT_CARD_WIDTH,
        height: DEFAULT_CARD_HEIGHT,
        createdAt: now,
        updatedAt: now,
        visitCount: 0,
      });

      toast.success('Bookmark added!');
      return id as number;
    },
    []
  );

  // Update bookmark fields
  const updateBookmark = useCallback(
    async (id: number, changes: Partial<Bookmark>): Promise<void> => {
      const safeChanges = { ...changes };
      if (typeof changes.url === 'string') {
        const url = changes.url.startsWith('http') ? changes.url : `https://${changes.url}`;
        if (!isValidUrl(url)) {
          toast.error('Please enter a valid URL');
          return;
        }
        safeChanges.url = url;
        safeChanges.favicon = getFaviconUrl(url);
      }
      delete safeChanges.id;
      await db.bookmarks.update(id, { ...safeChanges, updatedAt: new Date() });
    },
    []
  );

  // Update position (called on drag stop)
  const updatePosition = useCallback(
    async (id: number, x: number, y: number): Promise<void> => {
      await db.bookmarks.update(id, { x, y, updatedAt: new Date() });
    },
    []
  );

  // Update size (called on resize stop)
  const updateSize = useCallback(
    async (id: number, width: number, height: number): Promise<void> => {
      await db.bookmarks.update(id, { width, height, updatedAt: new Date() });
    },
    []
  );

  // Delete with undo (plain string toast, no JSX)
  const deleteBookmark = useCallback(async (id: number): Promise<void> => {
    const bm = await db.bookmarks.get(id);
    if (!bm) return;

    await db.bookmarks.delete(id);

    // Store for undo
    undoRef.current = bm;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    toast('Bookmark deleted', {
      duration: 5000,
      icon: '🗑️',
    });

    undoTimerRef.current = setTimeout(() => {
      undoRef.current = null;
    }, 5500);

    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  // Undo the last deletion
  const undoDelete = useCallback(async (): Promise<void> => {
    if (!undoRef.current) {
      toast('Nothing to undo', { icon: '⚠️' });
      return;
    }
    const restored = { ...undoRef.current };
    delete (restored as Partial<Bookmark>).id;
    await db.bookmarks.add(restored);
    undoRef.current = null;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    toast.success('Bookmark restored!');
  }, []);

  // Duplicate
  const duplicateBookmark = useCallback(async (id: number): Promise<void> => {
    const bm = await db.bookmarks.get(id);
    if (!bm) return;
    const now = new Date();
    await db.bookmarks.add({
      ...bm,
      id: undefined,
      title: `${bm.title} (copy)`,
      x: bm.x + 30,
      y: bm.y + 30,
      createdAt: now,
      updatedAt: now,
    });
    toast.success('Duplicated!');
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback(async (id: number): Promise<void> => {
    const bm = await db.bookmarks.get(id);
    if (!bm) return;
    await db.bookmarks.update(id, { favorite: !bm.favorite, updatedAt: new Date() });
  }, []);

  // Toggle pin
  const togglePin = useCallback(async (id: number): Promise<void> => {
    const bm = await db.bookmarks.get(id);
    if (!bm) return;
    await db.bookmarks.update(id, { pinned: !bm.pinned, updatedAt: new Date() });
    toast.success(bm.pinned ? 'Unpinned' : 'Pinned to top');
  }, []);

  // Record a visit
  const recordVisit = useCallback(async (id: number): Promise<void> => {
    const bm = await db.bookmarks.get(id);
    if (!bm) return;
    await db.bookmarks.update(id, {
      lastVisited: new Date(),
      visitCount: (bm.visitCount || 0) + 1,
      updatedAt: new Date(),
    });
  }, []);

  // Export bookmarks as JSON
  const exportToJson = useCallback(async (): Promise<void> => {
    const all = await db.bookmarks.toArray();
    const json = exportBookmarks(all);
    downloadFile(json, `prism-bookmarks-${Date.now()}.json`);
    toast.success(`Exported ${all.length} bookmarks`);
  }, []);

  // Import bookmarks from JSON
  const importFromJson = useCallback(async (file: File): Promise<void> => {
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      toast.error('Import file is too large (maximum 2 MB)');
      return Promise.reject(new Error('Import file too large'));
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => {
        toast.error('Failed to read import file');
        reject(new Error('Failed to read import file'));
      };
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const data = JSON.parse(text);
          const bookmarks: unknown = data && typeof data === 'object' && !Array.isArray(data)
            ? (data as Record<string, unknown>).bookmarks
            : data;

          if (!Array.isArray(bookmarks)) throw new Error('Invalid format');
          if (bookmarks.length > MAX_IMPORTED_BOOKMARKS) {
            throw new Error('Too many bookmarks');
          }

          const now = new Date();
          let added = 0;
          let skipped = 0;

          await db.transaction('rw', db.bookmarks, async () => {
            for (const value of bookmarks) {
              const bm = sanitizeImportedBookmark(value, now);
              if (!bm) { skipped++; continue; }
              const exists = await db.bookmarks.where('url').equals(bm.url).first();
              if (exists) { skipped++; continue; }
              await db.bookmarks.add(bm);
              added++;
            }
          });

          toast.success(`Imported ${added} bookmarks${skipped ? ` (${skipped} skipped)` : ''}`);
          resolve();
        } catch {
          toast.error('Failed to import: invalid or unsafe bookmark file');
          reject(new Error('Invalid bookmark import'));
        }
      };
      reader.readAsText(file);
    });
  }, []);

  return {
    // Data
    allBookmarks: allBookmarks ?? [],
    filteredBookmarks,
    categories,
    selectedId,
    // Filters
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    showFavoritesOnly,
    setShowFavoritesOnly,
    setSelectedId,
    // Operations
    addBookmark,
    updateBookmark,
    updatePosition,
    updateSize,
    deleteBookmark,
    undoDelete,
    duplicateBookmark,
    toggleFavorite,
    togglePin,
    recordVisit,
    exportToJson,
    importFromJson,
  };
}
