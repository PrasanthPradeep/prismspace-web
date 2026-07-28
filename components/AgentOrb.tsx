'use client';

import SiriOrb from '@/components/ui/smoothui/siri-orb';
import { ModelProvider } from '@/lib/agent-swarm-client';

export const PROVIDER_ORB_COLORS: Record<
  string,
  { bg: string; c1: string; c2: string; c3: string }
> = {
  nvidia: {
    bg: 'oklch(12% 0.05 140)',
    c1: 'oklch(76% 0.28 140)', // NVIDIA green
    c2: 'oklch(72% 0.22 100)', // Lime
    c3: 'oklch(68% 0.20 180)', // Teal
  },
  groq: {
    bg: 'oklch(15% 0.05 25)',
    c1: 'oklch(75% 0.26 35)',  // Groq Neon Orange
    c2: 'oklch(70% 0.25 15)',  // Coral
    c3: 'oklch(85% 0.22 80)',  // Yellow
  },
};

export const AGENT_COLOR_PALETTES: Record<
  string,
  { bg: string; c1: string; c2: string; c3: string }
> = {
  'agent-a': {
    bg: 'oklch(15% 0.04 140)',
    c1: 'oklch(75% 0.24 140)', // Cyber Emerald / Green
    c2: 'oklch(80% 0.22 170)', // Cyan
    c3: 'oklch(70% 0.20 110)', // Lime
  },
  'agent-b': {
    bg: 'oklch(15% 0.04 260)',
    c1: 'oklch(72% 0.26 260)', // Sapphire Blue
    c2: 'oklch(78% 0.24 220)', // Sky Blue
    c3: 'oklch(70% 0.22 290)', // Indigo
  },
  'agent-c': {
    bg: 'oklch(15% 0.04 320)',
    c1: 'oklch(74% 0.26 320)', // Neon Pink / Purple
    c2: 'oklch(78% 0.22 350)', // Hot Pink
    c3: 'oklch(70% 0.24 280)', // Violet
  },
  'agent-d': {
    bg: 'oklch(15% 0.04 40)',
    c1: 'oklch(75% 0.26 40)',  // Sunset Amber / Orange
    c2: 'oklch(80% 0.22 65)',  // Gold
    c3: 'oklch(70% 0.24 15)',  // Crimson
  },
  'agent-e': {
    bg: 'oklch(15% 0.04 190)',
    c1: 'oklch(76% 0.24 190)', // Bright Turquoise
    c2: 'oklch(80% 0.20 150)', // Mint
    c3: 'oklch(72% 0.22 230)', // Deep Aqua
  },
  'agent-f': {
    bg: 'oklch(15% 0.04 280)',
    c1: 'oklch(74% 0.26 280)', // Electric Lavender
    c2: 'oklch(78% 0.22 310)', // Orchid
    c3: 'oklch(70% 0.24 240)', // Cobalt
  },
  'agent-g': {
    bg: 'oklch(15% 0.04 85)',
    c1: 'oklch(78% 0.24 85)',  // Vivid Chartreuse
    c2: 'oklch(82% 0.20 110)', // Lime
    c3: 'oklch(74% 0.22 60)',  // Gold
  },
  'agent-h': {
    bg: 'oklch(15% 0.04 350)',
    c1: 'oklch(75% 0.26 350)', // Neon Fuchsia
    c2: 'oklch(80% 0.22 20)',  // Peach
    c3: 'oklch(70% 0.24 310)', // Magenta
  },
};

export interface AgentOrbProps {
  provider?: ModelProvider | string;
  seed?: string;
  size?: string;
  className?: string;
  animationDuration?: number;
}

export function AgentOrb({
  provider,
  seed,
  size = '32px',
  className,
  animationDuration = 12,
}: AgentOrbProps) {
  let colors: { bg: string; c1: string; c2: string; c3: string } | undefined;

  // 1. If seed is passed, look up specific agent palette or generate a unique one
  if (seed) {
    const key = seed.toLowerCase().trim();
    if (AGENT_COLOR_PALETTES[key]) {
      colors = AGENT_COLOR_PALETTES[key];
    } else {
      // Deterministically generate a distinct multi-hue color palette from seed hash
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
      }
      const hue1 = hash % 360;
      const hue2 = (hue1 + 50) % 360;
      const hue3 = (hue1 + 310) % 360;
      colors = {
        bg: `oklch(15% 0.04 ${hue1})`,
        c1: `oklch(75% 0.24 ${hue1})`,
        c2: `oklch(80% 0.22 ${hue2})`,
        c3: `oklch(70% 0.22 ${hue3})`,
      };
    }
  }

  // 2. If no seed colors, use provider palette
  if (!colors && provider) {
    colors = PROVIDER_ORB_COLORS[provider.toLowerCase()];
  }

  // 3. Fallback default
  colors = colors || PROVIDER_ORB_COLORS.groq;

  return (
    <SiriOrb
      size={size}
      colors={colors}
      animationDuration={animationDuration}
      className={className}
    />
  );
}

export default AgentOrb;
