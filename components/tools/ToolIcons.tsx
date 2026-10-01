/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import React from 'react';

interface ToolIconProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

/**
 * Modern Web Scraper Emblem:
 * Interconnected intelligent crawl radar with precision data extraction nodes.
 */
export function WebScraperIcon({ size = 24, className = '', glow = false }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={glow ? { filter: 'drop-shadow(0 0 10px rgba(0, 223, 129, 0.45))' } : undefined}
    >
      <defs>
        <linearGradient id="scraper-grad-primary" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00df81" />
          <stop offset="50%" stopColor="#00f59b" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="scraper-grad-track" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(0, 223, 129, 0.3)" />
          <stop offset="100%" stopColor="rgba(6, 182, 212, 0.1)" />
        </linearGradient>
      </defs>

      {/* Orbit Rings */}
      <circle cx="24" cy="24" r="19" stroke="url(#scraper-grad-primary)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.35" />
      <circle cx="24" cy="24" r="13" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1.2" />

      {/* Crosshairs / Scanner Rays */}
      <path d="M24 5V11M24 37V43M5 24H11M37 24H43" stroke="url(#scraper-grad-primary)" strokeWidth="2" strokeLinecap="round" />
      
      {/* Central Extraction Core */}
      <rect x="17" y="17" width="14" height="14" rx="4" fill="url(#scraper-grad-track)" stroke="url(#scraper-grad-primary)" strokeWidth="1.8" />
      <circle cx="24" cy="24" r="3" fill="#00df81" />

      {/* Crawl Data Vectors */}
      <path d="M12 16L18 22M36 32L30 26M32 12L26 18M16 36L22 30" stroke="url(#scraper-grad-primary)" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />

      {/* Satellite Extraction Nodes */}
      <circle cx="12" cy="16" r="2.5" fill="#06b6d4" />
      <circle cx="36" cy="32" r="2.5" fill="#00df81" />
      <circle cx="32" cy="12" r="2.5" fill="#00df81" />
      <circle cx="16" cy="36" r="2.5" fill="#06b6d4" />
    </svg>
  );
}

/**
 * Modern Color Generator Emblem:
 * Radiant chromatic prism with harmonious multi-spectrum aperture ring.
 */
export function ColorGenIcon({ size = 24, className = '', glow = false }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={glow ? { filter: 'drop-shadow(0 0 10px rgba(0, 223, 129, 0.4))' } : undefined}
    >
      <defs>
        <linearGradient id="spectrum-ring" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00df81" />
          <stop offset="25%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="75%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>

      {/* Outer segmented color dial */}
      <circle cx="24" cy="24" r="18" stroke="url(#spectrum-ring)" strokeWidth="3" strokeLinecap="round" strokeDasharray="18 4" />

      {/* Inner Chromatic Diamond Prism */}
      <polygon points="24,10 37,24 24,38 11,24" fill="rgba(255, 255, 255, 0.04)" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1.5" />
      
      {/* Light Refraction Beams */}
      <path d="M24 10L24 38" stroke="rgba(0, 223, 129, 0.6)" strokeWidth="1.5" strokeDasharray="2 2" />
      <path d="M11 24L37 24" stroke="rgba(56, 189, 248, 0.6)" strokeWidth="1.5" strokeDasharray="2 2" />

      {/* Core Seed Swatch */}
      <circle cx="24" cy="24" r="5" fill="#00df81" />
      <circle cx="24" cy="24" r="2" fill="#090c12" />
    </svg>
  );
}

/**
 * Modern Pomodoro Timer Emblem:
 * Aerodynamic focal chronometer with precision radial segment track.
 */
