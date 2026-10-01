/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

/**
 * components/ByokModal.tsx
 * ─────────────────────────
 * Bring Your Own Key (BYOK) modal dialog for PrismSpace AI Orchestrator.
 * Allows users to configure and manage API keys for Groq, NVIDIA NIM,
 * OpenAI, Anthropic, Google Gemini, OpenRouter, and DeepSeek.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  KeyRound,
  X,
  ExternalLink,
  Check,
  Trash2,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import {
  BYOK_PROVIDERS,
  type ByokProviderId,
  getAllStoredApiKeys,
  setStoredApiKey,
  removeStoredApiKey,
  maskApiKey,
  verifyApiKey,
  type KeyVerificationResult,
} from '@/lib/byok-storage';
import {
  NVIDIA_ICON,
  GROQ_ICON,
  OPENAI_ICON,
  CLAUDE_ICON,
  ANTHROPIC_ICON,
  GEMINI_ICON,
  DEEPSEEK_ICON,
  OPENROUTER_ICON,
} from '@/components/kokonutui/ai-prompt';

export function getProviderIcon(providerId: string) {
  switch (providerId) {
    case 'nvidia':
      return NVIDIA_ICON;
    case 'groq':
      return GROQ_ICON;
    case 'openai':
      return OPENAI_ICON;
    case 'anthropic':
      return CLAUDE_ICON;
    case 'google':
      return GEMINI_ICON;
    case 'deepseek':
      return DEEPSEEK_ICON;
    case 'openrouter':
      return OPENROUTER_ICON;
    default:
      return <KeyRound className="size-3.5 text-[#00df81]" />;
  }
}

interface ByokModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProvider?: ByokProviderId;
  initialProvider?: ByokProviderId;
}

export function ByokModal({ isOpen, onClose, defaultProvider, initialProvider }: ByokModalProps) {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<ByokProviderId>(initialProvider || defaultProvider || 'groq');
  const [testStates, setTestStates] = useState<
    Record<string, { loading: boolean; result?: KeyVerificationResult }>
  >({});

  const loadKeys = () => {
    const stored = getAllStoredApiKeys();
    setKeys(stored);
    const initialInputs: Record<string, string> = {};
    for (const [p, val] of Object.entries(stored)) {
      initialInputs[p] = val;
    }
    setInputs(initialInputs);
  };

  useEffect(() => {
    if (isOpen) {
      loadKeys();
      if (defaultProvider) {
        setActiveTab(defaultProvider);
      }
    }
  }, [isOpen, defaultProvider]);

  if (!isOpen) return null;

  const currentProvider = BYOK_PROVIDERS.find((p) => p.id === activeTab) || BYOK_PROVIDERS[0];
  const configuredCount = Object.keys(keys).filter((k) => Boolean(keys[k]?.trim())).length;

  const handleSaveKey = (providerId: string) => {
    const val = (inputs[providerId] || '').trim();
    if (!val) {
      toast.error('Please enter an API key');
      return;
    }
    setStoredApiKey(providerId, val);
    loadKeys();
    toast.success(`${currentProvider.name} key saved`);
  };

  const handleRemoveKey = (providerId: string) => {
    removeStoredApiKey(providerId);
    setInputs((prev) => {
      const next = { ...prev };
      delete next[providerId];
      return next;
    });
    setTestStates((prev) => {
      const next = { ...prev };
      delete next[providerId];
      return next;
    });
    loadKeys();
    toast.success(`${currentProvider.name} key removed`);
  };

  const handleTestKey = async (providerId: string) => {
    const val = (inputs[providerId] || keys[providerId] || '').trim();
    if (!val) {
      toast.error(`Please enter a ${currentProvider.name} API key to test`);
      return;
    }

    setTestStates((prev) => ({
      ...prev,
      [providerId]: { loading: true },
    }));

    try {
      const result = await verifyApiKey(providerId, val);
      setTestStates((prev) => ({
        ...prev,
        [providerId]: { loading: false, result },
      }));

      if (result.valid) {
        toast.success(result.message || `${currentProvider.name} key verified!`);
      } else {
        toast.error(result.error || `${currentProvider.name} key verification failed`);
      }
    } catch (err: any) {
      const failedResult: KeyVerificationResult = {
        valid: false,
        provider: providerId,
        error: err.message || 'Key verification failed',
      };
      setTestStates((prev) => ({
        ...prev,
        [providerId]: { loading: false, result: failedResult },
      }));
      toast.error(err.message || 'Verification failed');
    }
  };

  const toggleVisibility = (providerId: string) => {
    setVisibleKeys((prev) => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative flex flex-col w-full max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden border shadow-2xl"
          style={{
            background: '#090c12',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(0, 223, 129, 0.15)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-[rgba(0,223,129,0.12)] border border-[rgba(0,223,129,0.3)] text-[#00df81]">
                <KeyRound className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight">API Keys & BYOK Manager</h3>
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold bg-[rgba(0,223,129,0.1)] text-[#00df81] border border-[rgba(0,223,129,0.25)]">
                    {configuredCount}/{BYOK_PROVIDERS.length} Active
                  </span>
                </div>
                <p className="text-xs text-white/50">Bring Your Own Key for all major AI providers and their models</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Privacy & Storage Banner */}
          <div className="flex items-center gap-2.5 px-5 py-2.5 bg-black/40 border-b border-white/[0.06] text-xs text-white/60">
            <ShieldCheck className="size-3.5 text-[#00df81] flex-shrink-0" />
            <span>
              Your keys are stored securely in your browser&apos;s local storage and passed directly for autonomous agent runs.
            </span>
          </div>

          {/* Body Content */}
          <div className="flex flex-1 min-h-0 divide-x divide-white/[0.08] overflow-hidden">
            {/* Left: Provider Tabs List */}
            <div className="w-56 flex-shrink-0 p-3 space-y-1 overflow-y-auto bg-black/20">
              <span className="block px-2 py-1 text-[10px] font-mono uppercase text-white/40 font-bold tracking-wider">
                Providers ({BYOK_PROVIDERS.length})
              </span>
              {BYOK_PROVIDERS.map((provider) => {
                const isSelected = activeTab === provider.id;
                const isConfigured = Boolean(keys[provider.id]?.trim());

                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => setActiveTab(provider.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-mono transition-all outline-none ${
                      isSelected
                        ? 'bg-[rgba(0,223,129,0.12)] border border-[rgba(0,223,129,0.35)] text-white shadow-sm'
                        : 'text-white/70 hover:bg-white/[0.04] hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {getProviderIcon(provider.id)}
                      <span className="font-semibold truncate">{provider.name}</span>
                    </div>

                    {isConfigured ? (
                      <span className="size-2 rounded-full bg-[#00df81] shadow-[0_0_8px_#00df81]" title="Key Configured" />
                    ) : provider.id === 'nvidia' ? (
                      <span className="text-[9px] font-mono text-white/40">Shared</span>
                    ) : (
                      <span className="size-1.5 rounded-full bg-white/20" title="Not Configured" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right: Active Provider Configuration & Models */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    {getProviderIcon(currentProvider.id)}
                    <h4 className="text-lg font-bold text-white tracking-tight">{currentProvider.name}</h4>
                    {keys[currentProvider.id] && (
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono font-semibold bg-[rgba(0,223,129,0.15)] text-[#00df81] border border-[rgba(0,223,129,0.3)]">
                        <Check className="size-3" /> Configured
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-white/60 leading-relaxed">{currentProvider.description}</p>
                </div>

                <a
                  href={currentProvider.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-[#00df81] hover:underline flex-shrink-0"
                >
                  <span>Get API Key</span>
                  <ExternalLink className="size-3" />
                </a>
              </div>

              {/* Key Input Section */}
              <div className="rounded-xl p-4 border border-white/[0.08] bg-white/[0.02] mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono font-semibold text-white/80">
                    {currentProvider.envKey}
                  </label>
                  {keys[currentProvider.id] && (
                    <span className="text-[11px] font-mono text-white/40">
                      Active: {maskApiKey(keys[currentProvider.id])}
                    </span>
                  )}
                </div>

                <div className="relative flex items-center">
                  <input
                    type={visibleKeys[currentProvider.id] ? 'text' : 'password'}
                    value={inputs[currentProvider.id] || ''}
                    onChange={(e) =>
                      setInputs((prev) => ({ ...prev, [currentProvider.id]: e.target.value }))
                    }
                    placeholder={currentProvider.placeholder}
                    className="w-full h-10 px-3.5 pr-10 rounded-lg bg-[#090c12] border border-white/[0.12] text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-[#00df81] focus:ring-1 focus:ring-[#00df81]/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility(currentProvider.id)}
                    className="absolute right-3 text-white/40 hover:text-white transition-colors"
                  >
                    {visibleKeys[currentProvider.id] ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-white/40 font-mono">
                    Prefix: <code className="text-white/60">{currentProvider.keyPrefix}</code>
                  </span>

                  <div className="flex items-center gap-2">
                    {keys[currentProvider.id] && (
                      <button
                        type="button"
                        onClick={() => handleRemoveKey(currentProvider.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent transition-all cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                        Remove
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={testStates[currentProvider.id]?.loading}
                      onClick={() => handleTestKey(currentProvider.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-white/80 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.12] transition-all cursor-pointer disabled:opacity-50"
                      title="Validate key authentication with provider"
                    >
                      {testStates[currentProvider.id]?.loading ? (
                        <Loader2 className="size-3.5 animate-spin text-[#00df81]" />
                      ) : (
                        <Zap className="size-3.5 text-[#6366F1]" />
                      )}
                      Test Key
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSaveKey(currentProvider.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-mono font-bold bg-[#00df81] text-[#06190e] hover:brightness-110 shadow-[0_0_12px_rgba(0,223,129,0.3)] transition-all cursor-pointer"
                    >
                      <Check className="size-3.5" />
                      Save Key
                    </button>
                  </div>
                </div>

                {/* Live Key Verification Status Card */}
                {testStates[currentProvider.id]?.result && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "mt-3.5 p-3 rounded-lg border text-xs font-mono flex items-start gap-2.5",
                      testStates[currentProvider.id]?.result?.valid
                        ? "bg-[rgba(0,223,129,0.08)] border-[rgba(0,223,129,0.3)] text-[#00df81]"
                        : "bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.3)] text-red-400"
                    )}
                  >
                    {testStates[currentProvider.id]?.result?.valid ? (
                      <CheckCircle2 className="size-4 flex-none mt-0.5" />
                    ) : (
                      <AlertCircle className="size-4 flex-none mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs">
                        {testStates[currentProvider.id]?.result?.valid
                          ? `${currentProvider.name} Key Active & Authorized`
                          : "Verification Failed"}
                      </div>
                      <p className="mt-0.5 text-[11px] opacity-80 leading-relaxed">
                        {testStates[currentProvider.id]?.result?.valid
                          ? testStates[currentProvider.id]?.result?.message
                          : testStates[currentProvider.id]?.result?.error}
                      </p>
                      {testStates[currentProvider.id]?.result?.details && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                          {testStates[currentProvider.id]?.result?.details?.limit && (
                            <span className="px-2 py-0.5 rounded-md bg-black/40 border border-current/20">
                              Limit: {testStates[currentProvider.id]?.result?.details?.limit}
                            </span>
                          )}
                          {testStates[currentProvider.id]?.result?.details?.usage && (
                            <span className="px-2 py-0.5 rounded-md bg-black/40 border border-current/20">
                              Usage: {testStates[currentProvider.id]?.result?.details?.usage}
                            </span>
                          )}
                          {testStates[currentProvider.id]?.result?.details?.is_free_tier !== undefined && (
                            <span className="px-2 py-0.5 rounded-md bg-black/40 border border-current/20">
                              {testStates[currentProvider.id]?.result?.details?.is_free_tier ? "Free Tier" : "Paid Tier"}
                            </span>
                          )}
                          {testStates[currentProvider.id]?.result?.details?.models_available !== undefined && (
                            <span className="px-2 py-0.5 rounded-md bg-black/40 border border-current/20">
                              Models: {testStates[currentProvider.id]?.result?.details?.models_available}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Supported Models List */}
              <div className="flex flex-col flex-1 min-h-0">
                <span className="text-xs font-bold font-mono uppercase text-white/60 mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-[#00df81]" />
                  Supported Models ({currentProvider.models.length})
                </span>

                <div className="grid grid-cols-1 gap-2 overflow-y-auto pr-1">
                  {currentProvider.models.map((model) => (
                    <div
                      key={model.id}
                      className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.015] hover:border-white/[0.12] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-white">{model.name}</span>
                        {model.badge && (
                          <span className="rounded px-1.5 py-0.5 text-[9px] font-mono bg-white/[0.08] text-white/70">
                            {model.badge}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-white/40">
                        <code className="text-[#00df81]/80 text-[10px] font-mono">{model.id}</code>
                        {model.recommended && (
                          <span className="text-[10px] font-mono text-[#00df81]">Recommended</span>
                        )}
                      </div>
                      {model.description && (
                        <p className="mt-1 text-[11px] text-white/50">{model.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.08] bg-black/40 text-xs text-white/40">
            <span className="font-mono text-[11px]">All keys remain locally on this machine</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg font-mono font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default ByokModal;
