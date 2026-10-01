/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import React, { useId } from 'react';

export type ModernIconVariant = 'cyber' | 'prism' | 'minimal' | 'zenith' | 'mono' | 'matrix' | 'phantom';

export interface ModernUserIconProps {
  variant?: ModernIconVariant | string;
  size?: number | string;
  className?: string;
  showGlow?: boolean;
}

export function ModernUserIcon({
  variant = 'cyber',
  size = 36,
  className = 'w-full h-full',
}: ModernUserIconProps) {
  const rawId = useId();
  const id = rawId.replace(/[:/]/g, '-');
  const normalizedVariant = (variant?.startsWith('modern:')
    ? variant.replace('modern:', '')
    : variant) as ModernIconVariant;

  switch (normalizedVariant) {
    case 'zenith':
      return (
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={size}
          height={size}
        >
          <defs>
            <radialGradient id={`${id}-zen-bg`} cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#111622" />
              <stop offset="100%" stopColor="#05070a" />
            </radialGradient>
            <linearGradient id={`${id}-zen-head`} x1="18" y1="8" x2="18" y2="19" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
            <linearGradient id={`${id}-zen-torso`} x1="18" y1="22" x2="18" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#090d16" />
            </linearGradient>
          </defs>

          {/* Deep Obsidian Background */}
          <circle cx="18" cy="18" r="18" fill={`url(#${id}-zen-bg)`} />
          <circle cx="18" cy="18" r="17.25" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.75" />

          {/* Torso */}
          <path
            d="M 8.5 32.5 C 8.5 26.2 13 22.8 18 22.8 C 23 22.8 27.5 26.2 27.5 32.5 C 27.5 33 27 33.5 26.5 33.5 L 9.5 33.5 C 9 33.5 8.5 33 8.5 32.5 Z"
            fill={`url(#${id}-zen-torso)`}
          />

          {/* Subtle Electric Mint Collar Accent Arc */}
          <path
            d="M 14.5 23.5 C 15.5 24.8 16.7 25.4 18 25.4 C 19.3 25.4 20.5 24.8 21.5 23.5"
            stroke="#00df81"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Head */}
          <circle cx="18" cy="13.2" r="5.2" fill={`url(#${id}-zen-head)`} />
        </svg>
      );

    case 'mono':
      return (
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={size}
          height={size}
        >
          <defs>
            <radialGradient id={`${id}-mono-bg`} cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#141923" />
              <stop offset="100%" stopColor="#07090e" />
            </radialGradient>
          </defs>

          {/* Deep Obsidian Background */}
          <circle cx="18" cy="18" r="18" fill={`url(#${id}-mono-bg)`} />
          <circle cx="18" cy="18" r="17.25" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="0.75" />

          {/* Minimalist Stroke Torso */}
          <path
            d="M 9.5 32.5 C 9.5 26.2 13.2 23 18 23 C 22.8 23 26.5 26.2 26.5 32.5"
            stroke="#e2e8f0"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Minimalist Stroke Head */}
          <circle cx="18" cy="13.5" r="4.8" stroke="#ffffff" strokeWidth="1.5" />

          {/* Single Electric Mint Core Dot */}
          <circle cx="18" cy="13.5" r="1.5" fill="#00df81" />
        </svg>
      );

    case 'minimal':
      return (
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={size}
          height={size}
        >
          <defs>
            <radialGradient id={`${id}-min-bg`} cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#1e2433" />
              <stop offset="100%" stopColor="#0b0e14" />
            </radialGradient>
            <linearGradient id={`${id}-min-body`} x1="18" y1="8" x2="18" y2="33" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
          </defs>

          <circle cx="18" cy="18" r="18" fill={`url(#${id}-min-bg)`} />
          <circle cx="18" cy="18" r="17" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="0.75" />

          {/* Torso */}
          <path
            d="M 8.5 32.5 C 8.5 26.2 13.2 23 18 23 C 22.8 23 27.5 26.2 27.5 32.5 C 27.5 33 27 33.5 26.5 33.5 L 9.5 33.5 C 9 33.5 8.5 33 8.5 32.5 Z"
            fill={`url(#${id}-min-body)`}
          />

          {/* Head */}
          <circle cx="18" cy="13.5" r="5.5" fill={`url(#${id}-min-body)`} />

          {/* Status pill dot */}
          <circle cx="26" cy="26" r="2.5" fill="#00df81" stroke="#0b0e14" strokeWidth="1" />
        </svg>
      );

    case 'prism':
      return (
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={size}
          height={size}
        >
          <defs>
            <radialGradient id={`${id}-prism-bg`} cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#15102a" />
              <stop offset="100%" stopColor="#080712" />
            </radialGradient>
            <linearGradient id={`${id}-prism-grad`} x1="8" y1="8" x2="28" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00df81" />
              <stop offset="48%" stopColor="#00d2ff" />
              <stop offset="100%" stopColor="#b5179e" />
            </linearGradient>
            <linearGradient id={`${id}-prism-sheen`} x1="18" y1="7" x2="18" y2="19" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Background */}
          <circle cx="18" cy="18" r="18" fill={`url(#${id}-prism-bg)`} />

          {/* Hologram halo ring */}
          <circle
            cx="18"
            cy="18"
            r="16.5"
            stroke={`url(#${id}-prism-grad)`}
            strokeOpacity="0.4"
            strokeWidth="0.8"
          />

          {/* Torso */}
          <path
            d="M 8.5 32.5 C 8.5 25.8 13.2 22.8 18 22.8 C 22.8 22.8 27.5 25.8 27.5 32.5 C 27.5 33 27 33.5 26.5 33.5 L 9.5 33.5 C 9 33.5 8.5 33 8.5 32.5 Z"
            fill={`url(#${id}-prism-grad)`}
          />

          {/* Head */}
          <circle cx="18" cy="13.2" r="5.5" fill={`url(#${id}-prism-grad)`} />
          {/* Glass specular sheen */}
          <circle cx="18" cy="13.2" r="5.5" fill={`url(#${id}-prism-sheen)`} />
          <circle cx="16.2" cy="11.2" r="1.3" fill="#ffffff" fillOpacity="0.5" />
        </svg>
      );

    case 'matrix':
      return (
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={size}
          height={size}
        >
          <defs>
            <radialGradient id={`${id}-mat-bg`} cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#041a0e" />
              <stop offset="100%" stopColor="#010603" />
            </radialGradient>
          </defs>

          <circle cx="18" cy="18" r="18" fill={`url(#${id}-mat-bg)`} />

          {/* Tech dots */}
          <circle cx="9" cy="9" r="0.7" fill="#00df81" fillOpacity="0.35" />
          <circle cx="18" cy="5" r="0.7" fill="#00df81" fillOpacity="0.35" />
          <circle cx="27" cy="9" r="0.7" fill="#00df81" fillOpacity="0.35" />
          <circle cx="5" cy="18" r="0.7" fill="#00df81" fillOpacity="0.35" />
          <circle cx="31" cy="18" r="0.7" fill="#00df81" fillOpacity="0.35" />

          {/* Torso Wireframe */}
          <path
            d="M 9 32.5 C 9 26.5 13.2 23.2 18 23.2 C 22.8 23.2 27 26.5 27 32.5"
            stroke="#00df81"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M 12 33 C 12 28.5 14.8 26 18 26 C 21.2 26 24 28.5 24 33"
            stroke="#00df81"
            strokeWidth="0.8"
            strokeOpacity="0.6"
          />

          {/* Head Wireframe & Core */}
          <circle cx="18" cy="13.5" r="5.2" stroke="#00df81" strokeWidth="1.2" />
          <circle cx="18" cy="13.5" r="2.2" fill="#00df81" fillOpacity="0.8" />
          {/* Data transmission line */}
          <line x1="18" y1="18.7" x2="18" y2="23.2" stroke="#00df81" strokeWidth="1" strokeDasharray="1 1" />
        </svg>
      );

    case 'phantom':
      return (
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={size}
          height={size}
        >
          <defs>
            <radialGradient id={`${id}-ph-bg`} cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#181e28" />
              <stop offset="100%" stopColor="#080a0f" />
            </radialGradient>
            <filter id={`${id}-ph-glow`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <circle cx="18" cy="18" r="18" fill={`url(#${id}-ph-bg)`} />
          <circle cx="18" cy="18" r="16.8" stroke="#38bdf8" strokeOpacity="0.3" strokeWidth="0.8" />

          {/* Torso */}
          <path
            d="M 8.5 32.5 C 8.5 26.2 13.2 23 18 23 C 22.8 23 27.5 26.2 27.5 32.5 C 27.5 33 27 33.5 26.5 33.5 L 9.5 33.5 C 9 33.5 8.5 33 8.5 32.5 Z"
            fill="#0f172a"
            stroke="#38bdf8"
            strokeWidth="1.1"
            filter={`url(#${id}-ph-glow)`}
          />

          {/* Head */}
          <circle
            cx="18"
            cy="13.5"
            r="5.5"
            fill="#0f172a"
            stroke="#38bdf8"
            strokeWidth="1.1"
            filter={`url(#${id}-ph-glow)`}
          />

          {/* Visor */}
          <line x1="14.5" y1="13.5" x2="21.5" y2="13.5" stroke="#38bdf8" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="15" y1="13.5" x2="21" y2="13.5" stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" />
        </svg>
      );

    case 'cyber':
    default:
      return (
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          width={size}
          height={size}
        >
          <defs>
            <radialGradient id={`${id}-cyber-bg`} cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#0d2818" />
              <stop offset="60%" stopColor="#08141e" />
              <stop offset="100%" stopColor="#03070d" />
            </radialGradient>
            <linearGradient id={`${id}-cyber-head`} x1="18" y1="7" x2="18" y2="19" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id={`${id}-cyber-body`} x1="18" y1="21" x2="18" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#090d16" />
            </linearGradient>
            <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="0.8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background */}
          <circle cx="18" cy="18" r="18" fill={`url(#${id}-cyber-bg)`} />

          {/* Tech HUD ring */}
          <circle
            cx="18"
            cy="18"
            r="16.5"
            stroke="#00df81"
            strokeOpacity="0.25"
            strokeWidth="0.75"
            strokeDasharray="3 2"
          />

          {/* Tech ticks */}
          <line x1="18" y1="1.5" x2="18" y2="3.5" stroke="#00df81" strokeOpacity="0.5" strokeWidth="1" />
          <line x1="18" y1="32.5" x2="18" y2="34.5" stroke="#00df81" strokeOpacity="0.5" strokeWidth="1" />

          {/* Torso / Shoulders */}
          <path
            d="M 8.5 32.5 C 8.5 26.2 13 22.8 18 22.8 C 23 22.8 27.5 26.2 27.5 32.5 C 27.5 33 27 33.5 26.5 33.5 L 9.5 33.5 C 9 33.5 8.5 33 8.5 32.5 Z"
            fill={`url(#${id}-cyber-body)`}
            stroke="#00df81"
            strokeOpacity="0.35"
            strokeWidth="0.8"
          />

          {/* Collar seam */}
          <path d="M 18 22.8 L 18 26.5" stroke="#00df81" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.8" />
          <circle cx="13" cy="27.5" r="0.8" fill="#00df81" fillOpacity="0.7" />
          <circle cx="23" cy="27.5" r="0.8" fill="#00df81" fillOpacity="0.7" />

          {/* Head */}
          <circle
            cx="18"
            cy="13.2"
            r="5.5"
            fill={`url(#${id}-cyber-head)`}
            stroke="#00df81"
            strokeOpacity="0.4"
            strokeWidth="0.8"
          />

          {/* Glowing Neon Visor */}
          <rect
            x="14"
            y="12.2"
            width="8"
            height="2"
            rx="1"
            fill="#00df81"
            filter={`url(#${id}-glow)`}
          />
          {/* Visor reflection glint */}
          <circle cx="15.8" cy="13.2" r="0.55" fill="#ffffff" />
        </svg>
      );
  }
}

