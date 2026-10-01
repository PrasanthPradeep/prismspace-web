/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
"use client";

import React from "react";
import { CosmicButton, type CosmicButtonProps } from "./cosmic-button";

export * from "./cosmic-button";

export interface RainbowButtonProps extends Omit<CosmicButtonProps<"button">, "as"> {
  as?: "button" | "a";
  variant?: string;
  size?: string;
}

/**
 * RainbowButton delegates directly to CosmicButton for the sleek rotating cosmic gradient border effect.
 */
export const RainbowButton = React.forwardRef<HTMLButtonElement, RainbowButtonProps>(
  ({ variant, size, ...props }, ref) => {
    return <CosmicButton ref={ref as any} as="button" {...(props as any)} />;
  }
);

RainbowButton.displayName = "RainbowButton";

export default RainbowButton;
