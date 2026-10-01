/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

/**
 * components/SearchBar.tsx
 * ────────────────────────
 * A premium search bar placed under the clock on the hero screen.
 *
 * Features:
 * - Mode toggle: Search Engine ↔ Agent Swarm
 * - Search engine selector: Google, Brave, DuckDuckGo, Bing, Perplexity, Kagi
 *   with SVG logos + dropdown picker
 * - Keyboard: Enter to search / submit
 * - Persists engine choice and mode to localStorage
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AgentOrb } from './AgentOrb';
import {
  BYOK_PROVIDERS,
  getAllStoredApiKeys,
  getAllPromptModels,
  getProviderForModel,
  type ByokProviderId,
} from '@/lib/byok-storage';
import { ByokModal, getProviderIcon } from './ByokModal';
import { getModelIcon } from '@/components/kokonutui/ai-prompt';
import { Check, Search as SearchIconLucide, KeyRound, X } from 'lucide-react';

// ── Search engine definitions ─────────────────────────────────────────────────

type EngineId = 'google' | 'brave' | 'duckduckgo' | 'bing' | 'perplexity' | 'kagi';

interface Engine {
  id: EngineId;
  name: string;
  url: (q: string) => string;
  color: string;       // brand accent for the active indicator
  logo: React.ReactNode;
  tag: string;
  tagColor: string;
  tagBg: string;
  tagBorder: string;
  shortcut: string;
  description: string;
}

// ── Engine favicon helper (uses each site's own favicon for pixel-perfect logos) ──
// We use img tags with the Google favicon proxy — always accurate, no custom SVG needed.
const EngineFavicon = ({ domain, name }: { domain: string; name: string }) => (
  /* eslint-disable @next/next/no-img-element */
  <img
    src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
    alt={name}
    width={18}
    height={18}
    style={{ borderRadius: '3px', display: 'block', flexShrink: 0 }}
    onError={(e) => {
      // Fallback: first letter in brand color
      const el = e.currentTarget;
      el.style.display = 'none';
      const next = el.nextElementSibling as HTMLElement | null;
      if (next) next.style.display = 'flex';
    }}
  />
);

const AgentIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8" r="4" stroke="#00df81" strokeWidth="1.5"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#00df81" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="18" cy="6" r="2" fill="#00df81" opacity="0.7"/>
    <path d="M18 4v1m0 2v1m-1-3h1m2 0h1" stroke="#00df81" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.2"/>
    <path d="M20 20L16.2 16.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
);

const SwarmIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="18" cy="6" r="2" fill="currentColor"/>
    <path d="M18 3.5v1m0 3v1m-1.5-2.5h1m2 0h1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

