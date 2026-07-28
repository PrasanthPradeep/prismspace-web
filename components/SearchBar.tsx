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

import { useState, useEffect, useRef, useCallback } from 'react';
import { AgentOrb } from './AgentOrb';

// ── Search engine definitions ─────────────────────────────────────────────────

type EngineId = 'google' | 'brave' | 'duckduckgo' | 'bing' | 'perplexity' | 'kagi';

interface Engine {
  id: EngineId;
  name: string;
  url: (q: string) => string;
  color: string;       // brand accent for the active indicator
  logo: React.ReactNode;
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
    <circle cx="12" cy="8" r="4" stroke="#00ff88" strokeWidth="1.5"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="18" cy="6" r="2" fill="#00ff88" opacity="0.7"/>
    <path d="M18 4v1m0 2v1m-1-3h1m2 0h1" stroke="#00ff88" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
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
  },
  {
    id: 'brave',
    name: 'Brave',
    url: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}`,
    color: '#FB542B',
    logo: <EngineLogo domain="brave.com" name="Brave" color="#FB542B" />,
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
    color: '#DE5833',
    logo: <EngineLogo domain="duckduckgo.com" name="DuckDuckGo" color="#DE5833" />,
  },
  {
    id: 'bing',
    name: 'Bing',
    url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
    color: '#0078D4',
    logo: <EngineLogo domain="bing.com" name="Bing" color="#0078D4" />,
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    url: (q) => `https://www.perplexity.ai/search?q=${encodeURIComponent(q)}`,
    color: '#20B2AA',
    logo: <EngineLogo domain="perplexity.ai" name="Perplexity" color="#20B2AA" />,
  },
  {
    id: 'kagi',
    name: 'Kagi',
    url: (q) => `https://kagi.com/search?q=${encodeURIComponent(q)}`,
    color: '#F6C14E',
    logo: <EngineLogo domain="kagi.com" name="Kagi" color="#F6C14E" />,
  },
];

type Mode = 'search' | 'agent';

interface SearchBarProps {
  onAgentSubmit?: (query: string) => void; // called when in agent mode
}

