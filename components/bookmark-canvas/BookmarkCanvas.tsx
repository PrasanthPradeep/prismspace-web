/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { AnimatePresence } from 'motion/react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import {
  MousePointer2,
  Move,
  Plus,
  Star,
  Maximize2,
  FileDown,
  Upload,
  Lock,
  Edit2,
  Palette,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BookmarkCard } from './BookmarkCard';
import { BookmarkModal } from './BookmarkModal';
import { ContextMenu } from './ContextMenu';
import { CanvasBgModal } from './CanvasBgModal';
import { Toolbar } from './Toolbar';
import { Toolbar as KokonutToolbar, type ToolbarItem } from '@/components/kokonutui/toolbar';
import { BookmarkIcon } from '@/components/tools/ToolIcons';
import { useBookmarks } from '@/hooks/bookmark-canvas/useBookmarks';
import { useCanvas } from '@/hooks/bookmark-canvas/useCanvas';
import { useKeyboardShortcuts } from '@/hooks/bookmark-canvas/useKeyboardShortcuts';
import type { Bookmark, BookmarkFormData, ContextMenuState } from '@/lib/bookmark-canvas/types';
import { DEFAULT_CANVAS_BG, isLightColor } from '@/lib/bookmark-canvas/types';
import { copyToClipboard } from '@/lib/bookmark-canvas/utils';

