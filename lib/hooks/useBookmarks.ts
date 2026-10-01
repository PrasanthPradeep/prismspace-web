/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
// lib/hooks/useBookmarks.ts
'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, Bookmark } from '../db';

export function useBookmarks() {
  const bookmarks = useLiveQuery(() => db.bookmarks.orderBy('createdAt').reverse().toArray());

  const addBookmark = async (data: {
    url: string;
    title?: string;
    tags?: string[];
    notes?: string;
  }) => {
    // Normalize URL
    let normalizedUrl = data.url.trim();
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    try {
      const parsed = new URL(normalizedUrl);
      parsed.hash = ''; // Remove fragment
      normalizedUrl = parsed.toString();
    } catch (e) {
      throw new Error('Invalid URL');
    }

    // Check for duplicates
    const existing = await db.bookmarks.where('url').equals(normalizedUrl).first();
    if (existing) {
      throw new Error('Bookmark already exists');
    }

    // Auto-generate title if not provided
    let title = data.title?.trim();
    if (!title) {
      try {
        const parsed = new URL(normalizedUrl);
        title = parsed.hostname.replace(/^www\./, '');
      } catch {
        title = 'Untitled';
      }
    }

    const id = await db.bookmarks.add({
      url: normalizedUrl,
      title,
      tags: data.tags || [],
      notes: data.notes || '',
      createdAt: Date.now(),
      visitCount: 0,
      lastVisitedAt: null
    });

    return id;
  };

  const updateBookmark = async (id: number, updates: Partial<Bookmark>) => {
    await db.bookmarks.update(id, updates);
  };

  const deleteBookmark = async (id: number) => {
    await db.bookmarks.delete(id);
  };

  const visitBookmark = async (id: number) => {
    const bookmark = await db.bookmarks.get(id);
    if (bookmark) {
      await db.bookmarks.update(id, {
        visitCount: bookmark.visitCount + 1,
        lastVisitedAt: Date.now()
      });
    }
  };

  const searchBookmarks = (query: string, bookmarks: Bookmark[] | undefined) => {
    if (!bookmarks) return [];
    if (!query.trim()) return bookmarks;

    const lowerQuery = query.toLowerCase();
    return bookmarks.filter(b => {
      const searchText = [b.title, b.url, b.notes, ...b.tags].join(' ').toLowerCase();
      return searchText.includes(lowerQuery);
    });
  };

  const filterByTag = (tag: string, bookmarks: Bookmark[] | undefined) => {
    if (!bookmarks) return [];
    if (!tag) return bookmarks;
    return bookmarks.filter(b => b.tags.includes(tag));
  };

  const getAllTags = (bookmarks: Bookmark[] | undefined) => {
    if (!bookmarks) return [];
    const tagSet = new Set<string>();
    bookmarks.forEach(b => b.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  };

  const bulkAddFromUrls = async (urls: string[]) => {
    const results = { added: 0, failed: 0, duplicates: 0 };
    
    for (const url of urls) {
      try {
        await addBookmark({ url });
        results.added++;
      } catch (e: any) {
        if (e.message?.includes('already exists')) {
          results.duplicates++;
        } else {
          results.failed++;
        }
      }
    }

    return results;
  };

  const exportToJson = async () => {
    const allBookmarks = await db.bookmarks.toArray();
    return JSON.stringify(allBookmarks, null, 2);
  };

  const exportToHtml = async () => {
    const allBookmarks = await db.bookmarks.toArray();
    const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
${allBookmarks.map(b => `    <DT><A HREF="${b.url}" ADD_DATE="${Math.floor(b.createdAt / 1000)}">${b.title}</A>`).join('\n')}
</DL><p>`;
    return html;
  };

  return {
    bookmarks,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    visitBookmark,
    searchBookmarks,
    filterByTag,
    getAllTags,
    bulkAddFromUrls,
    exportToJson,
    exportToHtml
  };
}
