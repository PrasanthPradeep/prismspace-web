/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, ExternalLink, Loader2 } from 'lucide-react';
import { CosmicButton } from '@/components/ui/cosmic-button';
import type { Bookmark, BookmarkFormData } from '@/lib/bookmark-canvas/types';
import { STICKY_COLORS } from '@/lib/bookmark-canvas/types';
import { getFaviconUrl, isValidUrl, normalizeUrl } from '@/lib/bookmark-canvas/utils';

interface BookmarkModalProps {
  isOpen: boolean;
  editingBookmark?: Bookmark | null;
  existingUrls: string[];
  dropPosition?: { x: number; y: number };
  onConfirm: (data: BookmarkFormData, position?: { x: number; y: number }) => void;
  onClose: () => void;
}

const CATEGORIES = [
  'Work',
  'Design',
  'Development',
  'Research',
  'Tools',
  'Social',
  'News',
  'Entertainment',
  'Learning',
  'Other',
];

const defaultForm: BookmarkFormData = {
  title: '',
  url: '',
  category: '',
  notes: '',
  color: STICKY_COLORS[0].value,
  favorite: false,
};

export function BookmarkModal({
  isOpen,
  editingBookmark,
  existingUrls,
  dropPosition,
  onConfirm,
  onClose,
}: BookmarkModalProps) {
  const [form, setForm] = useState<BookmarkFormData>(defaultForm);
  const [errors, setErrors] = useState<Partial<Record<keyof BookmarkFormData, string>>>({});
  const [previewFavicon, setPreviewFavicon] = useState('');
  const [loadingFavicon, setLoadingFavicon] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editingBookmark) {
        setForm({
          title: editingBookmark.title,
          url: editingBookmark.url,
          category: editingBookmark.category,
          notes: editingBookmark.notes,
          color: editingBookmark.color,
          favorite: editingBookmark.favorite,
        });
        setPreviewFavicon(editingBookmark.favicon);
      } else {
        setForm(defaultForm);
        setPreviewFavicon('');
      }
      setErrors({});
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [isOpen, editingBookmark]);

  const fetchFavicon = useCallback(async (url: string) => {
    const normalized = normalizeUrl(url);
    if (!isValidUrl(normalized)) return;
    setLoadingFavicon(true);
    setPreviewFavicon(getFaviconUrl(normalized));
    setLoadingFavicon(false);
  }, []);

  const handleUrlBlur = useCallback(async () => {
    if (form.url) {
      const normalized = normalizeUrl(form.url);
      setForm((p) => ({ ...p, url: normalized }));
      await fetchFavicon(normalized);
      // Auto-fill title if empty
      if (!form.title) {
        try {
          const domain = new URL(normalized).hostname.replace(/^www\./, '');
          setForm((p) => ({ ...p, title: p.title || domain }));
        } catch { /* ignore */ }
      }
    }
  }, [form.url, form.title, fetchFavicon]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof BookmarkFormData, string>> = {};
    if (!form.title.trim()) newErrors.title = 'Title is required';

    const normalized = normalizeUrl(form.url);
    if (!normalized) {
      newErrors.url = 'URL is required';
    } else if (!isValidUrl(normalized)) {
      newErrors.url = 'Please enter a valid URL (https://...)';
    } else if (!editingBookmark && existingUrls.includes(normalized)) {
      newErrors.url = 'This URL is already bookmarked';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const finalData = { ...form, url: normalizeUrl(form.url) };
    onConfirm(finalData, dropPosition);
    onClose();
  };

  const set = (field: keyof BookmarkFormData, value: string | boolean) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop + centering wrapper */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
            onClick={onClose}
          >

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative z-[160] w-full max-w-lg rounded-2xl border overflow-hidden"
            style={{
              background: 'rgba(9, 12, 18, 0.95)',
              backdropFilter: 'blur(20px) saturate(1.8)',
              borderColor: 'rgba(255, 255, 255, 0.08)',
              boxShadow: '0 24px 80px rgba(0, 0, 0, 0.7), 0 4px 16px rgba(0, 0, 0, 0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
            >
              <div className="flex items-center gap-3">
                {previewFavicon ? (
                  <div 
                    className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center"
                    style={{ background: 'rgba(0, 223, 129, 0.12)' }}
                  >
                    {loadingFavicon ? (
                      <Loader2 size={14} className="animate-spin" style={{ color: '#94a3b8' }} />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewFavicon}
                        alt=""
                        className="w-5 h-5 object-contain"
                        onError={() => setPreviewFavicon('')}
                      />
                    )}
                  </div>
                ) : (
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(255, 255, 255, 0.08)' }}
                  >
                    <ExternalLink size={14} style={{ color: '#94a3b8' }} />
                  </div>
                )}
                <h2 
                  className="text-base font-semibold"
                  style={{
                    color: '#ffffff',
                    fontFamily: 'Space Grotesk, sans-serif',
                    fontWeight: 700,
                  }}
                >
                  {editingBookmark ? 'Edit Bookmark' : 'Add Bookmark'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: '#94a3b8' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* URL */}
              <div>
                <label 
                  className="block text-xs font-medium mb-1.5"
                  style={{
                    color: '#94a3b8',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  URL <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  ref={urlRef}
                  type="text"
                  placeholder="https://example.com"
                  value={form.url}
                  onChange={(e) => set('url', e.target.value)}
                  onBlur={handleUrlBlur}
                  className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: errors.url ? '1px solid rgba(248, 113, 113, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    fontFamily: 'Space Grotesk, sans-serif',
                  }}
                />
                {errors.url && <p className="mt-1 text-xs" style={{ color: '#f87171' }}>{errors.url}</p>}
              </div>

              {/* Title */}
              <div>
                <label 
                  className="block text-xs font-medium mb-1.5"
                  style={{
                    color: '#94a3b8',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  Title <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  ref={titleRef}
                  type="text"
                  placeholder="My Bookmark"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-2"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: errors.title ? '1px solid rgba(248, 113, 113, 0.6)' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    fontFamily: 'Space Grotesk, sans-serif',
                  }}
                />
                {errors.title && <p className="mt-1 text-xs" style={{ color: '#f87171' }}>{errors.title}</p>}
              </div>

              {/* Category */}
              <div>
                <label 
                  className="block text-xs font-medium mb-1.5"
                  style={{
                    color: '#94a3b8',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => set('category', form.category === cat ? '' : cat)}
                      className="px-2.5 py-1 rounded-lg text-xs transition-all"
                      style={
                        form.category === cat
                          ? {
                              background: 'rgba(0, 223, 129, 0.12)',
                              border: '1px solid rgba(0, 223, 129, 0.3)',
                              color: '#00df81',
                              fontFamily: 'JetBrains Mono, monospace',
                              fontWeight: 700,
                            }
                          : {
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              color: '#94a3b8',
                              fontFamily: 'JetBrains Mono, monospace',
                              fontWeight: 600,
                            }
                      }
                      onMouseEnter={(e) => {
                        if (form.category !== cat) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.color = '#cbd5e1';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (form.category !== cat) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                          e.currentTarget.style.color = '#94a3b8';
                        }
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label 
                  className="block text-xs font-medium mb-1.5"
                  style={{
                    color: '#94a3b8',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  Notes
                </label>
                <textarea
                  placeholder="Add notes, thoughts, or context..."
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl text-sm transition-all resize-none focus:outline-none focus:ring-2"
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    fontFamily: 'Space Grotesk, sans-serif',
                  }}
                />
              </div>

              {/* Color + Favorite row */}
              <div className="flex items-center justify-between">
                <div>
                  <label 
                    className="block text-xs font-medium mb-2"
                    style={{
                      color: '#94a3b8',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Card Color
                  </label>
                  <div className="flex gap-1.5">
                    {STICKY_COLORS.map((c) => (
                      <button
                        type="button"
                        key={c.value}
                        title={c.label}
                        onClick={() => set('color', c.value)}
                        className="w-6 h-6 rounded-full transition-all hover:scale-110"
                        style={{
                          background: c.value,
                          border: form.color === c.value ? '2px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.2)',
                          transform: form.color === c.value ? 'scale(1.1)' : 'scale(1)',
                        }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => set('favorite', !form.favorite)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-sm"
                  style={
                    form.favorite
                      ? {
                          background: 'rgba(251, 191, 36, 0.12)',
                          borderColor: 'rgba(251, 191, 36, 0.3)',
                          color: '#fbbf24',
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
                  <Star size={14} fill={form.favorite ? 'currentColor' : 'none'} />
                  Favorite
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl border text-sm transition-all"
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e1',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#cbd5e1';
                  }}
                >
                  Cancel
                </button>
                <CosmicButton
                  as="button"
                  type="submit"
                  className="flex-1"
                >
                  {editingBookmark ? 'Save Changes' : 'Add Bookmark'}
                </CosmicButton>
              </div>
            </form>
          </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
