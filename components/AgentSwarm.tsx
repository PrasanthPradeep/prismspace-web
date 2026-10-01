/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

/**
 * components/AgentSwarm.tsx
 * ──────────────────────────
 * Centered dialog Agent Swarm orchestration dashboard.
 * Redesigned with PrismSpace High-Voltage design system.
 * Shows live agent status, log streaming, HITL controls, and a task launcher.
 */

import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Copy,
  Cpu,
  ExternalLink,
  Eye,
  EyeOff,
  GitBranch,
  KeyRound,
  Layers,
  ListTree,
  Lock,
  MessageSquare,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TerminalSquare,
  Trash2,
  X,
} from 'lucide-react';
import { StatefulButton } from '@/components/ui/stateful-button';
import { GradientButton } from '@/components/kokonutui/gradient-button';
import { AIPrompt, type AIPromptModel } from '@/components/kokonutui/ai-prompt';
import {
  BYOK_PROVIDERS,
  getAllStoredApiKeys,
  getStoredApiKey,
  getAllPromptModels,
  getProviderForModel as getByokProviderForModel,
  maskApiKey,
  isProviderConfigured,
  type ByokProviderId,
} from '@/lib/byok-storage';
import { ByokModal, getProviderIcon } from '@/components/ByokModal';
import { SwarmModelSelect } from './SwarmModelSelect';
import { cn } from '@/lib/utils';
import {
  MCP_SERVER_REGISTRY,
  FEATURED_MCP_SERVERS,
  ALL_MCP_SERVERS,
  getMcpServerMeta,
  getMcpServerForEnvKey,
  renderMcpServerIcon,
  type McpServerMeta,
} from '@/lib/mcp-catalog';

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
        style={{
          width: '100%',
          appearance: 'none',
          borderRadius: 'var(--prism-radius-lg)',
          border: '1px solid var(--prism-border-card)',
          background: 'var(--prism-board)',
          padding: '10px 36px 10px 12px',
          fontSize: '0.8125rem',
          color: '#fff',
          outline: 'none',
          transition: 'border-color 0.2s',
          fontFamily: "'JetBrains Mono', monospace",
        }}
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
        <blockquote key={`bq-${i}`} style={{ borderLeft: '3px solid rgba(0,223,129,0.4)', paddingLeft: '12px', margin: '8px 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', fontStyle: 'italic' }}>
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
      return <code key={idx} style={{ background: 'rgba(0,223,129,0.1)', color: '#00df81', padding: '1px 5px', borderRadius: '4px', fontSize: '0.78rem', fontFamily: "'JetBrains Mono', monospace" }}>{part.slice(1, -1)}</code>;
    return part;
  });
}

import {
  SwarmAgent,
  CreateAgentPayload,
  ModelProvider,
  createAgent,
  analyzeSwarmIntelligence,
  listAgents,
  approveAgent,
  streamAgentLogs,
  checkSwarmHealth,
  listMcpServers,
  saveMcpToken,
  removeMcpToken,
  cancelAgentOperation,
  connectGmail,
  gmailStatus,
  getGmailUserId,
  STATUS_COLORS,
  STATUS_LABELS,
  isTerminal,
  type McpServerStatus,
  type McpTokenStatus,
  type SwarmIntelligence,
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
  nvidia: ['nvidia/nemotron-3.5-lightning-30b-a3b', 'meta/llama-3.3-70b-instruct'],
  groq: ['llama-3.3-70b-versatile', 'llama3-70b-8192', 'mixtral-8x7b-32768'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o3-mini'],
  anthropic: ['claude-3-7-sonnet-latest', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
  google: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  openrouter: [
    'anthropic/claude-3.7-sonnet',
    'anthropic/claude-3.5-sonnet',
    'deepseek/deepseek-r1',
    'meta-llama/llama-3.3-70b-instruct',
    'google/gemini-2.0-flash-001',
    'openai/gpt-4o',
    'mistralai/mistral-large-2411',
    'qwen/qwen-2.5-72b-instruct',
  ],
  deepseek: ['deepseek-chat', 'deepseek-reasoner'],
};

function getProviderForModel(modelId: string): ModelProvider {
  return getByokProviderForModel(modelId) as ModelProvider;
}

const SWARM_MODEL_KEY = 'prism.agentSwarm.selectedModel';
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

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatChatTime(timestamp);
}

interface TransferStatus {
  operation: 'copy' | 'move';
  percent: number;
  phase: 'running' | 'complete' | 'failed';
  method: string;
  detail: string;
  command?: string;
}

function getTransferStatus(lines: string[]): TransferStatus | null {
  const transferLines = lines.filter((line) => line.includes('[TRANSFER]'));
  if (!transferLines.length) return null;

  const latest = transferLines[transferLines.length - 1];
  const operationMatch = latest.match(/\[TRANSFER\]\s+(copy|move)\b/);
  if (!operationMatch) return null;

  const operation = operationMatch[1] as TransferStatus['operation'];
  const relevant = transferLines.filter((line) => line.includes(`[TRANSFER] ${operation} `));
  const percent = relevant.reduce((value, line) => {
    const match = line.match(/progress\s+(\d{1,3})%/i);
    return match ? Math.min(100, Number(match[1])) : value;
  }, 0);
  const methodMatch = relevant.join('\n').match(/via\s+([\w.-]+)/i) ?? relevant.join('\n').match(/fallback command:\s+([^\r\n]+)/i);
  const commandMatch = [...relevant].reverse().find((line) => line.includes(' command: '));
  const phase = latest.includes(' failed ') ? 'failed' : latest.includes(' complete ') ? 'complete' : 'running';

  return {
    operation,
    percent: phase === 'complete' ? 100 : percent,
    phase,
    method: methodMatch?.[1] ?? 'native copier',
    detail: latest.replace(/^\[[^\]]+\]\s*\[TRANSFER\]\s*/, ''),
    command: commandMatch?.split(' command: ')[1],
  };
}

