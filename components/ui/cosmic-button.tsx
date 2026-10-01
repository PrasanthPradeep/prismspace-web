/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
"use client";

import React, { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Animated button/link with a cosmic rotating gradient border effect aligned with
 * PrismSpace's canonical Electric Mint (#00df81) and Obsidian (#090c12) color palette.
 * Keyframes and GPU layer acceleration configured for flicker-free 60fps rendering.
 */

export type CosmicButtonProps<E extends "a" | "button" = "button"> = {
  /** The HTML element to render as. @default "button" */
  as?: E;
} & ComponentPropsWithoutRef<E>;

export const CosmicButton = forwardRef<HTMLElement, CosmicButtonProps<any>>(
  function CosmicButton(
    { as, className, children, style, ...props },
    ref
  ) {
    const Element = as ?? "button";
    const isAnchor = Element === "a";

    // Separate outer layout classes from padding classes so external px/py
    // styles never blow out or distort the uniform 1.5px gradient border ring.
    const classTokens = (className || "").split(/\s+/).filter(Boolean);
    const paddingTokens = classTokens.filter((c: string) =>
      /^p[xyltrb]?-/.test(c) || /^p-/.test(c)
    );
    const nonPaddingTokens = classTokens.filter((c: string) =>
      !/^p[xyltrb]?-/.test(c) && !/^p-/.test(c)
    );

    const baseClassName = cn(
      "group/cosmic relative inline-flex items-center justify-center rounded-[8px] cursor-pointer select-none",
      "transition-all duration-200 ease-out",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00df81] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#090c12]",
      "disabled:pointer-events-none disabled:opacity-50",
      "hover:shadow-[0_0_16px_rgba(0,223,129,0.35)] active:scale-[0.98]",
      nonPaddingTokens
    );

    const innerPaddingClass = paddingTokens.length > 0 ? paddingTokens.join(" ") : "px-3.5 py-1";

    const content = (
      <>
        {/* Animated cosmic mint border - strictly pointer-events-none and static inset-0 */}
        <span
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[8px]"
          style={{ transform: "translateZ(0)" }}
        >
          <span
            className="absolute inset-[-200%] animate-cosmic-spin bg-[conic-gradient(from_0deg,#00df81,#2ae89b,#80ffd2,#05b768,#036437,#10b981,#00df81)] opacity-95"
            style={{ willChange: "transform", transform: "translateZ(0)" }}
          />
        </span>

        {/* Secondary ambient mint overlay */}
        <span
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-[8px] opacity-40 transition-opacity duration-200 group-hover/cosmic:opacity-80"
          style={{ transform: "translateZ(0)" }}
        >
          <span
            className="absolute inset-[-200%] animate-cosmic-spin-slow bg-[conic-gradient(from_180deg,#80ffd2_0%,transparent_35%,#00df81_55%,transparent_75%,#059669_100%)]"
            style={{ willChange: "transform", transform: "translateZ(0)" }}
          />
        </span>

        {/* Theme-aware inner obsidian background - flexes cleanly to container */}
        <span
          className={cn(
            "relative z-10 flex h-full w-full items-center justify-center gap-1.5 rounded-[6.5px] bg-[#090c12] text-inherit shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.5),0_1px_2px_rgba(0,0,0,0.45)] transition-all duration-200 group-hover/cosmic:bg-[#0c1219] group-hover/cosmic:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.6),0_2px_6px_rgba(0,0,0,0.55)]",
            innerPaddingClass
          )}
        >
          <span className="font-['Space_Grotesk',sans-serif] font-bold text-inherit tracking-wide text-white group-hover/cosmic:text-[#00df81] transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
            {children ?? "Button"}
          </span>
        </span>
      </>
    );

    const buttonStyle = {
      padding: "1.5px",
      ...style,
    };

    if (isAnchor) {
      const { href, rel, target, ...rest } = props as ComponentPropsWithoutRef<"a">;
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={baseClassName}
          style={buttonStyle}
          href={href ?? "#"}
          rel={rel ?? "noopener noreferrer"}
          target={target}
          {...rest}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={(props as any).type ?? "button"}
        className={baseClassName}
        style={buttonStyle}
        {...(props as ComponentPropsWithoutRef<"button">)}
      >
        {content}
      </button>
    );
  }
);

CosmicButton.displayName = "CosmicButton";

export default CosmicButton;
