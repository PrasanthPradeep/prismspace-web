/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
"use client";

/**
 * @author: @kokonutui (adapted for PrismSpace Autonomous Developer OS)
 * @description: AI Prompt Input & Toolbar with PrismSpace High-Voltage Design System
 * @version: 2.0.0
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Send,
  Sparkles,
  X,
  Cpu,
  Loader2,
  KeyRound,
  Search,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { cn } from "@/lib/utils";
import { BYOK_PROVIDERS, getProviderForModel } from "@/lib/byok-storage";

// ── Model Provider Icons (Authentic Vector Brand Marks) ─────────────────────
export const NVIDIA_ICON = (
  <svg className="size-3.5 flex-none" viewBox="0 0 24 24" fill="#76B900" fillRule="evenodd">
    <title>NVIDIA</title>
    <path d="M10.212 8.976V7.62c.127-.01.256-.017.388-.021 3.596-.117 5.957 3.184 5.957 3.184s-2.548 3.647-5.282 3.647a3.227 3.227 0 01-1.063-.175v-4.109c1.4.174 1.681.812 2.523 2.258l1.873-1.627a4.905 4.905 0 00-3.67-1.846 6.594 6.594 0 00-.729.044m0-4.476v2.025c.13-.01.259-.019.388-.024 5.002-.174 8.261 4.226 8.261 4.226s-3.743 4.69-7.643 4.69c-.338 0-.675-.031-1.007-.092v1.25c.278.038.558.057.838.057 3.629 0 6.253-1.91 8.794-4.169.421.347 2.146 1.193 2.501 1.564-2.416 2.083-8.048 3.763-11.24 3.763-.308 0-.603-.02-.894-.048V19.5H24v-15H10.21zm0 9.756v1.068c-3.356-.616-4.287-4.21-4.287-4.21a7.173 7.173 0 014.287-2.138v1.172h-.005a3.182 3.182 0 00-2.502 1.178s.615 2.276 2.507 2.931m-5.961-3.3c1.436-1.935 3.604-3.148 5.961-3.336V6.523C5.81 6.887 2 10.723 2 10.723s2.158 6.427 8.21 7.015v-1.166C5.77 16 4.25 10.958 4.25 10.958h-.002z" />
  </svg>
);

export const GROQ_ICON = (
  <svg className="size-3.5 flex-none" viewBox="0 0 24 24" fill="#F55036" fillRule="evenodd">
    <title>Groq</title>
    <path d="M12.036 2c-3.853-.035-7 3-7.036 6.781-.035 3.782 3.055 6.872 6.908 6.907h2.42v-2.566h-2.292c-2.407.028-4.38-1.866-4.408-4.23-.029-2.362 1.901-4.298 4.308-4.326h.1c2.407 0 4.358 1.915 4.365 4.278v6.305c0 2.342-1.944 4.25-4.323 4.279a4.375 4.375 0 01-3.033-1.252l-1.851 1.818A7 7 0 0012.029 22h.092c3.803-.056 6.858-3.083 6.879-6.816v-6.5C18.907 4.963 15.817 2 12.036 2z" />
  </svg>
);

export const GEMINI_ICON = (
  <svg className="size-3.5 flex-none" viewBox="0 0 24 24" fillRule="evenodd">
    <title>Google Gemini</title>
    <defs>
      <linearGradient id="prism-gemini-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#1C7DFF" />
        <stop offset="50%" stopColor="#7B61FF" />
        <stop offset="100%" stopColor="#FA7268" />
      </linearGradient>
    </defs>
    <path
      d="M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
      fill="url(#prism-gemini-gradient)"
    />
  </svg>
);

export const CLAUDE_ICON = (
  <svg className="size-3.5 flex-none" viewBox="0 0 24 24" fill="#D97706" fillRule="evenodd">
    <title>Claude</title>
    <path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" />
  </svg>
);

export const ANTHROPIC_ICON = (
  <svg className="size-3.5 flex-none" viewBox="0 0 24 24" fill="#D97706" fillRule="evenodd">
    <title>Anthropic</title>
    <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z" />
  </svg>
);

export const OPENAI_ICON = (
  <svg className="size-3.5 flex-none" viewBox="0 0 24 24" fill="#10A37F" fillRule="evenodd">
    <title>OpenAI</title>
    <path d="M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z" />
  </svg>
);

export const DEEPSEEK_ICON = (
  <svg className="size-3.5 flex-none" viewBox="0 0 24 24" fill="#4D6BFE" fillRule="evenodd">
    <title>DeepSeek</title>
    <path d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 011.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 01.415-.287.302.302 0 01.2.288.306.306 0 01-.31.307.303.303 0 01-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 01-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 01.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 01-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z" />
  </svg>
);

export const OPENROUTER_ICON = (
  <svg className="size-3.5 flex-none" viewBox="0 0 24 24" fill="#6366F1" fillRule="evenodd">
    <title>OpenRouter</title>
    <path d="M18.654 3.87a5.087 5.087 0 110 10.174L23.7 19.09c.64.641.187 1.737-.72 1.737H8.48a8.479 8.479 0 010-16.958h10.175zM8.479 7.26a5.087 5.087 0 100 10.176 5.087 5.087 0 000-10.175z" />
  </svg>
);

export interface AIPromptModel {
  id: string;
  name: string;
  provider?: string;
  badge?: string;
  icon?: React.ReactNode;
  hasCustomKey?: boolean;
}

export interface AIPromptTemplate {
  label: string;
  text: string;
  icon?: React.ReactNode;
}

export interface AIPromptProps {
  value?: string;
  defaultValue?: string;
  onChange?: (val: string) => void;
  onSubmit?: (val: string, model: string, provider?: string) => void;
  models?: (string | AIPromptModel)[];
  defaultModel?: string;
  selectedModel?: string;
  onModelChange?: (modelId: string, provider?: string) => void;
  onOpenByok?: () => void;
  showModelSelector?: boolean;
  placeholder?: string;
  headerText?: string;
  headerSubtitle?: string;
  headerAction?: React.ReactNode;
  templates?: AIPromptTemplate[];
  loading?: boolean;
  disabled?: boolean;
  submitDisabled?: boolean;
  compact?: boolean;
  submitLabel?: string;
  submitLoadingLabel?: string;
  showAttachment?: boolean;
  minHeight?: number;
  maxHeight?: number;
  className?: string;
}

const DEFAULT_MODELS: AIPromptModel[] = [
  { id: "nvidia/nemotron-3.5-lightning-30b-a3b", name: "Nemotron 3.5 30B", provider: "nvidia", badge: "NVIDIA NIM" },
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", provider: "groq", badge: "Groq Cloud" },
  { id: "gpt-4o", name: "GPT-4o", provider: "openai", badge: "OpenAI" },
  { id: "claude-3-7-sonnet-latest", name: "Claude 3.7 Sonnet", provider: "anthropic", badge: "Anthropic" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "google", badge: "Google" },
  { id: "deepseek-chat", name: "DeepSeek-V3", provider: "deepseek", badge: "DeepSeek" },
  { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 (OpenRouter)", provider: "openrouter", badge: "OpenRouter" },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1 (OpenRouter)", provider: "openrouter", badge: "OpenRouter" },
];

export function getModelIcon(modelId: string, provider?: string): React.ReactNode {
  const p = (provider || "").toLowerCase();
  const id = modelId.toLowerCase();
  if (p === "openrouter" || id.startsWith("openrouter/")) return OPENROUTER_ICON;
  if (p === "nvidia" || id.includes("nvidia") || id.includes("nemotron")) return NVIDIA_ICON;
  if (p === "groq" || id.includes("llama") || id.includes("mixtral") || id.includes("gemma")) return GROQ_ICON;
  if (p === "openai" || id.includes("gpt") || id.startsWith("o1") || id.startsWith("o3")) return OPENAI_ICON;
  if (p === "anthropic" || id.includes("claude")) return ANTHROPIC_ICON;
  if (p === "google" || id.includes("gemini")) return GEMINI_ICON;
  if (p === "deepseek" || id.includes("deepseek")) return DEEPSEEK_ICON;
  if (id.includes("/") && !id.startsWith("meta/") && !id.startsWith("deepseek-ai/")) return OPENROUTER_ICON;
  return <Bot className="size-3.5 text-[#00df81]" />;
}

export function AIPrompt({
  value: controlledValue,
  defaultValue = "",
  onChange,
  onSubmit,
  models = DEFAULT_MODELS,
  defaultModel,
  selectedModel: controlledModel,
  onModelChange,
  onOpenByok,
  showModelSelector = true,
  placeholder = "Describe the objective or task you want the swarm to execute...",
  headerText,
  headerSubtitle,
  headerAction,
  templates = [],
  loading = false,
  disabled = false,
  submitDisabled = false,
  compact = false,
  submitLabel = "Launch Swarm Orchestration",
  submitLoadingLabel = "Deploying Swarm Nodes...",
  showAttachment = true,
  minHeight = 84,
  maxHeight = 320,
  className,
}: AIPromptProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const normalizedModels: AIPromptModel[] = models.map((m) =>
    typeof m === "string" ? { id: m, name: m } : m
  );

  const initialModelId =
    controlledModel ||
    defaultModel ||
    (normalizedModels.length > 0 ? normalizedModels[0].id : "default");

  const [internalModel, setInternalModel] = useState(initialModelId);
  const selectedModelId = controlledModel || internalModel;

  const activeModelObj =
    normalizedModels.find((m) => m.id === selectedModelId) ||
    normalizedModels[0] || { id: selectedModelId, name: selectedModelId };

  const [providerTab, setProviderTab] = useState<string>("all");
  const [modelSearch, setModelSearch] = useState<string>("");
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = tabsContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = tabsContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScrollState]);

  const scrollTabs = (offset: number) => {
    tabsContainerRef.current?.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const filteredNormalizedModels = useMemo(() => {
    const q = modelSearch.toLowerCase().trim();
    return normalizedModels.filter((m) => {
      const prov = m.provider || getProviderForModel(m.id);
      const matchesTab = providerTab === "all" || prov === providerTab;
      if (!matchesTab) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        (m.badge && m.badge.toLowerCase().includes(q)) ||
        prov.toLowerCase().includes(q)
      );
    });
  }, [normalizedModels, providerTab, modelSearch]);

  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: compact ? 42 : minHeight,
    maxHeight,
  });

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    if (!isControlled) {
      setInternalValue(newVal);
    }
    onChange?.(newVal);
    adjustHeight();
  };

  const handleSelectModel = (model: AIPromptModel) => {
    if (!controlledModel) {
      setInternalModel(model.id);
    }
    onModelChange?.(model.id, model.provider);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!value.trim() || loading || disabled) return;
    onSubmit?.(value.trim(), selectedModelId, activeModelObj.provider);
    if (!isControlled) {
      setInternalValue("");
      adjustHeight(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col transition-all duration-200",
        compact
          ? "rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#090c12]/95 shadow-[0_4px_20px_rgba(0,0,0,0.4)] focus-within:border-[rgba(0,223,129,0.35)] focus-within:shadow-[0_0_20px_rgba(0,223,129,0.12)]"
          : "rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#090c12]/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] focus-within:border-[rgba(0,223,129,0.4)] focus-within:shadow-[0_0_25px_rgba(0,223,129,0.14)]",
        className
      )}
    >
      {/* ── Optional Header with Telemetry & Chips (Standard Mode) ── */}
      {!compact && (headerText || templates.length > 0 || headerAction) && (
        <div className="flex flex-col gap-2 p-3 pb-2 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
          {(headerText || headerAction) && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00df81] opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-[#00df81]" />
                </span>
                {headerText && (
                  <span
                    className="text-xs font-bold tracking-wider uppercase"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: "var(--prism-primary, #00df81)",
                    }}
                  >
                    {headerText}
                  </span>
                )}
                {headerSubtitle && (
                  <span className="text-[11px] font-mono text-white/40">
                    · {headerSubtitle}
                  </span>
                )}
              </div>
              {headerAction && <div>{headerAction}</div>}
            </div>
          )}

          {/* Quick Objective Chips */}
          {templates.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {templates.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => {
                    const nextVal = value ? `${value}\n${tpl.text}` : tpl.text;
                    if (!isControlled) setInternalValue(nextVal);
                    onChange?.(nextVal);
                    setTimeout(() => adjustHeight(), 10);
                  }}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-mono transition-all border border-[rgba(255,255,255,0.08)] bg-white/[0.03] text-white/60 hover:border-[rgba(0,223,129,0.4)] hover:bg-[rgba(0,223,129,0.08)] hover:text-white"
                >
                  <span className="text-[#00df81]">+</span>
                  {tpl.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Main Input Area ── */}
      <div className="relative flex-1 min-h-0 flex flex-col p-3 pb-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={loading}
          className={cn(
            "w-full flex-1 resize-none bg-transparent outline-none leading-relaxed transition-colors",
            "text-white placeholder:text-white/35 font-sans",
            compact ? "text-xs min-h-[38px] max-h-[140px]" : "text-sm min-h-[90px]"
          )}
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
          }}
        />

        {/* Attached file chip */}
        {attachedFile && (
          <div className="mt-2 flex items-center gap-2 self-start rounded-md border border-[rgba(0,223,129,0.3)] bg-[rgba(0,223,129,0.08)] px-2 py-1 text-[11px] font-mono text-white/90">
            <Paperclip className="size-3 text-[#00df81]" />
            <span className="max-w-[200px] truncate">{attachedFile.name}</span>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              className="text-white/50 hover:text-white"
            >
              <X className="size-3" />
            </button>
          </div>
        )}
      </div>

      {/* ── Integrated Action Toolbar (Bottom) ── */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-black/40 border-t border-[rgba(255,255,255,0.06)] flex-shrink-0">
        <div className="flex items-center gap-1.5">
          {/* Model Selector Dropdown */}
          {showModelSelector && <DropdownMenu>
            <DropdownMenuTrigger
              type="button"
              className={cn(
                "flex items-center gap-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] bg-white/[0.03] px-2.5 py-1 text-xs font-mono text-white/80 transition-all cursor-pointer outline-none select-none",
                "hover:border-[rgba(0,223,129,0.35)] hover:bg-[rgba(0,223,129,0.06)] hover:text-white focus-visible:border-[rgba(0,223,129,0.5)]"
              )}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeModelObj.id}
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 2 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1.5 pointer-events-none"
                >
                  {activeModelObj.icon || getModelIcon(activeModelObj.id, activeModelObj.provider)}
                  <span className="font-semibold">{activeModelObj.name}</span>
                  {activeModelObj.badge && (
                    <span className="hidden sm:inline-block rounded px-1.5 py-0.2 text-[9px] bg-white/10 text-white/60">
                      {activeModelObj.badge}
                    </span>
                  )}
                  <ChevronDown className="size-3 text-white/40 ml-0.5" />
                </motion.div>
              </AnimatePresence>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="start"
              side="top"
              sideOffset={8}
              className={cn(
                "z-[9999] min-w-[20rem] max-w-[24rem] p-0 rounded-2xl border border-[rgba(255,255,255,0.12)]",
                "bg-[#090c12]/98 shadow-2xl backdrop-blur-2xl text-white font-mono text-xs flex flex-col overflow-hidden"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.08] bg-black/40">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#00df81] animate-pulse" />
                  <span className="text-[10px] uppercase tracking-wider text-white/90 font-bold">Model Routing</span>
                  <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-white/50">{filteredNormalizedModels.length}/{normalizedModels.length}</span>
                </div>
                {onOpenByok && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onOpenByok();
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-[#00df81]/25 bg-[#00df81]/10 px-2 py-0.5 text-[10px] font-medium text-[#00df81] hover:bg-[#00df81]/20 transition-all cursor-pointer"
                  >
                    <KeyRound className="size-2.5" />
                    BYOK Keys
                  </button>
                )}
              </div>

              {/* Provider Segregation Tabs with Custom Horizontal Scrollbar */}
              <div className="relative border-b border-white/[0.06] bg-black/25">
                {/* Left scroll button & gradient fade */}
                {canScrollLeft && (
                  <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 flex items-center bg-gradient-to-r from-[#090c12] via-[#090c12]/90 to-transparent pl-1 pr-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        scrollTabs(-110);
                      }}
                      className="pointer-events-auto flex size-4 items-center justify-center rounded-full border border-white/15 bg-[#090c12] text-white/70 hover:border-[#00df81]/60 hover:bg-[#00df81]/20 hover:text-[#00df81] transition-all cursor-pointer shadow-lg"
                      aria-label="Scroll left"
                    >
                      <ChevronLeft className="size-2.5" />
                    </button>
                  </div>
                )}

                {/* Right scroll button & gradient fade */}
                {canScrollRight && (
                  <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 flex items-center justify-end bg-gradient-to-l from-[#090c12] via-[#090c12]/90 to-transparent pr-1 pl-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        scrollTabs(110);
                      }}
                      className="pointer-events-auto flex size-4 items-center justify-center rounded-full border border-white/15 bg-[#090c12] text-white/70 hover:border-[#00df81]/60 hover:bg-[#00df81]/20 hover:text-[#00df81] transition-all cursor-pointer shadow-lg"
                      aria-label="Scroll right"
                    >
                      <ChevronRight className="size-2.5" />
                    </button>
                  </div>
                )}

                <div
                  ref={tabsContainerRef}
                  onScroll={updateScrollState}
                  onWheel={(e) => {
                    if (e.deltaY !== 0) {
                      e.currentTarget.scrollLeft += e.deltaY;
                    }
                  }}
                  className="flex items-center gap-1 overflow-x-auto px-2 pt-1.5 pb-2 custom-horizontal-scrollbar select-none"
                >
                  {[
                    { id: "all", label: "All", color: "#00df81" },
                    { id: "nvidia", label: "NVIDIA", color: "#76B900", icon: NVIDIA_ICON },
                    { id: "groq", label: "Groq", color: "#F55036", icon: GROQ_ICON },
                    { id: "openai", label: "OpenAI", color: "#10A37F", icon: OPENAI_ICON },
                    { id: "anthropic", label: "Claude", color: "#D97706", icon: ANTHROPIC_ICON },
                    { id: "google", label: "Google", color: "#4285F4", icon: GEMINI_ICON },
                    { id: "deepseek", label: "DeepSeek", color: "#0284c7", icon: DEEPSEEK_ICON },
                    { id: "openrouter", label: "OpenRouter", color: "#6366F1", icon: OPENROUTER_ICON },
                  ].map((tab) => {
                    const isActive = providerTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setProviderTab(tab.id);
                          (e.currentTarget as HTMLElement).scrollIntoView({
                            behavior: "smooth",
                            inline: "nearest",
                            block: "nearest",
                          });
                        }}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9.5px] font-semibold whitespace-nowrap transition-all cursor-pointer leading-none flex-shrink-0",
                          isActive
                            ? "border shadow-[0_0_10px_rgba(0,223,129,0.15)] font-bold"
                            : "border border-white/[0.05] bg-white/[0.02] text-white/55 hover:bg-white/[0.06] hover:text-white"
                        )}
                        style={{
                          borderColor: isActive ? (tab.id === "all" ? "#00df81" : tab.color) : undefined,
                          background: isActive ? `${tab.id === "all" ? "#00df81" : tab.color}20` : undefined,
                          color: isActive ? (tab.id === "all" ? "#00df81" : tab.color) : undefined,
                        }}
                      >
                        {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search Bar */}
              <div className="border-b border-white/[0.06] bg-black/15 p-2">
                <div className="relative flex items-center">
                  <Search className="pointer-events-none absolute left-2.5 size-3.5 text-white/40" />
                  <input
                    type="text"
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Filter by name, tags (e.g. 70b, sonnet, r1)..."
                    className="h-7 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-8 pr-7 text-[11px] text-white placeholder-white/40 outline-none transition-all focus:border-[#00df81]/50 focus:bg-white/[0.07]"
                  />
                  {modelSearch && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setModelSearch("");
                      }}
                      className="absolute right-2 text-white/40 hover:text-white"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Models List */}
              <div className="max-h-[240px] overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                {filteredNormalizedModels.length === 0 ? (
                  <div className="py-8 text-center text-xs text-white/40">
                    No models matching &quot;{modelSearch}&quot;
                  </div>
                ) : (
                  filteredNormalizedModels.map((m) => {
                    const isSelected = m.id === selectedModelId;
                    const provId = m.provider || getProviderForModel(m.id);
                    const provConfig = BYOK_PROVIDERS.find((p) => p.id === provId);

                    return (
                      <DropdownMenuItem
                        key={m.id}
                        onClick={() => handleSelectModel(m)}
                        onSelect={() => handleSelectModel(m)}
                        className={cn(
                          "group/item flex w-full items-center justify-between gap-2 rounded-xl p-2 text-left transition-all cursor-pointer outline-none",
                          isSelected
                            ? "border border-[#00df81]/30 bg-[#00df81]/12 text-[#00df81]"
                            : "border border-transparent hover:border-white/[0.08] hover:bg-white/[0.05] text-white/80 hover:text-white"
                        )}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                          <div className="flex size-6 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/40">
                            {m.icon || getModelIcon(m.id, provId)}
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex items-center gap-1.5 leading-tight">
                              <span className={cn(
                                "truncate font-medium text-xs",
                                isSelected ? "text-[#00df81] font-bold" : "text-white"
                              )}>
                                {m.name}
                              </span>
                              {m.hasCustomKey && (
                                <span
                                  title="Custom BYOK key configured"
                                  className="inline-flex flex-shrink-0 items-center gap-0.5 rounded border border-[#00df81]/30 bg-[#00df81]/15 px-1 py-[0.5px] font-mono text-[7.5px] font-bold text-[#00df81] leading-none"
                                >
                                  <KeyRound className="size-2" />
                                  BYOK
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 leading-none">
                              <span
                                className="text-[8.5px] font-semibold uppercase tracking-wider"
                                style={{ color: provConfig?.color || "#00df81" }}
                              >
                                {provConfig?.name || provId}
                              </span>
                              {m.badge && (
                                <>
                                  <span className="text-white/20 text-[8px]">•</span>
                                  <span className="truncate text-[9px] text-white/45">
                                    {m.badge}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-shrink-0 items-center ml-1">
                          {isSelected ? (
                            <div className="flex size-4 items-center justify-center rounded-full border border-[#00df81]/40 bg-[#00df81]/20 shadow-[0_0_8px_rgba(0,223,129,0.3)]">
                              <Check className="size-2.5 text-[#00df81]" />
                            </div>
                          ) : null}
                        </div>
                      </DropdownMenuItem>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-white/[0.06] bg-black/40 px-3 py-1.5 text-[9.5px] text-white/40">
                <span className="truncate mr-2">
                  Active: <span className="text-[#00df81] font-semibold">{activeModelObj.name}</span>
                </span>
                <span className="flex-shrink-0 text-white/30">Esc to close</span>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>}

          {/* Divider */}
          {showModelSelector && <div className="mx-1 h-3.5 w-px bg-white/10" />}

          {/* Attachment button */}
          {showAttachment && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach context or spec file"
                aria-label="Attach file"
                className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white border border-transparent hover:border-white/10"
              >
                <Paperclip className="size-3.5" />
              </button>
            </>
          )}

          {/* Key shortcut hint */}
          <span className="hidden sm:inline-block font-mono text-[10px] text-white/30 ml-1">
            ↵ to run
          </span>
        </div>

        {/* Right CTA Submit Button */}
        <div className="flex items-center gap-2">
          {compact ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!value.trim() || loading || disabled || submitDisabled}
              className={cn(
                "inline-flex size-7 items-center justify-center rounded-lg font-bold transition-all",
                "bg-[#00df81] text-[#06190e] shadow-[0_0_12px_rgba(0,223,129,0.3)] hover:shadow-[0_0_18px_rgba(0,223,129,0.5)] hover:scale-105 active:scale-95",
                "disabled:opacity-25 disabled:pointer-events-none disabled:shadow-none"
              )}
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!value.trim() || loading || disabled || submitDisabled}
              className={cn(
                "inline-flex h-9 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold transition-all",
                "bg-gradient-to-r from-[#00df81] to-[#00b368] text-[#06190e]",
                "shadow-[0_0_16px_rgba(0,223,129,0.28)] hover:shadow-[0_0_24px_rgba(0,223,129,0.5)] hover:brightness-110 active:scale-[0.98]",
                "disabled:opacity-30 disabled:pointer-events-none disabled:shadow-none font-mono tracking-wide"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{submitLoadingLabel}</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  <span>{submitLabel}</span>
                  <ArrowRight className="size-3.5 ml-0.5 opacity-80" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AIPrompt;
