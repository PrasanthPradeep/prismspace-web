"use client";

import { cn } from "@/lib/utils";
import {
  type MotionValue,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { useCallback, useEffect, useRef } from "react";

export interface ExposureSliderProps {
  /** Accent color for the active notch and progress ring (CSS color value) */
  accentColor?: string;
  /** Additional CSS classes */
  className?: string;
  /** Initial value */
  defaultValue?: number;
  /** Controlled value */
  value?: number;
  /** Maximum value */
  max?: number;
  /** Minimum value */
  min?: number;
  /** Callback fired when the value changes */
  onChange?: (value: number) => void;
  /** Show the circular progress indicator with the current value */
  showIndicator?: boolean;
  /** Step size between values */
  step?: number;
}

const NOTCH_WIDTH = 14; // px per notch (3px notch + 11px gap)
const SPRING_CONFIG = { stiffness: 300, damping: 30, mass: 0.5 };

const DEFAULT_ACCENT = "oklch(0.65 0.25 12)";

const ExposureSlider = ({
  min = -20,
  max = 20,
  step = 1,
  defaultValue = 0,
  value,
  onChange,
  showIndicator = true,
  accentColor,
  className,
}: ExposureSliderProps) => {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const targetValue = value !== undefined ? value : defaultValue;

  const count = Math.max(1, Math.floor((max - min) / step) + 1);
  const centerIndex = Math.floor((targetValue - min) / step);

  // Raw drag offset and spring-smoothed version
  const rawX = useMotionValue(0);
  const x = shouldReduceMotion ? rawX : useSpring(rawX, SPRING_CONFIG);

  // Sync rawX when targetValue changes externally
  useEffect(() => {
    rawX.set(0);
  }, [targetValue, rawX]);

  // Current value derived from offset
  const currentValue = useTransform(x, (latest) => {
    const indexOffset = Math.round(-latest / NOTCH_WIDTH);
    const val = Math.max(
      min,
      Math.min(max, (centerIndex + indexOffset) * step + min)
    );
    return val;
  });

  // Track value for circle and display
  const displayValue = useTransform(currentValue, (v) => Math.round(v));

  const snapToNearest = useCallback(() => {
    const current = rawX.get();
    const snapped = Math.round(current / NOTCH_WIDTH) * NOTCH_WIDTH;
    rawX.set(snapped);
  }, [rawX]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      const startX = e.clientX;
      const startOffset = rawX.get();

      const handleMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - startX;
        const newOffset = startOffset + delta;
        // Clamp to bounds
        const maxOffset = (count - 1 - centerIndex) * NOTCH_WIDTH;
        const minOffset = -centerIndex * NOTCH_WIDTH;
        rawX.set(Math.max(-maxOffset, Math.min(-minOffset, newOffset)));

        // Fire onChange
        const indexOffset = Math.round(-rawX.get() / NOTCH_WIDTH);
        const val = Math.max(
          min,
          Math.min(max, (centerIndex + indexOffset) * step + min)
        );
        onChange?.(Math.round(val));
      };

      const handleUp = () => {
        isDragging.current = false;
        snapToNearest();
        // Fire final onChange
        const indexOffset = Math.round(-rawX.get() / NOTCH_WIDTH);
        const val = Math.max(
          min,
          Math.min(max, (centerIndex + indexOffset) * step + min)
        );
        onChange?.(Math.round(val));
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [rawX, centerIndex, count, min, max, step, onChange, snapToNearest]
  );

  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <div
      className={cn(
        "flex w-full max-w-[500px] flex-col items-center gap-6 text-foreground",
        className
      )}
      style={
        { "--es-accent": accentColor ?? DEFAULT_ACCENT } as React.CSSProperties
      }
    >
      {/* Progress circle */}
      {showIndicator && (
        <ProgressCircle
          currentValue={currentValue}
          displayValue={displayValue}
          max={max}
          min={min}
        />
      )}

      {/* Ticker slider */}
      <div
        className="relative flex h-12 w-full items-center justify-center"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
        }}
      >
        <div
          className="relative h-full w-full cursor-grab select-none active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          ref={containerRef}
          style={{
            touchAction: "pan-y",
            padding: `0 calc(50% - ${NOTCH_WIDTH / 2}px)`,
          }}
        >
          <motion.ul
            className="relative m-0 flex h-full list-none items-center p-0"
            style={{ x, marginLeft: -centerIndex * NOTCH_WIDTH }}
          >
            {items.map((i) => (
              <Notch centerIndex={centerIndex} index={i} key={i} x={x} />
            ))}
          </motion.ul>
        </div>
      </div>
    </div>
  );
};

