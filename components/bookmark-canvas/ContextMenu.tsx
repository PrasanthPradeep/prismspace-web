/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ExternalLink,
  Pencil,
  Copy,
  Trash2,
  Star,
  Pin,
  Palette,
  Files,
} from 'lucide-react';
import type { BookmarkAction, ContextMenuState } from '@/lib/bookmark-canvas/types';
import { STICKY_COLORS } from '@/lib/bookmark-canvas/types';

interface ContextMenuProps {
  state: ContextMenuState;
  isPinned: boolean;
  isFavorite: boolean;
  onAction: (action: BookmarkAction, id: number) => void;
  onClose: () => void;
  onColorChange: (id: number, color: string) => void;
}

export function ContextMenu({
  state,
  isPinned,
  isFavorite,
  onAction,
  onClose,
  onColorChange,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (state.visible) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [state.visible, onClose]);

  if (!state.visible || state.bookmarkId === null) return null;

  const id = state.bookmarkId;

  const menuItems = [
    {
      icon: ExternalLink,
      label: 'Open Website',
      action: () => onAction('open', id),
      className: 'text-blue-300',
    },
    {
      icon: Pencil,
      label: 'Edit',
      action: () => onAction('edit', id),
      className: '',
    },
    {
      icon: Files,
      label: 'Duplicate',
      action: () => onAction('duplicate', id),
      className: '',
    },
    {
      icon: Copy,
      label: 'Copy URL',
      action: () => onAction('copy-url', id),
      className: '',
    },
    null, // divider
    {
      icon: Star,
      label: isFavorite ? 'Remove Favorite' : 'Add to Favorites',
      action: () => onAction('favorite', id),
      className: isFavorite ? 'text-amber-300' : '',
    },
    {
      icon: Pin,
      label: isPinned ? 'Unpin Card' : 'Pin Card',
      action: () => onAction('pin', id),
      className: isPinned ? 'text-violet-300' : '',
    },
    null, // divider
    {
      icon: Trash2,
      label: 'Delete',
      action: () => onAction('delete', id),
      className: 'text-red-400',
    },
  ];

  return (
    <AnimatePresence>
      {state.visible && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.92, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: -4 }}
          transition={{ duration: 0.12 }}
          className="fixed z-[200] min-w-[200px] overflow-hidden rounded-xl border"
          style={{
            left: state.x,
            top: state.y,
            background: 'rgba(9, 12, 18, 0.95)',
            backdropFilter: 'blur(20px) saturate(1.8)',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            boxShadow: '0 8px 40px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4)',
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Color palette row */}
          <div 
            className="flex items-center gap-1.5 px-3 py-2.5 border-b"
            style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
          >
            <Palette size={12} style={{ color: '#94a3b8' }} className="shrink-0" />
            <div className="flex gap-1">
              {STICKY_COLORS.map((c) => (
                <button
                  key={c.value}
                  title={c.label}
                  className="w-4 h-4 rounded-full transition-transform hover:scale-125 focus:outline-none"
                  style={{ 
                    background: c.value,
                    boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.2)',
                  }}
                  onClick={() => {
                    onColorChange(id, c.value);
                    onClose();
                  }}
                />
              ))}
            </div>
          </div>

          <div className="py-1">
            {menuItems.map((item, i) => {
              if (item === null) {
                return <div key={i} className="my-1 mx-3 h-px" style={{ background: 'rgba(255, 255, 255, 0.08)' }} />;
              }
              const Icon = item.icon;
              const getColor = () => {
                if (item.className.includes('blue')) return '#60a5fa';
                if (item.className.includes('amber')) return '#fbbf24';
                if (item.className.includes('violet')) return '#00df81';
                if (item.className.includes('red')) return '#f87171';
                return '#cbd5e1';
              };
              return (
                <button
                  key={i}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors focus:outline-none"
                  style={{
                    color: getColor(),
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                >
                  <Icon size={14} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
