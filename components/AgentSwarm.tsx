'use client';

/**
 * components/AgentSwarm.tsx
 * ──────────────────────────
 * Full-panel Agent Swarm orchestration dashboard.
 * Shows live agent status, log streaming, HITL controls, and a task launcher.
 */

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Activity,
  Bot,
  Check,
  ChevronDown,
  Clipboard,
  GitBranch,
  KeyRound,
  LayoutDashboard,
  ListTree,
  MessageSquare,
  Plus,
  Radio,
  RefreshCw,
  Send,
  Sparkles,
  TerminalSquare,
  Trash2,
  X,
} from 'lucide-react';

// ── Custom dark-themed Select component ─────────────────────────────────────
interface SelectOption { value: string; label: ReactNode; }
interface StyledSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  className?: string;
}

function StyledSelect({ value, onChange, options, className = '' }: StyledSelectProps) {
  return (
    <div className={`relative ${className}`} style={{ userSelect: 'none' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-white/10 bg-[#11141a] px-3 py-2.5 pr-9 text-sm text-white outline-none transition-colors hover:border-white/20 focus:border-emerald-400/70"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {typeof opt.label === 'string' ? opt.label : opt.value}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
    </div>
  );
}

// ── Lightweight inline Markdown renderer ─────────────────────────────────────
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: ReactNode[] = [];
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

function inlineMarkdown(text: string): ReactNode {
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
import GridLoader from '@/components/ui/smoothui/grid-loader';
import { SwarmDagGraph } from './SwarmDagGraph';
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

  // Tab navigation
  const [sidebarTab, setSidebarTab] = useState<'launch' | 'chats' | 'mcp'>('launch');
  const [workspaceTab, setWorkspaceTab] = useState<'dag' | 'logs' | 'output'>('dag');

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

  const activeAgents = agents.filter((agent) => !isTerminal(agent.status)).length;
  const completedAgents = agents.filter((agent) => agent.status === 'completed').length;
  const selectedAgentModelLabel =
    selectedAgent?.model === 'nvidia/nemotron-3-nano-30b-a3b'
      ? 'NVIDIA NIM / Nemotron'
      : selectedAgent
      ? selectedAgent.model.startsWith(selectedAgent.provider)
        ? selectedAgent.model
        : `${selectedAgent.provider} / ${selectedAgent.model}`
      : '';

  const tabButtonClass =
    'flex h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400/70';

  const controlLabelClass = 'mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50';

  const chatHistoryPanel = (
    <section className="flex min-h-0 flex-1 flex-col border-t border-white/10 bg-[#0d1015]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <MessageSquare className="size-4 text-sky-300" />
            Conversation
          </div>
          <p className="mt-0.5 truncate text-xs text-white/45">
            {currentSession?.title ?? 'New chat'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => createNewChat()}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-400/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400/70"
        >
          <Plus className="size-3.5" />
          New
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {!currentSessionMessages?.length && (
          <div className="rounded-lg border border-dashed border-white/12 bg-white/[0.03] px-3 py-4 text-sm text-white/45">
            Launch a swarm to start this conversation.
          </div>
        )}
        {currentSessionMessages?.map((message) => (
          <div
            key={message.id}
            className={`rounded-lg border px-3 py-2.5 text-xs ${
              message.role === 'user'
                ? 'border-emerald-400/18 bg-emerald-400/[0.07]'
                : 'border-white/10 bg-white/[0.045]'
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className={message.role === 'user' ? 'font-semibold text-emerald-300' : 'font-semibold text-sky-300'}>
                {message.role === 'user' ? 'You' : 'Swarm'}
              </span>
              <span className="font-mono text-[10px] text-white/35">
                {message.status === 'pending' ? 'running' : formatChatTime(message.createdAt)}
              </span>
            </div>
            <p className="line-clamp-4 whitespace-pre-wrap leading-relaxed text-white/72">
              {message.content}
            </p>
          </div>
        ))}
      </div>
    </section>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden bg-[#07090d] text-white"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#11141a',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
          },
        }}
      />

      <header className="relative flex flex-shrink-0 items-center justify-between border-b border-white/10 bg-[#0b0f14] px-5 py-4">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-400/45 to-transparent" />
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid size-11 place-items-center rounded-xl border border-emerald-400/25 bg-emerald-400/10">
            <Bot className="size-5 text-emerald-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold leading-tight text-white">Agent Swarm</h2>
              <span className="hidden rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/55 md:inline">
                aden-hive/hive
              </span>
            </div>
            <p className="mt-0.5 text-sm text-white/48">Launch, monitor, and inspect multi-agent runs.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 md:flex">
            <span
              className="size-2 rounded-full"
              style={{
                backgroundColor:
                  backendOnline === null ? '#94a3b8' : backendOnline ? '#4ade80' : '#f87171',
                boxShadow: backendOnline ? '0 0 10px rgba(74,222,128,0.65)' : undefined,
              }}
            />
            <span className="font-mono text-xs text-white/58">
              {backendOnline === null ? 'checking backend' : backendOnline ? 'backend online' : 'backend offline'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => createNewChat()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-400 px-3.5 text-sm font-semibold text-[#06100b] transition-colors hover:bg-emerald-300 disabled:opacity-50"
          >
            <Plus className="size-4" />
            New Chat
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-white/55 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400/70"
            aria-label="Close Agent Swarm"
          >
            <X className="size-5" />
          </button>
        </div>
      </header>

      {backendOnline === false && (
        <div className="flex flex-shrink-0 items-start gap-3 border-b border-red-400/25 bg-red-500/10 px-5 py-3 text-sm">
          <Activity className="mt-0.5 size-4 flex-shrink-0 text-red-300" />
          <div>
            <p className="font-semibold text-red-200">Agent Swarm backend is not running</p>
            <p className="mt-0.5 text-xs text-red-200/72">
              Start it with <code className="rounded bg-black/30 px-1 font-mono">.\hive-backend\start.ps1</code>. The
              dashboard will reconnect automatically.
            </p>
          </div>
        </div>
      )}

      <main className="grid min-h-0 flex-1 grid-cols-[350px_minmax(360px,430px)_minmax(520px,1fr)] overflow-hidden xl:grid-cols-[360px_430px_minmax(540px,1fr)]">
        <aside className="flex min-h-0 flex-col border-r border-white/10 bg-[#0b0d12]">
          <div className="border-b border-white/10 p-3">
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
              <button
                type="button"
                onClick={() => setSidebarTab('launch')}
                className={`${tabButtonClass} ${
                  sidebarTab === 'launch' ? 'bg-emerald-400 text-[#06100b]' : 'text-white/56 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <Send className="size-3.5" />
                Launch
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('chats')}
                className={`${tabButtonClass} ${
                  sidebarTab === 'chats' ? 'bg-sky-300 text-[#06100b]' : 'text-white/56 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <MessageSquare className="size-3.5" />
                {chatSessions?.length ?? 0}
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('mcp')}
                className={`${tabButtonClass} ${
                  sidebarTab === 'mcp' ? 'bg-violet-300 text-[#12091f]' : 'text-white/56 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <KeyRound className="size-3.5" />
                {mcpTokens.length}
              </button>
            </div>
          </div>

          {sidebarTab === 'launch' && (
            <form onSubmit={handleLaunch} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
              <section className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.055] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-white" htmlFor="swarm-objective">
                    Mission Brief
                  </label>
                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] text-emerald-200">
                    {Math.min(3, Math.max(1, maxAgents))} workers
                  </span>
                </div>
                <textarea
                  id="swarm-objective"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Describe the outcome you want the swarm to produce..."
                  rows={7}
                  className="min-h-44 w-full resize-none rounded-lg border border-white/10 bg-[#080b10] px-3 py-3 text-sm leading-relaxed text-white outline-none transition-colors placeholder:text-white/40 hover:border-white/18 focus:border-emerald-400/70"
                />
              </section>

              <section>
                <span className={controlLabelClass}>Model Routing</span>
                <div className="grid gap-2">
                  <StyledSelect
                    value={provider}
                    onChange={(val) => handleProviderChange(val as ModelProvider)}
                    options={[
                      { value: 'nvidia', label: 'NVIDIA NIM' },
                      { value: 'groq', label: 'Groq' },
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
              </section>

              <section className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Worker Mesh</p>
                    <p className="mt-0.5 text-xs text-white/45">Balance breadth against coordination overhead.</p>
                  </div>
                  <span className="font-mono text-lg font-semibold text-emerald-300">{Math.min(3, Math.max(1, maxAgents))}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={1}
                  value={Math.min(3, Math.max(1, maxAgents))}
                  onChange={(e) => setMaxAgents(Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/12 accent-emerald-400"
                />
                <label className="mt-4 flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-[#10141b] px-3 py-3">
                  <span>
                    <span className="block text-sm font-semibold text-white">Human checkpoint</span>
                    <span className="text-xs text-white/45">Require approval before final synthesis.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={hitl}
                    onChange={(e) => setHitl(e.target.checked)}
                    className="size-4 accent-emerald-400"
                  />
                </label>
              </section>

              <button
                type="submit"
                disabled={!objective.trim() || launching || !backendOnline}
                className="mt-auto inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-[#06100b] transition-colors hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
              >
                {launching ? (
                  <>
                    <GridLoader color="#06100b" pattern="plus-hollow" size="sm" gap={3} rounded speed="fast" />
                    Launching
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Launch Swarm
                  </>
                )}
              </button>
            </form>
          )}

          {sidebarTab === 'chats' && (
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {chatSessions?.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/14 bg-white/[0.03] p-4 text-sm text-white/45">
                  No saved conversations yet.
                </div>
              )}
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
                  className={`rounded-xl border p-3 transition-colors ${
                    activeSessionId === session.id
                      ? 'border-sky-300/35 bg-sky-300/[0.08]'
                      : 'border-white/10 bg-white/[0.035] hover:bg-white/[0.055]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white/88">{session.title}</p>
                      <p className="mt-1 font-mono text-[10px] text-white/38">{formatChatTime(session.updatedAt)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChatSession(session.id);
                      }}
                      className="grid size-8 place-items-center rounded-lg text-white/38 transition-colors hover:bg-red-400/10 hover:text-red-300"
                      aria-label="Delete chat"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {sidebarTab === 'mcp' && (
            <form onSubmit={handleSaveMcpToken} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">MCP Credentials</p>
                  <p className="text-xs text-white/45">{mcpEnvFile ?? 'tools .env'}</p>
                </div>
                <button
                  type="button"
                  onClick={refreshMcpServers}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-xs text-white/65 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <RefreshCw className="size-3.5" />
                  Refresh
                </button>
              </div>

              <div className="space-y-2">
                {mcpTokens.length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/14 bg-white/[0.03] p-4 text-sm text-white/45">
                    Add a token key below to connect tools like Figma or GitHub.
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
                      className={`rounded-xl border p-3 transition-colors ${
                        active ? 'border-violet-300/35 bg-violet-300/[0.08]' : 'border-white/10 bg-white/[0.035] hover:bg-white/[0.055]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate font-mono text-xs font-semibold text-white/90">{token.key}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                            token.configured
                              ? 'bg-emerald-400/12 text-emerald-300'
                              : 'bg-amber-300/12 text-amber-200'
                          }`}
                        >
                          {token.configured ? 'set' : 'missing'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-1 space-y-3 border-t border-white/10 pt-4">
                <div>
                  <label className={controlLabelClass}>Target Server</label>
                  <StyledSelect
                    value={selectedMcpServer}
                    onChange={handleMcpServerChange}
                    options={
                      mcpServers.length
                        ? mcpServers.map((s) => ({ value: s.name, label: s.name }))
                        : [{ value: 'figma', label: 'figma' }]
                    }
                  />
                </div>
                <div>
                  <label className={controlLabelClass}>Environment Key</label>
                  <input
                    type="text"
                    value={mcpEnvKey}
                    onChange={(e) => setMcpEnvKey(e.target.value.toUpperCase())}
                    placeholder="e.g. FIGMA_API_TOKEN"
                    className="w-full rounded-lg border border-white/10 bg-[#11141a] px-3 py-2.5 font-mono text-xs text-white outline-none transition-colors placeholder:text-white/35 focus:border-emerald-400/70"
                  />
                </div>
                <div>
                  <label className={controlLabelClass}>Secret Token</label>
                  <input
                    type="password"
                    value={mcpToken}
                    onChange={(e) => setMcpToken(e.target.value)}
                    placeholder="Paste API token value..."
                    className="w-full rounded-lg border border-white/10 bg-[#11141a] px-3 py-2.5 font-mono text-xs text-white outline-none transition-colors placeholder:text-white/35 focus:border-emerald-400/70"
                  />
                </div>
                {mcpMessage && (
                  <p className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-2 font-mono text-xs text-emerald-200">
                    {mcpMessage}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={savingMcpToken || !mcpEnvKey.trim() || !mcpToken.trim()}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-violet-300 px-3 text-sm font-semibold text-[#12091f] transition-colors hover:bg-violet-200 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
                >
                  <KeyRound className="size-4" />
                  {savingMcpToken ? 'Saving...' : 'Save Token'}
                </button>
              </div>
            </form>
          )}
        </aside>

        <section className="flex min-h-0 flex-col border-r border-white/10 bg-[#080b10]">
          <div className="border-b border-white/10 p-4">
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">Runs</p>
                <p className="mt-1 text-xl font-semibold text-white">{agents.length}</p>
              </div>
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-200/65">Active</p>
                <p className="mt-1 text-xl font-semibold text-emerald-200">{activeAgents}</p>
              </div>
              <div className="rounded-xl border border-sky-300/18 bg-sky-300/[0.055] p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-sky-200/65">Done</p>
                <p className="mt-1 text-xl font-semibold text-sky-200">{completedAgents}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Radio className="size-4 text-emerald-300" />
                <h3 className="text-sm font-semibold text-white">Run Queue</h3>
              </div>
              <span className="font-mono text-[10px] text-white/38">polling / 3s</span>
            </div>
          </div>

          <div className="min-h-0 flex-[1.08] space-y-2 overflow-y-auto p-3">
            {agents.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/14 bg-white/[0.03] p-5 text-sm text-white/45">
                No swarms yet. Launch a mission brief to create the first run.
              </div>
            )}
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

          {chatHistoryPanel}
        </section>

        <section className="flex min-h-0 flex-col bg-[#0a0d12]">
          {!selectedAgent ? (
            <div className="grid min-h-0 flex-1 place-items-center p-8">
              <div className="max-w-sm text-center">
                <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
                  <ListTree className="size-7 text-white/45" />
                </div>
                <h3 className="text-lg font-semibold text-white">Select a run to inspect it</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/45">
                  The inspector shows the pipeline graph, live execution stream, approval controls, and final output.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-[#0d1117] px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold"
                      style={{
                        background: `${STATUS_COLORS[selectedAgent.status]}22`,
                        color: STATUS_COLORS[selectedAgent.status],
                      }}
                    >
                      {STATUS_LABELS[selectedAgent.status]}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-white/55">
                      {selectedAgent.max_agents} worker{selectedAgent.max_agents > 1 ? 's' : ''}
                    </span>
                    {selectedAgent.human_in_loop && (
                      <span className="rounded-full bg-amber-300/12 px-2.5 py-1 font-mono text-[11px] text-amber-200">
                        approval checkpoint
                      </span>
                    )}
                  </div>
                  <h3 className="truncate text-lg font-semibold text-white" title={selectedAgent.objective}>
                    {selectedAgent.objective}
                  </h3>
                  <p className="mt-1 truncate font-mono text-xs text-white/42">{selectedAgentModelLabel}</p>
                </div>

                <div className="flex flex-shrink-0 flex-col items-end gap-3">
                  {selectedAgent.status === 'awaiting_approval' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => approveAgent(selectedAgent.id, false).then(refresh)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-300/25 bg-red-400/10 px-3 text-xs font-semibold text-red-200 transition-colors hover:bg-red-400/16"
                      >
                        <X className="size-3.5" />
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => approveAgent(selectedAgent.id, true).then(refresh)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-400 px-3 text-xs font-semibold text-[#06100b] transition-colors hover:bg-emerald-300"
                      >
                        <Check className="size-3.5" />
                        Approve
                      </button>
                    </div>
                  )}
                  <div className="flex rounded-xl border border-white/10 bg-black/30 p-1">
                    <button
                      type="button"
                      onClick={() => setWorkspaceTab('dag')}
                      className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors ${
                        workspaceTab === 'dag' ? 'bg-white text-[#080b10]' : 'text-white/55 hover:bg-white/[0.07] hover:text-white'
                      }`}
                    >
                      <GitBranch className="size-3.5" />
                      Pipeline
                    </button>
                    <button
                      type="button"
                      onClick={() => setWorkspaceTab('logs')}
                      className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors ${
                        workspaceTab === 'logs' ? 'bg-white text-[#080b10]' : 'text-white/55 hover:bg-white/[0.07] hover:text-white'
                      }`}
                    >
                      <TerminalSquare className="size-3.5" />
                      Logs
                    </button>
                    <button
                      type="button"
                      onClick={() => setWorkspaceTab('output')}
                      className={`relative inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-colors ${
                        workspaceTab === 'output' ? 'bg-white text-[#080b10]' : 'text-white/55 hover:bg-white/[0.07] hover:text-white'
                      }`}
                    >
                      <Sparkles className="size-3.5" />
                      Output
                      {selectedAgent.result && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-emerald-400" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                {workspaceTab === 'dag' && (
                  <div className="grid h-full min-h-0 grid-rows-[minmax(260px,42%)_1fr]">
                    <div className="border-b border-white/10 bg-[#07090d] p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold text-white">
                          <LayoutDashboard className="size-4 text-emerald-300" />
                          Execution Map
                        </div>
                        <span className="font-mono text-[10px] text-white/38">{selectedAgent.id.slice(0, 8)}</span>
                      </div>
                      <SwarmDagGraph agent={selectedAgent} logLines={logLines} />
                    </div>
                    <div className="min-h-0 overflow-y-auto bg-[#080b10] p-4 font-mono text-xs">
                      <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-white/42">Live log tail</span>
                        <span className="text-emerald-300/80">{selectedAgent.status}</span>
                      </div>
                      {logLines.length === 0 && <p className="text-white/32">Waiting for log output...</p>}
                      {logLines.map((line, i) => {
                        const isError = line.includes('❌') || line.includes('⚠️') || line.includes('failed');
                        const isSuccess = line.includes('✅') || line.includes('🎉') || line.includes('completed');
                        const isWarning = line.includes('⏸️') || line.includes('checkpoint');
                        return (
                          <div
                            key={i}
                            className="border-b border-white/[0.03] py-1 leading-relaxed"
                            style={{
                              color: isError ? '#f87171' : isSuccess ? '#4ade80' : isWarning ? '#fbbf24' : 'rgba(255,255,255,0.72)',
                            }}
                          >
                            {line}
                          </div>
                        );
                      })}
                      {!isTerminal(selectedAgent.status) && (
                        <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4">
                          <GridLoader color="#00ff88" pattern="plus-hollow" size="sm" gap={3} rounded speed="fast" />
                          <span className="text-emerald-300/80">Running tasks...</span>
                        </div>
                      )}
                      <div ref={logsEndRef} />
                    </div>
                  </div>
                )}

                {workspaceTab === 'logs' && (
                  <div className="h-full overflow-y-auto bg-[#07090d] p-5 font-mono text-xs">
                    <div className="sticky top-0 z-10 mb-4 flex items-center justify-between border-b border-white/10 bg-[#07090d]/95 pb-3">
                      <span className="text-white/45">Execution stream / {selectedAgent.id}</span>
                      <span className="text-emerald-300">{selectedAgent.status}</span>
                    </div>
                    {logLines.length === 0 && <p className="text-white/32">Waiting for log output...</p>}
                    {logLines.map((line, i) => {
                      const isError = line.includes('❌') || line.includes('⚠️') || line.includes('failed');
                      const isSuccess = line.includes('✅') || line.includes('🎉') || line.includes('completed');
                      const isWarning = line.includes('⏸️') || line.includes('checkpoint');
                      return (
                        <div
                          key={i}
                          className="border-b border-white/[0.03] py-1.5 leading-relaxed"
                          style={{
                            color: isError ? '#f87171' : isSuccess ? '#4ade80' : isWarning ? '#fbbf24' : 'rgba(255,255,255,0.82)',
                          }}
                        >
                          {line}
                        </div>
                      );
                    })}
                    {!isTerminal(selectedAgent.status) && (
                      <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-5">
                        <GridLoader color="#00ff88" pattern="plus-hollow" size="sm" gap={3} rounded speed="fast" />
                        <span className="text-emerald-300/80">Live streaming execution logs...</span>
                      </div>
                    )}
                    <div ref={logsEndRef} />
                  </div>
                )}

                {workspaceTab === 'output' && (
                  <div className="h-full overflow-y-auto bg-[#080b10] p-6">
                    <div className="mx-auto max-w-4xl">
                      <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                        <div className="flex items-center gap-2">
                          <Sparkles className="size-4 text-emerald-300" />
                          <h3 className="text-base font-semibold text-white">Final Output</h3>
                        </div>
                        {selectedAgent.result && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedAgent.result ?? '');
                              toast.success('Output copied to clipboard');
                            }}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-white/72 transition-colors hover:bg-white/10 hover:text-white"
                          >
                            <Clipboard className="size-3.5" />
                            Copy
                          </button>
                        )}
                      </div>
                      {selectedAgent.result ? (
                        <article className="rounded-xl border border-white/10 bg-[#0d1117] p-6 text-sm leading-relaxed text-white/86">
                          <MarkdownRenderer content={selectedAgent.result ?? ''} />
                        </article>
                      ) : (
                        <div className="rounded-xl border border-dashed border-white/14 bg-white/[0.03] p-12 text-center">
                          <Sparkles className="mx-auto mb-4 size-8 text-white/30" />
                          <p className="text-sm font-semibold text-white/60">Output is being generated</p>
                          <p className="mt-1 text-xs text-white/38">The sub-agents are still processing this objective.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>

      {showRemoveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/12 bg-[#11141a] p-4">
            <h3 className="text-sm font-semibold text-white">Confirm removal</h3>
            <p className="mt-2 text-xs leading-relaxed text-white/60">
              {pendingRemoveKey === '__CLEAR_ALL__'
                ? 'This will remove all saved MCP tokens from the tools .env. This action cannot be undone.'
                : `Remove token ${pendingRemoveKey}? This will delete it from ${mcpEnvFile ?? 'tools .env'}.`}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowRemoveConfirm(false);
                  setPendingRemoveKey(null);
                }}
                className="h-9 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!pendingRemoveKey) return;
                  setShowRemoveConfirm(false);
                  const key = pendingRemoveKey;
                  setPendingRemoveKey(null);
                  try {
                    if (key === '__CLEAR_ALL__') {
                      for (const t of mcpTokens) {
                        try {
                          await removeMcpToken({ env_key: t.key });
                        } catch {
                          // Continue removing the rest of the configured tokens.
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
                className="h-9 rounded-lg bg-red-400/15 px-3 text-xs font-semibold text-red-200 transition-colors hover:bg-red-400/22"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
