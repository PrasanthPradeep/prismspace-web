/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
// lib/hooks/useShortcuts.ts
'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, Shortcut } from '../db';

// Built-in shortcut data to seed on first load
const BUILTIN_SHORTCUTS_DATA = {
  'VS Code': [
    { category: 'Editing', action: 'Duplicate line', keys: ['Shift', 'Alt', 'Down'] },
    { category: 'Editing', action: 'Move line up', keys: ['Alt', 'Up'] },
    { category: 'Editing', action: 'Move line down', keys: ['Alt', 'Down'] },
    { category: 'Files', action: 'Quick open', keys: ['Ctrl', 'P'] },
    { category: 'Search', action: 'Search project', keys: ['Ctrl', 'Shift', 'F'] },
    { category: 'Navigation', action: 'Go to definition', keys: ['F12'] },
    { category: 'Navigation', action: 'Toggle terminal', keys: ['Ctrl', '`'] }
  ],
  'Vim': [
    { category: 'Navigation', action: 'Move left', keys: ['h'] },
    { category: 'Navigation', action: 'Move down', keys: ['j'] },
    { category: 'Navigation', action: 'Move up', keys: ['k'] },
    { category: 'Navigation', action: 'Move right', keys: ['l'] },
    { category: 'Editing', action: 'Insert mode', keys: ['i'] },
    { category: 'Editing', action: 'Append', keys: ['a'] },
    { category: 'Editing', action: 'Delete line', keys: ['d', 'd'] },
    { category: 'Editing', action: 'Yank line', keys: ['y', 'y'] },
    { category: 'Editing', action: 'Paste', keys: ['p'] },
    { category: 'Editing', action: 'Undo', keys: ['u'] },
    { category: 'Editing', action: 'Redo', keys: ['Ctrl', 'r'] }
  ],
  'Windows': [
    { category: 'Windows', action: 'Run dialog', keys: ['Win', 'R'] },
    { category: 'Windows', action: 'Settings', keys: ['Win', 'I'] },
    { category: 'Windows', action: 'Lock PC', keys: ['Win', 'L'] },
    { category: 'System', action: 'Screenshot', keys: ['Win', 'Shift', 'S'] },
    { category: 'Windows', action: 'File Explorer', keys: ['Win', 'E'] },
    { category: 'Windows', action: 'Task view', keys: ['Win', 'Tab'] }
  ],
  'Chrome': [
    { category: 'Windows', action: 'New tab', keys: ['Ctrl', 'T'] },
    { category: 'Windows', action: 'Reopen tab', keys: ['Ctrl', 'Shift', 'T'] },
    { category: 'Navigation', action: 'Address bar', keys: ['Ctrl', 'L'] },
    { category: 'Navigation', action: 'Next tab', keys: ['Ctrl', 'Tab'] },
    { category: 'Navigation', action: 'Prev tab', keys: ['Ctrl', 'Shift', 'Tab'] },
    { category: 'System', action: 'Developer tools', keys: ['F12'] }
  ]
};

const COMMON_SHORTCUTS = [
  { category: 'Navigation', action: 'Go to start', keys: ['Home'] },
  { category: 'Navigation', action: 'Go to end', keys: ['End'] },
  { category: 'Editing', action: 'Copy selection', keys: ['Ctrl', 'C'] },
  { category: 'Editing', action: 'Cut selection', keys: ['Ctrl', 'X'] },
  { category: 'Editing', action: 'Paste clipboard', keys: ['Ctrl', 'V'] },
  { category: 'Editing', action: 'Undo', keys: ['Ctrl', 'Z'] },
  { category: 'Editing', action: 'Redo', keys: ['Ctrl', 'Shift', 'Z'] },
  { category: 'Selection', action: 'Select all', keys: ['Ctrl', 'A'] },
  { category: 'Files', action: 'New file/window', keys: ['Ctrl', 'N'] },
  { category: 'Files', action: 'Open', keys: ['Ctrl', 'O'] },
  { category: 'Files', action: 'Save', keys: ['Ctrl', 'S'] },
  { category: 'Files', action: 'Save as', keys: ['Ctrl', 'Shift', 'S'] },
  { category: 'Windows', action: 'Close window/tab', keys: ['Ctrl', 'W'] },
  { category: 'Search', action: 'Find', keys: ['Ctrl', 'F'] }
];

