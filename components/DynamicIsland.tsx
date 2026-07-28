'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AgentOrb } from '@/components/AgentOrb';

interface IslandEvent {
  title: string;
  subtitle?: string;
  icon?: string;
  duration?: number;
}

interface IslandSettings {
  enabled: boolean;
  showSeconds: boolean;
  autoExpand: boolean;
  clockFormat: '12' | '24';
}

function loadSettings(): IslandSettings {
  if (typeof window === 'undefined') {
    return { enabled: true, showSeconds: false, autoExpand: true, clockFormat: '24' };
  }
  return {
    enabled: localStorage.getItem('dynamicIsland') !== 'false',
    showSeconds: localStorage.getItem('dynamicIslandSeconds') === 'true',
    autoExpand: localStorage.getItem('dynamicIslandExpand') !== 'false',
    clockFormat: (localStorage.getItem('clockFormat') as '12' | '24') || '24',
  };
}

function formatTime(date: Date, format: '12' | '24', showSeconds: boolean): string {
  if (format === '12') {
    let h = date.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    return showSeconds ? `${h}:${m}:${s} ${ampm}` : `${h}:${m} ${ampm}`;
  }
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  return showSeconds ? `${h}:${m}:${s}` : `${h}:${m}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function DynamicIsland() {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<IslandSettings>(loadSettings);
  const [now, setNow] = useState(() => new Date());
  const [hovered, setHovered] = useState(false);
  const [event, setEvent] = useState<IslandEvent | null>(null);
  const [eventVisible, setEventVisible] = useState(false);
  const eventTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mark mounted on client & load settings
  useEffect(() => {
    setMounted(true);
    setSettings(loadSettings());
  }, []);

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Listen for settings changes
  useEffect(() => {
    const handler = () => setSettings(loadSettings());
    window.addEventListener('prism:island-settings', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('prism:island-settings', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  // Listen for event notifications
  const handleIslandEvent = useCallback((e: Event) => {
    if (!settings.autoExpand) return;
    const detail = (e as CustomEvent<IslandEvent>).detail;
    if (!detail?.title) return;

    // Clear any pending timers
    if (eventTimerRef.current) clearTimeout(eventTimerRef.current);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

    setEvent(detail);
    setEventVisible(true);

    const duration = detail.duration ?? 3000;
    // Fade out slightly before removing
    eventTimerRef.current = setTimeout(() => {
      setEventVisible(false);
      dismissTimerRef.current = setTimeout(() => setEvent(null), 400);
    }, duration);
  }, [settings.autoExpand]);

  useEffect(() => {
    window.addEventListener('prism:island-event', handleIslandEvent);
    return () => window.removeEventListener('prism:island-event', handleIslandEvent);
  }, [handleIslandEvent]);

  if (!mounted || !settings.enabled) return null;

  const timeStr = formatTime(now, settings.clockFormat, settings.showSeconds);
  const dateStr = formatDate(now);

  const isExpanded = hovered || eventVisible;
  const showEvent = eventVisible && event;

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 900,
        // Prevent layout shift
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-label="Dynamic Island"
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: 'rgba(0, 0, 0, 0.88)',
          backdropFilter: 'blur(20px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: isExpanded ? '24px' : '999px',
          boxShadow: isExpanded
            ? '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08)'
            : '0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
          width: isExpanded ? (showEvent ? '340px' : '300px') : '130px',
          height: isExpanded ? '72px' : '34px',
          overflow: 'hidden',
          transition: 'width 0.45s cubic-bezier(0.34,1.56,0.64,1), height 0.45s cubic-bezier(0.34,1.56,0.64,1), border-radius 0.45s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease',
          cursor: 'default',
          position: 'relative',
        }}
      >
        {/* Collapsed: time only */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isExpanded ? 0 : 1,
            transform: isExpanded ? 'scale(0.85)' : 'scale(1)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
            pointerEvents: isExpanded ? 'none' : 'auto',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-sans, system-ui)',
              fontSize: '13px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.92)',
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
            }}
          >
            {timeStr}
          </span>
        </div>

        {/* Expanded: time + date / event */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 18px',
            opacity: isExpanded ? 1 : 0,
            transform: isExpanded ? 'scale(1)' : 'scale(0.92)',
            transition: 'opacity 0.3s ease 0.1s, transform 0.3s ease 0.1s',
            pointerEvents: isExpanded ? 'auto' : 'none',
          }}
        >
          {showEvent ? (
            // Event notification layout
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {event.icon && (
                  <span style={{ fontSize: '22px', lineHeight: 1 }}>{event.icon}</span>
                )}
                <div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.95)',
                      lineHeight: 1.2,
                    }}
                  >
                    {event.title}
                  </div>
                  {event.subtitle && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.5)',
                        marginTop: '2px',
                        lineHeight: 1.2,
                      }}
                    >
                      {event.subtitle}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.9)',
                    letterSpacing: '0.01em',
                  }}
                >
                  {timeStr}
                </div>
              </div>
            </>
          ) : (
            // Default expanded: time + date + status
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span
                  style={{
                    fontSize: '22px',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.95)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {timeStr}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.45)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {dateStr}
                </span>
              </div>

              {/* Status pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '999px',
                  padding: '4px 10px 4px 6px',
                }}
              >
                <AgentOrb size="18px" provider="groq" />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.7)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Agent Active
                </span>
              </div>
            </>
          )}
        </div>

        {/* Subtle inner shine */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '50%',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.06), transparent)',
            borderRadius: 'inherit',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
}
