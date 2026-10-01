/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
"use client";

import { cn } from "@/lib/utils";
import React, { useCallback, useEffect, useRef } from "react";
import { motion, useAnimate, type HTMLMotionProps } from "motion/react";

export interface StatefulButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  className?: string;
  children: React.ReactNode;
  loading?: boolean;
  success?: boolean;
}

export const Button = ({
  className,
  children,
  loading,
  success,
  disabled,
  style,
  ...props
}: StatefulButtonProps) => {
  const [scope, animate] = useAnimate();
  const prevLoadingRef = useRef(false);

  const animateLoading = useCallback(async () => {
    try {
      await animate(
        ".check",
        {
          width: "0px",
          height: "0px",
          opacity: 0,
          scale: 0,
          display: "none",
        },
        {
          duration: 0.1,
        },
      );
      await animate(
        ".loader",
        {
          width: "18px",
          height: "18px",
          opacity: 1,
          scale: 1,
          display: "inline-block",
        },
        {
          duration: 0.2,
        },
      );
    } catch {
      // Ignore if unmounted
    }
  }, [animate]);

  const animateSuccess = useCallback(async () => {
    try {
      await animate(
        ".loader",
        {
          width: "0px",
          height: "0px",
          opacity: 0,
          scale: 0,
          display: "none",
        },
        {
          duration: 0.15,
        },
      );
      await animate(
        ".check",
        {
          width: "18px",
          height: "18px",
          opacity: 1,
          scale: 1,
          display: "inline-block",
        },
        {
          duration: 0.2,
        },
      );

      await animate(
        ".check",
        {
          width: "0px",
          height: "0px",
          opacity: 0,
          scale: 0,
          display: "none",
        },
        {
          delay: 1.8,
          duration: 0.2,
        },
      );
    } catch {
      // Ignore if unmounted
    }
  }, [animate]);

  const animateReset = useCallback(async () => {
    try {
      await animate(
        ".loader",
        { width: "0px", height: "0px", opacity: 0, scale: 0, display: "none" },
        { duration: 0.15 },
      );
      await animate(
        ".check",
        { width: "0px", height: "0px", opacity: 0, scale: 0, display: "none" },
        { duration: 0.15 },
      );
    } catch {
      // Ignore
    }
  }, [animate]);

  // Sync external loading state prop
  useEffect(() => {
    if (loading !== undefined) {
      if (loading && !prevLoadingRef.current) {
        animateLoading();
      } else if (!loading && prevLoadingRef.current) {
        animateSuccess();
      }
      prevLoadingRef.current = loading;
    }
  }, [loading, animateLoading, animateSuccess]);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (loading !== undefined) {
      // When externally controlled, just delegate onClick
      props.onClick?.(event);
      return;
    }

    // Auto state handling for async onClick
    try {
      await animateLoading();
      await props.onClick?.(event);
      await animateSuccess();
    } catch (err) {
      await animateReset();
      throw err;
    }
  };

  const isDisabled = disabled || loading;

  return (
    <motion.button
      ref={scope}
      style={style}
      disabled={isDisabled}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
      onClick={handleClick}
    >
      <div className="inline-flex items-center justify-center gap-2 pointer-events-none">
        <Loader />
        <CheckIcon />
        <span className="inline-flex items-center gap-1.5">{children}</span>
      </div>
    </motion.button>
  );
};

const Loader = () => {
  return (
    <motion.svg
      animate={{
        rotate: [0, 360],
      }}
      initial={{
        scale: 0,
        opacity: 0,
        width: "0px",
        height: "0px",
        display: "none",
      }}
      style={{
        scale: 0,
        opacity: 0,
        width: "0px",
        height: "0px",
        display: "none",
      }}
      transition={{
        duration: 0.6,
        repeat: Infinity,
        ease: "linear",
      }}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="loader shrink-0 text-current"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 3a9 9 0 1 0 9 9" />
    </motion.svg>
  );
};

const CheckIcon = () => {
  return (
    <motion.svg
      initial={{
        scale: 0,
        opacity: 0,
        width: "0px",
        height: "0px",
        display: "none",
      }}
      style={{
        scale: 0,
        opacity: 0,
        width: "0px",
        height: "0px",
        display: "none",
      }}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="check shrink-0 text-current"
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
      <path d="M9 12l2 2l4 -4" />
    </motion.svg>
  );
};

export { Button as StatefulButton };
export default Button;
