/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

/**
 * components/SwarmModelSelect.tsx
 * ──────────────────────────────
 * Rich Model Dropdown for Agent Swarm nodes and routing.
 * Features:
 * - Brand vector logos for all model providers (NVIDIA, Groq, OpenAI, Anthropic, Google, DeepSeek, OpenRouter)
 * - Model provider segregation with interactive tabs
 * - Live fuzzy search across 29+ models and capabilities
 * - BYOK badges and key configuration link
 * - High-voltage cyber-glass styling matching PrismSpace design system
 */

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  KeyRound,
  X,
  Sparkles,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getModelIcon,
  type AIPromptModel,
  NVIDIA_ICON,
  GROQ_ICON,
  OPENAI_ICON,
  ANTHROPIC_ICON,
  GEMINI_ICON,
  DEEPSEEK_ICON,
  OPENROUTER_ICON,
} from '@/components/kokonutui/ai-prompt';
import {
  BYOK_PROVIDERS,
  type ByokProviderId,
  getProviderForModel,
} from '@/lib/byok-storage';
import { cn } from '@/lib/utils';

export interface SwarmModelSelectProps {
  value: string;
  onChange: (modelId: string, provider?: string) => void;
  models: AIPromptModel[];
  onOpenByok?: () => void;
  className?: string;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom';
  disabled?: boolean;
}

const PROVIDER_TABS: {
  id: 'all' | ByokProviderId;
  label: string;
  shortLabel: string;
  color: string;
  icon?: React.ReactNode;
}[] = [
  { id: 'all', label: 'All Models', shortLabel: 'All', color: '#00df81' },
  { id: 'nvidia', label: 'NVIDIA NIM', shortLabel: 'NVIDIA', color: '#76B900', icon: NVIDIA_ICON },
  { id: 'groq', label: 'Groq Cloud', shortLabel: 'Groq', color: '#F55036', icon: GROQ_ICON },
  { id: 'openai', label: 'OpenAI', shortLabel: 'OpenAI', color: '#10A37F', icon: OPENAI_ICON },
  { id: 'anthropic', label: 'Anthropic Claude', shortLabel: 'Claude', color: '#D97706', icon: ANTHROPIC_ICON },
  { id: 'google', label: 'Google Gemini', shortLabel: 'Google', color: '#4285F4', icon: GEMINI_ICON },
  { id: 'deepseek', label: 'DeepSeek', shortLabel: 'DeepSeek', color: '#0284c7', icon: DEEPSEEK_ICON },
  { id: 'openrouter', label: 'OpenRouter', shortLabel: 'OpenRouter', color: '#6366F1', icon: OPENROUTER_ICON },
];