export function PomodoroIcon({ size = 24, className = '', glow = false }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={glow ? { filter: 'drop-shadow(0 0 10px rgba(0, 223, 129, 0.45))' } : undefined}
    >
      <defs>
        <linearGradient id="pomo-grad" x1="12" y1="8" x2="36" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00df81" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>

      {/* Outer Dial Track */}
      <circle cx="24" cy="26" r="16" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="2.5" />
      {/* Active 25-min arc progress */}
      <path
        d="M24 10A16 16 0 1 1 10 32"
        stroke="url(#pomo-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Top Stopwatch Stopper */}
      <path d="M21 5H27" stroke="url(#pomo-grad)" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 5V8" stroke="url(#pomo-grad)" strokeWidth="2" />
      <path d="M34 9L36 7" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="2" strokeLinecap="round" />

      {/* Focal Target Cross & Needle */}
      <circle cx="24" cy="26" r="3" fill="#00df81" />
      <path d="M24 26L31 19" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      
      {/* Precision Tick Marks */}
      <circle cx="24" cy="14" r="1" fill="#00df81" />
      <circle cx="36" cy="26" r="1" fill="rgba(255, 255, 255, 0.4)" />
      <circle cx="24" cy="38" r="1" fill="rgba(255, 255, 255, 0.4)" />
      <circle cx="12" cy="26" r="1" fill="rgba(255, 255, 255, 0.4)" />
    </svg>
  );
}

/**
 * Modern SQL Playground Emblem:
 * Relational quantum ledger & query engine terminal.
 */
export function SQLIcon({ size = 24, className = '', glow = false }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={glow ? { filter: 'drop-shadow(0 0 10px rgba(0, 223, 129, 0.4))' } : undefined}
    >
      <defs>
        <linearGradient id="sql-grad" x1="10" y1="8" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00df81" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>

      {/* Database Cylinder Stack 1 */}
      <ellipse cx="24" cy="13" rx="14" ry="4.5" fill="rgba(0, 223, 129, 0.12)" stroke="url(#sql-grad)" strokeWidth="1.8" />
      
      {/* Tier 2 */}
      <path d="M10 13V22C10 24.5 16.3 26.5 24 26.5C31.7 26.5 38 24.5 38 22V13" stroke="url(#sql-grad)" strokeWidth="1.8" />
      
      {/* Tier 3 */}
      <path d="M10 22V31C10 33.5 16.3 35.5 24 35.5C31.7 35.5 38 33.5 38 31V22" stroke="url(#sql-grad)" strokeWidth="1.8" />

      {/* Query Terminal Prompt Accent */}
      <path d="M17 21L21 24L17 27" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="23" y1="27" x2="27" y2="27" stroke="#00df81" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Modern Bookmark Manager Emblem:
 * Geometric magnetic prism bookmark with star telemetry.
 */
export function BookmarkIcon({ size = 24, className = '', glow = false }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={glow ? { filter: 'drop-shadow(0 0 10px rgba(0, 223, 129, 0.4))' } : undefined}
    >
      <defs>
        <linearGradient id="bm-grad" x1="14" y1="6" x2="34" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00df81" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>

      {/* Outer Ribbon Geometry */}
      <path
        d="M14 8C14 6.89543 14.8954 6 16 6H32C33.1046 6 34 6.89543 34 8V40L24 32L14 40V8Z"
        fill="rgba(0, 223, 129, 0.08)"
        stroke="url(#bm-grad)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Inner Geometric Fold Lines */}
      <path d="M14 8L24 16L34 8" stroke="rgba(255, 255, 255, 0.18)" strokeWidth="1.5" />
      <path d="M24 16V32" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" strokeDasharray="2 2" />

      {/* Star Beacon */}
      <polygon
        points="24,19 25.5,23 29.5,23.5 26.5,26.2 27.4,30.2 24,28 20.6,30.2 21.5,26.2 18.5,23.5 22.5,23"
        fill="#00df81"
      />
    </svg>
  );
}

/**
 * Modern Agent Swarm Emblem:
 * Autonomous multi-node neural constellation mesh.
 */