// Logo component per engine — uses real favicon image with letter fallback
const EngineLogo = ({ domain, name, color }: { domain: string; name: string; color: string }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', width: 18, height: 18, flexShrink: 0 }}>
    <EngineFavicon domain={domain} name={name} />
    {/* Letter fallback (hidden by default, shown if favicon fails) */}
    <span
      style={{
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        width: 18,
        height: 18,
        borderRadius: 3,
        background: color,
        color: '#fff',
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {name[0]}
    </span>
  </span>
);

const ENGINES: Engine[] = [
  {
    id: 'google',
    name: 'Google',
    url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    color: '#4285F4',
    logo: <EngineLogo domain="google.com" name="Google" color="#4285F4" />,
    tag: 'Web',
    tagColor: '#60a5fa',
    tagBg: 'rgba(59, 130, 246, 0.12)',
    tagBorder: 'rgba(59, 130, 246, 0.25)',
    shortcut: '1',
    description: 'Global web index',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    url: (q) => `https://www.perplexity.ai/search?q=${encodeURIComponent(q)}`,
    color: '#20B2AA',
    logo: <EngineLogo domain="perplexity.ai" name="Perplexity" color="#20B2AA" />,
    tag: 'AI Search',
    tagColor: '#20B2AA',
    tagBg: 'rgba(32, 178, 170, 0.14)',
    tagBorder: 'rgba(32, 178, 170, 0.35)',
    shortcut: '2',
    description: 'Direct cited answers',
  },
  {
    id: 'brave',
    name: 'Brave',
    url: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}`,
    color: '#FB542B',
    logo: <EngineLogo domain="brave.com" name="Brave" color="#FB542B" />,
    tag: 'Shield',
    tagColor: '#fb923c',
    tagBg: 'rgba(251, 84, 43, 0.12)',
    tagBorder: 'rgba(251, 84, 43, 0.25)',
    shortcut: '3',
    description: 'Independent index',
  },
  {
    id: 'bing',
    name: 'Bing',
    url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
    color: '#0078D4',
    logo: <EngineLogo domain="bing.com" name="Bing" color="#0078D4" />,
    tag: 'Copilot',
    tagColor: '#38bdf8',
    tagBg: 'rgba(0, 120, 212, 0.12)',
    tagBorder: 'rgba(0, 120, 212, 0.25)',
    shortcut: '4',
    description: 'Microsoft Copilot',
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
    color: '#DE5833',
    logo: <EngineLogo domain="duckduckgo.com" name="DuckDuckGo" color="#DE5833" />,
    tag: 'Private',
    tagColor: '#f87171',
    tagBg: 'rgba(222, 88, 51, 0.12)',
    tagBorder: 'rgba(222, 88, 51, 0.25)',
    shortcut: '5',
    description: 'Zero tracking queries',
  },
  {
    id: 'kagi',
    name: 'Kagi',
    url: (q) => `https://kagi.com/search?q=${encodeURIComponent(q)}`,
    color: '#F6C14E',
    logo: <EngineLogo domain="kagi.com" name="Kagi" color="#F6C14E" />,
    tag: 'Ad-Free',
    tagColor: '#facc15',
    tagBg: 'rgba(246, 193, 78, 0.12)',
    tagBorder: 'rgba(246, 193, 78, 0.25)',
    shortcut: '6',
    description: 'Premium fast results',
  },
];

type Mode = 'search' | 'agent';

const SWARM_MODEL_KEY = 'prism.agentSwarm.selectedModel';
const DEFAULT_SWARM_MODEL = 'nvidia/nemotron-3.5-lightning-30b-a3b';

function shortenModelName(name: string): string {
  return name.replace(/\s*\([^)]*\)/g, '').trim();
}

interface SearchBarProps {
  onAgentSubmit?: (query: string, model?: string, provider?: string) => void;
}