function TransferProgress({ status, onCancel }: { status: TransferStatus | null; onCancel?: () => void }) {
  if (!status) return null;
  const color = status.phase === 'failed' ? '#f87171' : status.phase === 'complete' ? '#00df81' : '#38bdf8';
  const label = status.phase === 'failed' ? 'Transfer failed' : status.phase === 'complete' ? 'Transfer complete' : `${status.operation === 'copy' ? 'Copying' : 'Moving'} files`;

  return (
    <div
      className="mb-4 rounded-xl p-3"
      style={{ border: `1px solid ${color}35`, background: `${color}0d` }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <Copy className="size-3.5" style={{ color }} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color }}>
          {label}
        </span>
        <span className="ml-auto font-mono text-xs" style={{ color }}>
          {status.percent}%
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-full rounded-full transition-[width] duration-200"
          style={{ width: `${status.percent}%`, background: color, boxShadow: `0 0 10px ${color}80` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-white/45">
        <span className="truncate">{status.method} · {status.detail}</span>
        <div className="flex min-w-0 items-center gap-2">
          {status.command && <code className="max-w-[40%] truncate text-white/35" title={status.command}>{status.command}</code>}
          {status.phase === 'running' && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-[10px] font-semibold text-red-200 transition-colors hover:bg-red-400/10"
              style={{ border: '1px solid rgba(248,113,113,0.25)' }}
              title="Cancel active transfer"
            >
              <X className="size-3" />
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── View types ──────────────────────────────────────────────────────────────
type SwarmView = 'launch' | 'runs' | 'settings';
type InspectorTab = 'dag' | 'logs' | 'output';

const VIEW_TABS: { id: SwarmView; label: string; icon: typeof Send }[] = [
  { id: 'launch', label: 'Launch', icon: Send },
  { id: 'runs', label: 'Runs', icon: Radio },
  { id: 'settings', label: 'Settings', icon: Settings },
];



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
  const [showServerPicker, setShowServerPicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [showToolsDrawer, setShowToolsDrawer] = useState(false);

  // New agent form & BYOK state
  const [objective, setObjective] = useState('');
  const [provider, setProvider] = useState<ModelProvider>('nvidia');
  const [model, setModel] = useState<string>('nvidia/nemotron-3.5-lightning-30b-a3b');
  const [maxAgents, setMaxAgents] = useState(3);
  const [workerMode, setWorkerMode] = useState<'auto' | 'manual'>('manual');
  const [workerModels, setWorkerModels] = useState<string[]>([
    'nvidia/nemotron-3.5-lightning-30b-a3b',
    'nvidia/nemotron-3.5-lightning-30b-a3b',
    'nvidia/nemotron-3.5-lightning-30b-a3b',
  ]);
  const [autoSizing, setAutoSizing] = useState(false);
  const [autoRecommendation, setAutoRecommendation] = useState<SwarmIntelligence | null>(null);
  const [hitl, setHitl] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [runsSubTab, setRunsSubTab] = useState<'agents' | 'chat'>('agents');

  // BYOK & Chat History Launch page state
  const [showByokModal, setShowByokModal] = useState(false);
  const [storedKeys, setStoredKeys] = useState<Record<string, string>>({});
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [launchRightTab, setLaunchRightTab] = useState<'history' | 'byok' | 'config'>('history');

  useEffect(() => {
    setStoredKeys(getAllStoredApiKeys());
    const handleByokUpdated = () => {
      setStoredKeys(getAllStoredApiKeys());
    };
    window.addEventListener('prism:byok-updated', handleByokUpdated);
    window.addEventListener('storage', handleByokUpdated);
    return () => {
      window.removeEventListener('prism:byok-updated', handleByokUpdated);
      window.removeEventListener('storage', handleByokUpdated);
    };
  }, []);

  const availablePromptModels = useMemo(() => {
    return getAllPromptModels(storedKeys);
  }, [storedKeys]);

  const configuredProviderCount = useMemo(() => {
    return BYOK_PROVIDERS.filter((p) => Boolean(storedKeys[p.id]?.trim())).length;
  }, [storedKeys]);

  useEffect(() => {
    if (!availablePromptModels.length) return;
    const fallback = availablePromptModels[0].id;
    setWorkerModels((current) => Array.from({ length: 3 }, (_, index) => current[index] && availablePromptModels.some((item) => item.id === current[index]) ? current[index] : fallback));
  }, [availablePromptModels]);

  const workerModelOptions = useMemo(() => availablePromptModels.map((item) => ({
    value: item.id,
    label: `${item.name} · ${item.provider || getProviderForModel(item.id)}`,
  })), [availablePromptModels]);

  const handleWorkerModelChange = useCallback((index: number, modelId: string) => {
    setWorkerModels((current) => current.map((item, itemIndex) => itemIndex === index ? modelId : item));
  }, []);

  const handleWorkerModeChange = useCallback(async (mode: 'auto' | 'manual') => {
    setWorkerMode(mode);
    if (mode !== 'auto' || !objective.trim() || autoSizing) return;
    setAutoSizing(true);
    try {
      const recommendation = await analyzeSwarmIntelligence(objective.trim());
      const recommendedWorkers = Math.min(3, Math.max(1, recommendation.recommended_workers || 1));
      setMaxAgents(recommendedWorkers);
      setAutoRecommendation(recommendation);
    } catch {
      toast.error('Auto worker sizing needs the Agent Swarm backend online.');
      setWorkerMode('manual');
    } finally {
      setAutoSizing(false);
    }
  }, [autoSizing, objective]);

  // Load saved model preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SWARM_MODEL_KEY);
      if (saved && availablePromptModels.some((m) => m.id === saved)) {
        setModel(saved);
        setProvider(getProviderForModel(saved));
      }
    } catch {
      // ignore storage error
    }
  }, [availablePromptModels]);

  const handleModelChange = useCallback((newModelId: string, newProvider?: string) => {
    const prov = (newProvider as ModelProvider) || getProviderForModel(newModelId);
    setModel(newModelId);
    setProvider(prov);
    try {
      localStorage.setItem(SWARM_MODEL_KEY, newModelId);
      window.dispatchEvent(
        new CustomEvent('prism:model-updated', {
          detail: { model: newModelId, provider: prov },
        })
      );
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const handleOpenSwarm = (e: Event) => {
      const customEvent = e as CustomEvent<{ query?: string; model?: string; provider?: string }>;
      if (customEvent.detail?.query) {
        setObjective(customEvent.detail.query);
      }
      if (customEvent.detail?.model) {
        handleModelChange(customEvent.detail.model, customEvent.detail.provider);
      }
      setActiveView('launch');
    };

    const handleModelUpdatedFromExternal = (e: Event) => {
      const customEvent = e as CustomEvent<{ model?: string; provider?: string }>;
      if (customEvent.detail?.model && customEvent.detail.model !== model) {
        const targetModel = customEvent.detail.model;
        const targetProv = (customEvent.detail.provider as ModelProvider) || getProviderForModel(targetModel);
        setModel(targetModel);
        setProvider(targetProv);
      }
    };

    window.addEventListener('prism:open-agent-swarm', handleOpenSwarm);
    window.addEventListener('prism:model-updated', handleModelUpdatedFromExternal);
    return () => {
      window.removeEventListener('prism:open-agent-swarm', handleOpenSwarm);
      window.removeEventListener('prism:model-updated', handleModelUpdatedFromExternal);
    };
  }, [handleModelChange, model]);

  // Per-user Gmail MCP
  const [gmailEmail, setGmailEmail] = useState<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('prism_gmail_email') : null,
  );
  const [gmailLoading, setGmailLoading] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const uid = q.get('gmail_user_id');
    const email = q.get('gmail_email');
    if (uid) localStorage.setItem('prism_gmail_user_id', uid);
    if (email) {
      localStorage.setItem('prism_gmail_email', email);
      setGmailEmail(email);
    }
    const stored = uid ?? getGmailUserId();
    if (stored) {
      gmailStatus(stored)
        .then((s) => {
          if (s.connected) {
            setGmailEmail(s.email ?? email ?? null);
            if (s.email) localStorage.setItem('prism_gmail_email', s.email);
          } else {
            setGmailEmail(null);
            localStorage.removeItem('prism_gmail_email');
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // View navigation
  const [activeView, setActiveView] = useState<SwarmView>('launch');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('dag');

  const logsEndRef = useRef<HTMLDivElement>(null);
  const cleanupLogStream = useRef<(() => void) | null>(null);

  const chatSessions = useLiveQuery(
    () => db.agent_chat_sessions.orderBy('updatedAt').reverse().toArray(),
    [],
  );

  const allChatMessages = useLiveQuery(
    () => db.agent_chat_messages.toArray(),
    [],
  );

  const sessionMessageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (allChatMessages) {
      for (const msg of allChatMessages) {
        counts[msg.sessionId] = (counts[msg.sessionId] || 0) + 1;
      }
    }
    return counts;
  }, [allChatMessages]);

  const filteredChatSessions = useMemo(() => {
    if (!chatSessions) return [];
    if (!chatSearchQuery.trim()) return chatSessions;
    const query = chatSearchQuery.toLowerCase();
    return chatSessions.filter((s) => s.title.toLowerCase().includes(query));
  }, [chatSessions, chatSearchQuery]);

  const resumeSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    localStorage.setItem(ACTIVE_SWARM_CHAT_KEY, sessionId);
    setRunsSubTab('chat');
    setActiveView('runs');
  }, []);

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
      await db.agent_chat_messages.where('sessionId').equals(sessionId).delete();
      await db.agent_chat_sessions.delete(sessionId);

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
  const handleLaunch = async (
    e?: React.FormEvent,
    customPrompt?: string,
    customModel?: string,
    customProvider?: ModelProvider,
  ) => {
    e?.preventDefault();
    const textToLaunch = customPrompt !== undefined ? customPrompt : objective;
    const trimmedObjective = textToLaunch.trim();
    if (!trimmedObjective || launching) return;

    if (backendOnline === false) {
      toast.error('Agent Swarm backend is offline. Start it with: .\\backend\\start.ps1');
      return;
    }

    setLaunching(true);
    let sessionIdForFailure: string | null = null;
    try {
      let launchMaxAgents = maxAgents;
      if (workerMode === 'auto') {
        const recommendation = await analyzeSwarmIntelligence(trimmedObjective);
        launchMaxAgents = Math.min(3, Math.max(1, recommendation.recommended_workers || 1));
        setMaxAgents(launchMaxAgents);
        setAutoRecommendation(recommendation);
      }
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

      const launchWorkerModels = workerModels.slice(0, launchMaxAgents).map((workerModel, index) => ({
        model: index === 0 && customModel ? customModel : workerModel,
        provider: (index === 0 && customProvider ? customProvider : getProviderForModel(workerModel)) as ModelProvider,
      }));
      const launchModel = launchWorkerModels[0]?.model || customModel || model;
      const launchProvider = launchWorkerModels[0]?.provider || customProvider || provider || getProviderForModel(launchModel);
      const byokApiKey = getStoredApiKey(launchProvider);

      const payload: CreateAgentPayload = {
        objective: trimmedObjective,
        provider: launchProvider,
        model: launchModel,
        max_agents: launchMaxAgents,
        human_in_loop: hitl,
        api_key: byokApiKey || undefined,
        chat_history: priorMessages.slice(-16).map((message) => ({
          role: message.role,
          content: message.content,
        })),
        worker_models: launchWorkerModels,
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
      setActiveView('runs');
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

  const selectedAgent = agents.find((a) => a.id === selectedId);
  const transferStatus = useMemo(() => getTransferStatus(logLines), [logLines]);
  const selectedMcpToken = mcpTokens.find((token) => token.key === mcpEnvKey);

  const currentServerMeta = useMemo(
    () => getMcpServerMeta(selectedMcpServer),
    [selectedMcpServer],
  );

  const isServerConfigured = useCallback(
    (server: McpServerMeta): boolean => {
      if (server.id === 'filesystem') return true;
      if (server.id === 'gmail' && gmailConnected) return true;
      return server.envKeys.some((env) =>
        mcpTokens.some((t) => t.key.toUpperCase() === env.key.toUpperCase() && t.configured),
      );
    },
    [mcpTokens, gmailConnected],
  );

  const handleMcpServerChange = (serverName: string) => {
    const meta = getMcpServerMeta(serverName);
    setSelectedMcpServer(meta.id);
    setMcpEnvKey(meta.primaryEnvKey);
    setMcpToken('');
    setMcpMessage(null);
  };

  const handleSelectMcpToken = (token: McpTokenStatus) => {
    const meta = getMcpServerForEnvKey(token.key) ?? (token.used_by[0] ? getMcpServerMeta(token.used_by[0]) : null);
    if (meta) {
      setSelectedMcpServer(meta.id);
    }
    setMcpEnvKey(token.key);
    setMcpToken('');
    setMcpMessage(null);
  };

  const handleConnectGmail = async () => {
    setConnectingGmail(true);
    try {
      await connectGmail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Google OAuth connection failed');
      setConnectingGmail(false);
    }
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
          ? `${mcpEnvKey.trim().toUpperCase()} saved for ${getMcpServerMeta(selectedMcpServer).displayName}.`
          : `${mcpEnvKey.trim().toUpperCase()} updated in tools .env.`,
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
    selectedAgent?.model === 'nvidia/nemotron-3.5-lightning-30b-a3b'
      ? 'NVIDIA NIM / Lightning'
      : selectedAgent
      ? selectedAgent.model.startsWith(selectedAgent.provider)
        ? selectedAgent.model
        : `${selectedAgent.provider} / ${selectedAgent.model}`
      : '';

  // ── Shared styles ─────────────────────────────────────────────────────────
  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--prism-muted)',
    fontFamily: "'JetBrains Mono', monospace",
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 'var(--prism-radius-lg)',
    border: '1px solid var(--prism-border-card)',
    background: 'var(--prism-board)',
    padding: '10px 12px',
    fontSize: '0.8125rem',
    color: '#fff',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: "'JetBrains Mono', monospace",
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden"
      style={{
        fontFamily: "'Space Grotesk', sans-serif",
        background: 'var(--prism-board)',
        color: '#fff',
      }}
    >
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: 'var(--prism-board)',
            color: 'white',
            border: '1px solid var(--prism-border-card)',
            borderRadius: 'var(--prism-radius-lg)',
          },
        }}
      />

      {/* ── Header with Integrated Tab Bar ─────────────────────────────── */}
      <header
        className="relative flex flex-shrink-0 items-center justify-between px-5 py-2"
        style={{ borderBottom: '1px solid var(--prism-border-card)' }}
      >
        {/* Accent glow line */}
        <div
          className="absolute inset-x-0 bottom-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(0,223,129,0.45), transparent)' }}
        />

        {/* Left: Branding & Status */}
        <div className="flex min-w-0 items-center gap-3">
        </div>

        {/* Center: Tabs Switcher */}
        <div
          className="flex gap-1 p-1 rounded-xl"
          style={{
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid var(--prism-border-card)',
            borderRadius: 'var(--prism-radius-lg)',
          }}
        >
          {VIEW_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;
            const count = tab.id === 'runs' ? agents.length : tab.id === 'settings' ? mcpTokens.length : undefined;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveView(tab.id)}
                className={`relative flex h-8 min-w-[95px] items-center justify-center gap-1.5 px-3 text-xs font-semibold transition-colors duration-150 ${
                  isActive ? 'text-black' : 'text-neutral-400 hover:text-white'
                }`}
                style={{
                  borderRadius: 'var(--prism-radius-md)',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="swarm-tab-pill"
                    className="absolute inset-0"
                    style={{ background: 'var(--prism-primary)', borderRadius: 'var(--prism-radius-md)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="size-3.5" />
                  {tab.label}
                  {count !== undefined && count > 0 && (
                    <span
                      className="rounded-full px-1.5 py-0.2 text-[9px] font-bold"
                      style={{
                        background: isActive ? 'rgba(0,0,0,0.2)' : 'var(--prism-card)',
                        color: isActive ? '#000' : 'var(--prism-primary)',
                      }}
                    >
                      {count}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            onClick={() => createNewChat()}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold"
            style={{
              background: 'rgba(0,223,129,0.1)',
              border: '1px solid rgba(0,223,129,0.25)',
              color: 'var(--prism-primary)',
              borderRadius: 'var(--prism-radius-md)',
            }}
            whileHover={{ background: 'var(--prism-primary)', color: '#000' }}
            whileTap={{ scale: 0.97 }}
          >
            <Plus className="size-3.5" />
            New Chat
          </motion.button>
          <motion.button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg"
            style={{
              border: '1px solid var(--prism-border-card)',
              background: 'var(--prism-card)',
              color: 'var(--prism-muted)',
            }}
            whileHover={{
              backgroundColor: 'rgba(0,223,129,0.1)',
              borderColor: 'rgba(0,223,129,0.3)',
              color: '#00df81',
            }}
            whileTap={{ scale: 0.93 }}
          >
            <X className="size-4" />
          </motion.button>
        </div>
      </header>

      {/* ── Backend offline banner ──────────────────────────────────────── */}
      {backendOnline === false && (
        <div
          className="flex flex-shrink-0 items-start gap-3 px-5 py-2.5 text-sm"
          style={{
            borderBottom: '1px solid rgba(248,113,113,0.25)',
            background: 'rgba(248,113,113,0.06)',
          }}
        >
          <Activity className="mt-0.5 size-4 flex-shrink-0" style={{ color: '#f87171' }} />
          <div>
            <p style={{ fontWeight: 600, color: '#fca5a5', fontSize: '13px' }}>Agent Swarm backend is offline</p>
            <p className="mt-0.5" style={{ fontSize: '0.72rem', color: 'rgba(252,165,165,0.7)' }}>
              Start with{' '}
              <code className="terminal-pill" style={{ display: 'inline', padding: '1px 6px', fontSize: '0.68rem' }}>
                <span className="terminal-prompt-char">$</span> .\backend\start.ps1
              </code>
            </p>
          </div>
        </div>
      )}

      {/* ── View Content ───────────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* ═══════ LAUNCH VIEW (2-COLUMN ZERO-SCROLL) ═══════ */}
        <div className={`h-full min-h-0 overflow-y-auto lg:overflow-hidden p-4 ${activeView === 'launch' ? 'block' : 'hidden'}`}>
              <form onSubmit={handleLaunch} className="grid h-full grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
                {/* Left: Mission Brief AI Prompt Toolbar (lg:col-span-7) */}
                <div className="lg:col-span-7 flex flex-col min-h-0 h-full">
                  {/* Quick-resume recent chat chips if any */}
                  {chatSessions && chatSessions.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-0.5 flex-shrink-0">
                      <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
                        <MessageSquare className="size-3 text-[#00df81]" />
                        Recent:
                      </span>
                      {chatSessions.slice(0, 4).map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => resumeSession(s.id)}
                          title={`Resume "${s.title}" (${sessionMessageCounts[s.id] || 0} messages)`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border border-[rgba(255,255,255,0.08)] bg-white/[0.03] hover:border-[rgba(0,223,129,0.35)] hover:bg-[rgba(0,223,129,0.08)] text-white/80 hover:text-white transition-all max-w-[170px] truncate group cursor-pointer"
                        >
                          <span className="truncate">{s.title}</span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-white/50 group-hover:text-[#00df81]">
                            {sessionMessageCounts[s.id] || 0}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <section className="mb-3 flex-shrink-0 rounded-2xl border border-[rgba(0,223,129,0.22)] bg-[linear-gradient(135deg,rgba(0,223,129,0.09),rgba(0,0,0,0.25))] p-3.5 shadow-[0_0_24px_rgba(0,223,129,0.06)]" aria-labelledby="worker-mesh-title">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex size-8 items-center justify-center rounded-lg border border-[rgba(0,223,129,0.28)] bg-black/30 text-[#00df81]">
                          <GitBranch className="size-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 id="worker-mesh-title" className="text-sm font-semibold text-white">Worker mesh</h2>
                            <span className="rounded-full bg-[#00df81]/15 px-2 py-0.5 text-[10px] font-mono font-bold text-[#00df81]">{maxAgents} NODE{maxAgents === 1 ? '' : 'S'}</span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-white/55">Choose an API for each node before launch.</p>
                        </div>
                      </div>
                      <div className="flex items-center rounded-lg border border-white/10 bg-black/25 p-0.5" role="group" aria-label="Worker sizing mode">
                        <button type="button" onClick={() => handleWorkerModeChange('manual')} className={cn('rounded-md px-2.5 py-1.5 text-[10px] font-mono transition-colors', workerMode === 'manual' ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white')}>Manual</button>
                        <button type="button" onClick={() => handleWorkerModeChange('auto')} className={cn('rounded-md px-2.5 py-1.5 text-[10px] font-mono transition-colors', workerMode === 'auto' ? 'bg-[#00df81]/20 text-[#00df81]' : 'text-white/45 hover:text-white')} disabled={autoSizing}>{autoSizing ? 'Sizing...' : 'Auto'}</button>
                      </div>
                    </div>

                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-white/40">Worker count</span>
                      <div className="flex flex-1 items-center gap-1.5">
                        {[1, 2, 3].map((count) => (
                          <button key={count} type="button" onClick={() => { setWorkerMode('manual'); setMaxAgents(count); }} className={cn('flex-1 rounded-md border py-1 text-xs font-mono transition-colors', maxAgents === count ? 'border-[#00df81]/45 bg-[#00df81]/15 text-[#00df81]' : 'border-white/10 bg-black/20 text-white/45 hover:border-white/25 hover:text-white')}>{count}</button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {workerModels.slice(0, maxAgents).map((workerModel, index) => {
                        const worker = availablePromptModels.find((item) => item.id === workerModel);
                        return (
                          <div key={index} className="min-w-0">
                            <div className="mb-1.5 flex items-center justify-between gap-1.5">
                              <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-white/55">
                                <span className="flex size-4 items-center justify-center rounded-full bg-white/10 text-[9px] text-white/80">{index + 1}</span>
                                Node {index + 1}
                              </span>
                              <span className="block truncate text-[10px] font-mono text-[#00df81]/70">{worker?.provider || getProviderForModel(workerModel)} API</span>
                            </div>
                            <SwarmModelSelect
                              value={workerModel}
                              onChange={(value) => handleWorkerModelChange(index, value)}
                              models={availablePromptModels}
                              onOpenByok={() => setShowByokModal(true)}
                              className="w-full"
                              align={index === 0 ? 'start' : index === 2 ? 'end' : 'center'}
                            />
                          </div>
                        );
                      })}
                    </div>
                    {workerMode === 'auto' && autoRecommendation && (
                      <p className="mt-2 text-[10px] font-mono text-white/45">ML route: <span className="text-[#00df81]">{autoRecommendation.intent || 'general'}</span> · {autoRecommendation.recommended_provider || 'nvidia'} · {autoRecommendation.models_loaded || 0} models loaded</p>
                    )}
                  </section>

                  <AIPrompt
                    value={objective}
                    onChange={setObjective}
                    onSubmit={(val, selectedModelId, modelProvider) => {
                      const targetModel = selectedModelId || workerModels[0] || model;
                      const targetProvider = (modelProvider as ModelProvider) || getProviderForModel(targetModel);
                      handleModelChange(targetModel, targetProvider);
                      handleLaunch(undefined, val, targetModel, targetProvider);
                    }}
                    models={availablePromptModels}
                    selectedModel={workerModels[0] || model}
                    onModelChange={handleModelChange}
                    onOpenByok={() => setShowByokModal(true)}
                    showModelSelector={false}
                    templates={[
                      { label: 'Research & Map', text: 'Research latest advancements and synthesize an architectural breakdown.' },
                      { label: 'Code Review & Audit', text: 'Audit recent commits, check for edge-case regressions, and formulate fixes.' },
                      { label: 'Feature Spec', text: 'Draft a fullstack implementation spec with API models, components, and tests.' },
                    ]}
                    headerText="Mission Brief"
                    headerSubtitle="Autonomous Swarm Objective"
                    headerAction={
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowByokModal(true)}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono border border-[rgba(0,223,129,0.25)] bg-[rgba(0,223,129,0.08)] text-[#00df81] hover:bg-[rgba(0,223,129,0.18)] transition-all cursor-pointer"
                          title="Configure API Keys (BYOK)"
                        >
                          <KeyRound className="size-2.5" />
                          BYOK Keys ({configuredProviderCount}/7)
                        </button>
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold"
                          style={{
                            border: '1px solid rgba(0,223,129,0.25)',
                            background: 'rgba(0,223,129,0.08)',
                            color: 'var(--prism-primary)',
                          }}
                        >
                          {maxAgents} worker{maxAgents > 1 ? 's' : ''} assigned
                        </span>
                      </div>
                    }
                    placeholder="Describe the outcome you want the swarm to produce... (e.g. build a data visualization pipeline, audit security, or synthesize documentation)"
                    loading={launching}
                    submitLabel="Launch Swarm Orchestration"
                    submitLoadingLabel="Deploying Swarm Nodes..."
                    className="h-full flex-1 flex flex-col"
                  />
                </div>

                {/* Right: Launch Page Hub with Chat History, BYOK & Config (lg:col-span-5) */}
                <div className="lg:col-span-5 flex flex-col min-h-0 h-full rounded-2xl border border-[var(--prism-border-card)] bg-[var(--prism-card)] overflow-hidden shadow-xl">
                  {/* Segmented Subheader */}
                  <div className="p-2 border-b border-[var(--prism-border-card)] bg-black/30 flex items-center justify-between gap-1 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setLaunchRightTab('history')}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 transition-all cursor-pointer",
                          launchRightTab === 'history'
                            ? "bg-[rgba(0,223,129,0.15)] text-[#00df81] border border-[rgba(0,223,129,0.3)] shadow-[0_0_10px_rgba(0,223,129,0.1)]"
                            : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                        )}
                      >
                        <MessageSquare className="size-3.5" />
                        Chat History
                        {chatSessions && chatSessions.length > 0 && (
                          <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] bg-white/10 text-white/70">
                            {chatSessions.length}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setLaunchRightTab('byok')}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 transition-all cursor-pointer",
                          launchRightTab === 'byok'
                            ? "bg-[rgba(0,223,129,0.15)] text-[#00df81] border border-[rgba(0,223,129,0.3)] shadow-[0_0_10px_rgba(0,223,129,0.1)]"
                            : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                        )}
                      >
                        <KeyRound className="size-3.5" />
                        BYOK Keys
                        <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] bg-white/10 text-[#00df81]">
                          {configuredProviderCount}/7
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLaunchRightTab('config')}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 transition-all cursor-pointer",
                          launchRightTab === 'config'
                            ? "bg-[rgba(0,223,129,0.15)] text-[#00df81] border border-[rgba(0,223,129,0.3)] shadow-[0_0_10px_rgba(0,223,129,0.1)]"
                            : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                        )}
                      >
                        <SlidersHorizontal className="size-3.5" />
                        Config
                      </button>
                    </div>

                    {launchRightTab === 'history' && (
                      <button
                        type="button"
                        onClick={() => createNewChat()}
                        className="px-2 py-1 rounded-md text-[11px] font-mono text-[#00df81] bg-[rgba(0,223,129,0.08)] hover:bg-[rgba(0,223,129,0.18)] transition-colors flex items-center gap-1 cursor-pointer"
                        title="Start a new chat session"
                      >
                        <Plus className="size-3" />
                        New
                      </button>
                    )}

                    {launchRightTab === 'byok' && (
                      <button
                        type="button"
                        onClick={() => setShowByokModal(true)}
                        className="px-2 py-1 rounded-md text-[11px] font-mono text-[#00df81] bg-[rgba(0,223,129,0.08)] hover:bg-[rgba(0,223,129,0.18)] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="size-3" />
                        Manage
                      </button>
                    )}
                  </div>

                  {/* Tab 1: Chat History Content */}
                  {launchRightTab === 'history' && (
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="p-2.5 border-b border-[var(--prism-border-card)] bg-black/20 flex items-center gap-2 flex-shrink-0">
                        <Search className="size-3.5 text-white/40 flex-none" />
                        <input
                          type="text"
                          placeholder="Filter chat history..."
                          value={chatSearchQuery}
                          onChange={(e) => setChatSearchQuery(e.target.value)}
                          className="w-full bg-transparent text-xs text-white placeholder:text-white/30 outline-none font-mono"
                        />
                        {chatSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setChatSearchQuery('')}
                            className="text-white/40 hover:text-white cursor-pointer"
                          >
                            <X className="size-3" />
                          </button>
                        )}
                      </div>

                      <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
                        {filteredChatSessions.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/40">
                            <MessageSquare className="size-8 mb-2 opacity-30 text-[#00df81]" />
                            <p className="text-xs font-mono text-white/60">
                              {chatSearchQuery ? 'No matching chats found' : 'No chat sessions yet'}
                            </p>
                            <p className="text-[11px] text-white/35 mt-1 max-w-[200px]">
                              {chatSearchQuery ? 'Try clearing your filter' : 'Launch a mission on the left to start a conversation'}
                            </p>
                          </div>
                        ) : (
                          filteredChatSessions.map((session) => {
                            const isCurrent = activeSessionId === session.id;
                            const msgCount = sessionMessageCounts[session.id] || 0;
                            return (
                              <div
                                key={session.id}
                                className={cn(
                                  "group relative rounded-xl p-3 border transition-all cursor-pointer",
                                  isCurrent
                                    ? "border-[rgba(0,223,129,0.4)] bg-[rgba(0,223,129,0.06)] shadow-[0_0_12px_rgba(0,223,129,0.08)]"
                                    : "border-[var(--prism-border-card)] bg-black/30 hover:border-white/20 hover:bg-black/40"
                                )}
                                onClick={() => resumeSession(session.id)}
                              >
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                  <h4 className="text-xs font-semibold text-white group-hover:text-[#00df81] transition-colors truncate flex-1">
                                    {session.title}
                                  </h4>
                                  <span className="flex-none text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-white/60">
                                    {msgCount} {msgCount === 1 ? 'msg' : 'msgs'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                                  <span className="flex items-center gap-1">
                                    {isCurrent && (
                                      <span className="inline-block size-1.5 rounded-full bg-[#00df81]" />
                                    )}
                                    {formatRelativeTime(session.updatedAt || session.createdAt)}
                                  </span>
                                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        resumeSession(session.id);
                                      }}
                                      className="px-2 py-0.5 rounded text-[10px] bg-[#00df81]/15 text-[#00df81] hover:bg-[#00df81]/25 transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      Resume <ArrowUpRight className="size-2.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteChatSession(session.id);
                                      }}
                                      title="Delete session"
                                      className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="size-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tab 2: BYOK Keys Content */}
                  {launchRightTab === 'byok' && (
                    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
                      <div className="p-2.5 rounded-xl border border-[rgba(0,223,129,0.2)] bg-[rgba(0,223,129,0.05)] text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white flex items-center gap-1.5">
                            <KeyRound className="size-3.5 text-[#00df81]" />
                            Bring Your Own Key (BYOK)
                          </span>
                          <span className="font-mono text-[10px] text-[#00df81]">Direct API Access</span>
                        </div>
                        <p className="text-[11px] text-white/60 mt-1 leading-relaxed">
                          Connect your personal API keys for Groq, NVIDIA, OpenAI, Claude, Gemini, OpenRouter, and DeepSeek. Keys remain in local browser storage.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        {BYOK_PROVIDERS.map((prov) => {
                          const userKey = storedKeys[prov.id];
                          const hasCustom = Boolean(userKey && userKey.trim().length > 3);
                          const isDefaultAvailable = prov.id === 'nvidia' || prov.id === 'groq';

                          return (
                            <div
                              key={prov.id}
                              className="flex items-center justify-between p-2 rounded-lg border border-[var(--prism-border-card)] bg-black/25 hover:border-white/20 transition-all text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="flex items-center justify-center size-6 rounded-md bg-white/[0.04] p-1 flex-none border border-white/[0.06]">
                                  {getProviderIcon(prov.id)}
                                </div>
                                <div className="truncate flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-white text-xs">{prov.name}</span>
                                    <span className="text-[10px] text-white/40 font-mono">({prov.models.length} models)</span>
                                  </div>
                                  <div className="text-[10px] font-mono text-white/40 truncate">
                                    {hasCustom ? (
                                      <span className="text-[#00df81] font-semibold">{maskApiKey(userKey)}</span>
                                    ) : isDefaultAvailable ? (
                                      <span className="text-amber-400/80">Shared Backend Default</span>
                                    ) : (
                                      <span>Key required for inference</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => setShowByokModal(true)}
                                className="flex-none px-2 py-1 rounded text-[10px] font-mono text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors border border-white/[0.06] cursor-pointer"
                              >
                                {hasCustom ? 'Edit' : 'Configure'}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setShowByokModal(true)}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-mono font-bold text-[#06190e] bg-gradient-to-r from-[#00df81] to-[#00b368] shadow-[0_0_16px_rgba(0,223,129,0.25)] hover:shadow-[0_0_22px_rgba(0,223,129,0.4)] transition-all cursor-pointer"
                        >
                          <KeyRound className="size-3.5" />
                          Open Full BYOK Key Manager
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Swarm Config Content */}
                  {launchRightTab === 'config' && (
                    <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        {/* Worker Mesh & Checkpoint */}
                        <div className="rounded-xl p-3.5" style={{ border: '1px solid var(--prism-border-card)', background: 'var(--prism-board)' }}>
                          <div className="mb-2.5 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold text-white">Worker Mesh Size</p>
                              <p className="text-[10.5px]" style={{ color: 'var(--prism-muted)' }}>Concurrent sub-agent nodes</p>
                            </div>
                            <span className="text-sm font-bold font-mono px-2 py-0.5 rounded-lg" style={{ background: 'rgba(0,223,129,0.1)', color: 'var(--prism-primary)' }}>
                              {maxAgents} Nodes
                            </span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={3}
                            step={1}
                            value={maxAgents}
                            onChange={(e) => setMaxAgents(Number(e.target.value))}
                            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg"
                            style={{ background: 'rgba(255,255,255,0.12)', accentColor: '#00df81' }}
                          />
                          <label
                            className="mt-3 flex cursor-pointer items-center justify-between rounded-lg p-2.5 transition-colors"
                            style={{ border: '1px solid var(--prism-border-card)', background: 'var(--prism-card)' }}
                          >
                            <div>
                              <span className="block text-xs font-semibold text-white">Human Checkpoint</span>
                              <span className="text-[10.5px]" style={{ color: 'var(--prism-muted)' }}>Require approval before synthesis</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={hitl}
                              onChange={(e) => setHitl(e.target.checked)}
                              className="size-4"
                              style={{ accentColor: '#00df81' }}
                            />
                          </label>
                        </div>

                        {/* Tool Integrations: Gmail MCP */}
                        <div className="rounded-xl p-3.5" style={{ border: '1px solid var(--prism-border-card)', background: 'var(--prism-board)' }}>
                          <div className="mb-2.5 flex items-center justify-between">
                            <span style={labelStyle} className="!mb-0">Tool Integrations</span>
                            <span className="text-[10px] font-mono text-white/40">OAuth 2.0</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 p-3 rounded-lg" style={{ background: 'var(--prism-card)', border: '1px solid var(--prism-border-card)' }}>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-white">Google Workspace / Gmail</p>
                              <p className="text-[11px] truncate" style={{ color: gmailEmail ? 'var(--prism-primary)' : 'var(--prism-muted)' }}>
                                {gmailEmail ? `Connected: ${gmailEmail}` : 'Inbox access for research & mail tools'}
                              </p>
                            </div>
                            {gmailEmail ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const uid = getGmailUserId();
                                  if (uid) {
                                    fetch('/api/auth/google/status', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ user_id: uid }),
                                    }).catch(() => {});
                                  }
                                  localStorage.removeItem('prism_gmail_user_id');
                                  localStorage.removeItem('prism_gmail_email');
                                  setGmailEmail(null);
                                }}
                                className="rounded-lg px-2.5 py-1 text-[11px] font-mono text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                              >
                                Disconnect
                              </button>
                            ) : (
                              <GradientButton
                                type="button"
                                loading={gmailLoading}
                                disabled={gmailLoading}
                                variant="emerald"
                                className="h-8 px-3 text-xs"
                                onClick={async () => {
                                  setGmailLoading(true);
                                  try {
                                    await connectGmail();
                                  } catch (e) {
                                    console.error(e);
                                  } finally {
                                    setGmailLoading(false);
                                  }
                                }}
                              >
                                {gmailLoading ? 'Connecting...' : 'Connect'}
                              </GradientButton>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Architecture spec footer */}
                      <div className="p-3 rounded-xl flex items-center justify-between text-xs" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--prism-border-card)' }}>
                        <div className="flex items-center gap-2">
                          <span className="size-2 rounded-full" style={{ background: backendOnline ? '#00df81' : '#f87171' }} />
                          <span className="font-mono text-white/60 text-[11px]">
                            {backendOnline ? 'Distributed Graph Engine Active' : 'Backend Engine Offline'}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-white/40">
                          DAG v2.0
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </form>
        </div>

        {/* ═══════ RUNS VIEW ═══════ */}
        <div className={`h-full min-h-0 ${activeView === 'runs' ? 'flex' : 'hidden'}`}>
              {/* Left: Agent list / Chat switcher */}
              <div
                className="flex w-[360px] xl:w-[400px] flex-shrink-0 flex-col min-h-0"
                style={{ borderRight: '1px solid var(--prism-border-card)' }}
              >
                {/* Stats bar */}
                <div className="grid grid-cols-3 gap-1.5 p-2 flex-shrink-0" style={{ borderBottom: '1px solid var(--prism-border-card)' }}>
                  <div className="layer-row !p-1.5 text-center">
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--prism-muted)' }}>Runs</p>
                    <p className="text-base font-semibold text-white">{agents.length}</p>
                  </div>
                  <div className="layer-row !p-1.5 text-center" style={{ borderColor: 'rgba(0,223,129,0.2)', background: 'rgba(0,223,129,0.04)' }}>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--prism-primary)' }}>Active</p>
                    <p className="text-base font-semibold" style={{ color: 'var(--prism-primary)' }}>{activeAgents}</p>
                  </div>
                  <div className="layer-row !p-1.5 text-center">
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--prism-muted)' }}>Done</p>
                    <p className="text-base font-semibold text-white">{completedAgents}</p>
                  </div>
                </div>

                {/* Left Pane Sub-Tabs: Swarms vs Chat History */}
                <div className="flex p-1.5 border-b flex-shrink-0 gap-1" style={{ borderColor: 'var(--prism-border-card)', background: 'rgba(0,0,0,0.2)' }}>
                  <button
                    type="button"
                    onClick={() => setRunsSubTab('agents')}
                    className="flex-1 py-1 px-2 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5"
                    style={{
                      background: runsSubTab === 'agents' ? 'var(--prism-card)' : 'transparent',
                      color: runsSubTab === 'agents' ? '#fff' : 'var(--prism-muted)',
                      border: runsSubTab === 'agents' ? '1px solid var(--prism-border-card)' : '1px solid transparent',
                    }}
                  >
                    <Radio className="size-3" style={{ color: runsSubTab === 'agents' ? 'var(--prism-primary)' : 'inherit' }} />
                    Swarms ({agents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRunsSubTab('chat')}
                    className="flex-1 py-1 px-2 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5"
                    style={{
                      background: runsSubTab === 'chat' ? 'var(--prism-card)' : 'transparent',
                      color: runsSubTab === 'chat' ? '#fff' : 'var(--prism-muted)',
                      border: runsSubTab === 'chat' ? '1px solid var(--prism-border-card)' : '1px solid transparent',
                    }}
                  >
                    <MessageSquare className="size-3" style={{ color: runsSubTab === 'chat' ? 'var(--prism-primary)' : 'inherit' }} />
                    Chat ({currentSessionMessages?.length || 0})
                  </button>
                </div>

                {/* SubTab Content */}
                <div className={`min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5 ${runsSubTab === 'agents' ? 'block' : 'hidden'}`}>
                  {agents.length === 0 && (
                    <div
                      className="rounded-xl p-5 text-sm text-center"
                      style={{
                        border: '1px dashed var(--prism-border-card)',
                        background: 'var(--prism-card)',
                        color: 'var(--prism-muted)',
                      }}
                    >
                      No swarms yet. Launch a mission to start.
                    </div>
                  )}
                  <AnimatePresence mode="popLayout">
                    {agents.map((agent) => (
                      <motion.div
                        key={agent.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -16, scale: 0.97 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <AgentCard
                          agent={agent}
                          isSelected={selectedId === agent.id}
                          onSelect={() => setSelectedId(agent.id)}
                          onRefresh={refresh}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div className={`flex min-h-0 flex-1 flex-col ${runsSubTab === 'chat' ? 'flex' : 'hidden'}`}>
                  <div className="px-3 py-2 text-xs font-semibold text-white flex items-center justify-between border-b" style={{ borderColor: 'var(--prism-border-card)' }}>
                    <span className="truncate">{currentSession?.title ?? 'New chat'}</span>
                    <span className="text-[10px] font-mono text-white/40">{currentSessionMessages?.length ?? 0} msgs</span>
                  </div>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
                    {!currentSessionMessages?.length && (
                      <div className="rounded-lg p-3 text-xs" style={{ border: '1px dashed var(--prism-border-card)', background: 'var(--prism-card)', color: 'var(--prism-muted)' }}>
                        Launch a swarm to start this conversation.
                      </div>
                    )}
                    {currentSessionMessages?.map((message) => (
                      <div
                        key={message.id}
                        className="rounded-lg px-3 py-2 text-xs"
                        style={{
                          border: `1px solid ${message.role === 'user' ? 'rgba(0,223,129,0.18)' : 'var(--prism-border-card)'}`,
                          background: message.role === 'user' ? 'rgba(0,223,129,0.04)' : 'var(--prism-card)',
                        }}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="font-semibold" style={{ color: message.role === 'user' ? 'var(--prism-primary)' : '#fff' }}>
                            {message.role === 'user' ? 'You' : 'Swarm'}
                          </span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'var(--prism-muted)' }}>
                            {message.status === 'pending' ? 'running' : formatChatTime(message.createdAt)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
                          {message.content}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Swarm Interactive Chat Input Bar */}
                  <div className="p-2.5 border-t flex-shrink-0" style={{ borderColor: 'var(--prism-border-card)', background: 'rgba(0,0,0,0.3)' }}>
                    <AIPrompt
                      compact
                      models={availablePromptModels}
                      selectedModel={model}
                      onModelChange={handleModelChange}
                      onOpenByok={() => setShowByokModal(true)}
                      placeholder="Send follow-up objective or prompt to swarm..."
                      loading={launching}
                      onSubmit={(promptVal, selectedModelId, modelProvider) => {
                        const targetModel = selectedModelId || model;
                        const targetProvider = (modelProvider as ModelProvider) || getProviderForModel(targetModel);
                        handleModelChange(targetModel, targetProvider);
                        handleLaunch(undefined, promptVal, targetModel, targetProvider);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Right: Inspector */}
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                {!selectedAgent ? (
                  <div className="grid min-h-0 flex-1 place-items-center p-8">
                    <div className="max-w-sm text-center">
                      <div
                        className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl"
                        style={{ border: '1px solid var(--prism-border-card)', background: 'var(--prism-card)' }}
                      >
                        <ListTree className="size-7" style={{ color: 'var(--prism-muted)' }} />
                      </div>
                      <h3 className="text-lg font-semibold text-white">Select a run to inspect it</h3>
                      <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--prism-muted)' }}>
                        The inspector shows the pipeline graph, live execution stream, approval controls, and final output.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Inspector header */}
                    <div
                      className="flex flex-shrink-0 items-start justify-between gap-4 px-5 py-4"
                      style={{ borderBottom: '1px solid var(--prism-border-card)' }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              background: `${STATUS_COLORS[selectedAgent.status]}22`,
                              color: STATUS_COLORS[selectedAgent.status],
                            }}
                          >
                            {STATUS_LABELS[selectedAgent.status]}
                          </span>
                          <span
                            className="rounded-full px-2.5 py-1 text-[11px]"
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              border: '1px solid var(--prism-border-card)',
                              background: 'var(--prism-card)',
                              color: 'var(--prism-muted)',
                            }}
                          >
                            {selectedAgent.max_agents} worker{selectedAgent.max_agents > 1 ? 's' : ''}
                          </span>
                          {selectedAgent.human_in_loop && (
                            <span
                              className="rounded-full px-2.5 py-1 text-[11px]"
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                background: 'rgba(251,191,36,0.1)',
                                color: '#fbbf24',
                              }}
                            >
                              approval checkpoint
                            </span>
                          )}
                        </div>
                        <h3 className="truncate text-base font-semibold text-white" title={selectedAgent.objective}>
                          {selectedAgent.objective}
                        </h3>
                        <p className="mt-1 truncate text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--prism-muted)' }}>
                          {selectedAgentModelLabel}
                        </p>
                      </div>

                      <div className="flex flex-shrink-0 flex-col items-end gap-3">
                        {selectedAgent.status === 'awaiting_approval' && (
                          <div className="flex gap-2">
                            <motion.button
                              type="button"
                              onClick={() => approveAgent(selectedAgent.id, false).then(refresh)}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold"
                              style={{ border: '1px solid rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.08)', color: '#fca5a5' }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <X className="size-3.5" />
                              Reject
                            </motion.button>
                            <motion.button
                              type="button"
                              onClick={() => approveAgent(selectedAgent.id, true).then(refresh)}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold"
                              style={{ background: 'var(--prism-primary)', color: '#000' }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Check className="size-3.5" />
                              Approve
                            </motion.button>
                          </div>
                        )}
                        {/* Inspector sub-tabs */}
                        <div
                          className="flex rounded-xl p-1"
                          style={{ border: '1px solid var(--prism-border-card)', background: 'rgba(0,0,0,0.3)' }}
                        >
                          {([
                            { id: 'dag' as InspectorTab, label: 'Pipeline', icon: GitBranch },
                            { id: 'logs' as InspectorTab, label: 'Logs', icon: TerminalSquare },
                            { id: 'output' as InspectorTab, label: 'Output', icon: Sparkles, dot: !!selectedAgent.result },
                          ]).map((tab) => {
                            const TabIcon = tab.icon;
                            return (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setInspectorTab(tab.id)}
                                className="relative inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors"
                                style={{
                                  background: inspectorTab === tab.id ? '#fff' : 'transparent',
                                  color: inspectorTab === tab.id ? 'var(--prism-board)' : 'var(--prism-muted)',
                                }}
                              >
                                <TabIcon className="size-3.5" />
                                {tab.label}
                                {tab.dot && (
                                  <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full" style={{ background: 'var(--prism-primary)' }} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Inspector content */}
                    <div className="min-h-0 flex-1 overflow-hidden">
                      {/* Pipeline / DAG */}
                      <div className={`h-full min-h-0 ${inspectorTab === 'dag' ? 'grid grid-rows-[minmax(240px,42%)_1fr]' : 'hidden'}`}>
                        <div className="p-4" style={{ borderBottom: '1px solid var(--prism-border-card)' }}>
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-semibold text-white">
                              <GitBranch className="size-4" style={{ color: 'var(--prism-primary)' }} />
                              Execution Map
                            </div>
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'var(--prism-muted)' }}>
                              {selectedAgent.id.slice(0, 8)}
                            </span>
                          </div>
                          <SwarmDagGraph agent={selectedAgent} logLines={logLines} />
                        </div>
                        <div className="min-h-0 overflow-y-auto p-4" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>
                          <div className="mb-3 flex items-center justify-between pb-2" style={{ borderBottom: '1px solid var(--prism-border-card)' }}>
                            <span style={{ color: 'var(--prism-muted)' }}>Live log tail</span>
                            <span style={{ color: 'var(--prism-primary)' }}>{selectedAgent.status}</span>
                          </div>
                          <TransferProgress status={transferStatus} onCancel={() => cancelAgentOperation(selectedAgent.id).catch((err) => toast.error(String(err)))} />
                          {logLines.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)' }}>Waiting for log output...</p>}
                          {logLines.map((line, i) => {
                            const isError = line.includes('❌') || line.includes('⚠️') || line.includes('failed');
                            const isSuccess = line.includes('✅') || line.includes('🎉') || line.includes('completed');
                            const isWarning = line.includes('⏸️') || line.includes('checkpoint');
                            return (
                              <div
                                key={i}
                                className="py-1 leading-relaxed"
                                style={{
                                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                                  color: isError ? '#f87171' : isSuccess ? '#00df81' : isWarning ? '#fbbf24' : 'rgba(255,255,255,0.72)',
                                }}
                              >
                                {line}
                              </div>
                            );
                          })}
                          {!isTerminal(selectedAgent.status) && (
                            <div className="mt-4 flex items-center gap-3 pt-4" style={{ borderTop: '1px solid var(--prism-border-card)' }}>
                              <GridLoader color="#00df81" pattern="plus-hollow" size="sm" gap={3} rounded speed="fast" />
                              <span style={{ color: 'rgba(0,223,129,0.8)' }}>Running tasks...</span>
                            </div>
                          )}
                          <div ref={logsEndRef} />
                        </div>
                      </div>

                      {/* Logs Tab */}
                      <div
                        className={`h-full overflow-y-auto p-5 ${inspectorTab === 'logs' ? 'block' : 'hidden'}`}
                        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}
                      >
                        <div className="sticky top-0 z-10 mb-4 flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--prism-border-card)', background: 'var(--prism-board)' }}>
                          <span style={{ color: 'var(--prism-muted)' }}>Execution stream / {selectedAgent.id}</span>
                          <span style={{ color: 'var(--prism-primary)' }}>{selectedAgent.status}</span>
                        </div>
                        <TransferProgress status={transferStatus} onCancel={() => cancelAgentOperation(selectedAgent.id).catch((err) => toast.error(String(err)))} />
                        {logLines.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)' }}>Waiting for log output...</p>}
                        {logLines.map((line, i) => {
                          const isError = line.includes('❌') || line.includes('⚠️') || line.includes('failed');
                          const isSuccess = line.includes('✅') || line.includes('🎉') || line.includes('completed');
                          const isWarning = line.includes('⏸️') || line.includes('checkpoint');
                          return (
                            <div
                              key={i}
                              className="py-1.5 leading-relaxed"
                              style={{
                                borderBottom: '1px solid rgba(255,255,255,0.03)',
                                color: isError ? '#f87171' : isSuccess ? '#00df81' : isWarning ? '#fbbf24' : 'rgba(255,255,255,0.82)',
                              }}
                            >
                              {line}
                            </div>
                          );
                        })}
                        {!isTerminal(selectedAgent.status) && (
                          <div className="mt-5 flex items-center gap-3 pt-5" style={{ borderTop: '1px solid var(--prism-border-card)' }}>
                            <GridLoader color="#00df81" pattern="plus-hollow" size="sm" gap={3} rounded speed="fast" />
                            <span style={{ color: 'rgba(0,223,129,0.8)' }}>Live streaming execution logs...</span>
                          </div>
                        )}
                        <div ref={logsEndRef} />
                      </div>

                      {/* Output Tab */}
                      <div className={`h-full overflow-y-auto p-6 ${inspectorTab === 'output' ? 'block' : 'hidden'}`}>
                        <div className="mx-auto max-w-3xl">
                          <div className="mb-5 flex items-center justify-between gap-3 pb-4" style={{ borderBottom: '1px solid var(--prism-border-card)' }}>
                            <div className="flex items-center gap-2">
                              <Sparkles className="size-4" style={{ color: 'var(--prism-primary)' }} />
                              <h3 className="text-base font-semibold text-white">Final Output</h3>
                            </div>
                            {selectedAgent.result && (
                              <motion.button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedAgent.result ?? '');
                                  toast.success('Output copied to clipboard');
                                }}
                                className="inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-semibold"
                                style={{
                                  border: '1px solid var(--prism-border-card)',
                                  background: 'var(--prism-card)',
                                  color: 'var(--prism-muted)',
                                }}
                                whileHover={{ borderColor: 'rgba(0,223,129,0.3)', color: '#fff' }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Clipboard className="size-3.5" />
                                Copy
                              </motion.button>
                            )}
                          </div>
                          {selectedAgent.result ? (
                            <article
                              className="rounded-xl p-6 text-sm leading-relaxed"
                              style={{
                                border: '1px solid var(--prism-border-card)',
                                background: 'rgba(0,0,0,0.3)',
                                color: 'rgba(255,255,255,0.86)',
                              }}
                            >
                              <MarkdownRenderer content={selectedAgent.result ?? ''} />
                            </article>
                          ) : (
                            <div
                              className="rounded-xl p-12 text-center"
                              style={{
                                border: '1px dashed var(--prism-border-card)',
                                background: 'var(--prism-card)',
                              }}
                            >
                              <Sparkles className="mx-auto mb-4 size-8" style={{ color: 'var(--prism-muted)' }} />
                              <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>
                                Output is being generated
                              </p>
                              <p className="mt-1 text-xs" style={{ color: 'var(--prism-muted)' }}>
                                The sub-agents are still processing this objective.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
        </div>

        {/* ═══════ SETTINGS VIEW: EXTENSIVE MCP HUB ═══════ */}
        <div className={`h-full min-h-0 overflow-y-auto p-4 flex flex-col gap-3.5 ${activeView === 'settings' ? 'flex' : 'hidden'}`}>
          {/* Top Row: Primary 5 MCP Server Cards (Figma, Google Drive, Gmail, GitHub, Filesystem) */}
          <div className="flex-shrink-0">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="size-4 text-emerald-400" />
                  Model Context Protocol (MCP) Hub
                </h3>
                <p className="text-[11px] text-white/50">
                  Arrange and configure tool providers for swarm sub-agents. Click any server to inspect capabilities or attach credentials.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-white/50">
                <span className="inline-block size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>5 Core MCPs Available</span>
              </div>
            </div>

            {/* 5 Server Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {FEATURED_MCP_SERVERS.map((server) => {
                const isSelected = selectedMcpServer === server.id;
                const configured = isServerConfigured(server);
                return (
                  <div
                    key={server.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleMcpServerChange(server.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleMcpServerChange(server.id);
                      }
                    }}
                    className={`group relative flex flex-col justify-between rounded-xl p-3 cursor-pointer transition-all duration-200 select-none ${
                      isSelected
                        ? 'ring-1 ring-emerald-500/80 shadow-[0_0_20px_rgba(0,223,129,0.18)] bg-gradient-to-b from-white/[0.08] to-white/[0.02]'
                        : 'hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]'
                    }`}
                    style={{
                      border: isSelected ? '1px solid #00DF81' : '1px solid var(--prism-border-card)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="flex size-9 items-center justify-center rounded-lg flex-shrink-0 transition-transform group-hover:scale-105"
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            boxShadow: `0 0 15px ${server.glowColor}`,
                          }}
                        >
                          {renderMcpServerIcon(server.id, 'size-5')}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                            {server.displayName}
                          </div>
                          <div className="text-[10px] text-white/40 truncate">
                            {server.subtitle}
                          </div>
                        </div>
                      </div>
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[9px] font-mono font-medium flex-shrink-0"
                        style={{
                          background: configured ? 'rgba(0,223,129,0.12)' : 'rgba(251,191,36,0.1)',
                          color: configured ? 'var(--prism-primary)' : '#fbbf24',
                          border: `1px solid ${configured ? 'rgba(0,223,129,0.25)' : 'rgba(251,191,36,0.25)'}`,
                        }}
                      >
                        {configured ? (server.isBuiltIn ? 'Active' : 'Configured') : 'Setup'}
                      </span>
                    </div>

                    <p className="mt-2 text-[11px] leading-snug line-clamp-2 text-white/50">
                      {server.description}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.05] pt-2 text-[10px]">
                      <span className="font-mono text-white/30">
                        {server.tools.length} tools • {server.transport}
                      </span>
                      <span
                        className="font-medium transition-colors"
                        style={{ color: isSelected ? 'var(--prism-primary)' : 'rgba(255,255,255,0.6)' }}
                      >
                        {isSelected ? 'Selected ✓' : 'Configure →'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Grid: 2-Column Split (Vault & Chat on Left, Selected Server Config on Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 min-h-0">
            {/* Left Column: Configured Tokens & Chat Sessions (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-2.5 min-h-0">
              <div
                className="flex-1 flex flex-col min-h-0 rounded-xl p-3.5"
                style={{ border: '1px solid var(--prism-border-card)', background: 'var(--prism-card)' }}
              >
                <div className="mb-2.5 flex items-center justify-between gap-3 flex-shrink-0">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <span>Active MCP Tokens</span>
                      <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] font-mono text-white/70">
                        {mcpTokens.length}
                      </span>
                    </h3>
                    <p className="mt-0.5 text-[11px]" style={{ color: 'var(--prism-muted)' }}>
                      Persisted locally in {mcpEnvFile ?? 'backend/hive/tools/.env'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {mcpTokens.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setPendingRemoveKey('__CLEAR_ALL__');
                          setShowRemoveConfirm(true);
                        }}
                        className="inline-flex h-7 items-center rounded-lg px-2 text-[11px] text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                    <motion.button
                      type="button"
                      onClick={refreshMcpServers}
                      className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[11px]"
                      style={{
                        border: '1px solid var(--prism-border-card)',
                        background: 'var(--prism-board)',
                        color: 'var(--prism-muted)',
                      }}
                      whileHover={{ borderColor: 'rgba(0,223,129,0.3)', color: '#fff' }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <RefreshCw className="size-3" />
                      Refresh
                    </motion.button>
                  </div>
                </div>

                {/* Token List with Brand Logos */}
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {mcpTokens.length === 0 && (
                    <div
                      className="rounded-xl p-6 text-xs text-center flex flex-col items-center justify-center gap-2"
                      style={{
                        border: '1px dashed var(--prism-border-card)',
                        background: 'var(--prism-board)',
                        color: 'var(--prism-muted)',
                      }}
                    >
                      <KeyRound className="size-6 text-white/20" />
                      <p className="font-semibold text-white/70">No MCP tokens configured yet</p>
                      <p className="text-[11px] text-white/40 max-w-xs">
                        Select one of the 5 servers above (Figma, Google Drive, Gmail, GitHub, Filesystem) or enter your API credentials on the right.
                      </p>
                    </div>
                  )}
                  {mcpTokens.map((token) => {
                    const active = token.key === mcpEnvKey;
                    const tokenServer =
                      getMcpServerForEnvKey(token.key) ??
                      (token.used_by[0] ? getMcpServerMeta(token.used_by[0]) : null);

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
                        className={`layer-row cursor-pointer transition-all ${active ? 'highlighted' : ''}`}
                        style={{
                          background: active ? 'rgba(0, 223, 129, 0.08)' : undefined,
                          borderColor: active ? 'rgba(0, 223, 129, 0.4)' : undefined,
                        }}
                      >
                        <div className="flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className="flex size-7 items-center justify-center rounded-lg flex-shrink-0"
                              style={{
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                              }}
                            >
                              {tokenServer ? (
                                renderMcpServerIcon(tokenServer.id, 'size-4')
                              ) : (
                                <KeyRound className="size-3.5 text-white/50" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1 truncate">
                              <div className="flex items-center gap-1.5 truncate">
                                <span
                                  className="truncate text-xs font-semibold"
                                  style={{
                                    fontFamily: "'JetBrains Mono', monospace",
                                    color: 'rgba(255,255,255,0.92)',
                                  }}
                                >
                                  {token.key}
                                </span>
                                {tokenServer && (
                                  <span className="text-[9px] font-mono px-1 rounded bg-white/10 text-white/50 flex-shrink-0">
                                    {tokenServer.displayName}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-mono text-white/40 truncate">
                                {token.masked || '••••••••••••'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px]"
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                background: token.configured ? 'rgba(0,223,129,0.1)' : 'rgba(251,191,36,0.1)',
                                color: token.configured ? 'var(--prism-primary)' : '#fbbf24',
                              }}
                            >
                              {token.configured ? 'configured' : 'missing'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPendingRemoveKey(token.key);
                                setShowRemoveConfirm(true);
                              }}
                              className="text-white/30 hover:text-red-400 p-1 text-xs transition-colors"
                              title="Delete token"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chat sessions card */}
              {chatSessions && chatSessions.length > 0 && (
                <div
                  className="rounded-xl p-3 flex flex-col max-h-[170px]"
                  style={{ border: '1px solid var(--prism-border-card)', background: 'var(--prism-card)' }}
                >
                  <h4 className="text-xs font-semibold text-white mb-2 flex-shrink-0">Chat Sessions ({chatSessions.length})</h4>
                  <div className="space-y-1.5 overflow-y-auto pr-1 flex-1 min-h-0">
                    {chatSessions.map((session) => (
                      <div
                        key={session.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setActiveSessionId(session.id);
                          localStorage.setItem(ACTIVE_SWARM_CHAT_KEY, session.id);
                          setActiveView('runs');
                        }}
                        className={`layer-row !p-1.5 cursor-pointer ${activeSessionId === session.id ? 'highlighted' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-semibold flex-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
                            {session.title}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteChatSession(session.id);
                            }}
                            className="text-white/30 hover:text-red-400 p-1"
                            aria-label="Delete chat"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Configure MCP Server Form (5 cols) */}
            <div
              className="lg:col-span-5 flex flex-col justify-between rounded-xl p-3.5 min-h-0"
              style={{ border: '1px solid var(--prism-border-card)', background: 'var(--prism-card)' }}
            >
              <div>
                {/* Server Header with Brand Logo */}
                <div className="mb-3 flex items-start justify-between gap-2 border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="flex size-9 items-center justify-center rounded-lg flex-shrink-0"
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: `0 0 12px ${currentServerMeta.glowColor}`,
                      }}
                    >
                      {renderMcpServerIcon(currentServerMeta.id, 'size-5')}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{currentServerMeta.displayName} MCP</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-white/70">
                          {currentServerMeta.badgeText}
                        </span>
                      </h4>
                      <p className="text-[11px] text-white/50 truncate">
                        {currentServerMeta.subtitle}
                      </p>
                    </div>
                  </div>

                  {currentServerMeta.docsUrl && (
                    <a
                      href={currentServerMeta.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-white/40 hover:text-emerald-400 hover:bg-white/5 transition-colors flex-shrink-0"
                      title="Open setup documentation"
                    >
                      Docs <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>

                <form onSubmit={handleSaveMcpToken} className="space-y-3">
                  {/* Target Server Selector with Brand Icons */}
                  <div className="relative">
                    <label style={labelStyle}>Target MCP Server</label>
                    <button
                      type="button"
                      onClick={() => setShowServerPicker(!showServerPicker)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-all"
                      style={{
                        border: '1px solid var(--prism-border-card)',
                        background: 'var(--prism-board)',
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-6 items-center justify-center rounded-md" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          {renderMcpServerIcon(currentServerMeta.id, 'size-3.5')}
                        </div>
                        <div className="truncate">
                          <span className="text-xs font-semibold text-white">
                            {currentServerMeta.displayName}
                          </span>
                          <span className="ml-2 text-[10px] font-mono text-white/40">
                            ({currentServerMeta.transport})
                          </span>
                        </div>
                      </div>
                      <ChevronDown className={`size-4 text-white/40 transition-transform ${showServerPicker ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Server Picker Dropdown */}
                    {showServerPicker && (
                      <div
                        className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-xl p-1 shadow-2xl backdrop-blur-xl"
                        style={{
                          border: '1px solid var(--prism-border-card)',
                          background: '#0d1117',
                        }}
                      >
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
                          Available Integrations
                        </div>
                        {ALL_MCP_SERVERS.map((server) => {
                          const configured = isServerConfigured(server);
                          const active = selectedMcpServer === server.id;
                          return (
                            <button
                              key={server.id}
                              type="button"
                              onClick={() => {
                                handleMcpServerChange(server.id);
                                setShowServerPicker(false);
                              }}
                              className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                                active
                                  ? 'bg-emerald-500/15 text-white'
                                  : 'hover:bg-white/5 text-white/80'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="flex size-6 items-center justify-center rounded-md" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                  {renderMcpServerIcon(server.id, 'size-3.5')}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-white truncate">
                                    {server.displayName}
                                  </div>
                                  <div className="text-[10px] text-white/40 truncate">
                                    {server.subtitle}
                                  </div>
                                </div>
                              </div>
                              <span
                                className="rounded-full px-1.5 py-0.2 text-[9px] font-mono"
                                style={{
                                  background: configured ? 'rgba(0,223,129,0.1)' : 'rgba(255,255,255,0.06)',
                                  color: configured ? 'var(--prism-primary)' : 'rgba(255,255,255,0.4)',
                                }}
                              >
                                {configured ? 'Ready' : 'Setup'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Environment Variable Key */}
                  <div>
                    <label style={labelStyle}>Environment Variable Key</label>
                    <input
                      type="text"
                      value={mcpEnvKey}
                      onChange={(e) => setMcpEnvKey(e.target.value.toUpperCase())}
                      placeholder={currentServerMeta.primaryEnvKey}
                      style={inputStyle}
                    />

                    {/* Quick-select pills for recommended keys */}
                    {currentServerMeta.envKeys.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {currentServerMeta.envKeys.map((env) => (
                          <button
                            key={env.key}
                            type="button"
                            onClick={() => setMcpEnvKey(env.key)}
                            className={`rounded-md px-2 py-0.5 text-[10px] font-mono transition-all ${
                              mcpEnvKey === env.key
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-white/[0.04] text-white/50 border border-white/[0.06] hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {env.key}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Secret Token Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label style={{ ...labelStyle, marginBottom: 0 }}>
                        {selectedMcpServer === 'filesystem' ? 'Allowed Directories' : 'Secret API Token / Credential'}
                      </label>
                      {selectedMcpServer !== 'filesystem' && (
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                          <span>{showPassword ? 'Hide' : 'Reveal'}</span>
                        </button>
                      )}
                    </div>

                    <input
                      type={showPassword || selectedMcpServer === 'filesystem' ? 'text' : 'password'}
                      value={mcpToken}
                      onChange={(e) => setMcpToken(e.target.value)}
                      placeholder={
                        currentServerMeta.envKeys[0]?.placeholder ||
                        'Paste secret credentials or API token...'
                      }
                      style={inputStyle}
                    />
                  </div>

                  {/* Gmail Special: 1-Click OAuth Connection */}
                  {selectedMcpServer === 'gmail' && (
                    <div
                      className="rounded-xl p-3 text-xs"
                      style={{
                        border: '1px solid rgba(234, 67, 53, 0.25)',
                        background: 'rgba(234, 67, 53, 0.05)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-semibold text-white/90 flex items-center gap-1.5">
                          {renderMcpServerIcon('gmail', 'size-4')}
                          1-Click Google OAuth
                        </span>
                        {gmailConnected && (
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            Connected ✓
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-white/50 mb-2.5">
                        Sign in with your Google account to grant direct email read, draft, and thread access.
                      </p>
                      <button
                        type="button"
                        onClick={handleConnectGmail}
                        disabled={connectingGmail}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all"
                        style={{
                          background: 'linear-gradient(135deg, #EA4335, #C5221F)',
                          color: '#fff',
                        }}
                      >
                        {connectingGmail ? (
                          <RefreshCw className="size-3.5 animate-spin" />
                        ) : (
                          renderMcpServerIcon('gmail', 'size-3.5')
                        )}
                        <span>{gmailConnected ? 'Reconnect Google Account' : 'Connect with Google Account'}</span>
                      </button>
                    </div>
                  )}

                  {/* Filesystem Special: Built-in local workspace reminder */}
                  {selectedMcpServer === 'filesystem' && (
                    <div
                      className="rounded-xl p-2.5 text-[11px] leading-relaxed"
                      style={{
                        border: '1px solid rgba(0, 223, 129, 0.2)',
                        background: 'rgba(0, 223, 129, 0.05)',
                        color: 'rgba(255, 255, 255, 0.8)',
                      }}
                    >
                      <div className="font-semibold text-emerald-400 flex items-center gap-1 mb-0.5">
                        <CheckCircle2 className="size-3.5" /> Workspace Sandboxing Active
                      </div>
                      Local files in the current repository are already accessible by default. Use this field if you want to explicitly restrict or whitelist custom directory paths.
                    </div>
                  )}

                  {/* Collapsible Tool Capabilities */}
                  <div className="border-t border-white/[0.05] pt-2">
                    <button
                      type="button"
                      onClick={() => setShowToolsDrawer(!showToolsDrawer)}
                      className="flex w-full items-center justify-between text-[11px] text-white/50 hover:text-white transition-colors"
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        <Layers className="size-3 text-emerald-400" />
                        Capabilities ({currentServerMeta.tools.length} Tools)
                      </span>
                      <span className="font-mono text-[10px] text-white/40">
                        {showToolsDrawer ? 'Collapse ▲' : 'Inspect ▼'}
                      </span>
                    </button>

                    {showToolsDrawer && (
                      <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {currentServerMeta.tools.map((t) => (
                          <div
                            key={t.name}
                            className="rounded-lg p-2 text-[10px]"
                            style={{
                              background: 'var(--prism-board)',
                              border: '1px solid rgba(255,255,255,0.04)',
                            }}
                          >
                            <div className="font-mono font-bold text-emerald-400 truncate">
                              {t.name}
                            </div>
                            <div className="text-white/50 mt-0.5 truncate">{t.description}</div>
                            <div className="mt-1 font-mono text-[9px] text-white/30 truncate">
                              Example: {t.example}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {mcpMessage && (
                    <p
                      className="rounded-lg p-2 text-xs"
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        border: '1px solid rgba(0,223,129,0.2)',
                        background: 'rgba(0,223,129,0.06)',
                        color: 'var(--prism-primary)',
                      }}
                    >
                      {mcpMessage}
                    </p>
                  )}

                  <GradientButton
                    type="submit"
                    loading={savingMcpToken}
                    disabled={savingMcpToken || !mcpEnvKey.trim() || !mcpToken.trim()}
                    variant="emerald"
                    className="h-10 w-full text-xs font-bold mt-1"
                    icon={<KeyRound className="size-3.5" />}
                  >
                    {savingMcpToken
                      ? 'Saving Credentials...'
                      : `Save ${currentServerMeta.displayName} Credentials`}
                  </GradientButton>
                </form>
              </div>

              {/* Security Footer Note */}
              <div
                className="p-2.5 rounded-lg border text-xs mt-3 flex items-start gap-2"
                style={{ background: 'var(--prism-board)', borderColor: 'rgba(255,255,255,0.05)' }}
              >
                <ShieldCheck className="size-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white/80 text-[11px] mb-0.5">Local Workspace Security</p>
                  <p className="text-[10px] leading-relaxed text-white/40">
                    Tokens are written directly to your local <code>tools .env</code> file and never sent to external servers or telemetry.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Remove Confirm Dialog ──────────────────────────────────────── */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)' }}>
          <div
            className="w-full max-w-sm rounded-xl p-4"
            style={{
              border: '1px solid var(--prism-border-card)',
              background: 'var(--prism-board)',
            }}
          >
            <h3 className="text-sm font-semibold text-white">Confirm removal</h3>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--prism-muted)' }}>
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
                className="h-9 rounded-lg px-3 text-xs font-semibold transition-colors"
                style={{
                  border: '1px solid var(--prism-border-card)',
                  background: 'var(--prism-card)',
                  color: 'var(--prism-muted)',
                }}
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
                className="h-9 rounded-lg px-3 text-xs font-semibold transition-colors"
                style={{ background: 'rgba(248,113,113,0.12)', color: '#fca5a5' }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── BYOK API Key Manager Dialog ── */}
      <ByokModal
        isOpen={showByokModal}
        onClose={() => setShowByokModal(false)}
        initialProvider={getProviderForModel(model)}
      />
    </div>
  );
}
