/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import { useCallback, useRef } from 'react';
import {
  Plus,
  Search,
  Download,
  Upload,
  Star,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ArrowLeft,
  Palette,
} from 'lucide-react';
import Link from 'next/link';
import { BookmarkIcon } from '@/components/tools/ToolIcons';

interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchRef: React.RefObject<HTMLInputElement>;
  categories: string[];
  categoryFilter: string;
  onCategoryChange: (c: string) => void;
  showFavoritesOnly: boolean;
  onToggleFavorites: () => void;
  onAddBookmark: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  totalCount: number;
  filteredCount: number;
  backgroundColor: string;
  onOpenBgPicker: () => void;
}

export function Toolbar({
  searchQuery,
  onSearchChange,
  searchRef,
  categories,
  categoryFilter,
  onCategoryChange,
  showFavoritesOnly,
  onToggleFavorites,
  onAddBookmark,
  onExport,
  onImport,
  scale,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  totalCount,
  filteredCount,
  backgroundColor,
  onOpenBgPicker,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onImport(file);
        e.target.value = '';
      }
    },
    [onImport]
  );

  return (
    <>
      <style jsx global>{`
        [data-dynamic-island="true"],
        #dynamic-island-root {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `}</style>

      <div
        className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] sm:w-[calc(100%-3rem)] max-w-7xl z-[100] h-14 flex items-center gap-2 px-3 sm:px-4 rounded-2xl border transition-all duration-300"
        style={{
          background: 'rgba(9, 12, 18, 0.88)',
          backdropFilter: 'blur(24px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          boxShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
      {/* Back button */}
      <Link
        href="/"
        className="flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors text-xs mr-1 shrink-0"
      >
        <ArrowLeft size={14} />
        <span className="hidden sm:inline">Back</span>
      </Link>

      {/* Divider */}
      <div className="w-px h-5 bg-white/10 shrink-0" />

      {/* Logo & title */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 223, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)',
            border: '1px solid rgba(0, 223, 129, 0.35)',
            boxShadow: '0 0 16px rgba(0, 223, 129, 0.25)',
          }}
        >
          <BookmarkIcon size={18} glow />
        </div>
        <span 
          className="text-sm font-semibold hidden sm:block" 
          style={{ 
            fontFamily: 'JetBrains Mono, monospace',
            color: '#ffffff',
            letterSpacing: '-0.02em',
            fontWeight: 800,
          }}
        >
          /bookmark-canvas
        </span>
      </div>

      {/* Count */}
      <span 
        className="text-xs shrink-0 hidden md:block"
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 600,
          color: '#94a3b8',
        }}
      >
        {filteredCount !== totalCount ? `${filteredCount} / ${totalCount}` : totalCount}
      </span>

      {/* Search */}
      <div className="flex-1 max-w-xs relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
        <input
          ref={searchRef}
          type="text"
          placeholder="Search bookmarks… (Ctrl+K)"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs transition-all focus:border-[#00df81] focus:ring-2 focus:ring-[#00df81]/20 outline-none"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            fontFamily: 'Space Grotesk, sans-serif',
          }}
        />
      </div>

      {/* Category filter */}
      <div className="relative shrink-0 hidden md:block">
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-sm cursor-pointer"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#ffffff',
            fontFamily: 'Space Grotesk, sans-serif',
            backgroundImage: 'none',
          }}
        >
          <option value="all" style={{ background: '#090c12', color: '#ffffff' }}>All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c} style={{ background: '#090c12', color: '#ffffff' }}>
              {c}
            </option>
          ))}
        </select>
        <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#94a3b8' }} />
      </div>

      {/* Favorites toggle */}
      <button
        onClick={onToggleFavorites}
        title="Show Favorites Only"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all shrink-0 hidden sm:flex ${
          showFavoritesOnly
            ? ''
            : ''
        }`}
        style={
          showFavoritesOnly
            ? {
                background: 'rgba(0, 223, 129, 0.12)',
                borderColor: 'rgba(0, 223, 129, 0.3)',
                color: '#00df81',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
              }
            : {
                background: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600,
              }
        }
      >
        <Star size={12} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
        <span className="hidden lg:inline">Favorites</span>
      </button>

      <div className="flex-1" />

      {/* Zoom controls */}
      <div className="flex items-center gap-0.5 shrink-0 hidden sm:flex">
        <button
          onClick={onZoomOut}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: '#cbd5e1' }}
          title="Zoom Out (Ctrl+-)"
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={onResetZoom}
          className="px-2 py-1 rounded-lg text-xs transition-colors min-w-[42px] text-center"
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            color: '#cbd5e1',
            fontWeight: 700,
          }}
          title="Reset Zoom (Ctrl+0)"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          onClick={onZoomIn}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: '#cbd5e1' }}
          title="Zoom In (Ctrl+=)"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={onResetZoom}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: '#cbd5e1' }}
          title="Fit to screen"
        >
          <Maximize2 size={13} />
        </button>
      </div>

      <div className="w-px h-5 bg-white/10 shrink-0" />

      {/* Canvas Background / Theme */}
      <button
        onClick={onOpenBgPicker}
        title="Canvas Background Theme"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all shrink-0 hover:border-white/20 active:scale-95"
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          color: '#cbd5e1',
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 600,
        }}
      >
        <div
          className="w-3.5 h-3.5 rounded-full border shrink-0"
          style={{
            backgroundColor,
            borderColor: 'rgba(255, 255, 255, 0.35)',
            boxShadow: '0 0 6px rgba(0, 0, 0, 0.4)',
          }}
        />
        <Palette size={13} className="text-white/70" />
        <span className="hidden xl:inline">Theme</span>
      </button>

      <div className="w-px h-5 bg-white/10 shrink-0" />

      {/* Import / Export */}
      <button
        onClick={() => fileInputRef.current?.click()}
        title="Import JSON"
        className="p-1.5 rounded-lg transition-colors shrink-0"
        style={{ color: '#cbd5e1' }}
      >
        <Upload size={14} />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        onClick={onExport}
        title="Export JSON"
        className="p-1.5 rounded-lg transition-colors shrink-0"
        style={{ color: '#cbd5e1' }}
      >
        <Download size={14} />
      </button>

      {/* Add bookmark */}
      <button
        onClick={onAddBookmark}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-95 shrink-0"
        style={{
          background: '#00df81',
          color: '#000000',
          boxShadow: '0 0 20px rgba(0, 223, 129, 0.35)',
          fontFamily: 'JetBrains Mono, monospace',
          fontWeight: 700,
        }}
        title="New Bookmark (Ctrl+N)"
      >
        <Plus size={14} />
        <span className="hidden sm:inline">Add</span>
      </button>
    </div>
    </>
  );
}
