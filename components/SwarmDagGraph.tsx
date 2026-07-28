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
  type: 'root' | 'planner' | 'agent' | 'approval' | 'mcp' | 'synthesizer';
  mcpType?: 'figma' | 'github' | 'database' | 'browser' | 'terminal';
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

  // Combine objective and logs for text scanning
  const fullText = (agent.objective + ' ' + logLines.join(' ')).toLowerCase();
  const lastLine = logLines[logLines.length - 1] ?? '';
  const isTerminated = ['completed', 'failed', 'cancelled'].includes(agent.status);

  // Dynamic MCP Detection
  const hasFigma = /figma/i.test(fullText);
  const hasGithub = /github|commit|repo|pull request|pr\b/i.test(fullText);
  const hasDatabase = /database|postgres|sqlite|sql|db\b/i.test(fullText);
  const hasBrowser = /browser|web|scrape|search/i.test(fullText);
  const hasTerminal = /terminal|bash|shell|command/i.test(fullText);

  // List of active detected MCPs
  const detectedMcps: Array<{ id: string; label: string; sublabel: string; type: 'figma' | 'github' | 'database' | 'browser' | 'terminal' }> = [];
  if (hasFigma) detectedMcps.push({ id: 'mcp-figma', label: 'Figma MCP', sublabel: 'Design Specs', type: 'figma' });
  if (hasGithub) detectedMcps.push({ id: 'mcp-github', label: 'GitHub MCP', sublabel: 'Repository', type: 'github' });
  if (hasDatabase) detectedMcps.push({ id: 'mcp-database', label: 'Database MCP', sublabel: 'SQL Engine', type: 'database' });
  if (hasBrowser) detectedMcps.push({ id: 'mcp-browser', label: 'Browser MCP', sublabel: 'Web Scraper', type: 'browser' });
  if (hasTerminal) detectedMcps.push({ id: 'mcp-terminal', label: 'Terminal MCP', sublabel: 'CLI Tools', type: 'terminal' });

  // Default fallback MCP node if user explicitly asked or if no specific tool keyword matched
  if (detectedMcps.length === 0 && (fullText.includes('mcp') || fullText.includes('tool'))) {
    detectedMcps.push({ id: 'mcp-generic', label: 'Hive Tools', sublabel: 'MCP Integration', type: 'terminal' });
  }

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

  // Node Positions (Tiered layout)
  let currentX = 60;
  const nodes: DagNode[] = [
    {
      id: 'root',
      label: 'Objective',
      sublabel: agent.objective ? (agent.objective.length > 18 ? agent.objective.slice(0, 16) + '...' : agent.objective) : 'User Goal',
      type: 'root',
      status: rootStatus,
      x: currentX,
      y: 110,
    },
  ];

  currentX += 150; // Planner tier X = 210
  nodes.push({
    id: 'planner',
    label: 'Planner',
    sublabel: 'Execution DAG',
    type: 'planner',
    status: plannerStatus,
    x: currentX,
    y: 110,
  });

  currentX += 160; // Worker tier X = 370
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
      x: currentX,
      y: subAgentYOffsets[i],
    });
  });

  // Dynamic MCP Tier X
  let mcpTierX = currentX;
  if (detectedMcps.length > 0) {
    currentX += 170; // MCP tier X = 540
    mcpTierX = currentX;
    const mcpYOffsets =
      detectedMcps.length === 1 ? [110] : detectedMcps.length === 2 ? [65, 155] : [45, 110, 175];

    detectedMcps.forEach((mcp, i) => {
      const isMcpActive =
        agent.status === 'running' || agent.status === 'completed';

      nodes.push({
        id: mcp.id,
        label: mcp.label,
        sublabel: mcp.sublabel,
        type: 'mcp',
        mcpType: mcp.type,
        status: isMcpActive ? (agent.status === 'completed' ? 'completed' : 'running') : 'idle',
        x: mcpTierX,
        y: mcpYOffsets[i] ?? 110,
      });
    });
  }

  // Approval Checkpoint Tier
  if (agent.human_in_loop) {
    currentX += 160;
    nodes.push({
      id: 'approval',
      label: 'Approval',
      sublabel: 'Checkpoint',
      type: 'approval',
      status: approvalStatus,
      x: currentX,
      y: 110,
    });
  }

  // Synthesizer Tier
  currentX += 160;
  nodes.push({
    id: 'synthesizer',
    label: 'Synthesizer',
    sublabel: 'Final Output',
    type: 'synthesizer',
    status: synthesizerStatus,
    x: currentX,
    y: 110,
  });

  // Build Edges
  const edges: DagEdge[] = [];

  // Root -> Planner
  edges.push({ from: 'root', to: 'planner', active: plannerStatus !== 'idle' });

  // Planner -> Sub-Agents
  subAgents.forEach((sa) => {
    edges.push({ from: 'planner', to: sa, active: agent.status === 'running' || agent.status === 'completed' });
  });

  // Sub-Agents -> MCP Tier or Approval/Synthesizer
  if (detectedMcps.length > 0) {
    subAgents.forEach((sa) => {
      detectedMcps.forEach((mcp) => {
        edges.push({ from: sa, to: mcp.id, active: agent.status === 'running' || agent.status === 'completed' });
      });
    });

    const mcpNextTarget = agent.human_in_loop ? 'approval' : 'synthesizer';
    detectedMcps.forEach((mcp) => {
      edges.push({ from: mcp.id, to: mcpNextTarget, active: approvalStatus === 'completed' || agent.status === 'completed' });
    });
  } else {
    const nextTarget = agent.human_in_loop ? 'approval' : 'synthesizer';
    subAgents.forEach((sa) => {
      edges.push({ from: sa, to: nextTarget, active: approvalStatus === 'completed' || agent.status === 'completed' });
    });
  }

  // Approval -> Synthesizer
  if (agent.human_in_loop) {
    edges.push({ from: 'approval', to: 'synthesizer', active: agent.status === 'completed' });
  }

  const svgWidth = currentX + 80;
  const svgHeight = 220;

  return (
    <div className="relative w-full overflow-x-auto rounded-xl p-4 bg-black/40 border border-white/10 backdrop-blur-md select-none">
      {/* SVG Canvas for Connections */}
      <svg
        className="w-full h-[220px] min-w-[720px]"
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

          {/* Figma Specific Edge Gradient */}
          <linearGradient id="figmaEdgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f24e1e" stopOpacity="0.9" />
            <stop offset="33%" stopColor="#a259ff" stopOpacity="0.9" />
            <stop offset="66%" stopColor="#1abcfe" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0acf83" stopOpacity="0.9" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="dagGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Intense Hover Ambient Glow Filter */}
          <filter id="nodeHoverGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="9" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Draw Edges */}
        {edges.map((edge, idx) => {
          const source = nodes.find((n) => n.id === edge.from);
          const target = nodes.find((n) => n.id === edge.to);
          if (!source || !target) return null;

          const isFigmaEdge = source.type === 'mcp' && source.mcpType === 'figma' || target.type === 'mcp' && target.mcpType === 'figma';

          // Bezier control points for smooth curves
          const dx = target.x - source.x;
          const pathD = `M ${source.x} ${source.y} C ${source.x + dx / 2} ${source.y}, ${target.x - dx / 2} ${target.y}, ${target.x} ${target.y}`;

          return (
            <g key={`edge-${idx}`}>
              {/* Background Path Line */}
              <path
                d={pathD}
                stroke={edge.active ? (isFigmaEdge ? 'rgba(162, 89, 255, 0.45)' : 'rgba(0, 255, 136, 0.4)') : 'rgba(255, 255, 255, 0.08)'}
                strokeWidth={edge.active ? 2 : 1.5}
                strokeDasharray={edge.active ? 'none' : '4 4'}
              />
              {/* Animated particle flow overlay for active edges */}
              {edge.active && !isTerminated && (
                <path
                  d={pathD}
                  stroke={isFigmaEdge ? 'url(#figmaEdgeGradient)' : 'url(#dagGradient)'}
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
          if (isRunning) statusColor = node.mcpType === 'figma' ? '#a259ff' : '#00ff88';
          if (isCompleted) statusColor = node.mcpType === 'figma' ? '#0acf83' : '#38bdf8';
          if (isAwaiting) statusColor = '#fbbf24';
          if (node.status === 'failed') statusColor = '#f87171';

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              {/* Hover Ambient Glow Aura Ring */}
              {isHovered && (
                <circle
                  r="26"
                  fill="none"
                  stroke={node.mcpType === 'figma' ? '#f24e1e' : '#00ff88'}
                  strokeWidth="3.5"
                  opacity="0.85"
                  filter="url(#nodeHoverGlow)"
                />
              )}

              {/* Pulsing ring for running nodes */}
              {isRunning && (
                <circle
                  r="24"
                  fill="none"
                  stroke={node.mcpType === 'figma' ? '#a259ff' : '#00ff88'}
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
                stroke={isHovered ? (node.mcpType === 'figma' ? '#f24e1e' : '#00ff88') : statusColor}
                strokeWidth={isHovered || isRunning ? 2.5 : 1.5}
                filter={isRunning ? 'url(#dagGlow)' : undefined}
              />

              {/* Inner Node Avatar / MCP Logo Rendering */}
              {node.type === 'agent' && node.seed ? (
                <foreignObject x="-16" y="-16" width="32" height="32" className="pointer-events-none">
                  <div className="w-full h-full flex items-center justify-center">
                    <AgentOrb seed={node.seed} size="26px" />
                  </div>
                </foreignObject>
              ) : node.type === 'mcp' && node.mcpType === 'figma' ? (
                /* Official 5-shape Figma Logo SVG */
                <foreignObject x="-12" y="-12" width="24" height="24" className="pointer-events-none">
                  <svg width="24" height="24" viewBox="0 0 38 57" fill="none">
                    <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
                    <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
                    <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
                    <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
                    <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
                  </svg>
                </foreignObject>
              ) : node.type === 'mcp' && node.mcpType === 'github' ? (
                /* GitHub Octocat SVG */
                <foreignObject x="-11" y="-11" width="22" height="22" className="pointer-events-none">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                  </svg>
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
                    : node.mcpType === 'database'
                    ? '🗄️'
                    : node.mcpType === 'browser'
                    ? '🌐'
                    : node.mcpType === 'terminal'
                    ? '💻'
                    : '✨'}
                </text>
              )}

              {/* Node Label Below */}
              <text
                textAnchor="middle"
                y="34"
                fill={isHovered ? (node.mcpType === 'figma' ? '#f24e1e' : '#00ff88') : 'rgba(255,255,255,0.9)'}
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
