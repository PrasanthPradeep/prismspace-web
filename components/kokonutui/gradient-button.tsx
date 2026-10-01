/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
"use client";

import React from "react";
import { cn } from "@/lib/utils";

type ColorVariant = "emerald" | "purple" | "orange";

interface GradientColors {
  dark: {
    border: string;
    overlay: string;
    accent: string;
    text: string;
    glow: string;
    textGlow: string;
    hover: string;
  };
  light: {
    border: string;
    base: string;
    overlay: string;
    accent: string;
    text: string;
    glow: string;
    hover: string;
  };
}

export interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  label?: string;
  className?: string;
  variant?: ColorVariant;
  loading?: boolean;
}

const gradientColors: Record<ColorVariant, GradientColors> = {
  emerald: {
    dark: {
      border: "from-[#00df81] via-[#06190e] to-[#00df81]/70",
      overlay: "from-[#00df81]/30 via-[#090c12] to-[#00df81]/20",
      accent: "from-[#00df81]/20 via-[#090c12] to-[#06190e]/60",
      text: "from-[#00df81] to-[#87f6b7]",
      glow: "rgba(0,223,129,0.25)",
      textGlow: "rgba(0,223,129,0.6)",
      hover: "from-[#00df81]/25 via-[#00df81]/15 to-[#06190e]/40",
    },
    light: {
      border: "from-emerald-400 via-emerald-300 to-emerald-200",
      base: "from-emerald-50 via-emerald-50/80 to-emerald-50/90",
      overlay: "from-emerald-300/30 via-emerald-200/20 to-emerald-400/20",
      accent: "from-emerald-400/20 via-emerald-300/10 to-emerald-200/30",
      text: "from-emerald-700 to-emerald-600",
      glow: "rgba(0,223,129,0.2)",
      hover: "from-emerald-300/30 via-emerald-200/20 to-emerald-300/30",
    },
  },
  purple: {
    dark: {
      border: "from-[#a855f7] via-[#090c12] to-[#7e22ce]",
      overlay: "from-[#a855f7]/30 via-[#090c12] to-[#7e22ce]/20",
      accent: "from-[#e9d8fd]/15 via-[#090c12] to-[#44337a]/50",
      text: "from-[#e9d8fd] to-[#d6bcfa]",
      glow: "rgba(168,85,247,0.25)",
      textGlow: "rgba(168,85,247,0.6)",
      hover: "from-[#7e22ce]/20 via-[#a855f7]/15 to-[#44337a]/20",
    },
    light: {
      border: "from-purple-400 via-purple-300 to-purple-200",
      base: "from-purple-50 via-purple-50/80 to-purple-50/90",
      overlay: "from-purple-300/30 via-purple-200/20 to-purple-400/20",
      accent: "from-purple-400/20 via-purple-300/10 to-purple-200/30",
      text: "from-purple-700 to-purple-600",
      glow: "rgba(159,122,234,0.2)",
      hover: "from-purple-300/30 via-purple-200/20 to-purple-300/30",
    },
  },
  orange: {
    dark: {
      border: "from-[#f97316] via-[#090c12] to-[#c2410c]",
      overlay: "from-[#f97316]/30 via-[#090c12] to-[#c2410c]/20",
      accent: "from-[#fed7aa]/15 via-[#090c12] to-[#7c2d12]/50",
      text: "from-[#fed7aa] to-[#fbd38d]",
      glow: "rgba(249,115,22,0.25)",
      textGlow: "rgba(249,115,22,0.6)",
      hover: "from-[#c2410c]/20 via-[#f97316]/15 to-[#7c2d12]/20",
    },
    light: {
      border: "from-orange-400 via-orange-300 to-orange-200",
      base: "from-orange-50 via-orange-50/80 to-orange-50/90",
      overlay: "from-orange-300/30 via-orange-200/20 to-orange-400/20",
      accent: "from-orange-400/20 via-orange-300/10 to-orange-200/30",
      text: "from-orange-700 to-orange-600",
      glow: "rgba(237,137,54,0.2)",
      hover: "from-orange-300/30 via-orange-200/20 to-orange-300/30",
    },
  },
};

export const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  (
    {
      label = "Button",
      children,
      className,
      variant = "emerald",
      icon,
      loading = false,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const colors = gradientColors[variant];
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          "group relative inline-flex h-11 items-center justify-center overflow-hidden rounded-xl px-5 transition-all duration-300 cursor-pointer select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00df81]/50",
          "disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]",
          className
        )}
        {...props}
      >
        {/* Outer glowing border frame */}
        <div
          className={cn(
            "absolute inset-0 rounded-xl bg-gradient-to-b p-[1.5px] transition-all duration-300",
            colors.light.border,
            colors.dark.border
          )}
        >
          <div
            className={cn(
              "absolute inset-0 rounded-xl opacity-90",
              "bg-white/80 dark:bg-[#090c12]"
            )}
          />
        </div>

        {/* Base dark fill */}
        <div
          className={cn(
            "absolute inset-[1.5px] rounded-[10px] opacity-95",
            "bg-white/80 dark:bg-[#090c12]"
          )}
        />

        {/* Dynamic color layers */}
        <div
          className={cn(
            "absolute inset-[1.5px] rounded-[10px] bg-gradient-to-r opacity-90",
            colors.light.base,
            "dark:from-[#090c12] dark:via-[#090c12] dark:to-[#06190e]"
          )}
        />
        <div
          className={cn(
            "absolute inset-[1.5px] rounded-[10px] bg-gradient-to-b opacity-80",
            colors.light.overlay,
            colors.dark.overlay
          )}
        />
        <div
          className={cn(
            "absolute inset-[1.5px] rounded-[10px] bg-gradient-to-br",
            colors.light.accent,
            colors.dark.accent
          )}
        />

        {/* Inner ambient glow */}
        <div
          className={cn(
            "absolute inset-[1.5px] rounded-[10px]",
            `shadow-[inset_0_0_12px_${colors.light.glow}]`,
            `dark:shadow-[inset_0_0_14px_${colors.dark.glow}]`
          )}
        />

        {/* Foreground label and icon */}
        <div className="relative z-10 flex items-center justify-center gap-2">
          {loading ? (
            <svg
              className="animate-spin h-4 w-4 text-[#00df81]"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : icon ? (
            <span className="shrink-0">{icon}</span>
          ) : null}
          <span
            className={cn(
              "bg-gradient-to-b bg-clip-text font-bold text-sm tracking-wider text-transparent inline-flex items-center gap-2",
              colors.light.text,
              colors.dark.text,
              `dark:drop-shadow-[0_0_10px_${colors.dark.textGlow}]`
            )}
          >
            {children ?? label}
          </span>
        </div>

        {/* Hover highlight shimmer */}
        <div
          className={cn(
            "absolute inset-[1.5px] rounded-[10px] bg-gradient-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100",
            colors.light.hover,
            colors.dark.hover
          )}
        />
      </button>
    );
  }
);

GradientButton.displayName = "GradientButton";

export default GradientButton;