export function BookmarkCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropPositionRef = useRef<{ x: number; y: number } | undefined>(undefined);

  // State
  const [activeTool, setActiveTool] = useState<'select' | 'pan'>('select');
  const [isLocked, setIsLocked] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [bgModalOpen, setBgModalOpen] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState<string>(DEFAULT_CANVAS_BG);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    bookmarkId: null,
  });

  // Load persisted background color on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('prism-bookmark-canvas-bg');
      if (saved) {
        setBackgroundColor(saved);
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  const handleBgChange = useCallback((color: string) => {
    setBackgroundColor(color);
    try {
      localStorage.setItem('prism-bookmark-canvas-bg', color);
    } catch {
      // ignore
    }
  }, []);

  const isLight = useMemo(() => isLightColor(backgroundColor), [backgroundColor]);

  // Hooks
  const {
    allBookmarks,
    filteredBookmarks,
    categories,
    selectedId,
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
  } = useBookmarks();

  const { camera, zoomIn, zoomOut, resetZoom } = useCanvas(canvasRef, activeTool === 'pan');

  const favoritesCount = useMemo(() => {
    return allBookmarks.filter((b) => b.favorite).length;
  }, [allBookmarks]);

  const handleToolbarFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        importFromJson(file);
        e.target.value = '';
      }
    },
    [importFromJson]
  );

  // ── Helpers ────────────────────────────────────────────────────

  const openAddModal = useCallback((position?: { x: number; y: number }) => {
    setEditingBookmark(null);
    dropPositionRef.current = position;
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((bookmark: Bookmark) => {
    setEditingBookmark(bookmark);
    dropPositionRef.current = undefined;
    setModalOpen(true);
  }, []);

  const kokonutToolbarItems: ToolbarItem[] = useMemo(
    () => [
      {
        id: 'select',
        title: 'Select',
        icon: MousePointer2,
        onClick: () => setActiveTool('select'),
      },
      {
        id: 'pan',
        title: 'Pan',
        icon: Move,
        onClick: () => setActiveTool('pan'),
      },
      {
        id: 'add',
        title: 'Add',
        icon: Plus,
        onClick: () => openAddModal(),
      },
      {
        id: 'favorites',
        title: 'Favorites',
        icon: Star,
        badge: favoritesCount > 0 ? favoritesCount : undefined,
        onClick: () => setShowFavoritesOnly((prev) => !prev),
      },
      {
        id: 'theme',
        title: 'Theme',
        icon: Palette,
        onClick: () => setBgModalOpen(true),
      },
      {
        id: 'fit',
        title: 'Fit',
        icon: Maximize2,
        onClick: resetZoom,
      },
      {
        id: 'export',
        title: 'Export',
        icon: FileDown,
        onClick: exportToJson,
      },
      {
        id: 'import',
        title: 'Import',
        icon: Upload,
        onClick: () => fileInputRef.current?.click(),
      },
    ],
    [favoritesCount, openAddModal, resetZoom, exportToJson, setShowFavoritesOnly]
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingBookmark(null);
  }, []);

  const handleModalConfirm = useCallback(
    async (data: BookmarkFormData, position?: { x: number; y: number }) => {
      if (editingBookmark?.id) {
        await updateBookmark(editingBookmark.id, {
          title: data.title,
          url: data.url,
          category: data.category,
          notes: data.notes,
          color: data.color,
          favorite: data.favorite,
        });
        toast.success('Bookmark updated!');
      } else {
        await addBookmark(data, position);
      }
    },
    [editingBookmark, updateBookmark, addBookmark]
  );

  // ── Context menu ────────────────────────────────────────────────

  const openContextMenu = useCallback((e: React.MouseEvent, bookmarkId: number) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, bookmarkId });
    setSelectedId(bookmarkId);
  }, [setSelectedId]);

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleContextAction = useCallback(
    async (action: string, id: number) => {
      const bm = allBookmarks.find((b) => b.id === id);
      if (!bm) return;

      switch (action) {
        case 'open':
          await recordVisit(id);
          window.open(bm.url, '_blank', 'noopener,noreferrer');
          break;
        case 'edit':
          openEditModal(bm);
          break;
        case 'duplicate':
          await duplicateBookmark(id);
          break;
        case 'copy-url':
          await copyToClipboard(bm.url);
          toast.success('URL copied!');
          break;
        case 'favorite':
          await toggleFavorite(id);
          break;
        case 'pin':
          await togglePin(id);
          break;
        case 'delete':
          await deleteBookmark(id);
          break;
      }
    },
    [allBookmarks, recordVisit, openEditModal, duplicateBookmark, toggleFavorite, togglePin, deleteBookmark]
  );

  const handleColorChange = useCallback(
    async (id: number, color: string) => {
      await updateBookmark(id, { color });
    },
    [updateBookmark]
  );

  // ── Card interactions ───────────────────────────────────────────

  const handleCardDoubleClick = useCallback(
    async (bookmark: Bookmark) => {
      if (!bookmark.id) return;
      await recordVisit(bookmark.id);
      window.open(bookmark.url, '_blank', 'noopener,noreferrer');
    },
    [recordVisit]
  );

  // ── Canvas double-click to add ──────────────────────────────────

  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('.rnd-resizer, [data-rnd]')) return;
      // Convert screen coords to canvas coords
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left - camera.x) / camera.scale;
      const y = (e.clientY - rect.top - camera.y) / camera.scale;
      openAddModal({ x, y });
    },
    [camera, openAddModal]
  );

  // ── Deselect on canvas click ────────────────────────────────────

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === canvasRef.current || e.target === e.currentTarget) {
        setSelectedId(null);
        closeContextMenu();
      }
    },
    [setSelectedId, closeContextMenu]
  );

  // ── Keyboard shortcuts ──────────────────────────────────────────

  const contextMenuBm = useMemo(
    () => allBookmarks.find((b) => b.id === contextMenu.bookmarkId),
    [allBookmarks, contextMenu.bookmarkId]
  );

  useKeyboardShortcuts({
    onNewBookmark: () => openAddModal(),
    onFocusSearch: () => searchRef.current?.focus(),
    onDeleteSelected: async () => {
      if (selectedId) await deleteBookmark(selectedId);
    },
    onDuplicateSelected: async () => {
      if (selectedId) await duplicateBookmark(selectedId);
    },
    onSave: () => toast.success('All changes saved automatically ✓'),
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onResetZoom: resetZoom,
    onEscape: () => {
      closeModal();
      closeContextMenu();
      setSelectedId(null);
    },
  });

  // Ctrl+Z undo
  const handleUndoKey = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undoDelete();
      }
    },
    [undoDelete]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleUndoKey);
    return () => window.removeEventListener('keydown', handleUndoKey);
  }, [handleUndoKey]);

  // ── Sorted bookmarks (pinned on top) ───────────────────────────

  const sortedBookmarks = useMemo(() => {
    return [...filteredBookmarks].sort((a, b) => {
      if (a.pinned && !b.pinned) return 1;
      if (!a.pinned && b.pinned) return -1;
      return 0;
    });
  }, [filteredBookmarks]);

  const existingUrls = useMemo(
    () => allBookmarks.filter((b) => !editingBookmark || b.id !== editingBookmark.id).map((b) => b.url),
    [allBookmarks, editingBookmark]
  );

  // ── Empty state ────────────────────────────────────────────────

  const isEmpty = allBookmarks.length === 0;

  return (
    <>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: 'rgba(9, 12, 18, 0.92)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            fontSize: '13px',
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 600,
          },
          success: {
            iconTheme: { primary: '#00df81', secondary: '#000000' },
          },
        }}
      />

      {/* Toolbar */}
      <Toolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchRef={searchRef}
        categories={categories}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        showFavoritesOnly={showFavoritesOnly}
        onToggleFavorites={() => setShowFavoritesOnly((p) => !p)}
        onAddBookmark={() => openAddModal()}
        onExport={exportToJson}
        onImport={importFromJson}
        scale={camera.scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        totalCount={allBookmarks.length}
        filteredCount={filteredBookmarks.length}
        backgroundColor={backgroundColor}
        onOpenBgPicker={() => setBgModalOpen(true)}
      />

      {/* Canvas wrapper */}
      <div
        ref={canvasRef}
        className={cn(
          "fixed inset-0 overflow-hidden",
          activeTool === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        )}
        style={{
          background: backgroundColor,
        }}
        onClick={handleCanvasClick}
        onDoubleClick={handleCanvasDoubleClick}
      >
        {/* Dot grid background */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ opacity: isLight ? 0.35 : 0.22 }}
          aria-hidden
        >
          <defs>
            <pattern
              id="dot-grid"
              x={camera.x % (24 * camera.scale)}
              y={camera.y % (24 * camera.scale)}
              width={24 * camera.scale}
              height={24 * camera.scale}
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx={1}
                cy={1}
                r={1.2}
                fill={isLight ? "rgba(0, 0, 0, 0.45)" : "rgba(255, 255, 255, 0.35)"}
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
        </svg>

        {/* Camera transform layer */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transformOrigin: '0 0',
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
            width: '10000px',
            height: '10000px',
          }}
        >
          <AnimatePresence>
            {sortedBookmarks.map((bm) => (
              <BookmarkCard
                key={bm.id}
                bookmark={bm}
                isSelected={selectedId === bm.id}
                scale={camera.scale}
                isLocked={isLocked}
                isPanMode={activeTool === 'pan'}
                onSelect={setSelectedId}
                onDoubleClick={handleCardDoubleClick}
                onDragStop={updatePosition}
                onResizeStop={updateSize}
                onContextMenu={openContextMenu}
                onToggleFavorite={toggleFavorite}
                onTogglePin={togglePin}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            <div className="text-center space-y-4">
              <div className="flex justify-center opacity-30">
                <BookmarkIcon size={56} glow />
              </div>
              <div>
                <p 
                  className="text-lg font-medium"
                  style={{
                    fontFamily: 'Space Grotesk, sans-serif',
                    color: isLight ? '#0f172a' : '#ffffff',
                    fontWeight: 700,
                  }}
                >
                  Your canvas is empty
                </p>
                <p 
                  className="text-sm mt-1"
                  style={{
                    fontFamily: 'Space Grotesk, sans-serif',
                    color: isLight ? '#475569' : 'rgba(255, 255, 255, 0.6)',
                    fontWeight: 600,
                  }}
                >
                  Press{' '}
                  <kbd 
                    className="px-1.5 py-0.5 rounded text-xs"
                    style={{
                      background: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.15)',
                      color: isLight ? '#0f172a' : '#ffffff',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700,
                    }}
                  >
                    Ctrl+N
                  </kbd>
                  {' '}or double-click anywhere to add a bookmark
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hint strip */}
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-none z-10 hidden sm:block">
          <p 
            className="text-xs text-center px-3.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10"
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              color: '#ffffff',
              opacity: 0.85,
              fontWeight: 600,
            }}
          >
            {activeTool === 'pan'
              ? '🖐️ Pan Mode: Drag canvas to navigate'
              : isLocked
              ? '🔒 Canvas Locked: Layout is protected from edits'
              : 'Scroll to zoom · Space+drag to pan · Double-click canvas to add'}
          </p>
        </div>
      </div>

      {/* Floating KokonutUI Canvas Toolbar Dock */}
      <div className="fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-[100] max-w-[calc(100%-2rem)]">
        <KokonutToolbar
          items={kokonutToolbarItems}
          selected={showFavoritesOnly ? 'favorites' : activeTool}
          onSelect={(id) => {
            if (id === 'select' || id === 'pan') {
              setActiveTool(id);
            }
          }}
          showToggle={true}
          isToggled={!isLocked}
          onToggleChange={(toggled) => {
            const nextLocked = !toggled;
            setIsLocked(nextLocked);
            toast(nextLocked ? '🔒 Canvas locked (Protected)' : '✏️ Canvas unlocked (Edit mode)', {
              icon: nextLocked ? '🔒' : '✏️',
            });
          }}
          toggleLabels={{ on: 'Edit', off: 'Locked' }}
          toggleIcons={{ on: Edit2, off: Lock }}
          notificationMessage={(item) => {
            if (item.id === 'select') return 'Select mode';
            if (item.id === 'pan') return 'Pan mode: drag canvas';
            if (item.id === 'add') return 'New bookmark';
            if (item.id === 'favorites') return showFavoritesOnly ? 'Showing all' : 'Showing favorites';
            if (item.id === 'theme') return 'Canvas background';
            if (item.id === 'fit') return 'Centered 100%';
            if (item.id === 'export') return 'Exported JSON';
            if (item.id === 'import') return 'Import JSON';
            return item.title;
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleToolbarFileChange}
        />
      </div>

      {/* Modals & Overlays */}
      <BookmarkModal
        isOpen={modalOpen}
        editingBookmark={editingBookmark}
        existingUrls={existingUrls}
        dropPosition={dropPositionRef.current}
        onConfirm={handleModalConfirm}
        onClose={closeModal}
      />

      <CanvasBgModal
        isOpen={bgModalOpen}
        onClose={() => setBgModalOpen(false)}
        currentColor={backgroundColor}
        onSelectColor={handleBgChange}
      />

      <ContextMenu
        state={contextMenu}
        isPinned={contextMenuBm?.pinned ?? false}
        isFavorite={contextMenuBm?.favorite ?? false}
        onAction={handleContextAction}
        onClose={closeContextMenu}
        onColorChange={handleColorChange}
      />
    </>
  );
}