export function SwarmModelSelect({
  value,
  onChange,
  models,
  onOpenByok,
  className,
  align = 'start',
  side = 'bottom',
  disabled = false,
}: SwarmModelSelectProps) {
  const [activeTab, setActiveTab] = useState<'all' | ByokProviderId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = tabsContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = tabsContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScrollState]);

  const scrollTabs = (offset: number) => {
    tabsContainerRef.current?.scrollBy({ left: offset, behavior: 'smooth' });
  };

  // Normalize active model object
  const activeModelObj = useMemo(() => {
    const found = models.find((m) => m.id === value);
    if (found) return found;
    return (
      models[0] || {
        id: value || 'nvidia/nemotron-3.5-lightning-30b-a3b',
        name: 'Nemotron 3.5 30B',
        provider: 'nvidia',
        badge: 'Thinking',
      }
    );
  }, [models, value]);

  const activeProviderConfig = useMemo(() => {
    const provId = activeModelObj.provider || getProviderForModel(activeModelObj.id);
    return BYOK_PROVIDERS.find((p) => p.id === provId) || BYOK_PROVIDERS[0];
  }, [activeModelObj]);

  // Filter models by active provider tab & search query
  const filteredModels = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return models.filter((m) => {
      const modelProvider = m.provider || getProviderForModel(m.id);
      const matchesTab = activeTab === 'all' || modelProvider === activeTab;
      if (!matchesTab) return false;

      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.badge && m.badge.toLowerCase().includes(q)) ||
        modelProvider.toLowerCase().includes(q)
      );
    });
  }, [models, activeTab, searchQuery]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        disabled={disabled}
        className={cn(
          'group relative flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--prism-border-card)] bg-[var(--prism-board)] px-3 py-2 text-left font-mono text-xs text-white transition-all cursor-pointer outline-none select-none',
          'hover:border-[#00df81]/40 hover:bg-[#00df81]/[0.03] focus-visible:border-[#00df81]/50',
          disabled && 'opacity-50 pointer-events-none cursor-not-allowed',
          className
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex size-5 flex-shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/40">
            {activeModelObj.icon || getModelIcon(activeModelObj.id, activeModelObj.provider)}
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="truncate font-semibold text-white group-hover:text-[#00df81] transition-colors">
                {activeModelObj.name}
              </span>
              {activeModelObj.hasCustomKey && (
                <span
                  title="BYOK key configured"
                  className="inline-flex flex-shrink-0 items-center gap-0.5 rounded border border-[#00df81]/30 bg-[#00df81]/15 px-1 py-[0.5px] font-mono text-[7.5px] font-bold text-[#00df81] leading-none"
                >
                  <KeyRound className="size-2" />
                  BYOK
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 leading-none">
              <span
                className="text-[9px] uppercase tracking-wider font-semibold"
                style={{ color: activeProviderConfig.color || '#00df81' }}
              >
                {activeProviderConfig.name}
              </span>
              {activeModelObj.badge && (
                <>
                  <span className="text-white/20 text-[8px]">•</span>
                  <span className="truncate text-[8.5px] text-white/40">
                    {activeModelObj.badge}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <ChevronDown className="size-3.5 flex-shrink-0 text-white/40 transition-transform duration-200 group-hover:text-white" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        side={side}
        sideOffset={6}
        className={cn(
          'z-[9999] flex w-[330px] sm:w-[360px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-[rgba(0,223,129,0.22)] bg-[#090c12]/98 p-0 font-mono text-xs text-white shadow-2xl backdrop-blur-2xl'
        )}
      >
        {/* ── Header: Title & Model Count ── */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-black/40 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#00df81] animate-pulse" />
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-white/90">
              Model Selection
            </span>
            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-white/50">
              {filteredModels.length}/{models.length}
            </span>
          </div>
          {onOpenByok && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpenByok();
              }}
              className="inline-flex items-center gap-1 rounded-md border border-[#00df81]/25 bg-[#00df81]/10 px-2 py-0.5 text-[10px] font-medium text-[#00df81] hover:bg-[#00df81]/20 transition-all cursor-pointer"
            >
              <KeyRound className="size-2.5" />
              BYOK Keys
            </button>
          )}
        </div>

        {/* ── Model Providers Segregation Tabs with Custom Horizontal Scrollbar ── */}
        <div className="relative border-b border-white/[0.06] bg-black/25">
          {/* Left scroll button & gradient fade */}
          {canScrollLeft && (
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 flex items-center bg-gradient-to-r from-[#090c12] via-[#090c12]/90 to-transparent pl-1 pr-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  scrollTabs(-110);
                }}
                className="pointer-events-auto flex size-4 items-center justify-center rounded-full border border-white/15 bg-[#090c12] text-white/70 hover:border-[#00df81]/60 hover:bg-[#00df81]/20 hover:text-[#00df81] transition-all cursor-pointer shadow-lg"
                aria-label="Scroll left"
              >
                <ChevronLeft className="size-2.5" />
              </button>
            </div>
          )}

          {/* Right scroll button & gradient fade */}
          {canScrollRight && (
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 flex items-center justify-end bg-gradient-to-l from-[#090c12] via-[#090c12]/90 to-transparent pr-1 pl-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  scrollTabs(110);
                }}
                className="pointer-events-auto flex size-4 items-center justify-center rounded-full border border-white/15 bg-[#090c12] text-white/70 hover:border-[#00df81]/60 hover:bg-[#00df81]/20 hover:text-[#00df81] transition-all cursor-pointer shadow-lg"
                aria-label="Scroll right"
              >
                <ChevronRight className="size-2.5" />
              </button>
            </div>
          )}

          <div
            ref={tabsContainerRef}
            onScroll={updateScrollState}
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
            className="flex items-center gap-1 overflow-x-auto px-2 pt-1.5 pb-2 custom-horizontal-scrollbar select-none"
          >
            {PROVIDER_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveTab(tab.id);
                    (e.currentTarget as HTMLElement).scrollIntoView({
                      behavior: 'smooth',
                      inline: 'nearest',
                      block: 'nearest',
                    });
                  }}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9.5px] font-semibold whitespace-nowrap transition-all cursor-pointer leading-none flex-shrink-0',
                    isActive
                      ? 'border shadow-[0_0_10px_rgba(0,223,129,0.15)] font-bold'
                      : 'border border-white/[0.05] bg-white/[0.02] text-white/55 hover:bg-white/[0.06] hover:text-white'
                  )}
                  style={{
                    borderColor: isActive ? (tab.id === 'all' ? '#00df81' : tab.color) : undefined,
                    background: isActive ? `${tab.id === 'all' ? '#00df81' : tab.color}20` : undefined,
                    color: isActive ? (tab.id === 'all' ? '#00df81' : tab.color) : undefined,
                  }}
                >
                  {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
                  <span>{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Search Input ── */}
        <div className="border-b border-white/[0.06] bg-black/15 p-2">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-2.5 size-3.5 text-white/40" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Filter by name, tags (e.g. 70b, sonnet, r1)..."
              className="h-7 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-8 pr-7 text-[11px] text-white placeholder-white/40 outline-none transition-all focus:border-[#00df81]/50 focus:bg-white/[0.07]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2 text-white/40 hover:text-white"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* ── Models List ── */}
        <div className="max-h-[240px] overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
          {filteredModels.length === 0 ? (
            <div className="py-8 text-center text-xs text-white/40">
              No models found matching &quot;{searchQuery}&quot;
            </div>
          ) : (
            filteredModels.map((m) => {
              const isSelected = m.id === value;
              const provId = m.provider || getProviderForModel(m.id);
              const provConfig = BYOK_PROVIDERS.find((p) => p.id === provId);

              return (
                <DropdownMenuItem
                  key={m.id}
                  onClick={() => onChange(m.id, provId)}
                  onSelect={() => onChange(m.id, provId)}
                  className={cn(
                    'group/item flex w-full items-center justify-between gap-2 rounded-xl p-2 text-left transition-all cursor-pointer outline-none',
                    isSelected
                      ? 'border border-[#00df81]/30 bg-[#00df81]/12 text-[#00df81]'
                      : 'border border-transparent hover:border-white/[0.08] hover:bg-white/[0.05] text-white/80 hover:text-white'
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <div className="flex size-6 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/40">
                      {m.icon || getModelIcon(m.id, provId)}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center gap-1.5 leading-tight">
                        <span
                          className={cn(
                            'truncate font-medium text-xs',
                            isSelected ? 'text-[#00df81] font-bold' : 'text-white'
                          )}
                        >
                          {m.name}
                        </span>
                        {m.hasCustomKey && (
                          <span
                            title="Custom key configured"
                            className="inline-flex flex-shrink-0 items-center gap-0.5 rounded border border-[#00df81]/30 bg-[#00df81]/15 px-1 py-[0.5px] font-mono text-[7.5px] font-bold text-[#00df81] leading-none"
                          >
                            <KeyRound className="size-2" />
                            BYOK
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 leading-none">
                        <span
                          className="text-[8.5px] font-semibold uppercase tracking-wider"
                          style={{ color: provConfig?.color || '#00df81' }}
                        >
                          {provConfig?.name || provId}
                        </span>
                        {m.badge && (
                          <>
                            <span className="text-white/20 text-[8px]">•</span>
                            <span className="truncate text-[9px] text-white/45">
                              {m.badge}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 items-center ml-1">
                    {isSelected ? (
                      <div className="flex size-4 items-center justify-center rounded-full border border-[#00df81]/40 bg-[#00df81]/20 shadow-[0_0_8px_rgba(0,223,129,0.3)]">
                        <Check className="size-2.5 text-[#00df81]" />
                      </div>
                    ) : null}
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between border-t border-white/[0.06] bg-black/40 px-3 py-1.5 text-[9.5px] text-white/40">
          <span className="truncate mr-2">
            Active:{' '}
            <span className="text-[#00df81] font-semibold">
              {activeModelObj.name}
            </span>
          </span>
          <span className="flex-shrink-0 text-white/30">Esc to close</span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
