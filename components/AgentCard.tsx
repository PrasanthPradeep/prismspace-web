'use client';

/**
 * components/AgentCard.tsx
 * ────────────────────────
 * A compact card that displays one Hive agent's status, controls, and metadata.
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
  const color = STATUS_COLORS[status];

  return (
    <span
      className="inline-block w-2 h-2 rounded-full mr-2 flex-shrink-0"
      style={{
        backgroundColor: color,
        boxShadow: isActive
          ? `0 0 6px ${color}`
          : isPaused
          ? `0 0 8px ${color}`
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

  const statusColor = STATUS_COLORS[agent.status];
  const statusLabel = STATUS_LABELS[agent.status];
  const statusIcon = STATUS_ICONS[agent.status];
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
        className="agent-card"
        style={{
          background: isSelected
            ? 'rgba(0,255,136,0.05)'
            : 'rgba(255,255,255,0.03)',
          border: isSelected
            ? `1px solid ${statusColor}55`
            : '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '14px 16px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow accent when selected */}
        {isSelected && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '3px',
              background: statusColor,
              borderRadius: '12px 0 0 12px',
            }}
          />
        )}

        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <AgentOrb provider={agent.provider} seed={agent.id} size="28px" className="flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p
                className="text-white text-sm font-medium truncate"
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
              className="text-white/30 hover:text-red-400 transition-colors text-sm flex-shrink-0"
            >
              {deleting ? '…' : '✕'}
            </button>
          )}
        </div>

        {/* Status row */}
        <div className="flex items-center gap-1.5">
          <StatusPulse status={agent.status} />
          <span className="text-xs font-mono" style={{ color: statusColor }}>
            {statusIcon} {statusLabel}
          </span>
          <span className="text-white/25 text-xs ml-auto font-mono">
            {agent.provider}/{agent.model}
          </span>
        </div>

        {/* HITL approval buttons */}
        {agent.status === 'awaiting_approval' && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={(e) => handleApprove(true, e)}
              disabled={approving}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: 'rgba(74,222,128,0.15)',
                border: '1px solid rgba(74,222,128,0.4)',
                color: '#4ade80',
              }}
            >
              {approving ? '…' : '✓ Approve'}
            </button>
            <button
              onClick={(e) => handleApprove(false, e)}
              disabled={approving}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: 'rgba(248,113,113,0.15)',
                border: '1px solid rgba(248,113,113,0.4)',
                color: '#f87171',
              }}
            >
              {approving ? '…' : '✕ Reject'}
            </button>
          </div>
        )}

        {/* Result preview */}
        {agent.result && terminal && (
          <p className="text-white/50 text-xs mt-2 truncate">{agent.result}</p>
        )}
      </div>
    </ShaderRevealTransition>
  );
}
