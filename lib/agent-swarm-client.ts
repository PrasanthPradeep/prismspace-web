/**
 * lib/agent-swarm-client.ts
 * ─────────────────────────
 * Typed TypeScript client for the Agent Swarm API.
 * Communicates with Next.js API routes which proxy to the Python backend.
 */

export type AgentStatus =
  | 'initialising'
  | 'planning'
  | 'running'
  | 'awaiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ModelProvider = 'groq' | 'nvidia';

export interface SwarmAgent {
  id: string;
  objective: string;
  model: string;
  provider: ModelProvider;
  max_agents: number;
  human_in_loop: boolean;
  status: AgentStatus;
  created_at: string;
  updated_at: string;
  result: string | null;
  approved: boolean | null;
}

export interface AgentChatContextMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface McpEnvVarStatus {
  key: string;
  configured: boolean;
}

export interface McpServerStatus {
  name: string;
  transport: string;
  command: string;
  args: string[];
  description: string;
  env: McpEnvVarStatus[];
}

export interface McpTokenStatus {
  key: string;
  configured: boolean;
  masked: string;
  used_by: string[];
}

export interface McpServerListResponse {
  servers: McpServerStatus[];
  tokens: McpTokenStatus[];
  env_file?: string;
}

export interface CreateAgentPayload {
  objective: string;
  model?: string;
  provider?: ModelProvider;
  max_agents?: number;
  human_in_loop?: boolean;
  chat_history?: AgentChatContextMessage[];
}

const BASE = '/api/agent-swarm';

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function listAgents(): Promise<SwarmAgent[]> {
  const res = await fetch(`${BASE}/agents`);
  if (!res.ok) throw new Error(`Failed to list agents: ${res.status}`);
  const data = await res.json();
  return data.agents as SwarmAgent[];
}

export async function createAgent(payload: CreateAgentPayload): Promise<SwarmAgent> {
  const res = await fetch(`${BASE}/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      objective: payload.objective,
      model: payload.model ?? 'gpt-4o',
      provider: payload.provider ?? 'openai',
      max_agents: payload.max_agents ?? 3,
      human_in_loop: payload.human_in_loop ?? true,
      chat_history: payload.chat_history ?? [],
    }),
  });
  if (!res.ok) throw new Error(`Failed to create agent: ${res.status}`);
  return res.json();
}

export async function getAgent(id: string): Promise<SwarmAgent> {
  const res = await fetch(`${BASE}/agents/${id}`);
  if (!res.ok) throw new Error(`Agent not found: ${id}`);
  return res.json();
}

export async function approveAgent(
  id: string,
  approved: boolean,
  message?: string,
): Promise<void> {
  const res = await fetch(`${BASE}/agents/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved, message }),
  });
  if (!res.ok) throw new Error(`Approval failed: ${res.status}`);
}

export async function deleteAgent(id: string): Promise<void> {
  const res = await fetch(`${BASE}/agents/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}

// ── MCP server/token management ─────────────────────────────────────────────

export async function listMcpServers(): Promise<McpServerListResponse> {
  const res = await fetch(`${BASE}/mcp`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to list MCP servers: ${res.status}`);
  const data = (await res.json()) as McpServerListResponse;
  return data;
}

export async function saveMcpToken(payload: {
  server_name?: string;
  env_key: string;
  token: string;
}): Promise<void> {
  const res = await fetch(`${BASE}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to save MCP token: ${res.status}`);
}

export async function removeMcpToken(payload: {
  server_name?: string;
  env_key: string;
}): Promise<void> {
  const res = await fetch(`${BASE}/mcp`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to remove MCP token: ${res.status}`);
}

// ── Health ────────────────────────────────────────────────────────────────────

export async function checkSwarmHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/health`, { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

// ── SSE log streaming ────────────────────────────────────────────────────────

/**
 * Opens a Server-Sent Events connection that calls `onLine` for every new log
 * entry and `onDone` when the agent finishes (completed/failed/cancelled).
 *
 * Returns a cleanup function that closes the EventSource.
 */
export function streamAgentLogs(
  agentId: string,
  onLine: (line: string, index: number) => void,
  onDone: () => void,
): () => void {
  const es = new EventSource(`${BASE}/agents/${agentId}/logs`);

  es.onmessage = (evt) => {
    try {
      const payload = JSON.parse(evt.data);
      if (payload.done) {
        onDone();
        es.close();
      } else if (payload.line !== undefined) {
        onLine(payload.line as string, payload.index as number);
      }
    } catch {
      // ignore malformed frames
    }
  };

  es.onerror = () => {
    es.close();
  };

  return () => es.close();
}

// ── Status helpers ────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<AgentStatus, string> = {
  initialising: 'Initialising',
  planning: 'Planning DAG',
  running: 'Running',
  awaiting_approval: 'Awaiting Approval',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export const STATUS_COLORS: Record<AgentStatus, string> = {
  initialising: '#94a3b8',
  planning: '#60a5fa',
  running: '#34d399',
  awaiting_approval: '#fbbf24',
  completed: '#4ade80',
  failed: '#f87171',
  cancelled: '#6b7280',
};

export function isTerminal(status: AgentStatus): boolean {
  return ['completed', 'failed', 'cancelled'].includes(status);
}
