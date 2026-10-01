/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import CardFlip from './kokonutui/card-flip';
import {
  WebScraperIcon,
  ColorGenIcon,
  PomodoroIcon,
  SQLIcon,
  BookmarkIcon,
  AgentSwarmIcon,
} from './tools/ToolIcons';

interface Tool {
  icon: React.ReactNode;
  title: string;
  desc: string;
  action?: string;
  href?: string;
  uses?: string[];
}

const tools: Tool[] = [
  {
    icon: <ColorGenIcon size={64} glow />,
    title: 'Color Gen',
    desc: 'Interactive color palette generator',
    action: 'color-gen',
    uses: [
      'Generate color palettes',
      'Pick colors interactively',
      'Export in multiple formats',
      'Create harmonious schemes'
    ]
  },
  {
    icon: <WebScraperIcon size={64} glow />,
    title: 'Web Scraper',
    desc: 'Paste a link and export clean JSON or CSV',
    action: 'web-scraper',
    uses: [
      'Scrape a single page',
      'Crawl linked doc pages',
      'Preview cleaned content',
      'Download JSON or CSV'
    ]
  },
  {
    icon: <PomodoroIcon size={64} glow />,
    title: 'Pomodoro Timer',
    desc: 'Animated focus countdown with Number Flow',
    action: 'pomodoro-timer',
    uses: [
      'Run a 25-minute focus session',
      'Pause or resume the countdown',
      'Reset the timer instantly',
      'Use animated Number Flow digits'
    ]
  },
  {
    icon: <SQLIcon size={64} glow />,
    title: 'SQL Playground',
    desc: 'In-browser SQLite editor powered by WASM',
    action: 'sql-playground',
    uses: [
      'Write and run SQL in-browser',
      'Import .db or .sql files',
      'Inspect schema and tables',
      'Export results as CSV'
    ]
  },
  {
    icon: <BookmarkIcon size={64} glow />,
    title: 'Bookmark Manager',
    desc: 'Save, tag, search, import, export, and track visits',
    href: '/dev-space/bookmark-canvas',
    uses: [
      'Organize with tags',
      'Search across all fields',
      'Track visit counts',
      'Import/export bookmarks'
    ]
  },
  {
    icon: <AgentSwarmIcon size={64} glow />,
    title: 'Agent Swarm',
    desc: 'Orchestrate multiple AI agents on a single task',
    action: 'agent-swarm',
    uses: [
      'Spawn parallel AI agents',
      'Monitor agent progress live',
      'Human-in-the-loop approvals',
      'Inspect per-agent logs'
    ]
  },
];

interface DevSpaceProps {
  onToolAction?: (action: string) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  },
};

export function DevSpace({ onToolAction }: DevSpaceProps) {
  const [opacity, setOpacity] = useState(100);

  useEffect(() => {
    const loadOpacity = () => {
      const saved = localStorage.getItem('devtools_opacity');
      if (saved !== null) {
        setOpacity(Math.max(0, Math.min(100, Number(saved))));
      }
    };
    loadOpacity();
    window.addEventListener('prism:devtools-opacity-change', loadOpacity);
    return () => window.removeEventListener('prism:devtools-opacity-change', loadOpacity);
  }, []);

  const handleCardClick = (tool: Tool) => {
    if (tool.href) {
      window.open(tool.href, '_blank');
    } else if (tool.action && onToolAction) {
      onToolAction(tool.action);
    }
  };

  const alpha = opacity / 100;

  return (
    <div className="min-h-screen py-[60px] px-[40px] flex flex-col items-center justify-start relative z-[2] transition-all duration-300"
      style={{
        background: `linear-gradient(180deg, rgba(9, 12, 18, ${0.85 * alpha}) 0%, rgba(9, 12, 18, ${0.95 * alpha}) 50%, rgba(9, 12, 18, ${0.85 * alpha}) 100%)`,
        backdropFilter: alpha < 0.99 ? `blur(${Math.round(12 * alpha)}px)` : undefined,
        marginTop: '-100vh',
        transform: 'translateY(100vh)'
      }}>

      {/* Section header with cutout box */}
      <motion.div
        className="mb-[30px] text-center flex-shrink-0 flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="cutout-box">
          <h2 className="cutout-text text-[2.5rem]">
            dev space.
          </h2>
        </div>
      </motion.div>

      {/* Tool cards grid with staggered entrance */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1400px] w-full mx-auto flex-1 content-start"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        {tools.map((tool, index) => {
          const card = (
            <CardFlip
              icon={tool.icon}
              title={tool.title}
              subtitle={tool.desc}
              description={tool.desc}
              features={tool.uses || [
                'Feature 1',
                'Feature 2',
                'Feature 3',
                'Feature 4'
              ]}
            />
          );

          return tool.href ? (
            <motion.div
              key={index}
              className="w-full flex justify-center"
              variants={cardVariants}
              layout
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link href={tool.href} className="block w-full" aria-label={`Open ${tool.title}`}>
                {card}
              </Link>
            </motion.div>
          ) : (
            <motion.button
              key={index}
              type="button"
              onClick={() => handleCardClick(tool)}
              className="cursor-pointer w-full flex justify-center border-0 bg-transparent p-0 text-left"
              variants={cardVariants}
              layout
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              {card}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
