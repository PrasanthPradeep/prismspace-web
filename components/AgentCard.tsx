/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

/**
 * components/AgentCard.tsx
 * ────────────────────────
 * A compact card that displays one Hive agent's status, controls, and metadata.
 * Styled with PrismSpace High-Voltage design system.
 */

import { useState } from 'react';
import {
  SwarmAgent,
  AgentStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  isTerminal,
  approveAgent,
  deleteAgent,
} from '@/lib/agent-swarm-client';

import { AgentOrb } from '@/components/AgentOrb';
import ShaderRevealTransition from '@/components/ui/smoothui/shader-reveal-transition';
import { StatefulButton } from '@/components/ui/stateful-button';

interface AgentCardProps {
  agent: SwarmAgent;
  isSelected: boolean;
  onSelect: () => void;
  onRefresh: () => void;
}

const STATUS_ICONS: Record<AgentStatus, string> = {
  initialising: '⚡',
  planning: '🧠',
  running: '⚙️',
  awaiting_approval: '⏸️',
  completed: '✅',
  failed: '❌',
  cancelled: '🛑',
};

function StatusPulse({ status }: { status: AgentStatus }) {
  const isActive = ['initialising', 'planning', 'running'].includes(status);
  const isPaused = status === 'awaiting_approval';
  const color = STATUS_COLORS[status] || '#00df81';

  return (
    <span
      className="inline-block w-2 h-2 rounded-full mr-2 flex-shrink-0"
      style={{
        backgroundColor: color,
        boxShadow: isActive
          ? `0 0 8px ${color}`
          : isPaused
          ? `0 0 10px ${color}`
          : 'none',
        animation: isActive
          ? 'pulse 1.2s ease-in-out infinite'
          : isPaused
          ? 'pulse 0.8s ease-in-out infinite'
          : 'none',
      }}
    />
  );
}

export function AgentCard({ agent, isSelected, onSelect, onRefresh }: AgentCardProps) {
  const [approving, setApproving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleApprove = async (approved: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    setApproving(true);
    try {
      await approveAgent(agent.id, approved);
      onRefresh();
    } finally {
      setApproving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(true);
    try {
      await deleteAgent(agent.id);
      onRefresh();
    } finally {
      setDeleting(false);
    }
  };

  const elapsed = Math.round(
    (new Date().getTime() - new Date(agent.created_at).getTime()) / 1000,
  );
  const elapsedStr =
    elapsed < 60
      ? `${elapsed}s ago`
      : elapsed < 3600
      ? `${Math.floor(elapsed / 60)}m ago`
      : `${Math.floor(elapsed / 3600)}h ago`;

  const statusColor = STATUS_COLORS[agent.status] || '#00df81';
  const statusLabel = STATUS_LABELS[agent.status] || agent.status;
  const statusIcon = STATUS_ICONS[agent.status] || '•';
  const terminal = isTerminal(agent.status);
  const isRunning = ['initialising', 'planning', 'running'].includes(agent.status);

  return (
    <ShaderRevealTransition
      variant="zoom"
      transitionKey={`${agent.id}-${isRunning ? 'running' : 'idle'}`}
      duration={750}
      className="rounded-[12px]"
    >
      <div
        onClick={onSelect}
        className={`layer-row relative cursor-pointer overflow-hidden transition-all duration-200 ${
          isSelected ? 'highlighted' : ''
        }`}
        style={{
          borderLeft: isSelected ? `3px solid ${statusColor}` : undefined,
          background: isSelected ? 'var(--prism-card-active)' : 'var(--prism-card)',
          borderColor: isSelected ? 'var(--prism-border-active)' : 'var(--prism-border-card)',
          boxShadow: isSelected ? '0 0 20px rgba(0, 223, 129, 0.12), inset 0 0 12px rgba(0, 223, 129, 0.04)' : undefined,
        }}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <AgentOrb provider={agent.provider} seed={agent.id} size="28px" className="flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p
                className="text-white text-sm font-medium truncate font-sans"
                title={agent.objective}
              >
                {agent.objective}
              </p>
              <p className="text-white/40 text-xs mt-0.5 font-mono">
                {agent.id.slice(0, 8)}… · {elapsedStr}
              </p>
            </div>
          </div>

          {/* Delete button (terminal states) */}
          {terminal && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Remove agent"
              className="text-white/30 hover:text-red-400 active:scale-75 transition-all text-xs p-1 flex-shrink-0 rounded hover:bg-white/5"
            >
              {deleting ? '…' : '✕'}
            </button>
          )}
        </div>

        {/* Status row */}
        <div className="flex items-center gap-1.5 pt-1">
          <StatusPulse status={agent.status} />
          <span
            className="text-[11px] font-mono font-medium"
            style={{ color: statusColor }}
          >
            {statusIcon} {statusLabel}
          </span>
          <span className="text-white/30 text-[11px] ml-auto font-mono">
            {agent.provider}/{agent.model}
          </span>
        </div>

        {/* HITL approval buttons */}
        {agent.status === 'awaiting_approval' && (
          <>
            {agent.pending_approval && (
              <div className="mt-3 rounded-md px-2 py-1 text-[10px] font-mono text-amber-200" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                Approval required: {agent.pending_approval.tool}
              </div>
            )}
            <div className="flex gap-2 mt-2 pt-2" style={{ borderTop: '1px solid var(--prism-border-card)' }}>
              <StatefulButton
              onClick={(e) => handleApprove(true, e)}
              loading={approving}
              disabled={approving}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-mono font-bold tracking-wider uppercase transition-all"
              style={{
                background: 'rgba(0, 223, 129, 0.15)',
                border: '1px solid rgba(0, 223, 129, 0.4)',
                color: 'var(--prism-primary)',
              }}
            >
              ✓ Approve
              </StatefulButton>
              <StatefulButton
              onClick={(e) => handleApprove(false, e)}
              loading={approving}
              disabled={approving}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-mono font-bold tracking-wider uppercase transition-all"
              style={{
                background: 'rgba(248, 113, 113, 0.12)',
                border: '1px solid rgba(248, 113, 113, 0.35)',
                color: '#fca5a5',
              }}
            >
              ✕ Reject
              </StatefulButton>
            </div>
          </>
        )}

        {/* Result preview */}
        {agent.result && terminal && (
          <p className="text-white/50 text-xs mt-2 truncate font-mono bg-black/20 px-2 py-1 rounded">
            {agent.result}
          </p>
        )}
      </div>
    </ShaderRevealTransition>
  );
}
