/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * lib/byok-storage.ts
 * ────────────────────
 * Bring Your Own Key (BYOK) manager for all AI API providers in PrismSpace.
 * Supports secure browser storage, masking, key validation, and model mappings.
 */

export type ByokProviderId =
  | 'groq'
  | 'nvidia'
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'openrouter'
  | 'deepseek';

export interface ByokModelSpec {
  id: string;
  name: string;
  badge?: string;
  description?: string;
  recommended?: boolean;
}

export interface ByokProviderConfig {
  id: ByokProviderId;
  name: string;
  company: string;
  envKey: string;
  keyPrefix: string;
  placeholder: string;
  docUrl: string;
  description: string;
  color: string;
  models: ByokModelSpec[];
}

export const BYOK_PROVIDERS: ByokProviderConfig[] = [
  {
    id: 'groq',
    name: 'Groq Cloud',
    company: 'Groq',
    envKey: 'GROQ_API_KEY',
    keyPrefix: 'gsk_',
    placeholder: 'gsk_...',
    docUrl: 'https://console.groq.com/keys',
    description: 'Ultra-low latency LPU engine for lightning inference.',
    color: '#F55036',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'LLaMA 3.3 70B Versatile', badge: 'Ultra-Fast', recommended: true, description: 'Default high-accuracy, 128k context model' },
      { id: 'llama3-70b-8192', name: 'LLaMA 3 70B (8k)', badge: 'Low Latency', description: 'Blazing fast code review and execution' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (32k)', badge: 'Long Context', description: 'Excellent MoE reasoning with large buffer' },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B IT', badge: 'Lightweight', description: 'Fast concise structured generation' },
      { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill 70B', badge: 'Reasoning', description: 'Deep reasoning distilled into LLaMA architecture' },
    ],
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    company: 'NVIDIA',
    envKey: 'NVIDIA_API_KEY',
    keyPrefix: 'nvapi-',
    placeholder: 'nvapi-...',
    docUrl: 'https://build.nvidia.com/explore/discover',
    description: 'Accelerated cloud microservices with thinking and multi-agent reasoning.',
    color: '#76B900',
    models: [
      { id: 'nvidia/nemotron-3.5-lightning-30b-a3b', name: 'Nemotron 3.5 30B', badge: 'Thinking', recommended: true, description: 'NVIDIA hybrid thinking architecture with reasoning budget' },
      { id: 'meta/llama-3.3-70b-instruct', name: 'Meta LLaMA 3.3 70B NIM', badge: 'High Perf', description: 'TensorRT-optimized LLaMA 3.3 inference' },
      { id: 'meta/llama-3.1-70b-instruct', name: 'Meta LLaMA 3.1 70B NIM', badge: 'Standard', description: 'Reliable generalist model for swarm nodes' },
      { id: 'deepseek-ai/deepseek-r1', name: 'DeepSeek R1 NIM', badge: 'CoT Reasoning', description: 'DeepSeek-R1 full reasoning pipeline on NVIDIA infrastructure' },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    company: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    keyPrefix: 'sk-',
    placeholder: 'sk-proj-...',
    docUrl: 'https://platform.openai.com/api-keys',
    description: 'Industry-standard flagship multimodal and reasoning intelligence.',
    color: '#10A37F',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o Omnimodel', badge: 'Flagship', recommended: true, description: 'High-intelligence flagship multimodal model' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', badge: 'Speed / Cost', description: 'Fast, lightweight agent orchestration model' },
      { id: 'o1-preview', name: 'OpenAI o1 Preview', badge: 'Deep Thought', description: 'Extended reasoning benchmark leader' },
      { id: 'o3-mini', name: 'OpenAI o3-mini', badge: 'STEM Reasoning', description: 'High-speed reasoning model specialized for coding' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    company: 'Anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    keyPrefix: 'sk-ant-',
    placeholder: 'sk-ant-api03-...',
    docUrl: 'https://console.anthropic.com/settings/keys',
    description: 'Premier developer models recognized for exceptional coding and tool usage.',
    color: '#D97706',
    models: [
      { id: 'claude-3-7-sonnet-latest', name: 'Claude 3.7 Sonnet', badge: 'Hybrid CoT', recommended: true, description: 'Frontier model featuring hybrid thinking and deep coding power' },
      { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet', badge: 'Exceptional Craft', description: 'The gold standard in software engineering and synthesis' },
      { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku', badge: 'Instantaneous', description: 'Near-instant sub-agent execution with high precision' },
    ],
  },
  {
    id: 'google',
    name: 'Google Gemini',
    company: 'Google',
    envKey: 'GEMINI_API_KEY',
    keyPrefix: 'AIza',
    placeholder: 'AIzaSy...',
    docUrl: 'https://aistudio.google.com/app/apikey',
    description: 'Massive 2M context window with lightning-fast multimodal reasoning.',
    color: '#1C7DFF',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', badge: 'Next-Gen', recommended: true, description: 'Real-time multi-agent speed with cutting edge latency' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', badge: '2M Context', description: 'Processes entire repositories and large data dumps in one shot' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', badge: 'High Throughput', description: 'Quick and economical agent node engine' },
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    company: 'OpenRouter',
    envKey: 'OPENROUTER_API_KEY',
    keyPrefix: 'sk-or-',
    placeholder: 'sk-or-v1-...',
    docUrl: 'https://openrouter.ai/keys',
    description: 'Universal unified API access to hundreds of open-source & proprietary models.',
    color: '#6366F1',
    models: [
      { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet (OpenRouter)', badge: 'Hybrid CoT', recommended: true, description: 'Anthropic frontier hybrid thinking model via OpenRouter' },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (OpenRouter)', badge: 'Universal', description: 'Routed via OpenRouter infrastructure' },
      { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (OpenRouter)', badge: 'Reasoning', description: 'Open weights reasoning accessible without waitlists' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'LLaMA 3.3 70B (OpenRouter)', badge: 'Open Weights', description: 'Full open-weight powerhouse' },
      { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash (OpenRouter)', badge: 'Ultra-Fast', description: 'High-speed multimodal intelligence via OpenRouter' },
      { id: 'openai/gpt-4o', name: 'GPT-4o (OpenRouter)', badge: 'Multimodal', description: 'Flagship OpenAI model through OpenRouter' },
      { id: 'mistralai/mistral-large-2411', name: 'Mistral Large (OpenRouter)', badge: 'Top MoE', description: 'Mistral flagship reasoning and synthesis' },
      { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B (OpenRouter)', badge: 'Coding Leader', description: 'Exceptional open coding and mathematics' },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek API',
    company: 'DeepSeek',
    envKey: 'DEEPSEEK_API_KEY',
    keyPrefix: 'sk-',
    placeholder: 'sk-...',
    docUrl: 'https://platform.deepseek.com/api_keys',
    description: 'State-of-the-art reasoning and coding models at unmatched cost-efficiency.',
    color: '#4D6BFE',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek-V3 Chat', badge: 'Economical', recommended: true, description: '671B MoE model rivaling top closed models' },
      { id: 'deepseek-reasoner', name: 'DeepSeek-R1 Reasoner', badge: 'Deep Reasoning', description: 'Reinforcement learning reasoning model with full chain-of-thought' },
    ],
  },
];

const BYOK_STORAGE_KEY = 'prism_byok_api_keys';

/**
 * Retrieve all user-stored BYOK keys from localStorage.
 */
export function getAllStoredApiKeys(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(BYOK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Get stored key for a specific provider.
 */
export function getStoredApiKey(provider: string): string | null {
  const keys = getAllStoredApiKeys();
  const normalized = provider.toLowerCase();
  return keys[normalized] || null;
}

/**
 * Save or update a BYOK key for a provider.
 */
export function setStoredApiKey(provider: string, key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const keys = getAllStoredApiKeys();
    const normalized = provider.toLowerCase();
    const cleanKey = key.trim();
    if (cleanKey) {
      keys[normalized] = cleanKey;
    } else {
      delete keys[normalized];
    }
    localStorage.setItem(BYOK_STORAGE_KEY, JSON.stringify(keys));
    window.dispatchEvent(new CustomEvent('prism:byok-updated', { detail: { provider: normalized } }));
  } catch (err) {
    console.error('Failed to store BYOK key', err);
  }
}

/**
 * Remove a stored BYOK key for a provider.
 */
export function removeStoredApiKey(provider: string): void {
  if (typeof window === 'undefined') return;
  try {
    const keys = getAllStoredApiKeys();
    const normalized = provider.toLowerCase();
    delete keys[normalized];
    localStorage.setItem(BYOK_STORAGE_KEY, JSON.stringify(keys));
    window.dispatchEvent(new CustomEvent('prism:byok-updated', { detail: { provider: normalized } }));
  } catch (err) {
    console.error('Failed to remove BYOK key', err);
  }
}

/**
 * Check if a provider has a configured key.
 */
export function isProviderConfigured(provider: string): boolean {
  // NVIDIA NIM has a default shared test key on the backend, but user can still BYOK
  const key = getStoredApiKey(provider);
  return Boolean(key && key.trim().length > 3);
}

/**
 * Format a masked preview of an API key (e.g., "sk-ant...8f2a").
 */
export function maskApiKey(key: string): string {
  if (!key) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '••••••••';
  const prefix = trimmed.slice(0, Math.min(6, Math.floor(trimmed.length / 3)));
  const suffix = trimmed.slice(-4);
  return `${prefix}...${suffix}`;
}

/**
 * Find provider id given a model ID string.
 */
export function getProviderForModel(modelId: string): ByokProviderId {
  // 1. Direct exact match in BYOK_PROVIDERS
  for (const provider of BYOK_PROVIDERS) {
    if (provider.models.some((m) => m.id === modelId)) {
      return provider.id;
    }
  }

  const m = modelId.toLowerCase();

  // 2. OpenRouter explicit prefix always routes to openrouter
  if (m.startsWith('openrouter/')) return 'openrouter';

  // 3. Known vendor-specific prefixes
  if (m.startsWith('nvidia/') || m.includes('nemotron')) return 'nvidia';
  if (m.startsWith('openai/') || m.startsWith('gpt-') || m.startsWith('o1') || m.startsWith('o3')) return 'openai';
  if (m.startsWith('claude-') || (m.includes('anthropic') && !m.includes('/'))) return 'anthropic';
  if (m.startsWith('gemini-') || (m.includes('google') && !m.includes('/'))) return 'google';
  if (m.startsWith('deepseek-') && !m.includes('distill') && !m.includes('/')) return 'deepseek';

  // 4. Any slashes from vendor models not owned directly (e.g. "qwen/...", "mistralai/...")
  if (m.includes('/')) {
    if (m.startsWith('meta/') || m.startsWith('deepseek-ai/')) return 'nvidia';
    return 'openrouter';
  }

  return 'groq';
}

/**
 * Get all unified prompt models across all providers for AIPrompt.
 */
export function getAllPromptModels(keysMap?: Record<string, string>): {
  id: string;
  name: string;
  provider: ByokProviderId;
  badge?: string;
  hasCustomKey?: boolean;
}[] {
  const models: {
    id: string;
    name: string;
    provider: ByokProviderId;
    badge?: string;
    hasCustomKey?: boolean;
  }[] = [];

  for (const provider of BYOK_PROVIDERS) {
    const hasKey = keysMap
      ? Boolean(keysMap[provider.id] && keysMap[provider.id].trim().length > 3)
      : isProviderConfigured(provider.id);
    for (const mod of provider.models) {
      models.push({
        id: mod.id,
        name: mod.name,
        provider: provider.id,
        badge: mod.badge || provider.name,
        hasCustomKey: hasKey,
      });
    }
  }

  return models;
}

export interface KeyVerificationResult {
  valid: boolean;
  provider: ByokProviderId | string;
  message?: string;
  error?: string;
  details?: {
    label?: string;
    usage?: string;
    limit?: string;
    is_free_tier?: boolean;
    models_available?: number;
    [key: string]: any;
  };
}

/**
 * Validate an API key for a provider via backend verification route or direct provider auth endpoint.
 */
export async function verifyApiKey(
  provider: ByokProviderId | string,
  key: string
): Promise<KeyVerificationResult> {
  const cleanKey = key.trim();
  const normalized = provider.toLowerCase();

  if (!cleanKey) {
    return {
      valid: false,
      provider: normalized,
      error: 'Please enter an API key.',
    };
  }

  if (cleanKey.length < 6) {
    return {
      valid: false,
      provider: normalized,
      error: 'API key is too short.',
    };
  }

  // 1. Try server-side verification proxy (/api/byok/verify)
  try {
    const res = await fetch('/api/byok/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: normalized, apiKey: cleanKey }),
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }

    const errData = await res.json().catch(() => null);
    if (errData?.error) {
      return {
        valid: false,
        provider: normalized,
        error: errData.error,
        details: errData.details,
      };
    }
  } catch {
    // Fall back to direct client check if Next.js proxy unreachable
  }

  // 2. Direct client fallback for OpenRouter
  if (normalized === 'openrouter') {
    try {
      const directRes = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: {
          Authorization: `Bearer ${cleanKey}`,
          'HTTP-Referer': 'https://prismspace.app',
          'X-Title': 'PrismSpace',
        },
      });
      const data = await directRes.json();
      if (directRes.ok && data?.data) {
        return {
          valid: true,
          provider: 'openrouter',
          message: 'OpenRouter key active & authorized.',
          details: {
            label: data.data.label || 'Standard Key',
            usage: data.data.usage != null ? `$${Number(data.data.usage).toFixed(4)}` : undefined,
            limit: data.data.limit != null ? `$${Number(data.data.limit).toFixed(2)}` : 'Unlimited',
            is_free_tier: data.data.is_free_tier,
          },
        };
      }
      return {
        valid: false,
        provider: 'openrouter',
        error: data?.error?.message || `OpenRouter rejected key (HTTP ${directRes.status})`,
      };
    } catch (err: any) {
      return {
        valid: false,
        provider: 'openrouter',
        error: `Could not reach OpenRouter API: ${err.message}`,
      };
    }
  }

  // Basic syntax verification fallback for others
  const provConfig = BYOK_PROVIDERS.find((p) => p.id === normalized);
  if (provConfig && provConfig.keyPrefix && !cleanKey.startsWith(provConfig.keyPrefix)) {
    return {
      valid: false,
      provider: normalized,
      error: `Key does not start with standard prefix "${provConfig.keyPrefix}"`,
    };
  }

  return {
    valid: true,
    provider: normalized,
    message: 'Key format verified.',
  };
}
