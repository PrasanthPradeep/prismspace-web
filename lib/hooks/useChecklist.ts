/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
// lib/hooks/useChecklist.ts
'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, Checklist, ChecklistItem } from '../db';

export function useChecklists() {
  const checklists = useLiveQuery(() => db.checklists.orderBy('createdAt').reverse().toArray());

  const getChecklistWithItems = async (checklistId: number) => {
    const checklist = await db.checklists.get(checklistId);
    const items = await db.checklist_items
      .where('checklistId')
      .equals(checklistId)
      .sortBy('order');
    return checklist ? { ...checklist, items } : null;
  };

  const createChecklist = async (name: string, items: string[] = []) => {
    const now = Date.now();
    const checklistId = await db.checklists.add({
      name,
      createdAt: now,
      updatedAt: now
    });

    for (let i = 0; i < items.length; i++) {
      await db.checklist_items.add({
        checklistId: checklistId as number,
        text: items[i],
        completed: false,
        order: i,
        createdAt: now
      });
    }

    return checklistId;
  };

  const updateChecklistName = async (id: number, name: string) => {
    await db.checklists.update(id, { name, updatedAt: Date.now() });
  };

  const deleteChecklist = async (id: number) => {
    await db.checklist_items.where('checklistId').equals(id).delete();
    await db.checklists.delete(id);
  };

  const addItem = async (checklistId: number, text: string) => {
    const existingItems = await db.checklist_items.where('checklistId').equals(checklistId).toArray();
    const maxOrder = existingItems.reduce((max, item) => Math.max(max, item.order), -1);
    
    await db.checklist_items.add({
      checklistId,
      text,
      completed: false,
      order: maxOrder + 1,
      createdAt: Date.now()
    });

    await db.checklists.update(checklistId, { updatedAt: Date.now() });
  };

  const updateItem = async (itemId: number, updates: Partial<ChecklistItem>) => {
    await db.checklist_items.update(itemId, updates);
    
    if (updates.checklistId !== undefined) {
      await db.checklists.update(updates.checklistId, { updatedAt: Date.now() });
    }
  };

  const deleteItem = async (itemId: number) => {
    const item = await db.checklist_items.get(itemId);
    if (item) {
      await db.checklist_items.delete(itemId);
      await db.checklists.update(item.checklistId, { updatedAt: Date.now() });
    }
  };

  const reorderItems = async (checklistId: number, newOrder: number[]) => {
    // newOrder is array of item IDs in desired order
    await db.transaction('rw', db.checklist_items, async () => {
      for (let i = 0; i < newOrder.length; i++) {
        await db.checklist_items.update(newOrder[i], { order: i });
      }
    });
    await db.checklists.update(checklistId, { updatedAt: Date.now() });
  };

  const toggleItemCompleted = async (itemId: number) => {
    const item = await db.checklist_items.get(itemId);
    if (item) {
      await db.checklist_items.update(itemId, { completed: !item.completed });
      await db.checklists.update(item.checklistId, { updatedAt: Date.now() });
    }
  };

  const getChecklistProgress = (items: ChecklistItem[]) => {
    const total = items.length;
    const completed = items.filter(item => item.completed).length;
    return { total, completed, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  return {
    checklists,
    getChecklistWithItems,
    createChecklist,
    updateChecklistName,
    deleteChecklist,
    addItem,
    updateItem,
    deleteItem,
    reorderItems,
    toggleItemCompleted,
    getChecklistProgress
  };
}