export function useShortcuts() {
  const shortcuts = useLiveQuery(async () => {
    const count = await db.shortcuts.count();
    
    // Seed built-in shortcuts on first load
    if (count === 0) {
      await seedBuiltinShortcuts();
    }

    return await db.shortcuts.toArray();
  });

  const pinnedShortcuts = useLiveQuery(() => 
    db.shortcuts.where('pinned').equals(1).toArray()
  );

  const togglePin = async (id: number) => {
    const shortcut = await db.shortcuts.get(id);
    if (shortcut) {
      await db.shortcuts.update(id, { pinned: !shortcut.pinned });
    }
  };

  const addCustomShortcut = async (data: {
    appName: string;
    category: string;
    action: string;
    keys: string[];
  }) => {
    const id = await db.shortcuts.add({
      appName: data.appName,
      category: data.category,
      action: data.action,
      keys: data.keys,
      pinned: false,
      custom: true
    });
    return id;
  };

  const deleteCustomShortcut = async (id: number) => {
    const shortcut = await db.shortcuts.get(id);
    if (shortcut?.custom) {
      await db.shortcuts.delete(id);
    }
  };

  const getShortcutsByApp = (appName: string, shortcuts: Shortcut[] | undefined) => {
    if (!shortcuts) return [];
    return shortcuts.filter(s => s.appName === appName);
  };

  const getShortcutsByCategory = (category: string, shortcuts: Shortcut[] | undefined) => {
    if (!shortcuts) return [];
    return shortcuts.filter(s => s.category === category);
  };

  const searchShortcuts = (query: string, shortcuts: Shortcut[] | undefined) => {
    if (!shortcuts) return [];
    if (!query.trim()) return shortcuts;

    const lowerQuery = query.toLowerCase();
    return shortcuts.filter(s => {
      const searchText = [s.action, s.category, ...s.keys].join(' ').toLowerCase();
      return searchText.includes(lowerQuery);
    });
  };

  const getAllApps = (shortcuts: Shortcut[] | undefined) => {
    if (!shortcuts) return [];
    return [...new Set(shortcuts.map(s => s.appName))].sort();
  };

  const getAllCategories = (shortcuts: Shortcut[] | undefined) => {
    if (!shortcuts) return [];
    return [...new Set(shortcuts.map(s => s.category))].sort();
  };

  return {
    shortcuts,
    pinnedShortcuts,
    togglePin,
    addCustomShortcut,
    deleteCustomShortcut,
    getShortcutsByApp,
    getShortcutsByCategory,
    searchShortcuts,
    getAllApps,
    getAllCategories
  };
}

// Seed function
async function seedBuiltinShortcuts() {
  const shortcuts: Omit<Shortcut, 'id'>[] = [];

  // Add app-specific shortcuts
  for (const [appName, appShortcuts] of Object.entries(BUILTIN_SHORTCUTS_DATA)) {
    for (const shortcut of appShortcuts) {
      shortcuts.push({
        appName,
        category: shortcut.category,
        action: shortcut.action,
        keys: shortcut.keys,
        pinned: false,
        custom: false
      });
    }
  }

  // Add common shortcuts to each major app
  const majorApps = ['VS Code', 'Windows', 'Chrome'];
  for (const appName of majorApps) {
    for (const shortcut of COMMON_SHORTCUTS) {
      shortcuts.push({
        appName,
        category: shortcut.category,
        action: shortcut.action,
        keys: shortcut.keys,
        pinned: false,
        custom: false
      });
    }
  }

  await db.shortcuts.bulkAdd(shortcuts);

  // Check for legacy pinned shortcuts from localStorage migration
  const legacy = await db.settings.get('pinned_shortcuts');
  if (legacy) {
    try {
      const pinnedIds = JSON.parse(legacy.value);
      // The old system used string IDs like "VS Code-0", we can't directly map
      // but we can mark some common ones as pinned
      const commonPins = await db.shortcuts
        .where('appName')
        .equals('VS Code')
        .limit(3)
        .toArray();
      
      for (const shortcut of commonPins) {
        if (shortcut.id) {
          await db.shortcuts.update(shortcut.id, { pinned: true });
        }
      }

      await db.settings.delete('pinned_shortcuts');
    } catch (e) {
      console.error('Failed to migrate pinned shortcuts:', e);
    }
  }
}
