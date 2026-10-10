/**
 * Copyright 2026 Prism AI Labs.
 * SPDX-License-Identifier: Apache-2.0
 */
import Dexie, { type EntityTable } from 'dexie';
import type { Bookmark } from './types';

export class PrismDevSpaceDB extends Dexie {
  bookmarks!: EntityTable<Bookmark, 'id'>;

  constructor() {
    super('PrismDevSpace');
    this.version(1).stores({
      bookmarks:
        '++id,title,url,color,x,y,width,height,notes,favorite,pinned,category,createdAt,updatedAt,lastVisited,visitCount',
    });
  }
}

export const db = new PrismDevSpaceDB();
