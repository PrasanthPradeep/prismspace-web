/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Copy,
  Check,
  Dices,
  X,
  Code2,
} from 'lucide-react';
import { ColorGenIcon } from './ToolIcons';

interface ColorGeneratorProps {
  onClose: () => void;
}

type HarmonyMode =
  | 'analogous'
  | 'complementary'
  | 'split-comp'
  | 'triadic'
  | 'tetradic'
  | 'monochromatic';

interface PaletteItem {
  hex: string;
  role: string;
  shift: string;
}

type ExportFormat = 'css' | 'tailwind' | 'json' | 'hex-list';

// ── Color Conversion & Telemetry Utilities ──

function hexToHSL(hex: string) {
  let cleanHex = hex.replace(/^#/, '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const r = (parseInt(cleanHex.slice(0, 2), 16) || 0) / 255;
  const g = (parseInt(cleanHex.slice(2, 4), 16) || 0) / 255;
  const b = (parseInt(cleanHex.slice(4, 6), 16) || 0) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function HSLToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const lNorm = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) => {
    const val = Math.round((n + m) * 255);
    const clamped = Math.max(0, Math.min(255, val));
    return clamped.toString(16).padStart(2, '0');
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function hexToRGB(hex: string) {
  let cleanHex = hex.replace(/^#/, '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(cleanHex.slice(0, 2), 16) || 0;
  const g = parseInt(cleanHex.slice(2, 4), 16) || 0;
  const b = parseInt(cleanHex.slice(4, 6), 16) || 0;
  return { r, g, b };
}

function getLuminance(r: number, g: number, b: number) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const val = c / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastInfo(hex: string) {
  const { r, g, b } = hexToRGB(hex);
  const L = getLuminance(r, g, b);
  const contrastBlack = (L + 0.05) / 0.05;
  const contrastWhite = 1.05 / (L + 0.05);

  const bestText = L > 0.42 ? '#000000' : '#FFFFFF';
  const bestRatio = L > 0.42 ? contrastBlack : contrastWhite;
  const wcag = bestRatio >= 7 ? 'AAA' : bestRatio >= 4.5 ? 'AA' : 'A';

  return {
    bestText,
    wcag,
    ratio: bestRatio.toFixed(1),
    lum: Math.round(L * 100),
  };
}

function generateHarmonies(baseColor: string, mode: HarmonyMode): PaletteItem[] {
  const { h, s, l } = hexToHSL(baseColor);
  const cleanHex = baseColor.startsWith('#') ? baseColor.toUpperCase() : `#${baseColor.toUpperCase()}`;

  switch (mode) {
    case 'analogous':
      return [
        { hex: HSLToHex(h - 32, s, l), role: 'Adjacent Left', shift: '-32°' },
        { hex: HSLToHex(h - 16, s, l), role: 'Subtle Step', shift: '-16°' },
        { hex: cleanHex, role: 'Base Anchor', shift: '0°' },
        { hex: HSLToHex(h + 16, s, l), role: 'Subtle Step', shift: '+16°' },
        { hex: HSLToHex(h + 32, s, l), role: 'Adjacent Right', shift: '+32°' },
      ];
    case 'complementary':
      return [
        { hex: cleanHex, role: 'Base Anchor', shift: '0°' },
        { hex: HSLToHex(h, Math.max(s - 25, 20), Math.min(l + 22, 90)), role: 'Base Tint', shift: 'Tint' },
        { hex: HSLToHex(h + 180, s, l), role: 'Direct Complement', shift: '180°' },
        { hex: HSLToHex(h + 180, Math.min(s + 10, 100), Math.min(l + 18, 88)), role: 'Comp Highlight', shift: '+180° Light' },
        { hex: HSLToHex(h + 180, s, Math.max(l - 22, 12)), role: 'Comp Shade', shift: '+180° Dark' },
      ];
    case 'split-comp':
      return [
        { hex: HSLToHex(h + 150, s, l), role: 'Split 1', shift: '+150°' },
        { hex: HSLToHex(h + 150, s, Math.min(l + 20, 88)), role: 'Split 1 Tint', shift: '+150° L' },
        { hex: cleanHex, role: 'Base Anchor', shift: '0°' },
        { hex: HSLToHex(h + 210, s, Math.min(l + 20, 88)), role: 'Split 2 Tint', shift: '+210° L' },
        { hex: HSLToHex(h + 210, s, l), role: 'Split 2', shift: '+210°' },
      ];
    case 'triadic':
      return [
        { hex: cleanHex, role: 'Base Anchor', shift: '0°' },
        { hex: HSLToHex(h + 120, s, l), role: 'Triad 2', shift: '+120°' },
        { hex: HSLToHex(h + 240, s, l), role: 'Triad 3', shift: '+240°' },
        { hex: HSLToHex(h + 120, s, Math.min(l + 20, 88)), role: 'Triad 2 Light', shift: '+120° L' },
        { hex: HSLToHex(h + 240, s, Math.max(l - 20, 15)), role: 'Triad 3 Dark', shift: '+240° D' },
      ];
    case 'tetradic':
      return [
        { hex: cleanHex, role: 'Base Anchor', shift: '0°' },
        { hex: HSLToHex(h + 90, s, l), role: 'Quad 2', shift: '+90°' },
        { hex: HSLToHex(h + 180, s, l), role: 'Quad 3', shift: '+180°' },
        { hex: HSLToHex(h + 270, s, l), role: 'Quad 4', shift: '+270°' },
        { hex: HSLToHex(h, Math.min(s + 20, 100), Math.min(l + 25, 90)), role: 'Quad Tint', shift: 'Base L' },
      ];
    case 'monochromatic':
      return [
        { hex: HSLToHex(h, s, Math.max(l - 35, 12)), role: 'Deep Shade', shift: '-35% L' },
        { hex: HSLToHex(h, s, Math.max(l - 18, 22)), role: 'Medium Shade', shift: '-18% L' },
        { hex: cleanHex, role: 'Base Anchor', shift: '0%' },
        { hex: HSLToHex(h, Math.max(s - 10, 15), Math.min(l + 18, 80)), role: 'Soft Tint', shift: '+18% L' },
        { hex: HSLToHex(h, Math.max(s - 25, 10), Math.min(l + 32, 92)), role: 'High Tint', shift: '+32% L' },
      ];
  }
}

const HARMONY_MODES: { id: HarmonyMode; label: string; desc: string }[] = [
  { id: 'analogous', label: 'Analogous', desc: 'Adjacent ±30° hues' },
  { id: 'complementary', label: 'Complement', desc: '180° direct contrast' },
  { id: 'split-comp', label: 'Split-Comp', desc: '±150° tri-point balance' },
  { id: 'triadic', label: 'Triadic', desc: '120° equilateral triad' },
  { id: 'tetradic', label: 'Tetradic', desc: '90° quad rectangle' },
  { id: 'monochromatic', label: 'Monochrome', desc: 'Lightness / Saturation' },
];

export function ColorGenerator({ onClose }: ColorGeneratorProps) {
  const [baseColor, setBaseColor] = useState('#667EEA');
  const [inputHex, setInputHex] = useState('667EEA');
  const [mode, setMode] = useState<HarmonyMode>('analogous');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('css');
  const [isRolling, setIsRolling] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const colorInputRef = useRef<HTMLInputElement>(null);

  // Sync internal hex text with baseColor
  useEffect(() => {
    const clean = baseColor.replace(/^#/, '').toUpperCase();
    setInputHex(clean);
  }, [baseColor]);

  // Generate palette
  const palette = useMemo(() => {
    return generateHarmonies(baseColor, mode);
  }, [baseColor, mode]);

  // Handle manual input
  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6);
    setInputHex(raw);
    if (raw.length === 3 || raw.length === 6) {
      setBaseColor(`#${raw}`);
    }
  };

  const copyToClipboard = (text: string, label: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setToastMessage(`COPIED ${text}`);

    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);

    setTimeout(() => {
      setToastMessage((cur) => (cur === `COPIED ${text}` ? null : cur));
    }, 2400);
  };

  const randomColor = () => {
    setIsRolling(true);
    const random = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    setBaseColor(random);
    setTimeout(() => setIsRolling(false), 500);
  };

  // Generate export snippet
  const exportSnippet = useMemo(() => {
    const colors = palette.map((p) => p.hex);
    switch (exportFormat) {
      case 'css':
        return `:root {\n${colors.map((c, i) => `  --color-${i + 1}: ${c};`).join('\n')}\n}`;
      case 'tailwind':
        return `// tailwind.config.js\ncolors: {\n${colors
          .map((c, i) => `  'palette-${i + 1}': '${c}',`)
          .join('\n')}\n}`;
      case 'json':
        return JSON.stringify(colors, null, 2);
      case 'hex-list':
        return colors.join(', ');
    }
  }, [palette, exportFormat]);

  return (
    <div className="flex flex-col h-full text-white relative select-none overflow-hidden font-sans"
      style={{
        backgroundColor: '#090c12',
        backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px',
      }}
    >
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#090c12]/90 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center relative transition-transform duration-300 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 223, 129, 0.12) 0%, rgba(56, 189, 248, 0.08) 100%)',
              border: '1px solid rgba(0, 223, 129, 0.25)',
              boxShadow: '0 0 16px rgba(0, 223, 129, 0.15)',
            }}
          >
            <ColorGenIcon size={22} glow />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2
                className="text-base font-bold text-white tracking-[-0.02em] leading-tight"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                Color Generator
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wider uppercase bg-[#00df81]/10 border border-[#00df81]/25 text-[#00df81]">
                Harmonic Studio
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive palette schemes, WCAG contrast verification & code export
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Close Button */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.03] border border-white/10 text-white/60 hover:text-white hover:border-rose-500/40 hover:bg-rose-500/15 transition-all duration-200"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ── Control Console Deck ── */}
      <div className="px-6 py-4 border-b border-white/[0.08] bg-[#090c12]/80 space-y-4 z-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Base Color Picker & Hex Input */}
          <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
            <span
              className="text-[11px] font-semibold tracking-wide text-slate-300"
            >
              Base Seed
            </span>

            {/* Color Swatch Trigger */}
            <div
              onClick={() => colorInputRef.current?.click()}
              className="relative w-9 h-9 rounded-xl border-2 border-white/20 shadow-inner cursor-pointer transition-transform hover:scale-105 active:scale-95 group overflow-hidden"
              style={{
                backgroundColor: baseColor,
                boxShadow: `0 0 16px ${baseColor}40`,
              }}
              title="Click to open color picker"
            >
              <input
                ref={colorInputRef}
                type="color"
                value={baseColor}
                onChange={(e) => setBaseColor(e.target.value)}
                className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
              />
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
            </div>

            {/* Developer-Grade Monospace Hex Input */}
            <div
              className="group relative flex items-center rounded-xl bg-black/60 border border-white/10 transition-all duration-200 focus-within:border-[#00df81] focus-within:ring-2 focus-within:ring-[#00df81]/20 px-2.5 py-1.5"
              style={{
                boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.5)',
              }}
            >
              <span className="text-xs font-mono font-bold text-[#00df81] mr-1 select-none pointer-events-none">
                #
              </span>
              <input
                type="text"
                value={inputHex}
                onChange={handleHexChange}
                maxLength={6}
                placeholder="667EEA"
                className="w-20 bg-transparent text-white font-mono text-xs font-bold uppercase tracking-wider outline-none"
              />
            </div>

            {/* HSL Info readout pill */}
            <div className="hidden lg:flex items-center px-2 py-1 bg-black/60 border border-white/10 rounded-md text-[10px] font-mono text-slate-400">
              {(() => {
                const { h, s, l } = hexToHSL(baseColor);
                return `H:${h}° S:${s}% L:${l}%`;
              })()}
            </div>
          </div>

          {/* Quick Actions (Random & Export) */}
          <div className="flex items-center gap-2">
            <button
              onClick={randomColor}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black border border-[#00df81]/40 text-[#00df81] hover:bg-[#00df81]/15 hover:border-[#00df81] transition-all duration-200 active:scale-95 text-xs font-mono font-bold tracking-wider"
              style={{
                boxShadow: '0 0 12px rgba(0, 223, 129, 0.15)',
              }}
              title="Generate Random Base Color"
            >
              <Dices
                size={14}
                className={`transition-transform duration-500 ${isRolling ? 'rotate-180' : ''}`}
              />
              <span>RANDOM</span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black border border-white/15 text-slate-300 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all duration-200 text-xs font-mono font-medium tracking-wide"
              title="Export Palette Code"
            >
              <Code2 size={13} className="text-[#00df81]" />
              <span>EXPORT</span>
            </button>
          </div>
        </div>

        {/* ── Segmented Harmony Mode Track ── */}
        <div className="p-1 rounded-xl bg-black/80 border border-white/10 flex flex-wrap gap-1">
          {HARMONY_MODES.map((m) => {
            const isActive = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex-1 min-w-[85px] py-1.5 px-2.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all duration-200 relative ${
                  isActive
                    ? 'bg-black text-[#00df81] border border-[#00df81]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
                style={
                  isActive
                    ? {
                        boxShadow: '0 0 14px rgba(0, 223, 129, 0.25)',
                      }
                    : undefined
                }
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Palette Strip Banner (Continuous Spectrum Preview) ── */}
      <div className="w-full h-3 flex overflow-hidden border-b border-white/[0.08]">
        {palette.map((item, idx) => (
          <div
            key={idx}
            className="flex-1 h-full transition-all duration-300 hover:brightness-110 cursor-pointer"
            style={{ backgroundColor: item.hex }}
            title={`${item.role}: ${item.hex}`}
            onClick={() => copyToClipboard(item.hex, item.role, `strip-${idx}`)}
          />
        ))}
      </div>

      {/* ── Scrollable Color Cards Area ── */}
      <div className="flex-1 px-6 py-5 overflow-y-auto space-y-3">
        <div className="flex items-center justify-between mb-1 text-[11px] font-mono text-slate-400 uppercase tracking-widest px-1">
          <span>{mode.toUpperCase()} HARMONY // 5 NODES</span>
          <span>FORMATS: HEX · RGB · HSL</span>
        </div>

        <div className="space-y-3">
          {palette.map((item, index) => {
            const isBase = item.shift === '0°' || item.shift === '0%';
            const contrast = getContrastInfo(item.hex);
            const { r, g, b } = hexToRGB(item.hex);
            const { h, s, l } = hexToHSL(item.hex);
            const isCopied = copiedKey === `card-${index}`;

            return (
              <motion.div
                key={`${item.hex}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.04 }}
                className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl border transition-all duration-200 ${
                  isCopied
                    ? 'bg-[#00df81]/[0.08] border-[#00df81]'
                    : isBase
                    ? 'bg-white/[0.04] border-white/20 hover:border-[#00df81]/50'
                    : 'bg-white/[0.02] border-white/[0.08] hover:border-white/20 hover:bg-white/[0.04]'
                }`}
                style={{
                  boxShadow: isCopied
                    ? '0 0 20px rgba(0, 223, 129, 0.25)'
                    : '0 4px 12px rgba(0, 0, 0, 0.3)',
                }}
              >
                {/* Left Swatch & Role */}
                <div className="flex items-center gap-3.5">
                  {/* Swatch Box */}
                  <div
                    onClick={() => copyToClipboard(item.hex, item.role, `card-${index}`)}
                    className="relative w-14 h-14 rounded-xl border border-white/20 shadow-md cursor-pointer shrink-0 transition-transform duration-200 group-hover:scale-105 active:scale-95 overflow-hidden flex items-end justify-start p-1"
                    style={{
                      backgroundColor: item.hex,
                      boxShadow: `0 0 20px ${item.hex}30, inset 0 1px 1px rgba(255,255,255,0.25)`,
                    }}
                    title="Click to copy HEX"
                  >
                    {/* Contrast Tag Pill */}
                    <span
                      className="px-1 py-0.2 rounded text-[8px] font-mono font-bold tracking-tighter"
                      style={{
                        backgroundColor: contrast.bestText === '#000000' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)',
                        color: contrast.bestText === '#000000' ? '#ffffff' : '#000000',
                      }}
                    >
                      {contrast.wcag}
                    </span>
                  </div>

                  {/* Color Codes & Role */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        onClick={() => copyToClipboard(item.hex, item.role, `card-${index}`)}
                        className="font-mono text-base font-bold tracking-tight text-white hover:text-[#00df81] cursor-pointer transition-colors"
                      >
                        {item.hex}
                      </span>

                      {/* Role Pill */}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                          isBase
                            ? 'bg-black text-[#00df81] border border-[#00df81]/60'
                            : 'bg-black/60 text-slate-400 border border-white/10'
                        }`}
                      >
                        {item.role}
                      </span>
                    </div>

                    {/* Secondary Formats (Quick Copy Chips) */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-400">
                      <button
                        onClick={() => copyToClipboard(`rgb(${r}, ${g}, ${b})`, 'RGB', `rgb-${index}`)}
                        className="hover:text-white transition-colors"
                        title="Copy RGB"
                      >
                        rgb({r}, {g}, {b})
                      </button>
                      <span className="text-white/20">·</span>
                      <button
                        onClick={() => copyToClipboard(`hsl(${h}, ${s}%, ${l}%)`, 'HSL', `hsl-${index}`)}
                        className="hover:text-white transition-colors"
                        title="Copy HSL"
                      >
                        hsl({h}, {s}%, {l}%)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Action: Copy Button */}
                <div className="flex items-center justify-end sm:justify-center">
                  <button
                    onClick={() => copyToClipboard(item.hex, item.role, `card-${index}`)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-mono text-xs font-bold tracking-wider transition-all duration-200 ${
                      isCopied
                        ? 'bg-[#00df81] text-black shadow-[0_0_16px_rgba(0,223,129,0.5)] scale-105'
                        : 'bg-black border border-white/15 text-slate-200 hover:text-white hover:border-[#00df81]/50 hover:bg-[#00df81]/10'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check size={13} className="stroke-[3]" />
                        <span>COPIED!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} className="text-[#00df81]" />
                        <span>COPY</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Toast Feedback Notification ── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black border border-[#00df81] text-[#00df81] font-mono text-xs font-bold tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(0,223,129,0.35)] z-50 pointer-events-none"
          >
            <Check size={13} className="stroke-[3]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Export Palette Modal Overlay ── */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md z-40 flex items-center justify-center p-4"
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-lg rounded-2xl bg-[#090c12] border border-white/15 shadow-2xl p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Code2 size={16} className="text-[#00df81]" />
                  <h3 className="font-mono text-sm font-bold text-white tracking-wide uppercase">
                    EXPORT PALETTE CODE
                  </h3>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-black border border-white/10 text-white/50 hover:text-white hover:border-white/30"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Format Selectors */}
              <div className="flex gap-1.5 p-1 bg-black rounded-lg border border-white/10">
                {(['css', 'tailwind', 'json', 'hex-list'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setExportFormat(fmt)}
                    className={`flex-1 py-1.5 rounded text-[11px] font-mono font-bold tracking-wider uppercase transition-colors ${
                      exportFormat === fmt
                        ? 'bg-[#00df81] text-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>

              {/* Code Snippet Box */}
              <div className="relative">
                <pre className="p-3.5 rounded-xl bg-black border border-white/10 text-xs font-mono text-[#00df81] overflow-x-auto max-h-52 leading-relaxed">
                  <code>{exportSnippet}</code>
                </pre>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 rounded-lg bg-black border border-white/15 text-xs font-mono font-semibold text-slate-300 hover:text-white"
                >
                  CLOSE
                </button>
                <button
                  onClick={() => copyToClipboard(exportSnippet, 'Code Snippet', 'modal-copy')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00df81] text-black font-mono text-xs font-bold tracking-wider hover:bg-[#00df81]/90 shadow-[0_0_15px_rgba(0,223,129,0.3)] transition-all"
                >
                  {copiedKey === 'modal-copy' ? (
                    <>
                      <Check size={13} className="stroke-[3]" />
                      <span>COPIED CODE!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>COPY SNIPPET</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
