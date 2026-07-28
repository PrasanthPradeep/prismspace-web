import { useState, useEffect } from 'react';
import CardFlip from './kokonutui/card-flip';

interface Tool {
  icon: string;
  title: string;
  desc: string;
  action?: string;
  href?: string;
  uses?: string[];
}

const tools: Tool[] = [
  {
    icon: '🐙',
    title: 'Git Reference',
    desc: 'Cheat sheet, builder, scenarios',
    action: 'git-reference',
    uses: [
      'Quick command reference',
      'Build complex git commands',
      'Learn common scenarios',
      'Master git workflows'
    ]
  },

  {
    icon: '🎨',
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
    icon: '📱',
    title: 'QR Code Generator',
    desc: 'Create custom QR codes for URLs, WiFi, vCards, and more',
    action: 'qr-generator',
    uses: [
      'Generate QR codes',
      'WiFi network sharing',
      'Contact cards (vCard)',
      'Customize colors & size'
    ]
  },
  {
    icon: '🧾',
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
    icon: '⏱️',
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
    icon: '🗄️',
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
    icon: '🔖',
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
    icon: '🐝',
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
        background: `linear-gradient(180deg, rgba(0, 0, 0, ${0.4 * alpha}) 0%, rgba(0, 0, 0, ${0.6 * alpha}) 50%, rgba(0, 0, 0, ${0.4 * alpha}) 100%)`,
        backdropFilter: alpha < 0.99 ? `blur(${Math.round(12 * alpha)}px)` : undefined,
        marginTop: '-100vh',
        transform: 'translateY(100vh)'
      }}>
      <div className="mb-[30px] text-center animate-fadeInUp flex-shrink-0">
        <h2 className="font-sans text-[2.5rem] font-semibold text-white m-0 tracking-tight text-shadow-sm">
          Dev Space
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1400px] w-full mx-auto 
                      animate-fadeInUp flex-1 content-start">
        {tools.map((tool, index) => (
          <div
            key={index}
            onClick={() => handleCardClick(tool)}
            className="cursor-pointer w-full flex justify-center"
          >
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
          </div>
        ))}
      </div>
    </div>
  );
}
