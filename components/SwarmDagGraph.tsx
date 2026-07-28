'use client';

import { useState } from 'react';
import { AgentOrb } from '@/components/AgentOrb';
import type { SwarmAgent } from '@/lib/agent-swarm-client';

interface SwarmDagGraphProps {
  agent: SwarmAgent;
  logLines: string[];
}

export interface DagNode {
  id: string;
  label: string;
  sublabel: string;
  type: 'root' | 'planner' | 'agent' | 'approval' | 'synthesizer';
  status: 'idle' | 'running' | 'awaiting_approval' | 'completed' | 'failed' | 'cancelled';
  seed?: string;
  x: number;
  y: number;
}

export interface DagEdge {
  from: string;
  to: string;
  active: boolean;
}

export function SwarmDagGraph({ agent, logLines }: SwarmDagGraphProps) {
  const [hoveredNode, setHoveredNode] = useState<DagNode | null>(null);

  // Determine active stage from agent status & log lines
  const lastLine = logLines[logLines.length - 1] ?? '';
  const isTerminated = ['completed', 'failed', 'cancelled'].includes(agent.status);

  // Build sub-agent list dynamically
  const maxAgents = Math.min(3, Math.max(1, agent.max_agents || 1));
  const subAgents = Array.from({ length: maxAgents }, (_, i) => `Agent-${String.fromCharCode(65 + i)}`);

  // Compute node statuses
  const rootStatus: DagNode['status'] = 'completed';
  const plannerStatus: DagNode['status'] =
    agent.status === 'initialising'
      ? 'running'
      : ['planning', 'running', 'awaiting_approval', 'completed'].includes(agent.status)
      ? 'completed'
      : agent.status === 'failed'
      ? 'failed'
      : 'idle';

  const approvalStatus: DagNode['status'] = !agent.human_in_loop
    ? 'completed'
    : agent.status === 'awaiting_approval'
    ? 'awaiting_approval'
    : ['running', 'completed'].includes(agent.status)
    ? 'completed'
    : agent.status === 'cancelled'
    ? 'cancelled'
    : 'idle';

  const synthesizerStatus: DagNode['status'] =
    agent.status === 'completed'
      ? 'completed'
      : agent.status === 'failed'
      ? 'failed'
      : agent.status === 'cancelled'
      ? 'cancelled'
      : agent.status === 'running'
      ? 'running'
      : 'idle';

  // Position coordinates for DAG layout
  const nodes: DagNode[] = [
    {
      id: 'root',
      label: 'Objective',
      sublabel: agent.objective ? (agent.objective.length > 18 ? agent.objective.slice(0, 16) + '...' : agent.objective) : 'User Goal',
      type: 'root',
      status: rootStatus,
      x: 60,
      y: 110,
    },
    {
      id: 'planner',
      label: 'Planner',
      sublabel: 'Execution DAG',
      type: 'planner',
      status: plannerStatus,
      x: 210,
      y: 110,
    },
  ];

  // Distribute sub-agent nodes vertically in middle tier
  const subAgentYOffsets =
    maxAgents === 1 ? [110] : maxAgents === 2 ? [65, 155] : [45, 110, 175];

  subAgents.forEach((name, i) => {
    const isActive = agent.status === 'running' && lastLine.includes(name);
    let subStatus: DagNode['status'] = 'idle';
    if (agent.status === 'completed') subStatus = 'completed';
    else if (agent.status === 'failed') subStatus = 'failed';
    else if (agent.status === 'cancelled') subStatus = 'cancelled';
    else if (isActive) subStatus = 'running';
    else if (agent.status === 'running' || agent.status === 'awaiting_approval') subStatus = 'running';

    nodes.push({
      id: name,
      label: name,
      sublabel: `Worker ${String.fromCharCode(65 + i)}`,
      type: 'agent',
      seed: name,
      status: subStatus,
      x: 390,
      y: subAgentYOffsets[i],
    });
  });

  // Optional HITL Approval Node
  let lastTierX = 560;
  if (agent.human_in_loop) {
    nodes.push({
      id: 'approval',
      label: 'Approval',
      sublabel: 'Checkpoint',
      type: 'approval',
      status: approvalStatus,
      x: 560,
      y: 110,
    });
    lastTierX = 720;
  }

  // Synthesizer / Output Node
  nodes.push({
    id: 'synthesizer',
    label: 'Synthesizer',
    sublabel: 'Final Output',
    type: 'synthesizer',
    status: synthesizerStatus,
    x: lastTierX,
    y: 110,
  });

  // Build edges
  const edges: DagEdge[] = [];

  // Root -> Planner
  edges.push({ from: 'root', to: 'planner', active: plannerStatus !== 'idle' });

  // Planner -> Sub-Agents
  subAgents.forEach((sa) => {
    edges.push({ from: 'planner', to: sa, active: agent.status === 'running' || agent.status === 'completed' });
  });

  // Sub-Agents -> Approval or Synthesizer
  const nextTarget = agent.human_in_loop ? 'approval' : 'synthesizer';
  subAgents.forEach((sa) => {
    edges.push({ from: sa, to: nextTarget, active: approvalStatus === 'completed' || agent.status === 'completed' });
  });

  // Approval -> Synthesizer
  if (agent.human_in_loop) {
    edges.push({ from: 'approval', to: 'synthesizer', active: agent.status === 'completed' });
  }

  const svgWidth = lastTierX + 80;
  const svgHeight = 220;

  return (
    <div className="relative w-full overflow-x-auto rounded-xl p-4 bg-black/40 border border-white/10 backdrop-blur-md select-none">
      {/* SVG Canvas for Connections */}
      <svg
        className="w-full h-[220px] min-w-[650px]"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        fill="none"
      >
        <defs>
          {/* Animated gradient for active flows */}
          <linearGradient id="dagGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00ff88" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#00ff88" stopOpacity="0.8" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="dagGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Draw Edges */}
        {edges.map((edge, idx) => {
          const source = nodes.find((n) => n.id === edge.from);
          const target = nodes.find((n) => n.id === edge.to);
          if (!source || !target) return null;

          // Bezier control points for smooth curves
          const dx = target.x - source.x;
          const pathD = `M ${source.x} ${source.y} C ${source.x + dx / 2} ${source.y}, ${target.x - dx / 2} ${target.y}, ${target.x} ${target.y}`;

          return (
            <g key={`edge-${idx}`}>
              {/* Background Path Line */}
              <path
                d={pathD}
                stroke={edge.active ? 'rgba(0, 255, 136, 0.4)' : 'rgba(255, 255, 255, 0.08)'}
                strokeWidth={edge.active ? 2 : 1.5}
                strokeDasharray={edge.active ? 'none' : '4 4'}
              />
              {/* Animated particle flow overlay for active edges */}
              {edge.active && !isTerminated && (
                <path
                  d={pathD}
                  stroke="url(#dagGradient)"
                  strokeWidth="2.5"
                  strokeDasharray="8 12"
                  filter="url(#dagGlow)"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="40"
                    to="0"
                    dur="1.2s"
                    repeatCount="indefinite"
                  />
                </path>
              )}
            </g>
          );
        })}

        {/* Draw Nodes */}
        {nodes.map((node) => {
          const isHovered = hoveredNode?.id === node.id;
          const isRunning = node.status === 'running';
          const isCompleted = node.status === 'completed';
          const isAwaiting = node.status === 'awaiting_approval';

          let statusColor = '#6b7280'; // gray idle
          if (isRunning) statusColor = '#00ff88'; // cyber green
          if (isCompleted) statusColor = '#38bdf8'; // cyan
          if (isAwaiting) statusColor = '#fbbf24'; // amber
          if (node.status === 'failed') statusColor = '#f87171'; // red

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              className="cursor-pointer transition-transform duration-200 hover:scale-110"
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {/* Pulsing ring for running nodes */}
              {isRunning && (
                <circle
                  r="24"
                  fill="none"
                  stroke="#00ff88"
                  strokeWidth="1.5"
                  opacity="0.6"
                >
                  <animate
                    attributeName="r"
                    values="22;30;22"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.8;0;0.8"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}

              {/* Node Outer Container Circle */}
              <circle
                r="20"
                fill="rgba(18, 18, 24, 0.95)"
                stroke={isHovered ? '#00ff88' : statusColor}
                strokeWidth={isHovered || isRunning ? 2.5 : 1.5}
                filter={isHovered || isRunning ? 'url(#dagGlow)' : undefined}
              />

              {/* Inner Node Avatar / Icon */}
              {node.type === 'agent' && node.seed ? (
                <foreignObject x="-16" y="-16" width="32" height="32" className="pointer-events-none">
                  <div className="w-full h-full flex items-center justify-center">
                    <AgentOrb seed={node.seed} size="26px" />
                  </div>
                </foreignObject>
              ) : (
                <text
                  textAnchor="middle"
                  dy="4"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="bold"
                  className="pointer-events-none select-none font-mono"
                >
                  {node.type === 'root'
                    ? '🎯'
                    : node.type === 'planner'
                    ? '⚡'
                    : node.type === 'approval'
                    ? '✋'
                    : '✨'}
                </text>
              )}

              {/* Node Label Below */}
              <text
                textAnchor="middle"
                y="34"
                fill={isHovered ? '#00ff88' : 'rgba(255,255,255,0.9)'}
                fontSize="11"
                fontWeight="600"
                className="pointer-events-none select-none font-sans"
              >
                {node.label}
              </text>
              <text
                textAnchor="middle"
                y="46"
                fill="rgba(255,255,255,0.4)"
                fontSize="9"
                className="pointer-events-none select-none font-mono"
              >
                {node.sublabel}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Dynamic Hover Tooltip */}
      {hoveredNode && (
        <div className="absolute top-3 left-4 bg-gray-900/90 border border-emerald-500/30 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs shadow-lg animate-fadeIn pointer-events-none">
          <span className="font-bold text-white">{hoveredNode.label}</span>
          <span className="text-emerald-400 font-mono ml-2 uppercase text-[10px]">
            [{hoveredNode.status}]
          </span>
          <p className="text-white/60 text-[11px] mt-0.5">{hoveredNode.sublabel}</p>
        </div>
      )}
    </div>
  );
}
