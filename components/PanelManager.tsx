/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { PanelType } from './panel-types';
import { NotepadPanel } from './tools/NotepadPanel';
import { TodoPanel } from './tools/TodoPanel';
import { ColorGenerator } from './tools/ColorGenerator';
import { WebScraperTool } from './tools/WebScraperTool';
import { PomodoroTimer } from './tools/PomodoroTimer';
import { SQLPlayground } from './tools/SQLPlayground';
import { AgentSwarm } from './AgentSwarm';

interface PanelConfig {
  type: PanelType;
  title: string;
  position: 'left' | 'right' | 'full' | 'center';
  width?: string;
  maxWidth?: string;
  maxHeight?: string;
  component?: React.ComponentType<{ onClose: () => void }>;
  iframeSrc?: string;
}

const panelConfigs: Record<PanelType, PanelConfig> = {
  'notepad': {
    type: 'notepad',
    title: 'Notepad',
    position: 'left',
    width: '500px',
    component: NotepadPanel,
  },
  'todo': {
    type: 'todo',
    title: 'To-Do List',
    position: 'left',
    width: '480px',
    component: TodoPanel,
  },

  'color-gen': {
    type: 'color-gen',
    title: 'Color Generator',
    position: 'right',
    width: '600px',
    component: ColorGenerator,
  },
  'web-scraper': {
    type: 'web-scraper',
    title: 'Web Scraper',
    position: 'right',
    width: '82%',
    component: WebScraperTool,
  },
  'pomodoro-timer': {
    type: 'pomodoro-timer',
    title: 'Pomodoro Timer',
    position: 'right',
    width: '82%',
    component: PomodoroTimer,
  },
  'sql-playground': {
    type: 'sql-playground',
    title: 'SQL Playground',
    position: 'right',
    width: '88%',
    component: SQLPlayground,
  },
  'prompt-synthesizer': {
    type: 'prompt-synthesizer',
    title: 'Prompt Synthesizer',
    position: 'right',
    width: '80%',
    iframeSrc: '/dev-space/prompt-synthesizer.html',
  },
  'writing-assistant': {
    type: 'writing-assistant',
    title: 'Writing Assistant',
    position: 'right',
    width: '90%',
    iframeSrc: '/dev-space/writing-assistant.html',
  },

  'code-explainer': {
    type: 'code-explainer',
    title: 'Code Explainer',
    position: 'right',
    width: '90%',
    iframeSrc: '/dev-space/code-explainer.html',
  },
  'code-translator': {
    type: 'code-translator',
    title: 'Code Translator',
    position: 'right',
    width: '90%',
    iframeSrc: '/dev-space/code-translator.html',
  },
  'decision-analyzer': {
    type: 'decision-analyzer',
    title: 'Decision Analyzer',
    position: 'right',
    width: '90%',
    iframeSrc: '/dev-space/decision-analyzer.html',
  },
  'agent-swarm': {
    type: 'agent-swarm',
    title: 'Agent Swarm',
    position: 'center',
    width: '100%',
    maxWidth: '1600px',
    maxHeight: '95vh',
    component: AgentSwarm,
  },
};

