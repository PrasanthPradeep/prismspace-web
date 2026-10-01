/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
// Bookmark Canvas — Shared TypeScript Interfaces

export interface Bookmark {
  id?: number;
  title: string;
  url: string;
  favicon: string;
  notes: string;
  color: string;
  favorite: boolean;
  pinned: boolean;
  category: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: Date;
  updatedAt: Date;
  lastVisited?: Date;
  visitCount: number;
}

export interface CanvasCamera {
  x: number;
  y: number;
  scale: number;
}

export interface BookmarkFormData {
  title: string;
  url: string;
  category: string;
  notes: string;
  color: string;
  favorite: boolean;
}

export type BookmarkAction =
  | 'open'
  | 'edit'
  | 'delete'
  | 'duplicate'
  | 'copy-url'
  | 'change-color'
  | 'pin'
  | 'favorite';

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  bookmarkId: number | null;
}

export const STICKY_COLORS = [
  { value: '#FFF59D', label: 'Yellow' },
  { value: '#FFCCBC', label: 'Peach' },
  { value: '#B2DFDB', label: 'Teal' },
  { value: '#BBDEFB', label: 'Blue' },
  { value: '#D1C4E9', label: 'Lavender' },
  { value: '#C8E6C9', label: 'Green' },
  { value: '#F8BBD0', label: 'Pink' },
  { value: '#ECEFF1', label: 'Silver' },
] as const;

export const DEFAULT_CARD_WIDTH = 280;
export const DEFAULT_CARD_HEIGHT = 200;
export const MIN_CARD_WIDTH = 200;
export const MIN_CARD_HEIGHT = 150;
export const MAX_CARD_WIDTH = 600;
export const MAX_CARD_HEIGHT = 800;

export const GRID_SNAP = 20;
export const MIN_SCALE = 0.2;
export const MAX_SCALE = 3;
export const ZOOM_STEP = 0.1;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export interface CanvasBgPreset {
  id: string;
  name: string;
  value: string;
  category: 'dark' | 'light';
}

export const CANVAS_BG_PRESETS: CanvasBgPreset[] = [
  { id: 'obsidian', name: 'Obsidian (Default)', value: '#090c12', category: 'dark' },
  { id: 'midnight', name: 'Midnight Blue', value: '#0b1120', category: 'dark' },
  { id: 'emerald', name: 'Ink Emerald', value: '#06190e', category: 'dark' },
  { id: 'charcoal', name: 'Charcoal Studio', value: '#161922', category: 'dark' },
  { id: 'violet', name: 'Cosmic Violet', value: '#120f24', category: 'dark' },
  { id: 'pure-black', name: 'OLED Black', value: '#000000', category: 'dark' },
  { id: 'slate', name: 'Slate Gray', value: '#1e293b', category: 'dark' },
  { id: 'deep-teal', name: 'Deep Teal', value: '#082026', category: 'dark' },
  { id: 'paper-white', name: 'Clean Paper', value: '#f8fafc', category: 'light' },
  { id: 'warm-linen', name: 'Warm Linen', value: '#f5f2eb', category: 'light' },
  { id: 'soft-mint', name: 'Mist Green', value: '#e8f5e9', category: 'light' },
  { id: 'soft-lilac', name: 'Soft Lilac', value: '#f3e8ff', category: 'light' },
];

export const DEFAULT_CANVAS_BG = '#090c12';

export function isLightColor(color: string): boolean {
  if (!color) return false;
  let hex = color.trim().replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  if (hex.length !== 6) return false;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55;
}

