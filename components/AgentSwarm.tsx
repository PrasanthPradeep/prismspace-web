'use client';

/**
 * components/AgentSwarm.tsx
 * ──────────────────────────
 * Full-panel Agent Swarm orchestration dashboard.
 * Shows live agent status, log streaming, HITL controls, and a task launcher.
 */

import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

// ── Custom dark-themed Select component ─────────────────────────────────────
interface SelectOption { value: string; label: React.ReactNode; }
interface StyledSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  className?: string;
}

function StyledSelect({ value, onChange, options, className = '' }: StyledSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`} style={{ userSelect: 'none' }}>
      {/* Trigger */}
      <button
        type="button"
        id={uid}
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-1.5 rounded-lg px-2.5 py-2 text-xs text-white outline-none transition-all"
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: open ? '1px solid rgba(0,255,136,0.45)' : '1px solid rgba(255,255,255,0.1)',
          boxShadow: open ? '0 0 0 2px rgba(0,255,136,0.08)' : 'none',
        }}
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}
        >
          <path d="M1 3l4 4 4-4" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden"
          style={{
            background: 'rgba(18,18,24,0.97)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,255,136,0.06)',
            backdropFilter: 'blur(20px)',
            animation: 'swarmDropIn 0.15s ease',
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs transition-all"
              style={{
                color: opt.value === value ? '#00ff88' : 'rgba(255,255,255,0.75)',
                background: opt.value === value ? 'rgba(0,255,136,0.08)' : 'transparent',
                fontWeight: opt.value === value ? 600 : 400,
              }}
              onMouseEnter={(e) => {
                if (opt.value !== value) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = opt.value === value ? 'rgba(0,255,136,0.08)' : 'transparent';
              }}
              >
              <div className="flex items-center gap-2">
                {opt.label}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Lightweight inline Markdown renderer ─────────────────────────────────────
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={`cb-${i}`} style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px 14px', overflowX: 'auto', margin: '8px 0', fontSize: '0.78rem', lineHeight: 1.6, color: '#a5f3c0', fontFamily: 'monospace' }}>
          {lang && <span style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{lang}</span>}
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      i++; continue;
    }

    // Headings
    if (line.startsWith('### ')) { elements.push(<h5 key={`h5-${i}`} style={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem', margin: '12px 0 4px' }}>{inlineMarkdown(line.slice(4))}</h5>); i++; continue; }
    if (line.startsWith('## '))  { elements.push(<h4 key={`h4-${i}`} style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', margin: '14px 0 5px' }}>{inlineMarkdown(line.slice(3))}</h4>); i++; continue; }
    if (line.startsWith('# '))   { elements.push(<h3 key={`h3-${i}`} style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem', margin: '16px 0 6px' }}>{inlineMarkdown(line.slice(2))}</h3>); i++; continue; }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      elements.push(<hr key={`hr-${i}`} style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '12px 0' }} />);
      i++; continue;
    }

    // Unordered list block
    if (/^[-*+] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+] /.test(lines[i])) { items.push(lines[i].replace(/^[-*+] /, '')); i++; }
      elements.push(
        <ul key={`ul-${i}`} style={{ margin: '6px 0', paddingLeft: '18px', listStyleType: 'disc' }}>
          {items.map((it, idx) => <li key={idx} style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.82rem', lineHeight: 1.65, marginBottom: '2px' }}>{inlineMarkdown(it)}</li>)}
        </ul>
      );
      continue;
    }

    // Ordered list block
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\d+\. /, '')); i++; }
      elements.push(
        <ol key={`ol-${i}`} style={{ margin: '6px 0', paddingLeft: '18px', listStyleType: 'decimal' }}>
          {items.map((it, idx) => <li key={idx} style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.82rem', lineHeight: 1.65, marginBottom: '2px' }}>{inlineMarkdown(it)}</li>)}
        </ol>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const qLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) { qLines.push(lines[i].slice(2)); i++; }
      elements.push(
        <blockquote key={`bq-${i}`} style={{ borderLeft: '3px solid rgba(0,255,136,0.4)', paddingLeft: '12px', margin: '8px 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', fontStyle: 'italic' }}>
          {qLines.map((ql, qi) => <span key={qi}>{inlineMarkdown(ql)}<br /></span>)}
        </blockquote>
      );
      continue;
    }

    // Blank line — small gap
    if (line.trim() === '') { elements.push(<div key={`gap-${i}`} style={{ height: '6px' }} />); i++; continue; }

    // Regular paragraph line
    elements.push(
      <p key={`p-${i}`} style={{ margin: '2px 0', color: 'rgba(255,255,255,0.88)', fontSize: '0.82rem', lineHeight: 1.7 }}>
        {inlineMarkdown(line)}
      </p>
    );
    i++;
  }

  return <div style={{ wordBreak: 'break-word' }}>{elements}</div>;
}

function inlineMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={idx} style={{ color: '#fff', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={idx} style={{ color: 'rgba(255,255,255,0.8)' }}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={idx} style={{ background: 'rgba(0,255,136,0.1)', color: '#a5f3c0', padding: '1px 5px', borderRadius: '4px', fontSize: '0.78rem', fontFamily: 'monospace' }}>{part.slice(1, -1)}</code>;
    return part;
  });
}

import {
  SwarmAgent,
  CreateAgentPayload,
  ModelProvider,
  createAgent,
  listAgents,
  approveAgent,
  streamAgentLogs,
  checkSwarmHealth,
  listMcpServers,
  saveMcpToken,
  removeMcpToken,
  STATUS_COLORS,
  STATUS_LABELS,
  isTerminal,
  type McpServerStatus,
  type McpTokenStatus,
} from '@/lib/agent-swarm-client';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { AgentCard } from './AgentCard';
import { AgentOrb } from './AgentOrb';
import { getAgentAvatarStyle } from '@/lib/agent-avatar';
import GridLoader from '@/components/ui/smoothui/grid-loader';
import ShaderRevealTransition from '@/components/ui/smoothui/shader-reveal-transition';
import { db, type AgentChatMessage } from '@/lib/db';

interface AgentSwarmProps {
  onClose: () => void;
}

const MODELS: Record<ModelProvider, string[]> = {
  nvidia: ['nvidia/nemotron-3-nano-30b-a3b'],
  groq: ['llama-3.3-70b-versatile', 'llama3-70b-8192', 'mixtral-8x7b-32768'],
};

const ACTIVE_SWARM_CHAT_KEY = 'prism.agentSwarm.activeChatId';

function createChatId() {
  return `swarm-chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function titleFromObjective(value: string) {
  const title = value.trim().replace(/\s+/g, ' ');
  return title.length > 42 ? `${title.slice(0, 39)}...` : title || 'New chat';
}

function formatChatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export function AgentSwarm({ onClose }: AgentSwarmProps) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [agents, setAgents] = useState<SwarmAgent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [mcpServers, setMcpServers] = useState<McpServerStatus[]>([]);
  const [mcpTokens, setMcpTokens] = useState<McpTokenStatus[]>([]);
  const [mcpEnvFile, setMcpEnvFile] = useState<string | null>(null);
  const [selectedMcpServer, setSelectedMcpServer] = useState('figma');
  const [mcpEnvKey, setMcpEnvKey] = useState('FIGMA_API_TOKEN');
  const [mcpToken, setMcpToken] = useState('');
  const [savingMcpToken, setSavingMcpToken] = useState(false);
  const [mcpMessage, setMcpMessage] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [pendingRemoveKey, setPendingRemoveKey] = useState<string | null>(null);

  // New agent form
  const [objective, setObjective] = useState('');
  const [provider, setProvider] = useState<ModelProvider>('nvidia');
  const [model, setModel] = useState(MODELS.nvidia[0]);
  const [maxAgents, setMaxAgents] = useState(3);
  const [hitl, setHitl] = useState(true);
  const [launching, setLaunching] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const cleanupLogStream = useRef<(() => void) | null>(null);

  const chatSessions = useLiveQuery(
    () => db.agent_chat_sessions.orderBy('updatedAt').reverse().toArray(),
    [],
  );

  const currentSessionMessages = useLiveQuery(
    () =>
      activeSessionId
        ? db.agent_chat_messages
            .where('sessionId')
            .equals(activeSessionId)
            .sortBy('createdAt')
        : Promise.resolve([] as AgentChatMessage[]),
    [activeSessionId],
  );

  const currentSession = chatSessions?.find((session) => session.id === activeSessionId);

  const createNewChat = useCallback(async (seedTitle = 'New chat') => {
    const now = Date.now();
    const id = createChatId();
    await db.agent_chat_sessions.add({
      id,
      title: titleFromObjective(seedTitle),
      createdAt: now,
      updatedAt: now,
    });
    localStorage.setItem(ACTIVE_SWARM_CHAT_KEY, id);
    setActiveSessionId(id);
    setSelectedId(null);
    return id;
  }, []);

  const deleteChatSession = async (sessionId: string) => {
    if (!sessionId) return;
    const confirmed = confirm('Delete this chat and all its messages? This cannot be undone.');
    if (!confirmed) return;

    try {
      // Delete messages for session, then the session
      await db.agent_chat_messages.where('sessionId').equals(sessionId).delete();
      await db.agent_chat_sessions.delete(sessionId);

      // Clear active session if it was the deleted one
      if (activeSessionId === sessionId) {
        localStorage.removeItem(ACTIVE_SWARM_CHAT_KEY);
        setActiveSessionId(null);
      }

      toast.success('Chat deleted');
    } catch (err) {
      console.error('Failed to delete chat session', err);
      toast.error('Failed to delete chat');
    }
  };

  const ensureActiveSession = useCallback(
    async (seedTitle: string) => {
      if (activeSessionId) {
        const existing = await db.agent_chat_sessions.get(activeSessionId);
        if (existing) return activeSessionId;
      }

      const storedId =
        typeof window !== 'undefined'
          ? localStorage.getItem(ACTIVE_SWARM_CHAT_KEY)
          : null;
      if (storedId) {
        const stored = await db.agent_chat_sessions.get(storedId);
        if (stored) {
          setActiveSessionId(storedId);
          return storedId;
        }
      }

      const latest = await db.agent_chat_sessions.orderBy('updatedAt').last();
      if (latest) {
        localStorage.setItem(ACTIVE_SWARM_CHAT_KEY, latest.id);
        setActiveSessionId(latest.id);
        return latest.id;
      }

      return createNewChat(seedTitle);
    },
    [activeSessionId, createNewChat],
  );

  useEffect(() => {
    if (activeSessionId || chatSessions === undefined) return;

    const storedId =
      typeof window !== 'undefined'
        ? localStorage.getItem(ACTIVE_SWARM_CHAT_KEY)
        : null;
    const storedSession = storedId
      ? chatSessions.find((session) => session.id === storedId)
      : null;
    const nextSession = storedSession ?? chatSessions[0];

    if (nextSession) {
      setActiveSessionId(nextSession.id);
      localStorage.setItem(ACTIVE_SWARM_CHAT_KEY, nextSession.id);
    } else {
      createNewChat();
    }
  }, [activeSessionId, chatSessions, createNewChat]);

  // ── Health check ──────────────────────────────────────────────────────────
  useEffect(() => {
    checkSwarmHealth().then(setBackendOnline);
    const interval = setInterval(() => checkSwarmHealth().then(setBackendOnline), 8000);
    return () => clearInterval(interval);
  }, []);

  const refreshMcpServers = useCallback(async () => {
    try {
      const data = await listMcpServers();
      setMcpServers(data.servers);
      setMcpTokens(data.tokens);
      setMcpEnvFile(data.env_file ?? null);
    } catch {
      setMcpServers([]);
      setMcpTokens([]);
      setMcpEnvFile(null);
    }
  }, []);

  useEffect(() => {
    refreshMcpServers();
  }, [refreshMcpServers]);

  useEffect(() => {
    if (!mcpServers.length || mcpServers.some((server) => server.name === selectedMcpServer)) {
      return;
    }

    const fallback = mcpServers.find((server) => server.name === 'figma') ?? mcpServers[0];
    setSelectedMcpServer(fallback.name);
    setMcpEnvKey(fallback.env[0]?.key ?? (fallback.name === 'figma' ? 'FIGMA_API_TOKEN' : ''));
  }, [mcpServers, selectedMcpServer]);

  // ── Fetch agents ──────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const data = await listAgents();
      setAgents(data);
    } catch {
      // backend offline
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [refresh]);

  // ── Log streaming ─────────────────────────────────────────────────────────
  useEffect(() => {
    cleanupLogStream.current?.();
    cleanupLogStream.current = null;

    if (!selectedId) {
      setLogLines([]);
      return;
    }

    setLogLines([]);

    const stop = streamAgentLogs(
      selectedId,
      (line) => {
        setLogLines((prev) => [...prev, line]);
      },
      () => {},
    );
    cleanupLogStream.current = stop;

    return () => {
      stop();
      cleanupLogStream.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logLines]);

  // ── Launch new agent ──────────────────────────────────────────────────────
  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedObjective = objective.trim();
    if (!trimmedObjective || launching) return;

    setLaunching(true);
    let sessionIdForFailure: string | null = null;
    try {
      const sessionId = await ensureActiveSession(trimmedObjective);
      sessionIdForFailure = sessionId;
      const now = Date.now();
      const priorMessages = await db.agent_chat_messages
        .where('sessionId')
        .equals(sessionId)
        .and((message) => message.status !== 'pending')
        .sortBy('createdAt');

      await db.agent_chat_messages.add({
        sessionId,
        role: 'user',
        content: trimmedObjective,
        createdAt: now,
      });

      const session = await db.agent_chat_sessions.get(sessionId);
      await db.agent_chat_sessions.update(sessionId, {
        ...(session?.title === 'New chat'
          ? { title: titleFromObjective(trimmedObjective) }
          : {}),
        updatedAt: now,
      });

      const payload: CreateAgentPayload = {
        objective: trimmedObjective,
        provider,
        model,
        max_agents: maxAgents,
        human_in_loop: hitl,
        chat_history: priorMessages.slice(-16).map((message) => ({
          role: message.role,
          content: message.content,
        })),
      };
      const agent = await createAgent(payload);
      await db.agent_chat_messages.add({
        sessionId,
        role: 'assistant',
        content: 'Swarm is running...',
        agentId: agent.id,
        status: 'pending',
        createdAt: Date.now(),
      });
      setObjective('');
      setSelectedId(agent.id);
      await refresh();
    } catch (error) {
      console.error('Failed to launch swarm:', error);
      if (sessionIdForFailure) {
        await db.agent_chat_messages.add({
          sessionId: sessionIdForFailure,
          role: 'assistant',
          content:
            error instanceof Error
              ? `Launch failed: ${error.message}`
              : 'Launch failed.',
          status: 'failed',
          createdAt: Date.now(),
        });
      }
    } finally {
      setLaunching(false);
    }
  };

  const handleProviderChange = (p: ModelProvider) => {
    setProvider(p);
    setModel(MODELS[p][0]);
  };

  const selectedAgent = agents.find((a) => a.id === selectedId);
  const selectedMcpToken = mcpTokens.find((token) => token.key === mcpEnvKey);

  const handleMcpServerChange = (serverName: string) => {
    const server = mcpServers.find((item) => item.name === serverName);
    setSelectedMcpServer(serverName);
    setMcpEnvKey(server?.env[0]?.key ?? (serverName === 'figma' ? 'FIGMA_API_TOKEN' : ''));
    setMcpToken('');
    setMcpMessage(null);
  };

  const handleSelectMcpToken = (token: McpTokenStatus) => {
    const serverName = token.used_by[0] ?? '';
    setMcpEnvKey(token.key);
    setSelectedMcpServer(serverName);
    setMcpToken('');
    setMcpMessage(null);
  };

  const handleSaveMcpToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mcpEnvKey.trim() || !mcpToken.trim() || savingMcpToken) return;

    setSavingMcpToken(true);
    setMcpMessage(null);
    try {
      await saveMcpToken({
        server_name: selectedMcpServer || undefined,
        env_key: mcpEnvKey.trim().toUpperCase(),
        token: mcpToken.trim(),
      });
      setMcpToken('');
      toast.success(
        selectedMcpServer
          ? `${mcpEnvKey.trim().toUpperCase()} saved for ${selectedMcpServer}.`
          : `${mcpEnvKey.trim().toUpperCase()} updated in .env.`,
      );
      await refreshMcpServers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save MCP token.');
    } finally {
      setSavingMcpToken(false);
    }
  };

  useEffect(() => {
    const syncCompletedMessages = async () => {
      for (const agent of agents) {
        if (!isTerminal(agent.status)) continue;

        const message = await db.agent_chat_messages
          .where('agentId')
          .equals(agent.id)
          .and((entry) => entry.role === 'assistant')
          .first();

        if (!message || message.status !== 'pending') continue;

        await db.agent_chat_messages.update(message.id as number, {
          content: agent.result || `Swarm ${STATUS_LABELS[agent.status].toLowerCase()}.`,
          status: agent.status as AgentChatMessage['status'],
          createdAt: Date.now(),
        });
      }
    };

    syncCompletedMessages().catch(console.error);
  }, [agents]);

  const chatHistoryPanel = (
    <div
      className="flex-shrink-0 p-4"
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.025)',
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-xs text-white/50 font-semibold uppercase tracking-widest">
            Chat History
          </p>
          <p className="text-xs text-white/30 truncate">
            {currentSession?.title ?? 'New chat'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => createNewChat()}
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-black transition-all"
          style={{ background: '#00ff88' }}
        >
          + New Chat
        </button>
      </div>

      <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
        {!currentSessionMessages?.length && (
          <p className="text-white/25 text-xs">
            This chat is empty. Launch a swarm to start the bracket.
          </p>
        )}
        {currentSessionMessages?.map((message) => (
          <div
            key={message.id}
            className="rounded-lg px-3 py-2 text-xs"
            style={{
              background:
                message.role === 'user'
                  ? 'rgba(0,255,136,0.08)'
                  : 'rgba(255,255,255,0.055)',
              border:
                message.role === 'user'
                  ? '1px solid rgba(0,255,136,0.16)'
                  : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span
                className="font-semibold"
                style={{ color: message.role === 'user' ? '#00ff88' : '#93c5fd' }}
              >
                {message.role === 'user' ? 'You' : 'Swarm'}
              </span>
              <span className="text-white/25 font-mono">
                {message.status === 'pending' ? 'running' : formatChatTime(message.createdAt)}
              </span>
            </div>
            <p className="text-white/70 line-clamp-3 whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-full text-white"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: 'oklch(0.12 0.02 270)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px',
          },
        }}
      />
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background:
            'linear-gradient(135deg, rgba(0,255,136,0.06) 0%, rgba(0,100,255,0.04) 100%)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🐝</span>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">
              Agent Swarm
            </h2>
            <p className="text-white/40 text-xs">Multi-Agent Orchestration · aden-hive/hive</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => createNewChat()}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: 'rgba(0,255,136,0.12)',
              border: '1px solid rgba(0,255,136,0.3)',
              color: '#00ff88',
            }}
          >
            + New Chat
          </button>

          {/* Backend status indicator */}
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor:
                  backendOnline === null
                    ? '#94a3b8'
                    : backendOnline
                    ? '#4ade80'
                    : '#f87171',
                boxShadow: backendOnline ? '0 0 6px #4ade80' : undefined,
                animation: backendOnline ? 'pulse 2s ease-in-out infinite' : undefined,
              }}
            />
            <span className="text-xs text-white/50 font-mono">
              {backendOnline === null
                ? 'Checking…'
                : backendOnline
                ? 'Backend online'
                : 'Backend offline'}
            </span>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Offline banner ─────────────────────────────────────────────────── */}
      {backendOnline === false && (
        <div
          className="px-6 py-3 text-sm flex items-start gap-3 flex-shrink-0"
          style={{
            background: 'rgba(248,113,113,0.1)',
            borderBottom: '1px solid rgba(248,113,113,0.2)',
          }}
        >
          <span className="text-lg flex-shrink-0">⚠️</span>
          <div>
            <p className="font-semibold text-red-300">Agent Swarm backend is not running</p>
            <p className="text-red-300/70 text-xs mt-0.5">
              Start it with{' '}
              <code className="bg-black/30 px-1 rounded font-mono">
                .\hive-backend\start.ps1
              </code>{' '}
              in a separate terminal. The dashboard will reconnect automatically.
            </p>
          </div>
        </div>
      )}

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT: Agent list + Launch form ──────────────────────────────── */}
        <div
          className="flex flex-col w-72 sm:w-80 flex-shrink-0 min-w-0 max-w-full"
          style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}
        >
          {/* Launch form */}
          <form
            onSubmit={handleLaunch}
            className="p-4 space-y-3 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p className="text-xs text-white/50 font-semibold uppercase tracking-widest">
              Launch Swarm
            </p>

            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Describe the objective for the agent swarm…"
              rows={3}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 resize-none outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              onFocus={(e) =>
                (e.target.style.border = '1px solid rgba(0,255,136,0.4)')
              }
              onBlur={(e) =>
                (e.target.style.border = '1px solid rgba(255,255,255,0.1)')
              }
            />

            {/* Provider + Model (stacked) */}
            <div className="flex flex-col gap-1.5">
              <StyledSelect
                value={provider}
                onChange={(val) => handleProviderChange(val as ModelProvider)}
                options={[
                  { value: 'nvidia', label: <div className="flex items-center gap-2"><AgentOrb provider="nvidia" size="18px" /><span>NVIDIA NIM</span></div> },
                  { value: 'groq', label: <div className="flex items-center gap-2"><AgentOrb provider="groq" size="18px" /><span>Groq</span></div> },
                ]}
              />
              <StyledSelect
                value={model}
                onChange={setModel}
                options={MODELS[provider].map((m) => ({
                  value: m,
                  label: m === 'nvidia/nemotron-3-nano-30b-a3b' ? 'Nemotron' : m,
                }))}
              />
            </div>

            {/* Sub-agents slider + Approval */}
            <div className="flex items-center justify-between gap-3 py-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-medium text-white/70 whitespace-nowrap">Agents:</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={1}
                  value={Math.min(3, Math.max(1, maxAgents))}
                  onChange={(e) => setMaxAgents(Number(e.target.value))}
                  className="w-24 accent-emerald-400 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer flex-shrink-0"
                />
                <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded min-w-[20px] text-center flex-shrink-0">
                  {Math.min(3, Math.max(1, maxAgents))}
                </span>
              </div>

              <label className="flex items-center gap-1.5 text-xs text-white/80 cursor-pointer select-none whitespace-nowrap flex-shrink-0">
                <input
                  type="checkbox"
                  checked={hitl}
                  onChange={(e) => setHitl(e.target.checked)}
                  className="w-4 h-4 accent-emerald-400 rounded cursor-pointer"
                />
                <span className="font-medium">Approval</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={!objective.trim() || launching || !backendOnline}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background:
                  !objective.trim() || !backendOnline
                    ? 'rgba(255,255,255,0.06)'
                    : 'linear-gradient(135deg, #00ff88 0%, #00c4ff 100%)',
                color:
                  !objective.trim() || !backendOnline
                    ? 'rgba(255,255,255,0.3)'
                    : '#000',
                cursor:
                  !objective.trim() || !backendOnline ? 'not-allowed' : 'pointer',
                boxShadow:
                  objective.trim() && backendOnline
                    ? '0 4px 20px rgba(0,255,136,0.3)'
                    : 'none',
              }}
            >
              {launching ? '🚀 Launching…' : '🚀 Launch Swarm'}
            </button>
          </form>

          {/* Chat sessions */}
          <div
            className="p-3 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-white/50 font-semibold uppercase tracking-widest">
                Chats
              </p>
              <span className="text-[10px] text-white/25 font-mono">
                {chatSessions?.length ?? 0}
              </span>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {chatSessions?.map((session) => (
                <div
                  key={session.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setActiveSessionId(session.id);
                    localStorage.setItem(ACTIVE_SWARM_CHAT_KEY, session.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveSessionId(session.id);
                      localStorage.setItem(ACTIVE_SWARM_CHAT_KEY, session.id);
                    }
                  }}
                  className="w-full text-left rounded-lg px-2.5 py-2 transition-all"
                  style={{
                    background:
                      activeSessionId === session.id
                        ? 'rgba(0,255,136,0.1)'
                        : 'rgba(255,255,255,0.04)',
                    border:
                      activeSessionId === session.id
                        ? '1px solid rgba(0,255,136,0.22)'
                        : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs text-white/75 truncate">{session.title}</p>
                      <p className="text-[10px] text-white/30 font-mono mt-0.5">
                        {formatChatTime(session.updatedAt)}
                      </p>
                    </div>
                    <div className="ml-2 flex-none">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChatSession(session.id);
                        }}
                        className="px-2 py-1 rounded-md text-[11px] bg-red-600/10 text-red-300 hover:bg-red-600/20"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MCP token manager */}
          <form
            onSubmit={handleSaveMcpToken}
            className="p-3 space-y-3 flex-shrink-0 overflow-y-auto"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', maxHeight: '40vh' }}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-white/50 font-semibold uppercase tracking-widest">
                  MCP Tokens
                </p>
                <p className="text-[10px] text-white/30">
                  {mcpTokens.length ? `${mcpTokens.length} saved token${mcpTokens.length === 1 ? '' : 's'}` : 'No saved tokens'}
                </p>
              </div>
              <button
                type="button"
                onClick={refreshMcpServers}
                className="px-2 py-1 rounded-md text-[10px] text-white/50 hover:text-white hover:bg-white/10 transition-all"
              >
                Refresh
              </button>
            </div>

            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {mcpTokens.length === 0 && (
                <div
                  className="rounded-lg px-3 py-2 text-xs text-white/30"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  Add a token below to create the first MCP env entry.
                </div>
              )}
              {mcpTokens.map((token) => {
                const active = token.key === mcpEnvKey;
                return (
                  <div
                    key={token.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectMcpToken(token)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectMcpToken(token);
                      }
                    }}
                    className="w-full rounded-lg px-2.5 py-2 text-left transition-all"
                    style={{
                      background: active ? 'rgba(0,255,136,0.06)' : 'rgba(255,255,255,0.03)',
                      border: active
                        ? '1px solid rgba(0,255,136,0.2)'
                        : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex-1 min-w-0 truncate text-xs font-mono text-white/80">
                        {token.key}
                      </span>
                      <div className="flex items-center gap-2 flex-none">
                        <span
                          className="rounded px-1.5 py-0.5 text-[9px] font-mono"
                          style={{
                            background: token.configured
                              ? 'rgba(74,222,128,0.12)'
                              : 'rgba(251,191,36,0.12)',
                            color: token.configured ? '#4ade80' : '#fbbf24',
                          }}
                        >
                          {token.configured ? 'SET' : 'EMPTY'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Pre-fill the form so user can replace or view
                            setMcpEnvKey(token.key);
                            setSelectedMcpServer(token.used_by[0] ?? '');
                                setMcpToken('');
                                toast(`${token.key} selected — paste replacement to update.`, { icon: 'ℹ️' });
                          }}
                          className="flex-none px-2 py-1 text-[11px] rounded-md bg-white/5 hover:bg-white/10 text-white/70 whitespace-nowrap"
                        >
                          Set
                        </button>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            // Show strict modal confirm
                            setPendingRemoveKey(token.key);
                            setShowRemoveConfirm(true);
                          }}
                          className="flex-none px-2 py-1 text-[11px] rounded-md bg-red-600/10 hover:bg-red-600/20 text-red-300 whitespace-nowrap"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-[10px] text-white/30">
                        {token.used_by.length ? token.used_by.join(', ') : 'env only'}
                      </span>
                      <span className="text-[10px] text-white/25 font-mono">
                        {token.masked}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <input
                value={mcpEnvKey}
                onChange={(e) => setMcpEnvKey(e.target.value.toUpperCase())}
                placeholder="FIGMA_API_TOKEN"
                className="min-w-0 flex-1 rounded-lg px-2.5 py-2 text-xs text-white placeholder-white/25 outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
              <span
                className="px-2 py-2 rounded-lg text-[10px] font-mono"
                style={{
                  background: selectedMcpToken?.configured
                    ? 'rgba(74,222,128,0.12)'
                    : 'rgba(251,191,36,0.12)',
                  color: selectedMcpToken?.configured
                    ? '#4ade80'
                    : '#fbbf24',
                  border: selectedMcpToken?.configured
                    ? '1px solid rgba(74,222,128,0.25)'
                    : '1px solid rgba(251,191,36,0.25)',
                }}
              >
                {selectedMcpToken?.configured ? 'SET' : 'NEW'}
              </span>
            </div>

            <StyledSelect
              value={selectedMcpServer}
              onChange={handleMcpServerChange}
              options={
                mcpServers.length
                  ? [
                      { value: '', label: 'Env only' },
                      ...mcpServers.map((server) => ({
                        value: server.name,
                        label:
                          server.name === 'figma' ? (
                            <div className="flex items-center gap-2">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 12c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z" fill="#0ACF83"/>
                                <path d="M15 9c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z" fill="#F24E1E"/>
                                <path d="M18 6c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z" fill="#A259FF"/>
                                <path d="M15 3c1.657 0 3 1.343 3 3s-1.343 3-3 3-3-1.343-3-3 1.343-3 3-3z" fill="#FF7262"/>
                                <path d="M21 12c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z" fill="#1ABCFE"/>
                              </svg>
                              <span>{server.name}{server.env.some((item) => item.configured) ? ' - set' : ''}</span>
                            </div>
                          ) : (
                            `${server.name}${server.env.some((item) => item.configured) ? ' - set' : ''}`
                          ),
                      })),
                    ]
                  : [{ value: '', label: 'Env only' }]
              }
            />

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  // Export tokens as JSON (masked + metadata)
                  const data = JSON.stringify({ tokens: mcpTokens }, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'mcp-tokens.json';
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                  toast.success('MCP tokens exported');
                }}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10"
              >
                Export tokens
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!mcpTokens.length) { toast('No tokens to clear'); return; }
                  setPendingRemoveKey('__CLEAR_ALL__');
                  setShowRemoveConfirm(true);
                }}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-red-600/10 text-red-300 hover:bg-red-600/20 whitespace-nowrap"
              >
                Clear all
              </button>
            </div>

            <input
              type="password"
              value={mcpToken}
              onChange={(e) => setMcpToken(e.target.value)}
              placeholder={selectedMcpToken?.configured ? 'Paste replacement token' : 'Paste token'}
              className="w-full rounded-lg px-2.5 py-2 text-xs text-white placeholder-white/25 outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />

            {mcpEnvFile && (
              <p className="text-[10px] text-white/25 leading-relaxed truncate">
                Editing {mcpEnvFile}
              </p>
            )}

            {mcpMessage && (
              <p
                className="text-[10px] leading-relaxed"
                style={{
                  color: mcpMessage.toLowerCase().includes('failed') ? '#f87171' : '#4ade80',
                }}
              >
                {mcpMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={!mcpEnvKey.trim() || !mcpToken.trim() || savingMcpToken}
              className="w-full py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background:
                  !mcpEnvKey.trim() || !mcpToken.trim()
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(0,255,136,0.16)',
                border:
                  !mcpEnvKey.trim() || !mcpToken.trim()
                    ? '1px solid rgba(255,255,255,0.08)'
                    : '1px solid rgba(0,255,136,0.3)',
                color:
                  !mcpEnvKey.trim() || !mcpToken.trim()
                    ? 'rgba(255,255,255,0.3)'
                    : '#00ff88',
                cursor:
                  !mcpEnvKey.trim() || !mcpToken.trim()
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {savingMcpToken ? 'Saving...' : 'Save MCP Token'}
            </button>
          </form>

          {/* Remove confirmation modal (strict) */}
          {showRemoveConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/60" onClick={() => { setShowRemoveConfirm(false); setPendingRemoveKey(null); }} />
              <div className="relative w-96 p-4 rounded-xl bg-[#111318] border border-white/6">
                <h3 className="text-sm font-semibold text-white mb-2">Confirm removal</h3>
                <p className="text-xs text-white/60 mb-4">
                  {pendingRemoveKey === '__CLEAR_ALL__'
                    ? 'This will remove all saved MCP tokens from the tools .env. This action cannot be undone.'
                    : `Remove token ${pendingRemoveKey}? This will delete it from ${mcpEnvFile ?? 'tools .env'}.`}
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setShowRemoveConfirm(false); setPendingRemoveKey(null); }}
                    className="px-3 py-1.5 rounded-md text-xs text-white/70 bg-white/5 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!pendingRemoveKey) return;
                      setShowRemoveConfirm(false);
                      const key = pendingRemoveKey;
                      setPendingRemoveKey(null);
                      try {
                        if (key === '__CLEAR_ALL__') {
                          // remove all tokens sequentially
                          for (const t of mcpTokens) {
                            try {
                              await removeMcpToken({ env_key: t.key });
                            } catch (e) {
                              // continue
                            }
                          }
                          toast.success('All tokens removed');
                        } else {
                          await removeMcpToken({ env_key: key });
                          toast.success(`${key} removed`);
                        }
                        await refreshMcpServers();
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Remove failed');
                      }
                    }}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold bg-red-600/10 text-red-300 hover:bg-red-600/20"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Agent list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                isSelected={selectedId === agent.id}
                onSelect={() => setSelectedId(agent.id)}
                onRefresh={refresh}
              />
            ))}
          </div>
        </div>

        {/* ── RIGHT: Agent detail + log console ───────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedAgent ? (
            <>
              {chatHistoryPanel}
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="mb-4 text-5xl opacity-30">🐝</div>
                <p className="text-white/30 text-sm">
                  Select an agent to view its execution log
                </p>
              </div>
            </>
          ) : (
            <>
              {chatHistoryPanel}
              {/* Agent detail header */}
              <div
                className="px-6 py-4 flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-white truncate">
                      {selectedAgent.objective}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span
                        className="text-xs font-mono px-2 py-0.5 rounded-full"
                        style={{
                          background: `${STATUS_COLORS[selectedAgent.status]}22`,
                          border: `1px solid ${STATUS_COLORS[selectedAgent.status]}55`,
                          color: STATUS_COLORS[selectedAgent.status],
                        }}
                      >
                        {STATUS_LABELS[selectedAgent.status]}
                      </span>
                      <span className="text-white/30 text-xs font-mono">
                        {selectedAgent.provider}/{selectedAgent.model}
                      </span>
                      <span className="text-white/30 text-xs font-mono">
                        {selectedAgent.max_agents} agents
                      </span>
                      {selectedAgent.human_in_loop && (
                        <span
                          className="text-xs font-mono px-1.5 py-0.5 rounded"
                          style={{
                            background: 'rgba(251,191,36,0.12)',
                            color: '#fbbf24',
                            border: '1px solid rgba(251,191,36,0.3)',
                          }}
                        >
                          Approval
                        </span>
                      )}
                    </div>

                    {/* ── Sub-agent avatar row ─────────────────────────── */}
                    {(() => {
                      const subAgents = Array.from(
                        { length: selectedAgent.max_agents },
                        (_, i) => `Agent-${String.fromCharCode(65 + i)}`,
                      );
                      // Determine which sub-agent spoke most recently in the logs
                      const lastLine = logLines[logLines.length - 1] ?? '';
                      const activeAgent = subAgents.find(name => lastLine.includes(name));
                      const isAgentRunning = ['initialising', 'planning', 'running'].includes(selectedAgent.status);

                      return (
                        <ShaderRevealTransition
                          variant="zoom"
                          transitionKey={`${selectedAgent.id}-${isAgentRunning ? 'running' : 'idle'}`}
                          duration={850}
                          className="mt-3 p-1 rounded-xl"
                        >
                          <div className="flex items-center gap-2">
                            {subAgents.map(name => {
                              const isActive = name === activeAgent;
                              return (
                                <div
                                  key={name}
                                  title={name}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <div
                                    style={{
                                      borderRadius: '50%',
                                      padding: '2px',
                                      border: isActive
                                        ? '2px solid #00ff88'
                                        : '2px solid rgba(255,255,255,0.1)',
                                      boxShadow: isActive
                                        ? '0 0 12px rgba(0,255,136,0.5)'
                                        : 'none',
                                      transition: 'all 0.3s ease',
                                      opacity: isActive ? 1 : 0.5,
                                    }}
                                  >
                                    <AgentOrb seed={name} size="40px" />
                                  </div>
                                  <span
                                    style={{
                                      fontSize: 9,
                                      fontFamily: 'monospace',
                                      color: isActive ? '#00ff88' : 'rgba(255,255,255,0.3)',
                                      fontWeight: isActive ? 700 : 400,
                                      transition: 'color 0.3s',
                                    }}
                                  >
                                    {name}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </ShaderRevealTransition>
                      );
                    })()}
                  </div>

                  {/* HITL controls in detail pane */}
                  {selectedAgent.status === 'awaiting_approval' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => approveAgent(selectedAgent.id, false).then(refresh)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{
                          background: 'rgba(248,113,113,0.15)',
                          border: '1px solid rgba(248,113,113,0.4)',
                          color: '#f87171',
                        }}
                      >
                        ✕ Reject
                      </button>
                      <button
                        onClick={() => approveAgent(selectedAgent.id, true).then(refresh)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{
                          background: 'rgba(74,222,128,0.15)',
                          border: '1px solid rgba(74,222,128,0.4)',
                          color: '#4ade80',
                        }}
                      >
                        ✓ Approve
                      </button>
                    </div>
                  )}
                </div>
              </div>

                {/* Split View: Logs & Output */}
                <div className="flex flex-1 min-h-0">
                  {/* Log console */}
                  <div
                    className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-0.5"
                    style={{ background: 'rgba(0,0,0,0.4)' }}
                  >
                  <p className="text-white/20 mb-3 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    ── Execution Log ── {selectedAgent.id.slice(0, 8)}
                  </p>

                  {logLines.length === 0 && (
                    <p className="text-white/20 italic">Waiting for log output…</p>
                  )}

                  {logLines.map((line, i) => {
                    const isError = line.includes('❌') || line.includes('⚠️') || line.includes('failed');
                    const isSuccess = line.includes('✅') || line.includes('🎉') || line.includes('completed');
                    const isWarning = line.includes('⏸️') || line.includes('checkpoint');

                    return (
                      <div
                        key={i}
                        className="leading-relaxed"
                        style={{
                          color: isError
                            ? '#f87171'
                            : isSuccess
                            ? '#4ade80'
                            : isWarning
                            ? '#fbbf24'
                            : 'rgba(255,255,255,0.7)',
                        }}
                      >
                        {line}
                      </div>
                    );
                  })}

                  {/* Active state: GridLoader + status */}
                  {!isTerminal(selectedAgent.status) && (
                    <div
                      className="flex items-center gap-3 mt-3 pt-3"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <GridLoader
                        color="#00ff88"
                        mode={selectedAgent.status === 'planning' ? 'sequence' : 'stagger'}
                        sequence={[
                          'spiral-cw',
                          'plus-full',
                          'frame',
                          'x-shape',
                          'spiral-ccw',
                        ]}
                        pattern="plus-hollow"
                        size="sm"
                        gap={3}
                        rounded
                        speed="fast"
                      />
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: 'monospace',
                          color: '#00ff88',
                          opacity: 0.8,
                          animation: 'blink 2s ease-in-out infinite',
                        }}
                      >
                        {selectedAgent.status === 'planning' && 'Compiling execution plan…'}
                        {selectedAgent.status === 'running' && 'Agents processing…'}
                        {selectedAgent.status === 'initialising' && 'Initialising runtime…'}
                        {selectedAgent.status === 'awaiting_approval' && 'Awaiting your approval…'}
                        {!['planning','running','initialising','awaiting_approval'].includes(selectedAgent.status) && 'Working…'}
                      </span>
                    </div>
                  )}
                  <div ref={logsEndRef} />
                </div>

                {/* Final Output Panel */}
                {selectedAgent.result && isTerminal(selectedAgent.status) && (
                  <div
                    className="flex-1 overflow-y-auto p-6"
                    style={{
                      background: 'rgba(10,10,10,0.8)',
                      borderLeft: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                      <span className="text-green-400">✨</span> Final Output
                    </h3>
                    <div className="text-white/90 text-sm leading-relaxed">
                      <MarkdownRenderer content={selectedAgent.result ?? ''} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(1.15); }
        }
        @keyframes swarmDropIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