export function SearchBar({ onAgentSubmit }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode>('search');
  const [engineId, setEngineId] = useState<EngineId>('google');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Restore preferences from localStorage
  useEffect(() => {
    setMounted(true);
    const savedEngine = localStorage.getItem('searchEngine') as EngineId | null;
    const savedMode = localStorage.getItem('searchMode') as Mode | null;
    if (savedEngine && ENGINES.find((e) => e.id === savedEngine)) setEngineId(savedEngine);
    if (savedMode) setMode(savedMode);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeEngine = ENGINES.find((e) => e.id === engineId) ?? ENGINES[0];

  const handleModeToggle = (m: Mode) => {
    setMode(m);
    localStorage.setItem('searchMode', m);
    inputRef.current?.focus();
  };

  const handleEngineSelect = (id: EngineId) => {
    setEngineId(id);
    localStorage.setItem('searchEngine', id);
    setDropdownOpen(false);
    inputRef.current?.focus();
  };

  const handleSubmit = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    if (mode === 'search') {
      window.open(activeEngine.url(q), '_blank', 'noopener,noreferrer');
    } else {
      onAgentSubmit?.(q);
    }
    setQuery('');
  }, [query, mode, activeEngine, onAgentSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') setDropdownOpen(false);
  };

  if (!mounted) return null;

  return (
    <div
      className="flex flex-col items-center gap-3 w-full"
      style={{ maxWidth: '640px' }}
    >
      {/* ── Mode toggle ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center p-1 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {([
          { id: 'search', label: '🔍 Search', hint: 'Search the web' },
          { id: 'agent', label: '🐝 Agent Swarm', hint: 'Ask the agent swarm' },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => handleModeToggle(id)}
            title={id === 'agent' ? 'Run query through Agent Swarm' : 'Search the web'}
            className="relative px-5 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200 outline-none"
            style={{
              background:
                mode === id
                  ? id === 'agent'
                    ? 'linear-gradient(135deg, rgba(0,255,136,0.25) 0%, rgba(0,196,255,0.2) 100%)'
                    : 'rgba(255,255,255,0.12)'
                  : 'transparent',
              color: mode === id ? '#fff' : 'rgba(255,255,255,0.45)',
              boxShadow:
                mode === id && id === 'agent'
                  ? '0 0 12px rgba(0,255,136,0.2)'
                  : 'none',
              border: mode === id
                ? id === 'agent'
                  ? '1px solid rgba(0,255,136,0.3)'
                  : '1px solid rgba(255,255,255,0.15)'
                : '1px solid transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Search input row ──────────────────────────────────────────────── */}
      <div
        className="flex items-center w-full rounded-2xl transition-all duration-300"
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: mode === 'agent'
            ? '1px solid rgba(0,255,136,0.35)'
            : '1px solid rgba(255,255,255,0.14)',
          backdropFilter: 'blur(20px)',
          boxShadow: mode === 'agent'
            ? '0 0 24px rgba(0,255,136,0.1), 0 4px 24px rgba(0,0,0,0.4)'
            : '0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        {/* Engine selector (search mode) / Agent icon (agent mode) */}
        {mode === 'search' ? (
          <div className="relative flex-shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              title="Change search engine"
              className="flex items-center gap-2 px-4 py-3.5 rounded-l-2xl transition-all duration-150 outline-none group"
              style={{
                borderRight: '1px solid rgba(255,255,255,0.08)',
                background: dropdownOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
              }}
              aria-expanded={dropdownOpen}
              aria-haspopup="listbox"
              id="engine-selector-btn"
            >
              {activeEngine.logo}
              <svg
                viewBox="0 0 10 6"
                width="10"
                height="6"
                className="transition-transform duration-200"
                style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <path d="M1 1l4 4 4-4" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Dropdown — uses position:fixed to escape overflow:hidden */}
            {dropdownOpen && (
              <div
                role="listbox"
                aria-labelledby="engine-selector-btn"
                className="fixed z-[9999] rounded-xl overflow-hidden"
                style={{
                  background: 'rgba(10,10,10,0.92)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(24px)',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
                  width: '180px',
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                }}
              >
                {ENGINES.map((eng) => (
                  <button
                    key={eng.id}
                    role="option"
                    aria-selected={eng.id === engineId}
                    onClick={() => handleEngineSelect(eng.id)}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left transition-colors duration-150 outline-none"
                    style={{
                      background:
                        eng.id === engineId
                          ? `${eng.color}1a`
                          : 'transparent',
                      color: eng.id === engineId ? '#fff' : 'rgba(255,255,255,0.65)',
                      borderLeft: eng.id === engineId
                        ? `2px solid ${eng.color}`
                        : '2px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        eng.id === engineId ? `${eng.color}1a` : 'transparent';
                    }}
                  >
                    <span className="flex-shrink-0">{eng.logo}</span>
                    <span className="font-medium">{eng.name}</span>
                    {eng.id === engineId && (
                      <svg className="ml-auto" viewBox="0 0 12 12" width="12" height="12">
                        <path d="M2 6l3 3 5-5" stroke={eng.color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center px-3.5 py-3 flex-shrink-0" style={{ borderRight: '1px solid rgba(0,255,136,0.15)' }}>
            <AgentOrb size="24px" provider="groq" />
          </div>
        )}

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
              : 'Ask the agent swarm anything…'
          }
          className="flex-1 bg-transparent px-4 py-3.5 text-base text-white outline-none placeholder-white/25 font-sans"
          style={{ minWidth: 0 }}
          autoComplete="off"
          spellCheck="false"
        />

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!query.trim()}
          title={mode === 'search' ? 'Search' : 'Send to Agent Swarm'}
          id="search-submit-btn"
          className="flex items-center justify-center w-12 h-12 m-1 rounded-xl flex-shrink-0 transition-all duration-200 outline-none"
          style={{
            background:
              !query.trim()
                ? 'rgba(255,255,255,0.06)'
                : mode === 'agent'
                ? 'linear-gradient(135deg, #00ff88 0%, #00c4ff 100%)'
                : 'rgba(255,255,255,0.15)',
            cursor: !query.trim() ? 'not-allowed' : 'pointer',
            boxShadow:
              query.trim() && mode === 'agent'
                ? '0 0 16px rgba(0,255,136,0.4)'
                : 'none',
          }}
          aria-label="Submit search"
        >
          {mode === 'agent' ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path d="M22 2L11 13" stroke={query.trim() ? '#000' : 'rgba(255,255,255,0.3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22 11 13 2 9l20-7z" stroke={query.trim() ? '#000' : 'rgba(255,255,255,0.3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <circle cx="11" cy="11" r="8" stroke={query.trim() ? '#fff' : 'rgba(255,255,255,0.3)'} strokeWidth="2"/>
              <path d="M21 21l-4.35-4.35" stroke={query.trim() ? '#fff' : 'rgba(255,255,255,0.3)'} strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      </div>

      {/* ── Agent mode hint ───────────────────────────────────────────────── */}
      {mode === 'agent' && (
        <p
          className="text-xs font-mono animate-fadeInUp"
          style={{ color: 'rgba(0,255,136,0.5)' }}
        >
          ↳ Query will be sent to the Agent Swarm orchestrator
        </p>
      )}

      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.3s ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-fadeInUp { animation: none; }
        }
      `}</style>
    </div>
  );
}
