/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import { useEffect } from 'react';

interface ShortcutHandlers {
  onNewBookmark: () => void;
  onFocusSearch: () => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onSave: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onEscape: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (e.key === 'Escape') {
        handlers.onEscape();
        return;
      }

      if (ctrl && e.key === 'n') {
        e.preventDefault();
        handlers.onNewBookmark();
        return;
      }

      if (ctrl && e.key === 'k') {
        e.preventDefault();
        handlers.onFocusSearch();
        return;
      }

      if (ctrl && e.key === 's') {
        e.preventDefault();
        handlers.onSave();
        return;
      }

      if (ctrl && e.key === 'd') {
        e.preventDefault();
        handlers.onDuplicateSelected();
        return;
      }

      if (ctrl && e.key === '=') {
        e.preventDefault();
        handlers.onZoomIn();
        return;
      }

      if (ctrl && e.key === '-') {
        e.preventDefault();
        handlers.onZoomOut();
        return;
      }

      if (ctrl && e.key === '0') {
        e.preventDefault();
        handlers.onResetZoom();
        return;
      }

      // Delete key — only when not typing
      if (!isTyping && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        handlers.onDeleteSelected();
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers]);
}