export function getModernIconSvgDataUri(variant: string = 'cyber'): string {
  const norm = variant?.startsWith('modern:') ? variant.replace('modern:', '') : variant;
  switch (norm) {
    case 'zenith':
      return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'><circle cx='18' cy='18' r='18' fill='%2305070a'/><circle cx='18' cy='18' r='17.25' stroke='rgba(255,255,255,0.08)' stroke-width='0.75'/><path d='M8.5 32.5 C8.5 26.2 13 22.8 18 22.8 C23 22.8 27.5 26.2 27.5 32.5 Z' fill='%231e293b'/><path d='M14.5 23.5 C15.5 24.8 16.7 25.4 18 25.4 C19.3 25.4 20.5 24.8 21.5 23.5' stroke='%2300df81' stroke-width='1.2' stroke-linecap='round'/><circle cx='18' cy='13.2' r='5.2' fill='%23f1f5f9'/></svg>`;
    case 'mono':
      return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'><circle cx='18' cy='18' r='18' fill='%2307090e'/><circle cx='18' cy='18' r='17.25' stroke='rgba(255,255,255,0.06)' stroke-width='0.75'/><path d='M9.5 32.5 C9.5 26.2 13.2 23 18 23 C22.8 23 26.5 26.2 26.5 32.5' stroke='%23e2e8f0' stroke-width='1.5' stroke-linecap='round'/><circle cx='18' cy='13.5' r='4.8' stroke='%23ffffff' stroke-width='1.5'/><circle cx='18' cy='13.5' r='1.5' fill='%2300df81'/></svg>`;
    case 'prism':
      return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'><linearGradient id='pg' x1='8' y1='8' x2='28' y2='32'><stop offset='0%' stop-color='%2300df81'/><stop offset='50%' stop-color='%2300d2ff'/><stop offset='100%' stop-color='%23b5179e'/></linearGradient><circle cx='18' cy='18' r='18' fill='%23080712'/><circle cx='18' cy='18' r='16.5' stroke='url(%23pg)' stroke-opacity='0.4' stroke-width='0.8'/><path d='M8.5 32.5 C8.5 25.8 13.2 22.8 18 22.8 C22.8 22.8 27.5 25.8 27.5 32.5 Z' fill='url(%23pg)'/><circle cx='18' cy='13.2' r='5.5' fill='url(%23pg)'/><circle cx='16.2' cy='11.2' r='1.3' fill='%23fff' fill-opacity='0.5'/></svg>`;
    case 'minimal':
      return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'><circle cx='18' cy='18' r='18' fill='%230b0e14'/><circle cx='18' cy='18' r='17' stroke='rgba(255,255,255,0.12)' stroke-width='0.75'/><path d='M8.5 32.5 C8.5 26.2 13.2 23 18 23 C22.8 23 27.5 26.2 27.5 32.5 Z' fill='%23cbd5e1'/><circle cx='18' cy='13.5' r='5.5' fill='%23cbd5e1'/><circle cx='26' cy='26' r='2.5' fill='%2300df81'/></svg>`;
    case 'matrix':
      return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'><circle cx='18' cy='18' r='18' fill='%23010603'/><path d='M9 32.5 C9 26.5 13.2 23.2 18 23.2 C22.8 23.2 27 26.5 27 32.5' stroke='%2300df81' stroke-width='1.2'/><circle cx='18' cy='13.5' r='5.2' stroke='%2300df81' stroke-width='1.2'/><circle cx='18' cy='13.5' r='2.2' fill='%2300df81'/></svg>`;
    case 'phantom':
      return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'><circle cx='18' cy='18' r='18' fill='%23080a0f'/><path d='M8.5 32.5 C8.5 26.2 13.2 23 18 23 C22.8 23 27.5 26.2 27.5 32.5 Z' fill='%230f172a' stroke='%2338bdf8' stroke-width='1.1'/><circle cx='18' cy='13.5' r='5.5' fill='%230f172a' stroke='%2338bdf8' stroke-width='1.1'/><line x1='14.5' y1='13.5' x2='21.5' y2='13.5' stroke='%2338bdf8' stroke-width='1.4'/></svg>`;
    case 'cyber':
    default:
      return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'><radialGradient id='cbg' cx='50%' cy='30%' r='70%'><stop offset='0%' stop-color='%230d2818'/><stop offset='60%' stop-color='%2308141e'/><stop offset='100%' stop-color='%2303070d'/></radialGradient><circle cx='18' cy='18' r='18' fill='url(%23cbg)'/><circle cx='18' cy='18' r='16.5' stroke='%2300df81' stroke-opacity='0.25' stroke-width='0.75' stroke-dasharray='3 2'/><path d='M8.5 32.5 C8.5 26.2 13 22.8 18 22.8 C23 22.8 27.5 26.2 27.5 32.5 Z' fill='%231e293b' stroke='%2300df81' stroke-opacity='0.4' stroke-width='0.8'/><path d='M18 22.8 L18 26.5' stroke='%2300df81' stroke-width='1'/><circle cx='18' cy='13.2' r='5.5' fill='%230f172a' stroke='%2300df81' stroke-opacity='0.4' stroke-width='0.8'/><rect x='14' y='12.2' width='8' height='2' rx='1' fill='%2300df81'/><circle cx='15.8' cy='13.2' r='0.55' fill='%23fff'/></svg>`;
  }
}
