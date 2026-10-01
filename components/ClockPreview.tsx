/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
import { ClockStyle, clockStyleClasses } from './Clock';

interface ClockPreviewProps {
  style: ClockStyle;
  color?: string;
}

export function ClockPreview({ style, color = '#ffffff' }: ClockPreviewProps) {
  const styleClass = clockStyleClasses[style] || clockStyleClasses.default;

  return (
    <div className="w-full h-full flex items-center justify-center bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden border border-white/5 relative">
      <div 
        className={`text-4xl leading-none text-shadow-md transition-all duration-300 ${styleClass}`}
        style={{ color }}
      >
        12:24
      </div>
      
      {/* Decorative gradient accents for a premium feel */}
      <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.03)_0%,transparent_60%)] pointer-events-none" />
    </div>
  );
}