export function AgentSwarmIcon({ size = 24, className = '', glow = false }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={glow ? { filter: 'drop-shadow(0 0 10px rgba(0, 223, 129, 0.45))' } : undefined}
    >
      <defs>
        <linearGradient id="swarm-grad" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00df81" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>

      {/* Synaptic Mesh Lines */}
      <line x1="24" y1="10" x2="37" y2="19" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1.5" />
      <line x1="37" y1="19" x2="33" y2="35" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1.5" />
      <line x1="33" y1="35" x2="15" y2="35" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1.5" />
      <line x1="15" y1="35" x2="11" y2="19" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1.5" />
      <line x1="11" y1="19" x2="24" y2="10" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1.5" />

      {/* Internal Cross Links */}
      <line x1="24" y1="10" x2="24" y2="24" stroke="url(#swarm-grad)" strokeWidth="1.8" />
      <line x1="11" y1="19" x2="24" y2="24" stroke="url(#swarm-grad)" strokeWidth="1.8" />
      <line x1="37" y1="19" x2="24" y2="24" stroke="url(#swarm-grad)" strokeWidth="1.8" />
      <line x1="15" y1="35" x2="24" y2="24" stroke="url(#swarm-grad)" strokeWidth="1.8" />
      <line x1="33" y1="35" x2="24" y2="24" stroke="url(#swarm-grad)" strokeWidth="1.8" />

      {/* Orchestrator Center Node */}
      <circle cx="24" cy="24" r="5" fill="#090c12" stroke="#00df81" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="2" fill="#00df81" />

      {/* Autonomous Peripheral Agents */}
      <circle cx="24" cy="10" r="3" fill="#38bdf8" />
      <circle cx="37" cy="19" r="3" fill="#00df81" />
      <circle cx="33" cy="35" r="3" fill="#a855f7" />
      <circle cx="15" cy="35" r="3" fill="#00df81" />
      <circle cx="11" cy="19" r="3" fill="#38bdf8" />
    </svg>
  );
}

/**
 * Modern Notepad Emblem:
 * Digital drafting slate with emerald editorial spark.
 */
export function NotepadIcon({ size = 24, className = '', glow = false }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={glow ? { filter: 'drop-shadow(0 0 10px rgba(0, 223, 129, 0.4))' } : undefined}
    >
      <defs>
        <linearGradient id="np-grad" x1="12" y1="6" x2="36" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00df81" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>

      {/* Paper / Slate Card */}
      <rect x="11" y="7" width="26" height="34" rx="4" fill="rgba(255, 255, 255, 0.03)" stroke="url(#np-grad)" strokeWidth="1.8" />

      {/* Top Fold */}
      <path d="M28 7V13H37" stroke="url(#np-grad)" strokeWidth="1.8" strokeLinejoin="round" />

      {/* Content Text Lines */}
      <line x1="17" y1="18" x2="25" y2="18" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <line x1="17" y1="24" x2="31" y2="24" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="17" y1="30" x2="28" y2="30" stroke="rgba(255, 255, 255, 0.45)" strokeWidth="1.6" strokeLinecap="round" />

      {/* Active Drafting Spark / Pen Tip */}
      <circle cx="32" cy="34" r="4" fill="#090c12" stroke="#00df81" strokeWidth="1.8" />
      <circle cx="32" cy="34" r="1.5" fill="#00df81" />
    </svg>
  );
}

/**
 * Modern Todo List Emblem:
 * Milestone achievement shield with crisp geometric check glyph.
 */
export function TodoIcon({ size = 24, className = '', glow = false }: ToolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={glow ? { filter: 'drop-shadow(0 0 10px rgba(0, 223, 129, 0.4))' } : undefined}
    >
      <defs>
        <linearGradient id="todo-grad" x1="10" y1="8" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00df81" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>

      {/* Outer Rounded Shield / Frame */}
      <rect x="9" y="9" width="30" height="30" rx="9" fill="rgba(0, 223, 129, 0.06)" stroke="url(#todo-grad)" strokeWidth="2" />

      {/* Progress Notch Indicators */}
      <circle cx="16" cy="16" r="1.5" fill="rgba(255, 255, 255, 0.3)" />
      <circle cx="32" cy="16" r="1.5" fill="rgba(255, 255, 255, 0.3)" />

      {/* Precision Verified Checkmark */}
      <path
        d="M17 24.5L22 29.5L31 18.5"
        stroke="#00df81"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
