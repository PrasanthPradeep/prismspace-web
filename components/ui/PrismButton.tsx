/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import { motion, type HTMLMotionProps } from 'motion/react';
import { forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface PrismButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isActive?: boolean;
  fullWidth?: boolean;
}

const variants = {
  primary: {
    base: {
      background: 'rgba(0, 223, 129, 0.1)',
      border: '1px solid rgba(0, 223, 129, 0.3)',
      color: '#00df81',
    },
    hover: {
      background: 'rgba(0, 223, 129, 0.15)',
      borderColor: 'rgba(0, 223, 129, 0.4)',
      scale: 1.02,
    },
    active: {
      scale: 0.98,
    },
    disabled: {
      opacity: 0.4,
      cursor: 'not-allowed',
    },
  },
  secondary: {
    base: {
      background: 'rgba(255, 255, 255, 0.02)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      color: 'rgba(255, 255, 255, 0.7)',
    },
    hover: {
      background: 'rgba(0, 223, 129, 0.08)',
      borderColor: 'rgba(0, 223, 129, 0.25)',
      color: '#00df81',
      scale: 1.02,
    },
    active: {
      scale: 0.98,
    },
    disabled: {
      opacity: 0.3,
      cursor: 'not-allowed',
    },
  },
  ghost: {
    base: {
      background: 'transparent',
      border: '1px solid transparent',
      color: 'rgba(255, 255, 255, 0.6)',
    },
    hover: {
      background: 'rgba(0, 223, 129, 0.06)',
      borderColor: 'rgba(0, 223, 129, 0.15)',
      color: '#00df81',
      scale: 1.02,
    },
    active: {
      scale: 0.98,
    },
    disabled: {
      opacity: 0.3,
      cursor: 'not-allowed',
    },
  },
};

const sizes = {
  sm: {
    height: 32,
    padding: '0 12px',
    fontSize: 11,
    fontWeight: 600,
  },
  md: {
    height: 36,
    padding: '0 16px',
    fontSize: 12,
    fontWeight: 600,
  },
  lg: {
    height: 44,
    padding: '0 24px',
    fontSize: 13,
    fontWeight: 700,
  },
};

export const PrismButton = forwardRef<HTMLButtonElement, PrismButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'md',
      isActive = false,
      fullWidth = false,
      disabled = false,
      ...props
    },
    ref
  ) => {
    const variantStyles = variants[variant];
    const sizeStyles = sizes[size];

    return (
      <motion.button
        ref={ref}
        initial={false}
        whileHover={!disabled ? variantStyles.hover : {}}
        whileTap={!disabled ? variantStyles.active : {}}
        transition={{
          duration: 0.2,
          ease: [0.16, 1, 0.3, 1],
        }}
        disabled={disabled}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderRadius: 8,
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          letterSpacing: '-0.01em',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          userSelect: 'none',
          width: fullWidth ? '100%' : 'auto',
          ...(isActive ? {
            background: 'rgba(0, 223, 129, 0.08)',
            border: '1px solid rgba(0, 223, 129, 0.25)',
            color: '#00df81',
          } : variantStyles.base),
          ...sizeStyles,
          ...(disabled && variantStyles.disabled),
        }}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

PrismButton.displayName = 'PrismButton';

// Specialized button group component
interface PrismButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export function PrismButtonGroup({ children, className = '', fullWidth = false }: PrismButtonGroupProps) {
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: fullWidth ? '1fr 1fr' : 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: 8,
      }}
    >
      {children}
    </div>
  );
}

// Pill-style toggle button (for single/crawl, json/csv)
interface PrismToggleButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode;
  isActive?: boolean;
}

export function PrismToggleButton({ children, isActive = false, disabled = false, ...props }: PrismToggleButtonProps) {
  return (
    <motion.button
      initial={false}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      transition={{
        duration: 0.2,
        ease: [0.16, 1, 0.3, 1],
      }}
      disabled={disabled}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 36,
        padding: '0 16px',
        borderRadius: 8,
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none',
        userSelect: 'none',
        background: isActive ? 'rgba(0, 223, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
        border: isActive ? '1px solid rgba(0, 223, 129, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
        color: isActive ? '#00df81' : 'rgba(255, 255, 255, 0.5)',
        opacity: disabled ? 0.4 : 1,
      }}
      {...props}
    >
      <motion.div
        initial={false}
        animate={{
          opacity: isActive ? 1 : 0,
        }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 8,
          background: 'rgba(0, 223, 129, 0.08)',
          border: '1px solid rgba(0, 223, 129, 0.25)',
          zIndex: -1,
        }}
      />
      {children}
    </motion.button>
  );
}
