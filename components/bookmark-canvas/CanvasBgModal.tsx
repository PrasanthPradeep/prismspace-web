/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Palette, Check, X, RotateCcw, Sparkles, Pipette } from 'lucide-react';
import {
  CANVAS_BG_PRESETS,
  DEFAULT_CANVAS_BG,
  isLightColor,
} from '@/lib/bookmark-canvas/types';

interface CanvasBgModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentColor: string;
  onSelectColor: (color: string) => void;
}

export function CanvasBgModal({
  isOpen,
  onClose,
  currentColor,
  onSelectColor,
}: CanvasBgModalProps) {
  const [customHex, setCustomHex] = useState(currentColor);

  // Sync customHex when currentColor or modal opens
  useEffect(() => {
    if (isOpen) {
      setCustomHex(currentColor);
    }
  }, [isOpen, currentColor]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const isCurrentLight = useMemo(() => isLightColor(currentColor), [currentColor]);

  const handleCustomHexChange = (val: string) => {
    let clean = val.trim();
    if (!clean.startsWith('#')) {
      clean = '#' + clean;
    }
    setCustomHex(clean);
    // If valid 6-char or 3-char hex, update live
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(clean)) {
      onSelectColor(clean);
    }
  };

  const darkPresets = useMemo(
    () => CANVAS_BG_PRESETS.filter((p) => p.category === 'dark'),
    []
  );
  const lightPresets = useMemo(
    () => CANVAS_BG_PRESETS.filter((p) => p.category === 'light'),
    []
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={onClose}
        >
          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="relative z-[160] w-full max-w-xl rounded-2xl border overflow-hidden flex flex-col max-h-[90vh]"
            style={{
              background: 'rgba(9, 12, 18, 0.96)',
              backdropFilter: 'blur(24px) saturate(1.8)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              boxShadow:
                '0 28px 80px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b shrink-0"
              style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(0, 223, 129, 0.18) 0%, rgba(5, 150, 105, 0.1) 100%)',
                    border: '1px solid rgba(0, 223, 129, 0.35)',
                    boxShadow: '0 0 16px rgba(0, 223, 129, 0.25)',
                  }}
                >
                  <Palette size={16} className="text-[#00df81]" />
                </div>
                <div>
                  <h2
                    className="text-base font-bold leading-tight"
                    style={{
                      color: '#ffffff',
                      fontFamily: 'Space Grotesk, sans-serif',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Canvas Background
                  </h2>
                  <p
                    className="text-xs mt-0.5"
                    style={{
                      color: '#94a3b8',
                      fontFamily: 'Space Grotesk, sans-serif',
                    }}
                  >
                    Personalize your canvas aesthetic and contrast
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                title="Close (Esc)"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Active preview banner */}
              <div
                className="p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-colors"
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-lg border relative shrink-0 overflow-hidden shadow-inner flex items-center justify-center"
                    style={{
                      backgroundColor: currentColor,
                      borderColor: 'rgba(255, 255, 255, 0.18)',
                    }}
                  >
                    {/* Mini dot preview */}
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: isCurrentLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)',
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs uppercase font-bold tracking-wider"
                        style={{
                          color: '#ffffff',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      >
                        {currentColor}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: isCurrentLight ? 'rgba(255,255,255,0.1)' : 'rgba(0, 223, 129, 0.15)',
                          color: isCurrentLight ? '#cbd5e1' : '#00df81',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      >
                        {isCurrentLight ? 'Light Mode' : 'Dark Mode'}
                      </span>
                    </div>
                    <p
                      className="text-xs mt-0.5 truncate"
                      style={{
                        color: '#94a3b8',
                        fontFamily: 'Space Grotesk, sans-serif',
                      }}
                    >
                      Active canvas shade with adaptive dot grid
                    </p>
                  </div>
                </div>

                {currentColor.toLowerCase() !== DEFAULT_CANVAS_BG.toLowerCase() && (
                  <button
                    onClick={() => {
                      onSelectColor(DEFAULT_CANVAS_BG);
                      setCustomHex(DEFAULT_CANVAS_BG);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all hover:bg-white/10 shrink-0 text-white/70 hover:text-white"
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                    title="Reset to Obsidian Dark"
                  >
                    <RotateCcw size={12} />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                )}
              </div>

              {/* Dark & OLED Presets */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                    style={{
                      color: '#94a3b8',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    <Sparkles size={11} className="text-[#00df81]" />
                    Dark & Obsidian Palettes
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {darkPresets.map((preset) => {
                    const isSelected =
                      currentColor.toLowerCase() === preset.value.toLowerCase();
                    return (
                      <button
                        key={preset.id}
                        onClick={() => {
                          onSelectColor(preset.value);
                          setCustomHex(preset.value);
                        }}
                        className={`group relative flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all duration-150 ${
                          isSelected
                            ? 'border-[#00df81] ring-2 ring-[#00df81]/25 bg-white/[0.06]'
                            : 'border-white/[0.08] hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05]'
                        }`}
                      >
                        <div
                          className="w-5 h-5 rounded-full shrink-0 border relative flex items-center justify-center transition-transform group-hover:scale-110"
                          style={{
                            backgroundColor: preset.value,
                            borderColor: isSelected
                              ? '#00df81'
                              : 'rgba(255, 255, 255, 0.25)',
                            boxShadow: isSelected
                              ? '0 0 10px rgba(0, 223, 129, 0.4)'
                              : 'none',
                          }}
                        >
                          {isSelected && (
                            <Check size={11} className="text-white drop-shadow-md" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p
                            className="text-xs font-semibold truncate leading-tight"
                            style={{
                              color: isSelected ? '#ffffff' : '#cbd5e1',
                              fontFamily: 'Space Grotesk, sans-serif',
                            }}
                          >
                            {preset.name}
                          </p>
                          <p
                            className="text-[10px] uppercase font-mono mt-0.5 truncate"
                            style={{ color: '#64748b' }}
                          >
                            {preset.value}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Light & Clean Presets */}
              <div className="space-y-2.5">
                <span
                  className="text-xs font-bold uppercase tracking-wider block"
                  style={{
                    color: '#94a3b8',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  Light & Soft Palettes
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {lightPresets.map((preset) => {
                    const isSelected =
                      currentColor.toLowerCase() === preset.value.toLowerCase();
                    return (
                      <button
                        key={preset.id}
                        onClick={() => {
                          onSelectColor(preset.value);
                          setCustomHex(preset.value);
                        }}
                        className={`group relative flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all duration-150 ${
                          isSelected
                            ? 'border-[#00df81] ring-2 ring-[#00df81]/25 bg-white/[0.06]'
                            : 'border-white/[0.08] hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05]'
                        }`}
                      >
                        <div
                          className="w-5 h-5 rounded-full shrink-0 border relative flex items-center justify-center transition-transform group-hover:scale-110"
                          style={{
                            backgroundColor: preset.value,
                            borderColor: isSelected
                              ? '#00df81'
                              : 'rgba(0, 0, 0, 0.25)',
                            boxShadow: isSelected
                              ? '0 0 10px rgba(0, 223, 129, 0.4)'
                              : 'none',
                          }}
                        >
                          {isSelected && (
                            <Check size={11} className="text-black drop-shadow-md" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p
                            className="text-xs font-semibold truncate leading-tight"
                            style={{
                              color: isSelected ? '#ffffff' : '#cbd5e1',
                              fontFamily: 'Space Grotesk, sans-serif',
                            }}
                          >
                            {preset.name}
                          </p>
                          <p
                            className="text-[10px] uppercase font-mono mt-0.5 truncate"
                            style={{ color: '#64748b' }}
                          >
                            {preset.value}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Color Selector */}
              <div
                className="p-4 rounded-xl border space-y-3"
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                    style={{
                      color: '#94a3b8',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    <Pipette size={12} className="text-[#00df81]" />
                    Custom Color Picker
                  </span>
                  <span
                    className="text-[11px] text-white/40"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    Any Hex or Color Spectrum
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Native Color Picker Trigger */}
                  <label
                    className="relative cursor-pointer w-10 h-10 rounded-xl border overflow-hidden shrink-0 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-md"
                    style={{
                      backgroundColor: customHex,
                      borderColor: 'rgba(255, 255, 255, 0.25)',
                    }}
                    title="Open native color picker"
                  >
                    <input
                      type="color"
                      value={
                        /^#([0-9A-Fa-f]{6})$/.test(customHex)
                          ? customHex
                          : currentColor
                      }
                      onChange={(e) => {
                        const next = e.target.value;
                        setCustomHex(next);
                        onSelectColor(next);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <Palette
                      size={14}
                      className={
                        isLightColor(customHex) ? 'text-black/60' : 'text-white/70'
                      }
                    />
                  </label>

                  {/* Hex Text Input */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="#090C12"
                      value={customHex}
                      onChange={(e) => handleCustomHexChange(e.target.value)}
                      maxLength={7}
                      className="w-full px-3 py-2 rounded-xl text-xs uppercase font-mono transition-all outline-none focus:border-[#00df81] focus:ring-1 focus:ring-[#00df81]/30"
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#ffffff',
                        letterSpacing: '0.05em',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    />
                  </div>

                  {/* Apply Custom Button */}
                  <button
                    onClick={() => {
                      if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(customHex)) {
                        onSelectColor(customHex);
                        onClose();
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0"
                    style={{
                      background: '#00df81',
                      color: '#000000',
                      boxShadow: '0 0 16px rgba(0, 223, 129, 0.25)',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-end px-6 py-3 border-t shrink-0 bg-white/[0.01]"
              style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
            >
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Done
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
