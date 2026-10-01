/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import { memo, useCallback, useState } from 'react';
import { Rnd } from 'react-rnd';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star,
  Pin,
  ExternalLink,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import type { Bookmark } from '@/lib/bookmark-canvas/types';
import {
  MIN_CARD_WIDTH,
  MIN_CARD_HEIGHT,
  MAX_CARD_WIDTH,
  MAX_CARD_HEIGHT,
  GRID_SNAP,
} from '@/lib/bookmark-canvas/types';
import { getDomain, getTextColor, getStickyRotation, formatRelativeTime } from '@/lib/bookmark-canvas/utils';

interface BookmarkCardProps {
  bookmark: Bookmark;
  isSelected: boolean;
  scale: number;
  isLocked?: boolean;
  isPanMode?: boolean;
  onSelect: (id: number) => void;
  onDoubleClick: (bookmark: Bookmark) => void;
  onDragStop: (id: number, x: number, y: number) => void;
  onResizeStop: (id: number, width: number, height: number) => void;
  onContextMenu: (e: React.MouseEvent, id: number) => void;
  onToggleFavorite: (id: number) => void;
  onTogglePin: (id: number) => void;
}

export const BookmarkCard = memo(function BookmarkCard({
  bookmark,
  isSelected,
  scale,
  isLocked = false,
  isPanMode = false,
  onSelect,
  onDoubleClick,
  onDragStop,
  onResizeStop,
  onContextMenu,
  onToggleFavorite,
  onTogglePin,
}: BookmarkCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const id = bookmark.id!;
  const textColor = getTextColor(bookmark.color);
  const rotation = getStickyRotation(id);
  const domain = getDomain(bookmark.url);
  const isLight = textColor === '#1a1a2e';

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(id);
    },
    [id, onSelect]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDoubleClick(bookmark);
    },
    [bookmark, onDoubleClick]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(e, id);
    },
    [id, onContextMenu]
  );

  return (
    <Rnd
      position={{ x: bookmark.x, y: bookmark.y }}
      size={{ width: bookmark.width, height: bookmark.height }}
      minWidth={MIN_CARD_WIDTH}
      minHeight={MIN_CARD_HEIGHT}
      maxWidth={MAX_CARD_WIDTH}
      maxHeight={MAX_CARD_HEIGHT}
      dragGrid={[GRID_SNAP, GRID_SNAP]}
      resizeGrid={[GRID_SNAP, GRID_SNAP]}
      scale={scale}
      enableResizing={!isLocked && !isPanMode}
      disableDragging={isLocked || isPanMode}
      bounds="parent"
      style={{
        zIndex: bookmark.pinned ? 20 : isSelected ? 15 : 10,
        pointerEvents: isPanMode ? 'none' : 'auto',
      }}
      onDragStart={() => {
        setIsDragging(true);
        onSelect(id);
      }}
      onDragStop={(_e, d) => {
        setIsDragging(false);
        onDragStop(id, d.x, d.y);
      }}
      onResizeStop={(_e, _dir, ref, _delta, pos) => {
        onResizeStop(
          id,
          parseInt(ref.style.width),
          parseInt(ref.style.height)
        );
        onDragStop(id, pos.x, pos.y);
      }}
      cancel=".no-drag"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="w-full h-full select-none"
        style={{
          transform: `rotate(${isDragging ? 0 : rotation}deg)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={cn(
            "w-full h-full flex flex-col overflow-hidden",
            isPanMode
              ? "cursor-grab"
              : isLocked
              ? "cursor-pointer"
              : "cursor-grab active:cursor-grabbing"
          )}
          style={{
            background: '#090c12',
            borderRadius: '12px',
            border: isSelected ? '2px solid #00df81' : '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: isSelected
              ? `0 0 20px rgba(0, 223, 129, 0.25), 0 12px 40px rgba(0, 0, 0, 0.4)`
              : isHovered
              ? `0 8px 30px rgba(0, 0, 0, 0.35)`
              : `0 4px 16px rgba(0, 0, 0, 0.28)`,
            transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
            color: '#ffffff',
          }}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
        >
          {/* Header */}
          <div
            className="flex items-start gap-2 px-3 pt-3 pb-2"
            style={{
              borderBottom: `1px solid rgba(255, 255, 255, 0.08)`,
            }}
          >
            {/* Favicon */}
            <div 
              className="shrink-0 w-6 h-6 rounded-md overflow-hidden mt-0.5 flex items-center justify-center"
              style={{ 
                background: bookmark.color || 'rgba(0, 223, 129, 0.12)',
              }}
            >
              {bookmark.favicon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <Image
                  src={bookmark.favicon}
                  alt=""
                  width={16}
                  height={16}
                  unoptimized
                  className="w-4 h-4 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <ExternalLink size={10} style={{ color: '#ffffff', opacity: 0.5 }} />
              )}
            </div>

            {/* Title & domain */}
            <div className="flex-1 min-w-0">
              <p 
                className="text-sm font-semibold leading-tight truncate" 
                style={{ 
                  color: '#ffffff',
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontWeight: 700,
                }}
              >
                {bookmark.title}
              </p>
              <p 
                className="text-xs opacity-60 truncate mt-0.5" 
                style={{ 
                  color: '#cbd5e1',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '10px',
                }}
              >
                {domain}
              </p>
            </div>

            {/* Action buttons */}
            <div className={`flex items-center gap-0.5 no-drag shrink-0 transition-opacity ${isHovered || isSelected ? 'opacity-100' : 'opacity-0'}`}>
              <button
                className="p-1 rounded-md transition-colors"
                style={{
                  background: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                }}
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(id); }}
                title="Toggle Favorite"
              >
                <Star
                  size={12}
                  fill={bookmark.favorite ? 'currentColor' : 'none'}
                  style={{ color: bookmark.favorite ? '#f59e0b' : '#cbd5e1', opacity: bookmark.favorite ? 1 : 0.6 }}
                />
              </button>
              <button
                className="p-1 rounded-md transition-colors"
                style={{
                  background: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                }}
                onClick={(e) => { e.stopPropagation(); onTogglePin(id); }}
                title="Toggle Pin"
              >
                <Pin
                  size={12}
                  fill={bookmark.pinned ? 'currentColor' : 'none'}
                  style={{ color: bookmark.pinned ? '#00df81' : '#cbd5e1', opacity: bookmark.pinned ? 1 : 0.6 }}
                />
              </button>
              <button
                className="p-1 rounded-md transition-colors no-drag"
                style={{
                  background: isHovered ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                }}
                onClick={handleContextMenu}
                title="More options"
              >
                <MoreHorizontal size={12} style={{ color: '#cbd5e1', opacity: 0.6 }} />
              </button>
            </div>
          </div>

          {/* Notes body */}
          {bookmark.notes ? (
            <div className="flex-1 px-3 py-2 overflow-hidden">
              <p
                className="text-xs leading-relaxed line-clamp-5"
                style={{ 
                  color: '#cbd5e1', 
                  opacity: 0.8,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '11px',
                  fontWeight: 500,
                }}
              >
                {bookmark.notes}
              </p>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* Footer */}
          <div
            className="flex items-center justify-between px-3 pb-2.5 pt-1.5 flex-shrink-0"
            style={{
              borderTop: `1px solid rgba(255, 255, 255, 0.08)`,
            }}
          >
            {/* Category badge */}
            {bookmark.category ? (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                style={{
                  background: bookmark.color || 'rgba(0, 223, 129, 0.12)',
                  color: '#ffffff',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                {bookmark.category}
              </span>
            ) : <span />}

            {/* Visit counter + last visited */}
            <div className="flex items-center gap-1.5">
              {bookmark.visitCount > 0 && (
                <span
                  className="text-[10px] opacity-55"
                  style={{ 
                    color: '#94a3b8',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 600,
                  }}
                  title={`Last visited: ${formatRelativeTime(bookmark.lastVisited)}`}
                >
                  {bookmark.visitCount} visit{bookmark.visitCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Pinned indicator */}
          <AnimatePresence>
            {bookmark.pinned && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ 
                  background: '#00df81', 
                  boxShadow: '0 0 20px rgba(0, 223, 129, 0.5)',
                }}
              >
                <Pin size={9} fill="#000000" color="#000000" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </Rnd>
  );
});