export function SearchBar({ onAgentSubmit }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode>('search');
  const [engineId, setEngineId] = useState<EngineId>('google');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [swarmModelId, setSwarmModelId] = useState<string>(DEFAULT_SWARM_MODEL);
  const [storedKeys, setStoredKeys] = useState<Record<string, string>>({});
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState<'all' | ByokProviderId>('all');
  const [showByokModal, setShowByokModal] = useState(false);
  const [modelDropdownPlacement, setModelDropdownPlacement] = useState<'top' | 'bottom'>('top');
  const [engineDropdownPlacement, setEngineDropdownPlacement] = useState<'top' | 'bottom'>('top');
  const [mounted, setMounted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const modelSearchInputRef = useRef<HTMLInputElement>(null);

  // Restore preferences from localStorage & sync keys
  useEffect(() => {
    setMounted(true);
    const savedEngine = localStorage.getItem('searchEngine') as EngineId | null;
    const savedMode = localStorage.getItem('searchMode') as Mode | null;
    if (savedEngine && ENGINES.find((e) => e.id === savedEngine)) setEngineId(savedEngine);
    if (savedMode) setMode(savedMode);

    try {
      const savedModel = localStorage.getItem(SWARM_MODEL_KEY);
      if (savedModel) setSwarmModelId(savedModel);
      setStoredKeys(getAllStoredApiKeys());
    } catch {
      // ignore
    }
  }, []);

  // Sync external model updates and key additions
  useEffect(() => {
    const handleModelUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ model?: string }>;
      if (customEvent.detail?.model) {
        setSwarmModelId(customEvent.detail.model);
      }
    };

    const handleByokUpdated = () => {
      setStoredKeys(getAllStoredApiKeys());
    };

    window.addEventListener('prism:model-updated', handleModelUpdated);
    window.addEventListener('prism:byok-updated', handleByokUpdated);
    window.addEventListener('storage', handleByokUpdated);
    return () => {
      window.removeEventListener('prism:model-updated', handleModelUpdated);
      window.removeEventListener('prism:byok-updated', handleByokUpdated);
      window.removeEventListener('storage', handleByokUpdated);
    };
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search input when model dropdown opens
  useEffect(() => {
    if (modelDropdownOpen) {
      setTimeout(() => {
        modelSearchInputRef.current?.focus();
      }, 50);
    }
  }, [modelDropdownOpen]);

  const activeEngine = ENGINES.find((e) => e.id === engineId) ?? ENGINES[0];

  const handleEngineSelect = useCallback((id: EngineId) => {
    setEngineId(id);
    localStorage.setItem('searchEngine', id);
    setDropdownOpen(false);
    inputRef.current?.focus();
  }, []);

  const availablePromptModels = useMemo(() => {
    return getAllPromptModels(storedKeys);
  }, [storedKeys]);

  const activeModelSpec = useMemo(() => {
    return (
      availablePromptModels.find((m) => m.id === swarmModelId) ||
      availablePromptModels[0] || {
        id: DEFAULT_SWARM_MODEL,
        name: 'Nemotron 3.5 30B',
        provider: 'nvidia' as ByokProviderId,
        badge: 'Thinking',
        hasCustomKey: false,
      }
    );
  }, [availablePromptModels, swarmModelId]);

  const activeProviderConfig = useMemo(() => {
    return (
      BYOK_PROVIDERS.find((p) => p.id === activeModelSpec.provider) ||
      BYOK_PROVIDERS[0]
    );
  }, [activeModelSpec.provider]);

  const filteredModels = useMemo(() => {
    const q = modelSearchQuery.toLowerCase().trim();
    return availablePromptModels.filter((m) => {
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        (m.badge && m.badge.toLowerCase().includes(q));
      const matchesProvider =
        providerFilter === 'all' || m.provider === providerFilter;
      return matchesSearch && matchesProvider;
    });
  }, [availablePromptModels, modelSearchQuery, providerFilter]);

  const handleModelSelect = useCallback((modelId: string) => {
    setSwarmModelId(modelId);
    try {
      localStorage.setItem(SWARM_MODEL_KEY, modelId);
      const prov = getProviderForModel(modelId);
      window.dispatchEvent(
        new CustomEvent('prism:model-updated', {
          detail: { model: modelId, provider: prov },
        })
      );
    } catch {
      // ignore
    }
    setModelDropdownOpen(false);
    setModelSearchQuery('');
    inputRef.current?.focus();
  }, []);

  // Keyboard hotkeys: 1-6 selects engine immediately when open, Esc closes
  useEffect(() => {
    if (!dropdownOpen && !modelDropdownOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (dropdownOpen) {
        const num = parseInt(e.key, 10);
        if (!isNaN(num) && num >= 1 && num <= ENGINES.length) {
          e.preventDefault();
          const selected = ENGINES[num - 1];
          if (selected) {
            handleEngineSelect(selected.id);
          }
          return;
        }
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setDropdownOpen(false);
        setModelDropdownOpen(false);
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dropdownOpen, modelDropdownOpen, handleEngineSelect]);

  const updatePlacements = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (modelDropdownRef.current) {
      const rect = modelDropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setModelDropdownPlacement(spaceBelow < 340 && spaceAbove > 180 ? 'top' : 'bottom');
    }
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setEngineDropdownPlacement(spaceBelow < 280 && spaceAbove > 180 ? 'top' : 'bottom');
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updatePlacements);
    window.addEventListener('scroll', updatePlacements);
    return () => {
      window.removeEventListener('resize', updatePlacements);
      window.removeEventListener('scroll', updatePlacements);
    };
  }, [updatePlacements]);

  const handleToggleDropdown = () => {
    updatePlacements();
    setDropdownOpen((o) => !o);
  };

  const handleToggleModelDropdown = () => {
    updatePlacements();
    setModelDropdownOpen((o) => !o);
  };

  const handleModeToggle = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    localStorage.setItem('searchMode', m);
    // rAF: focus in the next frame (~16ms) instead of an arbitrary 50ms timeout
    requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
  };

  const handleSubmit = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    if (mode === 'search') {
      window.open(activeEngine.url(q), '_blank', 'noopener,noreferrer');
    } else {
      onAgentSubmit?.(q, swarmModelId, activeModelSpec.provider);
    }
    setQuery('');
  }, [query, mode, activeEngine, onAgentSubmit, swarmModelId, activeModelSpec.provider]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') {
      setDropdownOpen(false);
      setModelDropdownOpen(false);
    }
  };

  if (!mounted) return null;

  return (
    <div
      className="flex flex-col items-center gap-3 w-full"
      style={{ maxWidth: '640px' }}
    >
      {/* ── Mode toggle ──────────────────────────────────────────────────── */}
      <div
        className="relative flex items-center p-1 rounded-[12px] select-none"
        style={{
          background: '#090c12',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        }}
      >
        {([
          { id: 'search' as const, label: 'Search', icon: <SearchIcon /> },
          { id: 'agent' as const, label: 'Agent Swarm', icon: <SwarmIcon /> },
        ]).map(({ id, label, icon }) => {
          const isActive = mode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleModeToggle(id)}
              title={id === 'agent' ? 'Run query through Agent Swarm' : 'Search the web'}
              className="relative z-10 flex items-center gap-2 px-5 py-1.5 rounded-[8px] text-[12px] font-mono font-[700] tracking-[0.02em] transition-colors duration-150 outline-none cursor-pointer"
              style={{
                color: isActive
                  ? id === 'agent'
                    ? '#00df81'
                    : '#ffffff'
                  : 'rgba(255, 255, 255, 0.45)',
              }}
            >
              {isActive && (
                <motion.div
                  layoutId="active-search-mode-pill"
                  className="absolute inset-0 rounded-[8px] pointer-events-none"
                  style={{
                    background:
                      id === 'agent'
                        ? 'rgba(0, 223, 129, 0.12)'
                        : 'rgba(255, 255, 255, 0.08)',
                    border:
                      id === 'agent'
                        ? '1px solid rgba(0, 223, 129, 0.35)'
                        : '1px solid rgba(255, 255, 255, 0.14)',
                    boxShadow:
                      id === 'agent'
                        ? '0 0 16px rgba(0, 223, 129, 0.25)'
                        : 'none',
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {icon}
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Search input row ──────────────────────────────────────────────── */}
      <motion.div
        className="flex items-center w-full architecture-board micro-grid"
        style={{
          padding: '0',
          borderColor: mode === 'agent'
            ? 'rgba(0, 223, 129, 0.35)'
            : 'rgba(0, 0, 0, 0.25)',
          boxShadow: mode === 'agent'
            ? '0 0 24px rgba(0, 223, 129, 0.1), 0 30px 60px -15px rgba(0, 0, 0, 0.5)'
            : '0 30px 60px -15px rgba(0, 0, 0, 0.5)',
        }}
        animate={{
          borderColor: mode === 'agent' ? 'rgba(0, 223, 129, 0.35)' : 'rgba(0, 0, 0, 0.25)',
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Engine selector (search mode) / Agent icon (agent mode) */}
        <AnimatePresence mode="wait">
          {mode === 'search' ? (
            <motion.div
              key="search-engine"
              className="relative flex-shrink-0"
              ref={dropdownRef}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <button
                onClick={handleToggleDropdown}
                title={`Search engine: ${activeEngine.name} (Click or press 1-6 to change)`}
                className="flex items-center gap-2 px-4 py-3.5 rounded-l-[18px] transition-all duration-150 outline-none group cursor-pointer"
                style={{
                  borderRight: '1px solid rgba(255, 255, 255, 0.06)',
                  background: dropdownOpen ? 'rgba(0, 223, 129, 0.08)' : 'transparent',
                }}
                aria-expanded={dropdownOpen}
                aria-haspopup="listbox"
                id="engine-selector-btn"
              >
                <div className="relative flex items-center justify-center">
                  {activeEngine.logo}
                  {dropdownOpen && (
                    <span className="absolute -inset-1 rounded-full bg-[#00df81]/25 blur-[4px] pointer-events-none" />
                  )}
                </div>
                <svg
                  viewBox="0 0 10 6"
                  width="10"
                  height="6"
                  className="transition-transform duration-200"
                  style={{
                    transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    stroke: dropdownOpen ? '#00df81' : 'rgba(255,255,255,0.3)',
                  }}
                >
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                </svg>
              </button>

              {/* 2-Column HUD Popover */}
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    role="listbox"
                    aria-labelledby="engine-selector-btn"
                    className="absolute z-[9999] rounded-[14px] overflow-hidden select-none"
                    style={{
                      background: 'rgba(9, 12, 18, 0.96)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 24px rgba(0, 223, 129, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                      width: '340px',
                      ...(engineDropdownPlacement === 'top'
                        ? { bottom: 'calc(100% + 8px)', top: 'auto', transformOrigin: 'bottom left' }
                        : { top: 'calc(100% + 8px)', bottom: 'auto', transformOrigin: 'top left' }),
                      left: 0,
                    }}
                    initial={{
                      opacity: 0,
                      y: engineDropdownPlacement === 'top' ? 8 : -8,
                      scale: 0.96,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      y: engineDropdownPlacement === 'top' ? 8 : -8,
                      scale: 0.96,
                    }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {/* 2-Column Grid */}
                    <div className="grid grid-cols-2 gap-1.5 p-2">
                      {ENGINES.map((eng) => {
                        const isSelected = eng.id === engineId;
                        return (
                          <button
                            key={eng.id}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => handleEngineSelect(eng.id)}
                            className="group relative flex items-center justify-between p-2 rounded-[9px] text-left transition-all duration-150 outline-none cursor-pointer"
                            style={{
                              background: isSelected
                                ? 'rgba(0, 223, 129, 0.1)'
                                : 'rgba(255, 255, 255, 0.02)',
                              border: isSelected
                                ? '1px solid rgba(0, 223, 129, 0.45)'
                                : '1px solid rgba(255, 255, 255, 0.06)',
                              boxShadow: isSelected
                                ? '0 0 16px rgba(0, 223, 129, 0.18), inset 0 0 10px rgba(0, 223, 129, 0.05)'
                                : 'none',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.06)';
                                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255, 255, 255, 0.15)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.02)';
                                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255, 255, 255, 0.06)';
                              }
                            }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-6 h-6 rounded-[6px] flex items-center justify-center flex-shrink-0"
                                style={{
                                  background: 'rgba(0, 0, 0, 0.4)',
                                  border: isSelected
                                    ? '1px solid rgba(0, 223, 129, 0.3)'
                                    : '1px solid rgba(255, 255, 255, 0.08)',
                                }}
                              >
                                {eng.logo}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span
                                  className="text-[12px] font-mono font-[600] tracking-tight leading-tight truncate"
                                  style={{
                                    color: isSelected ? '#00df81' : '#f1f5f9',
                                  }}
                                >
                                  {eng.name}
                                </span>
                                <span
                                  className="text-[8px] font-mono font-[700] uppercase tracking-wider px-1 py-[1px] rounded mt-0.5 inline-block w-fit leading-none"
                                  style={{
                                    color: eng.tagColor,
                                    background: eng.tagBg,
                                    border: `1px solid ${eng.tagBorder}`,
                                  }}
                                >
                                  {eng.tag}
                                </span>
                              </div>
                            </div>

                            {/* Shortcut badge or active check */}
                            <div className="flex items-center flex-shrink-0 ml-1">
                              {isSelected ? (
                                <div className="w-4 h-4 rounded-full bg-[#00df81]/20 flex items-center justify-center border border-[#00df81]/40 shadow-[0_0_8px_rgba(0,223,129,0.3)]">
                                  <svg viewBox="0 0 12 12" width="10" height="10">
                                    <path
                                      d="M2.5 6.2l2.3 2.3 4.7-4.7"
                                      stroke="#00df81"
                                      strokeWidth="1.8"
                                      fill="none"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </div>
                              ) : (
                                <kbd
                                  className="font-mono text-[9px] font-[600] px-1.5 py-0.5 rounded text-white/35 group-hover:text-white/70 transition-colors"
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                  }}
                                >
                                  {eng.shortcut}
                                </kbd>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Footer Status Line */}
                    <div className="px-3 py-1.5 bg-black/40 border-t border-white/[0.05] flex items-center justify-between text-[9px] font-mono text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="text-white/40">Active:</span>
                        <span className="text-[#00df81] font-[600]">{activeEngine.name}</span>
                        <span className="text-white/30 font-normal">({activeEngine.description})</span>
                      </span>
                      <span className="text-white/30 hidden sm:inline">Press 1-6 · ESC</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="agent-model-selector"
              className="relative flex-shrink-0"
              ref={modelDropdownRef}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <button
                id="swarm-model-selector-btn"
                type="button"
                onClick={handleToggleModelDropdown}
                title={`Swarm Model: ${activeModelSpec.name} (${activeProviderConfig.name}). Click to change.`}
                className="flex items-center gap-2 px-3 sm:px-3.5 py-3 rounded-l-[18px] transition-all duration-150 outline-none group cursor-pointer select-none"
                style={{
                  borderRight: '1px solid rgba(0, 223, 129, 0.2)',
                  background: modelDropdownOpen ? 'rgba(0, 223, 129, 0.1)' : 'transparent',
                }}
                aria-expanded={modelDropdownOpen}
                aria-haspopup="listbox"
              >
                <div className="relative flex items-center justify-center flex-shrink-0">
                  <AgentOrb size="22px" provider={activeModelSpec.provider} />
                  {modelDropdownOpen && (
                    <span className="absolute -inset-1 rounded-full bg-[#00df81]/25 blur-[4px] pointer-events-none" />
                  )}
                </div>

                <div className="flex flex-col items-start min-w-0 text-left">
                  <div className="flex items-center gap-1.5 max-w-[110px] sm:max-w-[150px]">
                    <span
                      className="text-[12px] font-mono font-[700] tracking-tight leading-tight truncate"
                      style={{ color: modelDropdownOpen ? '#00df81' : '#ffffff' }}
                    >
                      {shortenModelName(activeModelSpec.name)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span
                      className="text-[8.5px] font-mono font-[600] uppercase tracking-wider leading-none"
                      style={{ color: activeProviderConfig.color || '#00df81' }}
                    >
                      {activeProviderConfig.name}
                    </span>
                    {activeModelSpec.hasCustomKey && (
                      <span
                        title="Custom BYOK key configured"
                        className="inline-flex items-center gap-0.5 px-1 py-[1px] rounded text-[7.5px] font-mono font-[700] bg-[#00df81]/15 text-[#00df81] border border-[#00df81]/30 leading-none"
                      >
                        <KeyRound className="size-2" />
                        BYOK
                      </span>
                    )}
                  </div>
                </div>

                <svg
                  viewBox="0 0 10 6"
                  width="10"
                  height="6"
                  className="transition-transform duration-200 ml-0.5 flex-shrink-0"
                  style={{
                    transform: modelDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    stroke: modelDropdownOpen ? '#00df81' : 'rgba(0, 223, 129, 0.5)',
                  }}
                >
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
              </button>

              {/* Swarm Model Selector Popover */}
              <AnimatePresence>
                {modelDropdownOpen && (
                  <motion.div
                    role="listbox"
                    aria-labelledby="swarm-model-selector-btn"
                    className="absolute z-[9999] rounded-[14px] overflow-hidden select-none flex flex-col"
                    style={{
                      background: 'rgba(9, 12, 18, 0.97)',
                      backdropFilter: 'blur(24px)',
                      WebkitBackdropFilter: 'blur(24px)',
                      border: '1px solid rgba(0, 223, 129, 0.22)',
                      boxShadow:
                        '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 24px rgba(0, 223, 129, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                      width: '320px',
                      maxWidth: 'calc(100vw - 32px)',
                      maxHeight: 'min(310px, calc(100vh - 120px))',
                      ...(modelDropdownPlacement === 'top'
                        ? { bottom: 'calc(100% + 8px)', top: 'auto', transformOrigin: 'bottom left' }
                        : { top: 'calc(100% + 8px)', bottom: 'auto', transformOrigin: 'top left' }),
                      left: 0,
                    }}
                    initial={{
                      opacity: 0,
                      y: modelDropdownPlacement === 'top' ? 8 : -8,
                      scale: 0.96,
                    }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{
                      opacity: 0,
                      y: modelDropdownPlacement === 'top' ? 8 : -8,
                      scale: 0.96,
                    }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                  >
                    {/* Header */}
                    <div className="px-3 py-1.5 border-b border-white/[0.08] flex items-center justify-between gap-2 bg-black/40 flex-shrink-0">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00df81] animate-pulse" />
                        <span className="text-[10px] font-mono font-[700] tracking-wider uppercase text-white/90">
                          Swarm Models
                        </span>
                        <span className="text-[9px] font-mono text-white/40 px-1 py-[1px] rounded bg-white/[0.04]">
                          {filteredModels.length}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowByokModal(true);
                          setModelDropdownOpen(false);
                        }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-medium text-[#00df81] bg-[#00df81]/10 hover:bg-[#00df81]/20 border border-[#00df81]/25 transition-all cursor-pointer"
                        title="Manage API Keys (BYOK)"
                      >
                        <KeyRound className="size-2" />
                        BYOK Keys
                      </button>
                    </div>

                    {/* Search inside Popover */}
                    <div className="px-2 py-1.5 border-b border-white/[0.06] bg-black/20 flex-shrink-0">
                      <div className="relative flex items-center">
                        <SearchIconLucide className="absolute left-2 size-3 text-white/40 pointer-events-none" />
                        <input
                          ref={modelSearchInputRef}
                          type="text"
                          value={modelSearchQuery}
                          onChange={(e) => setModelSearchQuery(e.target.value)}
                          placeholder="Search 29+ models..."
                          className="w-full bg-white/[0.04] hover:bg-white/[0.06] focus:bg-white/[0.08] border border-white/[0.08] focus:border-[#00df81]/50 rounded-md pl-6 pr-6 py-1 text-[10.5px] font-mono text-white placeholder-white/40 outline-none transition-all h-[26px]"
                        />
                        {modelSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setModelSearchQuery('')}
                            className="absolute right-2 text-white/40 hover:text-white"
                          >
                            <X className="size-2.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Provider filter chips */}
                    <div
                      onWheel={(e) => {
                        if (e.deltaY !== 0) {
                          e.currentTarget.scrollLeft += e.deltaY;
                        }
                      }}
                      className="flex items-center gap-1 px-2 pt-1 pb-1.5 overflow-x-auto border-b border-white/[0.06] bg-black/10 custom-horizontal-scrollbar flex-shrink-0"
                    >
                      {[
                        { id: 'all', label: 'All' },
                        ...BYOK_PROVIDERS.map((p) => ({
                          id: p.id,
                          label: p.name.replace(' Claude', '').replace(' Cloud', ''),
                        })),
                      ].map((p) => {
                        const isActive = providerFilter === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setProviderFilter(p.id as any)}
                            className="px-1.5 py-0.5 rounded text-[8.5px] font-mono font-[600] whitespace-nowrap transition-all cursor-pointer leading-none"
                            style={{
                              background: isActive ? 'rgba(0, 223, 129, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                              color: isActive ? '#00df81' : 'rgba(255, 255, 255, 0.55)',
                              border: isActive ? '1px solid rgba(0, 223, 129, 0.35)' : '1px solid rgba(255, 255, 255, 0.05)',
                            }}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Model Items List */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-1 space-y-0.5 custom-scrollbar">
                      {filteredModels.length === 0 ? (
                        <div className="py-5 text-center text-[10.5px] font-mono text-white/40">
                          No models matching &quot;{modelSearchQuery}&quot;
                        </div>
                      ) : (
                        filteredModels.map((m) => {
                          const isSelected = m.id === swarmModelId;
                          const provConfig = BYOK_PROVIDERS.find((p) => p.id === m.provider);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => handleModelSelect(m.id)}
                              className="w-full flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-[7px] text-left transition-all group cursor-pointer"
                              style={{
                                background: isSelected ? 'rgba(0, 223, 129, 0.12)' : 'transparent',
                                border: isSelected ? '1px solid rgba(0, 223, 129, 0.28)' : '1px solid transparent',
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.04)';
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent';
                              }}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="size-4 rounded flex items-center justify-center flex-shrink-0 bg-white/[0.04] border border-white/[0.08]">
                                  {getModelIcon(m.id, m.provider)}
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 leading-tight">
                                    <span
                                      className="text-[11px] font-mono font-[600] truncate"
                                      style={{ color: isSelected ? '#00df81' : '#f1f5f9' }}
                                    >
                                      {m.name}
                                    </span>
                                    {m.hasCustomKey && (
                                      <span
                                        title="BYOK key configured"
                                        className="inline-flex items-center gap-0.5 px-1 py-[0.5px] rounded text-[7px] font-mono font-[700] bg-[#00df81]/15 text-[#00df81] border border-[#00df81]/30 leading-none flex-shrink-0"
                                      >
                                        <KeyRound className="size-1.5" />
                                        BYOK
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 mt-0.5 leading-none">
                                    <span
                                      className="text-[8px] font-mono font-[600] uppercase tracking-wider"
                                      style={{ color: provConfig?.color || 'rgba(255,255,255,0.45)' }}
                                    >
                                      {provConfig?.name || m.provider}
                                    </span>
                                    {m.badge && (
                                      <>
                                        <span className="text-white/20 text-[8px]">•</span>
                                        <span className="text-[8px] font-mono text-white/40 truncate">
                                          {m.badge}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center flex-shrink-0 ml-1">
                                {isSelected ? (
                                  <div className="w-3.5 h-3.5 rounded-full bg-[#00df81]/20 flex items-center justify-center border border-[#00df81]/40 shadow-[0_0_6px_rgba(0,223,129,0.3)]">
                                    <Check className="size-2 text-[#00df81]" />
                                  </div>
                                ) : null}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Footer Status Line */}
                    <div className="px-2.5 py-1 bg-black/40 border-t border-white/[0.06] flex items-center justify-between text-[8.5px] font-mono text-white/40 flex-shrink-0">
                      <span className="flex items-center gap-1 truncate mr-2">
                        <span>Active:</span>
                        <span className="text-[#00df81] font-[600] truncate">
                          {shortenModelName(activeModelSpec.name)}
                        </span>
                      </span>
                      <span className="flex-shrink-0 text-white/30">ESC to close</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text input */}
        <input
          ref={inputRef}
          id="main-search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === 'search'
              ? `Search with ${activeEngine.name}…`
              : `Ask the swarm with ${shortenModelName(activeModelSpec.name)}…`
          }
          className="flex-1 bg-transparent px-4 py-3.5 text-[14px] text-white outline-none font-mono font-[500] tracking-normal"
          style={{
            minWidth: 0,
            color: '#ffffff',
          }}
          autoComplete="off"
          spellCheck="false"
        />
        <style jsx>{`
          input::placeholder {
            color: rgba(148, 163, 184, 0.5);
            font-family: 'JetBrains Mono', monospace;
          }
        `}</style>

        {/* Submit button */}
        <motion.button
          onClick={handleSubmit}
          disabled={!query.trim()}
          title={mode === 'search' ? 'Search' : 'Send to Agent Swarm'}
          id="search-submit-btn"
          className="flex items-center justify-center w-12 h-12 m-1 rounded-[10px] flex-shrink-0 transition-all duration-200 outline-none"
          style={{
            background:
              !query.trim()
                ? 'rgba(255, 255, 255, 0.04)'
                : mode === 'agent'
                ? '#00df81'
                : 'rgba(255, 255, 255, 0.1)',
            cursor: !query.trim() ? 'not-allowed' : 'pointer',
            boxShadow:
              query.trim() && mode === 'agent'
                ? '0 0 16px rgba(0, 223, 129, 0.4)'
                : 'none',
          }}
          whileTap={query.trim() ? { scale: 0.93 } : {}}
          aria-label="Submit search"
        >
          {mode === 'agent' ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path d="M22 2L11 13" stroke={query.trim() ? '#000' : 'rgba(255,255,255,0.2)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22 11 13 2 9l20-7z" stroke={query.trim() ? '#000' : 'rgba(255,255,255,0.2)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <circle cx="11" cy="11" r="8" stroke={query.trim() ? '#fff' : 'rgba(255,255,255,0.2)'} strokeWidth="2"/>
              <path d="M21 21l-4.35-4.35" stroke={query.trim() ? '#fff' : 'rgba(255,255,255,0.2)'} strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </motion.button>
      </motion.div>

      {/* ── Agent mode hint ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {mode === 'agent' && (
          <motion.div
            className="flex items-center justify-center gap-2 text-[11px] font-mono font-[500]"
            style={{ color: 'rgba(0, 223, 129, 0.7)' }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.25 }}
          >
            <span>↳ Routing to {activeModelSpec.name} ({activeProviderConfig.name})</span>
            <button
              type="button"
              onClick={() => setShowByokModal(true)}
              className="text-[10px] text-white/40 hover:text-[#00df81] underline underline-offset-2 transition-colors cursor-pointer"
            >
              Configure Keys
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <ByokModal
        isOpen={showByokModal}
        onClose={() => setShowByokModal(false)}
        defaultProvider={activeModelSpec.provider}
      />
    </div>
  );
}
