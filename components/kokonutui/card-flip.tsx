/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
"use client";

/**
 * @author: @dorianbaffier
 * @description: Card Flip — restyled for PrismSpace High-Voltage Developer OS
 * @version: 2.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { ArrowRight, Repeat2 } from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface CardFlipProps {
  title?: string;
  subtitle?: string;
  description?: string;
  features?: string[];
  icon?: React.ReactNode;
}

export default function CardFlip({
  title = "Design Systems",
  subtitle = "Explore the fundamentals",
  description = "Dive deep into the world of modern UI/UX design.",
  features = ["UI/UX", "Modern Design", "Tailwind CSS", "Kokonut UI"],
  icon,
}: CardFlipProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="group relative h-[320px] w-full [perspective:2000px]"
      onMouseEnter={() => setIsFlipped(true)}
      onMouseLeave={() => setIsFlipped(false)}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{
          duration: 0.65,
          ease: [0.16, 1, 0.3, 1],
        }}
      >
        {/* Front of card */}
        <div
          className={cn(
            "absolute inset-0 h-full w-full",
            "[backface-visibility:hidden] [transform:rotateY(0deg)]",
            "overflow-hidden rounded-[20px]",
            "transition-all duration-500",
            isFlipped ? "opacity-0" : "opacity-100"
          )}
          style={{
            background: '#090c12',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04)',
          }}
        >
          {/* Micro-grid texture */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          <div className="relative h-full overflow-hidden">
            <div className="absolute inset-0 flex items-start justify-center pt-16">
              {icon ? (
                <div className="relative flex items-center justify-center">
                  <div
                    className="absolute -inset-4 rounded-full opacity-40 blur-xl transition-all duration-500 group-hover:opacity-80 group-hover:scale-125 pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle, rgba(0, 223, 129, 0.3) 0%, rgba(6, 182, 212, 0.1) 60%, transparent 80%)',
                    }}
                  />
                  <div className="relative transition-transform duration-500 group-hover:scale-110">
                    {icon}
                  </div>
                </div>
              ) : (
                <div className="relative flex h-[100px] w-[200px] items-center justify-center">
                  {[...Array(10)].map((_, i) => (
                    <div
                      className={cn(
                        "absolute h-[50px] w-[50px]",
                        "rounded-[140px]",
                        "animate-[scale_3s_linear_infinite]",
                        "opacity-0",
                        "shadow-[0_0_50px_rgba(0,223,129,0.4)]",
                        "group-hover:animate-[scale_2s_linear_infinite]"
                      )}
                      key={i}
                      style={{
                        animationDelay: `${i * 0.3}s`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="absolute right-0 bottom-0 left-0 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1.5">
                <h3
                  className="font-sans font-[700] text-lg leading-snug tracking-[-0.02em] transition-all duration-500 ease-out group-hover:translate-y-[-4px]"
                  style={{ color: '#ffffff' }}
                >
                  {title}
                </h3>
                <p
                  className="line-clamp-2 text-[12px] font-mono font-[500] tracking-normal transition-all delay-75 duration-500 ease-out group-hover:translate-y-[-4px]"
                  style={{ color: '#94a3b8' }}
                >
                  {subtitle}
                </p>
              </div>
              <div className="group/icon relative">
                <div
                  className={cn(
                    "absolute inset-[-8px] rounded-lg transition-opacity duration-300",
                    "bg-gradient-to-br from-mint/20 via-mint/10 to-transparent"
                  )}
                />
                <Repeat2
                  className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover/icon:-rotate-12 group-hover/icon:scale-110"
                  style={{ color: '#00df81' }}
                />
              </div>
            </div>
          </div>

          {/* Hover glow border */}
          <div
            className="absolute inset-0 rounded-[20px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              border: '1px solid rgba(0, 223, 129, 0.25)',
              boxShadow: '0 0 20px rgba(0, 223, 129, 0.1)',
            }}
          />
        </div>

        {/* Back of card */}
        <div
          className={cn(
            "absolute inset-0 h-full w-full",
            "[backface-visibility:hidden] [transform:rotateY(180deg)]",
            "rounded-[20px] p-6",
            "flex flex-col",
            "transition-all duration-500",
            isFlipped ? "opacity-100" : "opacity-0"
          )}
          style={{
            background: '#090c12',
            border: '1px solid rgba(0, 223, 129, 0.25)',
            boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 223, 129, 0.08)',
          }}
        >
          {/* Micro-grid texture */}
          <div
            className="absolute inset-0 rounded-[20px] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          <div className="flex-1 space-y-6 relative z-10">
            <div className="space-y-2">
              <h3
                className="font-sans font-[700] text-lg leading-snug tracking-[-0.02em]"
                style={{ color: '#ffffff' }}
              >
                {title}
              </h3>
              <p
                className="line-clamp-2 text-[12px] font-mono font-[500] tracking-normal"
                style={{ color: '#94a3b8' }}
              >
                {description}
              </p>
            </div>

            <div className="space-y-2">
              {features.map((feature, index) => (
                <div
                  className="flex items-center gap-2 text-[13px] font-mono font-[500] transition-all duration-500"
                  key={feature}
                  style={{
                    color: '#cbd5e1',
                    transform: isFlipped
                      ? "translateX(0)"
                      : "translateX(-10px)",
                    opacity: isFlipped ? 1 : 0,
                    transitionDelay: `${index * 100 + 200}ms`,
                  }}
                >
                  <ArrowRight
                    className="h-3 w-3 flex-shrink-0"
                    style={{ color: '#00df81' }}
                  />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <style jsx>{`
                @keyframes scale {
                    0% {
                        transform: scale(2);
                        opacity: 0;
                        box-shadow: 0px 0px 50px rgba(0, 223, 129, 0.4);
                    }
                    50% {
                        transform: translate(0px, -5px) scale(1);
                        opacity: 1;
                        box-shadow: 0px 8px 20px rgba(0, 223, 129, 0.4);
                    }
                    100% {
                        transform: translate(0px, 5px) scale(0.1);
                        opacity: 0;
                        box-shadow: 0px 10px 20px rgba(0, 223, 129, 0);
                    }
                }
            `}</style>
    </div>
  );
}
