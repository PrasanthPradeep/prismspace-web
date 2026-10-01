/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
"use client";

/**
 * @author: @dorianbaffier
 * @description: Toolbar — restyled for PrismSpace High-Voltage Developer OS
 * @version: 2.0.0
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import {
  Bell,
  CircleUserRound,
  Edit2,
  FileDown,
  Frame,
  Layers,
  Lock,
  type LucideIcon,
  MousePointer2,
  Move,
  Palette,
  Shapes,
  Share2,
  SlidersHorizontal,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface ToolbarItem {
  id: string;
  title: string;
  icon: LucideIcon | React.ComponentType<{ className?: string; size?: number }>;
  badge?: string | number;
  onClick?: () => void;
  disabled?: boolean;
  type?: never;
}

export interface ToolbarProps {
  items?: ToolbarItem[];
  selected?: string | null;
  defaultSelected?: string | null;
  className?: string;
  activeColor?: string;
  onSelect?: (itemId: string) => void;
  showToggle?: boolean;
  isToggled?: boolean;
  defaultToggled?: boolean;
  onToggleChange?: (toggled: boolean) => void;
  toggleLabels?: { on: string; off: string };
  toggleIcons?: {
    on: LucideIcon | React.ComponentType<{ className?: string; size?: number }>;
    off: LucideIcon | React.ComponentType<{ className?: string; size?: number }>;
  };
  children?: React.ReactNode;
  showNotifications?: boolean;
  notificationMessage?: (item: ToolbarItem) => string;
}

const DEFAULT_TOOLBAR_ITEMS: ToolbarItem[] = [
  { id: "select", title: "Select", icon: MousePointer2 },
  { id: "move", title: "Move", icon: Move },
  { id: "shapes", title: "Shapes", icon: Shapes },
  { id: "layers", title: "Layers", icon: Layers },
  { id: "frame", title: "Frame", icon: Frame },
  { id: "properties", title: "Properties", icon: SlidersHorizontal },
  { id: "export", title: "Export", icon: FileDown },
  { id: "share", title: "Share", icon: Share2 },
  { id: "notifications", title: "Notifications", icon: Bell },
  { id: "profile", title: "Profile", icon: CircleUserRound },
  { id: "appearance", title: "Appearance", icon: Palette },
];

const buttonVariants = {
  initial: {
    gap: 0,
    paddingLeft: ".55rem",
    paddingRight: ".55rem",
  },
  animate: (isSelected: boolean) => ({
    gap: isSelected ? ".45rem" : 0,
    paddingLeft: isSelected ? ".85rem" : ".55rem",
    paddingRight: isSelected ? ".85rem" : ".55rem",
  }),
};

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: "auto", opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const notificationVariants = {
  initial: { opacity: 0, y: 10, scale: 0.92 },
  animate: { opacity: 1, y: -10, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 0.95 },
};

const lineVariants = {
  initial: { scaleX: 0, x: "-50%" },
  animate: {
    scaleX: 1,
    x: "0%",
    transition: { duration: 0.22, ease: "easeOut" },
  },
  exit: {
    scaleX: 0,
    x: "50%",
    transition: { duration: 0.18, ease: "easeIn" },
  },
};

const transition = { type: "spring", bounce: 0.15, duration: 0.38 };

export function Toolbar({
  items = DEFAULT_TOOLBAR_ITEMS,
  selected: selectedProp,
  defaultSelected = "select",
  className,
  activeColor = "bg-[#00df81] text-[#06190e] shadow-[0_0_20px_rgba(0,223,129,0.35)]",
  onSelect,
  showToggle = true,
  isToggled: isToggledProp,
  defaultToggled = false,
  onToggleChange,
  toggleLabels = { on: "On", off: "Off" },
  toggleIcons = { on: Edit2, off: Lock },
  children,
  showNotifications = true,
  notificationMessage,
}: ToolbarProps) {
  const isControlledSelected = selectedProp !== undefined;
  const [internalSelected, setInternalSelected] = React.useState<string | null>(
    defaultSelected
  );
  const selected = isControlledSelected ? selectedProp : internalSelected;

  const isControlledToggled = isToggledProp !== undefined;
  const [internalToggled, setInternalToggled] = React.useState(defaultToggled);
  const isToggled = isControlledToggled ? isToggledProp : internalToggled;

  const [activeNotification, setActiveNotification] = React.useState<string | null>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const outsideClickRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleItemClick = (item: ToolbarItem) => {
    if (item.disabled) return;
    const nextSelected = selected === item.id ? null : item.id;
    if (!isControlledSelected) {
      setInternalSelected(nextSelected);
    }
    item.onClick?.();
    onSelect?.(item.id);

    if (showNotifications) {
      setActiveNotification(item.id);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setActiveNotification(null), 1500);
    }
  };

  const handleToggleClick = () => {
    const next = !isToggled;
    if (!isControlledToggled) {
      setInternalToggled(next);
    }
    onToggleChange?.(next);
  };

  const activeItem = items.find((item) => item.id === activeNotification);
  const notificationText = activeItem
    ? notificationMessage
      ? notificationMessage(activeItem)
      : `${activeItem.title}`
    : null;

  const ToggleIcon = isToggled ? toggleIcons.on : toggleIcons.off;

  return (
    <div className="relative inline-block select-none">
      <div
        className={cn(
          "relative flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2",
          "rounded-2xl border transition-all duration-300",
          className
        )}
        style={{
          background: "rgba(9, 12, 18, 0.90)",
          backdropFilter: "blur(24px) saturate(1.8)",
          WebkitBackdropFilter: "blur(24px) saturate(1.8)",
          borderColor: "rgba(255, 255, 255, 0.1)",
          boxShadow:
            "0 20px 50px -10px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(0, 223, 129, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        }}
        ref={outsideClickRef}
      >
        {/* Floating animated notification pill */}
        <AnimatePresence>
          {showNotifications && activeNotification && notificationText && (
            <motion.div
              animate="animate"
              className="absolute -top-10 left-1/2 z-50 -translate-x-1/2 transform pointer-events-none"
              exit="exit"
              initial="initial"
              transition={{ duration: 0.25 }}
              variants={notificationVariants as any}
            >
              <div
                className="rounded-full px-3 py-1 text-xs font-mono font-bold flex items-center gap-1.5 border"
                style={{
                  background: "#00df81",
                  color: "#06190e",
                  borderColor: "rgba(0, 223, 129, 0.5)",
                  boxShadow: "0 0 20px rgba(0, 223, 129, 0.45)",
                }}
              >
                <span>{notificationText}</span>
              </div>
              <motion.div
                animate="animate"
                className="absolute -bottom-1 left-1/2 h-[2px] w-full origin-left"
                exit="exit"
                initial="initial"
                style={{
                  background: "#00df81",
                  boxShadow: "0 0 8px rgba(0, 223, 129, 0.8)",
                }}
                variants={lineVariants as any}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toolbar items */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          {items.map((item) => {
            const isSelected = selected === item.id;
            const Icon = item.icon;

            return (
              <motion.button
                animate="animate"
                className={cn(
                  "relative flex items-center h-9 sm:h-10 rounded-xl transition-all duration-200 outline-none",
                  item.disabled && "opacity-40 cursor-not-allowed",
                  isSelected
                    ? activeColor
                    : "text-slate-400 hover:text-white hover:bg-white/[0.06] active:bg-white/[0.09]"
                )}
                custom={isSelected}
                disabled={item.disabled}
                initial={false}
                key={item.id}
                onClick={() => handleItemClick(item)}
                title={item.title}
                transition={transition as any}
                variants={buttonVariants as any}
              >
                <Icon
                  className={cn(
                    "shrink-0 transition-colors",
                    isSelected ? "text-[#06190e]" : "text-slate-400 group-hover:text-white"
                  )}
                  size={16}
                />
                <AnimatePresence initial={false}>
                  {isSelected && (
                    <motion.span
                      animate="animate"
                      className="overflow-hidden font-mono text-xs font-bold tracking-tight whitespace-nowrap"
                      exit="exit"
                      initial="initial"
                      transition={transition as any}
                      variants={spanVariants as any}
                    >
                      {item.title}
                    </motion.span>
                  )}
                </AnimatePresence>

                {item.badge !== undefined && (
                  <span
                    className={cn(
                      "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none",
                      isSelected
                        ? "bg-[#06190e]/20 text-[#06190e]"
                        : "bg-white/10 text-slate-300"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </motion.button>
            );
          })}

          {/* Optional children slot */}
          {children}

          {/* Toggle Switch Button */}
          {showToggle && (
            <motion.button
              className={cn(
                "flex items-center gap-1.5 h-9 sm:h-10 px-3 sm:px-3.5",
                "rounded-xl border font-mono text-xs font-bold transition-all duration-200",
                isToggled
                  ? "bg-[rgba(0,223,129,0.14)] text-[#00df81] border-[rgba(0,223,129,0.35)] shadow-[0_0_16px_rgba(0,223,129,0.2)] hover:bg-[rgba(0,223,129,0.22)]"
                  : "bg-white/[0.03] text-slate-400 border-white/10 hover:bg-white/[0.07] hover:text-white hover:border-white/20"
              )}
              onClick={handleToggleClick}
              title={`Toggle: ${isToggled ? toggleLabels.on : toggleLabels.off}`}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <ToggleIcon className="h-3.5 w-3.5 shrink-0" />
              <span>{isToggled ? toggleLabels.on : toggleLabels.off}</span>
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Toolbar;