// Animation variants for panel positions
const panelVariants = {
  left: {
    initial: { x: '-100%', opacity: 0.8 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '-100%', opacity: 0 },
  },
  right: {
    initial: { x: '100%', opacity: 0.8 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '100%', opacity: 0 },
  },
  full: {
    initial: { scale: 0.92, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
  },
  center: {
    initial: { scale: 0.95, opacity: 0, y: 14 },
    animate: { scale: 1, opacity: 1, y: 0 },
    exit: { scale: 0.97, opacity: 0, y: 14 }, // mirror entry path — exits the same way it arrived
  },
};

// Critically-damped spring (ratio ≈ 1.0): settles smoothly without snapping dead.
// Apple default: damping ~1.0, response ~0.35s. Maps to stiffness≈280, damping≈33, mass≈1.
const springTransition = {
  type: 'spring' as const,
  stiffness: 280,
  damping: 33,
  mass: 1,
};

const exitTransition = {
  duration: 0.22,
  ease: [0.4, 0, 1, 1] as [number, number, number, number],
};

interface PanelManagerProps {
  activePanel: PanelType | null;
  onClose: () => void;
}

export function PanelManager({ activePanel, onClose }: PanelManagerProps) {
  const [opacity, setOpacity] = useState(100);

  useEffect(() => {
    const loadOpacity = () => {
      const saved = localStorage.getItem('devtools_opacity');
      if (saved !== null) {
        setOpacity(Math.max(10, Math.min(100, Number(saved))));
      }
    };
    loadOpacity();
    window.addEventListener('prism:devtools-opacity-change', loadOpacity);
    return () => window.removeEventListener('prism:devtools-opacity-change', loadOpacity);
  }, []);

  const config = activePanel ? panelConfigs[activePanel] : null;

  const positionClasses: Record<string, string> = {
    left: 'left-0',
    right: 'right-0',
    full: 'inset-0',
    center: 'inset-0',
  };

  return (
    // No mode="wait" — panels are interruptible; enter and exit overlap
    <AnimatePresence>
      {activePanel && config && (() => {
        const Component = config.component;
        const variants = panelVariants[config.position];

        return (
          <>
            {/* Overlay with mint tint */}
            <motion.div
              key="panel-overlay"
              className="fixed inset-0 z-[1000]"
              style={{
                backgroundColor: `rgba(0, 0, 0, ${0.6 * (opacity / 100)})`,
                backdropFilter: `blur(${Math.round(8 * (opacity / 100))}px)`,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={onClose}
            />

            {/* Panel */}
            {config.position === 'center' ? (
              <div className="fixed inset-0 z-[1001] flex items-center justify-center p-2 sm:p-3 pointer-events-none">
                <motion.div
                  key={`panel-${activePanel}`}
                  className="pointer-events-auto relative flex flex-col w-full rounded-2xl overflow-hidden shadow-2xl border"
                  style={{
                    maxWidth: config.maxWidth || '1600px',
                    width: '98vw',
                    height: config.maxHeight || '95vh',
                    maxHeight: '96vh',
                    background: `rgba(9, 12, 18, ${Math.max(0.85, opacity / 100)})`,
                    backdropFilter: `blur(${Math.round(20 * (opacity / 100))}px) saturate(1.4)`,
                    WebkitBackdropFilter: `blur(${Math.round(20 * (opacity / 100))}px) saturate(1.4)`,
                    opacity: Math.max(0.1, opacity / 100),
                    borderColor: 'var(--prism-border-card)',
                    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(0, 223, 129, 0.1)',
                  }}
                  initial={variants.initial}
                  animate={variants.animate}
                  exit={variants.exit}
                  transition={springTransition}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="h-full overflow-hidden flex flex-col min-h-0">
                    {Component ? (
                      <Component onClose={onClose} />
                    ) : config.iframeSrc ? (
                      <iframe
                        src={config.iframeSrc}
                        className="w-full h-full border-0 block"
                        title={config.title}
                      />
                    ) : (
                      <div className="p-8">
                        <h2 className="text-2xl font-sans font-[700] text-white mb-4 tracking-[-0.02em]">{config.title}</h2>
                        <p className="font-mono text-[12px]" style={{ color: '#94a3b8' }}>Loading...</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            ) : (
              <motion.div
                key={`panel-${activePanel}`}
                className={`fixed top-0 h-screen z-[1001] ${positionClasses[config.position]}
                           ${config.position === 'left' ? 'border-r' : ''}
                           ${config.position === 'right' ? 'border-l' : ''}
                           ${config.position === 'full' ? '' : ''}`}
                style={{
                  width: config.position === 'full' ? '100%' : config.width,
                  maxWidth: config.position === 'full' ? '90vw' : undefined,
                  overflowX: 'hidden',
                  background: `rgba(9, 12, 18, ${opacity / 100})`,
                  backdropFilter: `blur(${Math.round(20 * (opacity / 100))}px) saturate(1.4)`,
                  WebkitBackdropFilter: `blur(${Math.round(20 * (opacity / 100))}px) saturate(1.4)`,
                  opacity: Math.max(0.1, opacity / 100),
                  borderColor: 'rgba(255, 255, 255, 0.06)',
                  boxShadow: '0 0 80px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
                }}
                initial={variants.initial}
                animate={variants.animate}
                exit={variants.exit}
                transition={springTransition}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Panel content */}
                <div className="h-full overflow-auto">
                  {Component ? (
                    <Component onClose={onClose} />
                  ) : config.iframeSrc ? (
                    <iframe
                      src={config.iframeSrc}
                      className="w-full h-full border-0 block"
                      title={config.title}
                    />
                  ) : (
                    <div className="p-8">
                      <h2 className="text-2xl font-sans font-[700] text-white mb-4 tracking-[-0.02em]">{config.title}</h2>
                      <p className="font-mono text-[12px]" style={{ color: '#94a3b8' }}>Loading...</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </>
        );
      })()}
    </AnimatePresence>
  );
}
