/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * lib/agent-avatar.ts
 * ───────────────────
 * Maps agent identifiers (e.g. "Agent-A", "Agent-B") to sprite positions
 * inside /images/peeps/all-peeps.png — a 13-column × 7-row grid of avatars.
 *
 * Usage:
 *   import { getAgentAvatar } from '@/lib/agent-avatar';
 *   const avatar = getAgentAvatar('Agent-A');
 *   // { col: 0, row: 0, bgX: '0%', bgY: '0%', label: 'Agent-A' }
 */

export interface AgentAvatar {
  /** Zero-based column in the sprite grid */
  col: number;
  /** Zero-based row in the sprite grid */
  row: number;
  /** CSS background-position-x (percentage) */
  bgX: string;
  /** CSS background-position-y (percentage) */
  bgY: string;
  /** Display label for the agent */
  label: string;
}

// The sprite sheet is 13 columns × 7 rows = 91 avatars.
const COLS = 13;
const ROWS = 7;

/**
 * Fixed assignments for named agents.
 * Each entry is [col, row] (0-indexed) pointing to a distinct character.
 * Add more entries for Agent-D onward as needed.
 */
const NAMED_ASSIGNMENTS: Record<string, [number, number]> = {
  'Agent-A': [0, 0],   // row 0, col 0 — woman in blue top & jeans
  'Agent-B': [2, 0],   // row 0, col 2 — man in blue hoodie
  'Agent-C': [4, 0],   // row 0, col 4 — woman in grey jacket
  'Agent-D': [6, 0],   // row 0, col 6 — man in navy suit
  'Agent-E': [8, 0],   // row 0, col 8 — man in green hoodie
  'Agent-F': [10, 0],  // row 0, col 10 — woman in red top
  'Agent-G': [0, 1],   // row 1, col 0 — man in blue hoodie
  'Agent-H': [2, 1],   // row 1, col 2 — woman in yellow jacket
  'Agent-I': [4, 1],   // row 1, col 4 — woman in yellow top
  'Agent-J': [6, 1],   // row 1, col 6 — woman in grey shirt
};

/**
 * Derive a [col, row] from a string by hashing it deterministically,
 * used as fallback when the agent name isn't in NAMED_ASSIGNMENTS.
 */
function hashPosition(name: string): [number, number] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const index = hash % (COLS * ROWS);
  return [index % COLS, Math.floor(index / COLS)];
}

/**
 * Convert a [col, row] grid position to CSS background-position percentages.
 * Using the percentage formula: position% = col / (totalCols - 1) * 100
 */
function toPercent(col: number, row: number): { bgX: string; bgY: string } {
  const bgX = COLS > 1 ? `${(col / (COLS - 1)) * 100}%` : '0%';
  const bgY = ROWS > 1 ? `${(row / (ROWS - 1)) * 100}%` : '0%';
  return { bgX, bgY };
}

/**
 * Returns the avatar descriptor for a given agent name.
 * Falls back to a hash-derived position for unknown agent names.
 */
export function getAgentAvatar(agentName: string): AgentAvatar {
  const [col, row] = NAMED_ASSIGNMENTS[agentName] ?? hashPosition(agentName);
  const { bgX, bgY } = toPercent(col, row);
  return { col, row, bgX, bgY, label: agentName };
}

/**
 * Returns an inline style object to render the avatar as a background-image
 * sprite crop. Apply to a div with the desired width/height.
 *
 * @param agentName  e.g. "Agent-A"
 * @param sizePx     The display size of the avatar box (square), default 56px
 */
export function getAgentAvatarStyle(
  agentName: string,
  sizePx = 56,
): React.CSSProperties {
  const { bgX, bgY } = getAgentAvatar(agentName);
  return {
    backgroundImage: "url('/images/peeps/all-peeps.png')",
    backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
    backgroundPosition: `${bgX} ${bgY}`,
    backgroundRepeat: 'no-repeat',
    width: sizePx,
    height: sizePx,
    borderRadius: '50%',
    flexShrink: 0,
  };
}