/** Individual notch mark in the ticker */
const Notch = ({
  index,
  centerIndex,
  x,
}: {
  index: number;
  centerIndex: number;
  x: MotionValue<number>;
}) => {
  // Distance from center in notch units
  const distance = useTransform(x, (latest) => {
    const currentCenter = centerIndex + -latest / NOTCH_WIDTH;
    return Math.abs(index - currentCenter);
  });

  const opacity = useTransform(distance, [0, 1.5, 5], [1, 0.75, 0.4]);
  const height = useTransform(distance, [0, 1, 3], [36, 26, 18]);

  const isCenter = useTransform(distance, (d) => d < 0.5);
  const bg = useTransform(isCenter, (center) =>
    center ? "var(--es-accent)" : "rgba(255, 255, 255, 0.45)"
  );
  const boxShadow = useTransform(isCenter, (center) =>
    center ? "0 0 10px var(--es-accent)" : "none"
  );

  return (
    <li
      className="relative flex-shrink-0 flex-grow-0 flex items-center justify-center"
      style={{ height: "44px", width: `${NOTCH_WIDTH}px` }}
    >
      <motion.div
        className="rounded-full"
        style={{
          width: 3,
          height,
          backgroundColor: bg,
          opacity,
          boxShadow,
          willChange: "height, opacity",
        }}
      />
    </li>
  );
};

/** SVG progress ring showing positive/negative or percentage value */
const ProgressCircle = ({
  currentValue,
  displayValue,
  min,
  max,
}: {
  currentValue: MotionValue<number>;
  displayValue: MotionValue<number>;
  min: number;
  max: number;
}) => {
  const isBiDirectional = min < 0;

  // Normalized 0 to 1 for unidirectional (min >= 0)
  const norm01 = useTransform(currentValue, (v) => {
    const range = max - min || 1;
    return Math.max(0, Math.min(1, (v - min) / range));
  });

  // Normalized -1 to 1 for bi-directional (min < 0)
  const normBi = useTransform(currentValue, (v) => {
    const range = max - min || 1;
    return Math.max(-1, Math.min(1, ((v - min) / range) * 2 - 1));
  });

  const circleDash = useTransform(norm01, (v) => `${v} ${1 - v}`);

  const positiveDash = useTransform(normBi, (v) =>
    v > 0 ? `${v} ${1 - v}` : "0 1"
  );
  const negativeDash = useTransform(normBi, (v) =>
    v < 0 ? `${-v} ${1 + v}` : "0 1"
  );

  return (
    <div className="relative flex h-[75px] w-[75px] items-center justify-center">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
        {/* Background ring */}
        <circle
          cx="50"
          cy="50"
          fill="rgba(255, 255, 255, 0.04)"
          r="44"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="4"
        />
        {isBiDirectional ? (
          <>
            {/* Positive indicator */}
            <motion.circle
              cx="50"
              cy="50"
              fill="none"
              pathLength={1}
              r="44"
              stroke="var(--es-accent)"
              strokeDasharray={positiveDash}
              strokeDashoffset={0}
              strokeWidth="4"
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: "50% 50%",
                transformBox: "fill-box",
              }}
            />
            {/* Negative indicator */}
            <motion.circle
              cx="50"
              cy="50"
              fill="none"
              pathLength={1}
              r="44"
              stroke="var(--es-accent)"
              strokeDasharray={negativeDash}
              strokeDashoffset={0}
              strokeWidth="4"
              style={{
                transform: "scaleX(-1) rotate(-90deg)",
                transformOrigin: "50% 50%",
                transformBox: "fill-box",
              }}
            />
          </>
        ) : (
          /* Standard 0 to 100 progress ring */
          <motion.circle
            cx="50"
            cy="50"
            fill="none"
            pathLength={1}
            r="44"
            stroke="var(--es-accent)"
            strokeDasharray={circleDash}
            strokeDashoffset={0}
            strokeWidth="4"
            strokeLinecap="round"
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "50% 50%",
              transformBox: "fill-box",
            }}
          />
        )}
      </svg>
      <motion.span className="absolute font-semibold text-lg text-white">
        {displayValue}
      </motion.span>
    </div>
  );
};

export default ExposureSlider;
