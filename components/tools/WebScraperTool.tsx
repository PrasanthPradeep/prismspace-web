/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Globe,
  Sparkles,
  Copy,
  Check,
  Download,
  X,
  FileText,
  Network,
  Code2,
  Table2,
  ClipboardPaste,
  Layers,
  ArrowRight,
  Terminal,
} from 'lucide-react';
import { WebScraperIcon } from './ToolIcons';

interface WebScraperToolProps {
  onClose: () => void;
}

interface ScrapePage {
  url: string;
  title: string;
  description: string;
  content: string;
  markdown: string;
  html: string;
  wordCount: number;
}

interface ScrapeResult {
  baseUrl: string;
  scrapedAt: string;
  totalPages: number;
  pages: ScrapePage[];
}

type Format = 'json' | 'csv';
type Mode = 'single' | 'crawl';

export function WebScraperTool({ onClose }: WebScraperToolProps) {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<Format>('json');
  const [mode, setMode] = useState<Mode>('single');
  const [maxPages, setMaxPages] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [jsonResult, setJsonResult] = useState<ScrapeResult | null>(null);
  const [csvResult, setCsvResult] = useState('');
  const [copied, setCopied] = useState(false);

  const resultText = useMemo(() => {
    if (format === 'csv') return csvResult;
    return jsonResult ? JSON.stringify(jsonResult, null, 2) : '';
  }, [csvResult, format, jsonResult]);

  const scrape = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setJsonResult(null);
    setCsvResult('');

    try {
      const response = await fetch('/api/scrape-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          format,
          mode,
          maxPages: mode === 'crawl' ? maxPages : 1,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? 'Scrape failed.');
      }

      if (format === 'csv') {
        setCsvResult(await response.text());
      } else {
        setJsonResult((await response.json()) as ScrapeResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scrape failed.');
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!resultText) return;

    const type = format === 'csv' ? 'text/csv' : 'application/json';
    const blob = new Blob([resultText], { type });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `scraped-docs.${format}`;
    a.click();
    URL.revokeObjectURL(objectUrl);
  };

  const copy = async () => {
    if (!resultText) return;
    await navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
      }
    } catch {
      // Clipboard access denied or unsupported
    }
  };

  const pageCount = jsonResult?.totalPages ?? (csvResult ? Math.max(csvResult.split('\n').length - 1, 0) : 0);
  const totalWords = jsonResult?.pages?.reduce((s, p) => s + (p.wordCount ?? 0), 0) ?? 0;

  return (
    <div 
      className="flex h-full flex-col text-white select-none overflow-hidden"
      style={{
        background: '#090c12',
        backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px',
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
      }}
    >
      {/* Top energy beam line */}
      <div
        style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(0, 223, 129, 0.5) 50%, transparent 100%)',
          flexShrink: 0,
        }}
      />

      {/* ── Modern Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#090c12]/90 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          {/* Modern Tool Emblem Badge */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center relative transition-transform duration-300 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 223, 129, 0.12) 0%, rgba(6, 182, 212, 0.08) 100%)',
              border: '1px solid rgba(0, 223, 129, 0.25)',
              boxShadow: '0 0 16px rgba(0, 223, 129, 0.15)',
            }}
          >
            <WebScraperIcon size={22} glow />
            {loading && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00df81] opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00df81]" />
              </span>
            )}
          </div>

          <div>
            <h1 className="text-base font-bold text-white tracking-[-0.02em] leading-tight">
              Web Scraper
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Clean markdown, structured JSON, or CSV document extraction
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            title="Close"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.03] hover:bg-rose-500/15 border border-white/[0.08] hover:border-rose-500/40 transition-all duration-200 active:scale-95"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[380px_1fr]">
        {/* Left Panel: Configuration & Controls */}
        <section className="flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-[#090c12]/70 p-6 overflow-y-auto">
          <div className="space-y-5">
            {/* Target URL Input Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 tracking-wide flex items-center gap-1.5">
                  <span>Target URL</span>
                  <span className="text-[#00df81] font-mono text-[10px]">*</span>
                </label>
                <button
                  type="button"
                  onClick={handlePaste}
                  className="text-[11px] text-slate-400 hover:text-[#00df81] flex items-center gap-1 transition-colors"
                >
                  <ClipboardPaste size={12} />
                  <span>Paste URL</span>
                </button>
              </div>

              {/* Developer-grade URL Input Container */}
              <div
                className="group relative flex items-center w-full rounded-xl bg-black/60 border border-white/10 transition-all duration-200 focus-within:border-[#00df81] focus-within:ring-2 focus-within:ring-[#00df81]/20"
                style={{
                  boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.5)',
                }}
              >
                <div className="pl-3.5 pr-2 text-slate-400 group-focus-within:text-[#00df81] transition-colors">
                  <Globe size={16} />
                </div>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && url.trim() && !loading) scrape();
                  }}
                  placeholder="https://docs.example.com/api"
                  className="w-full bg-transparent py-2.5 pr-8 text-xs font-mono text-white placeholder:text-slate-500 outline-none"
                  autoComplete="off"
                  spellCheck="false"
                />
                {url && (
                  <button
                    type="button"
                    onClick={() => setUrl('')}
                    className="absolute right-3 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Clear URL"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Scrape Mode Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 tracking-wide">
                Extraction Mode
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10">
                <button
                  type="button"
                  onClick={() => setMode('single')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                    mode === 'single'
                      ? 'bg-[#00df81]/15 text-[#00df81] border border-[#00df81]/40 shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <FileText size={14} />
                  <span>Single Page</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('crawl')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                    mode === 'crawl'
                      ? 'bg-[#00df81]/15 text-[#00df81] border border-[#00df81]/40 shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Network size={14} />
                  <span>Crawl Linked</span>
                </button>
              </div>
            </div>

            {/* Max Pages Slider (Only in Crawl Mode) */}
            <AnimatePresence>
              {mode === 'crawl' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2 pt-1"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">Crawl Depth</span>
                    <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-[#00df81]/15 text-[#00df81] border border-[#00df81]/30">
                      {maxPages} {maxPages === 1 ? 'page' : 'pages'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={maxPages}
                    onChange={(e) => setMaxPages(Number(e.target.value))}
                    className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-white/10 accent-[#00df81]"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>1 page</span>
                    <span>10 pages</span>
                    <span>20 max</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Output Format Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 tracking-wide">
                Output Format
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/60 border border-white/10">
                <button
                  type="button"
                  onClick={() => setFormat('json')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-mono transition-all ${
                    format === 'json'
                      ? 'bg-[#00df81]/15 text-[#00df81] border border-[#00df81]/40 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Code2 size={14} />
                  <span>JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('csv')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-mono transition-all ${
                    format === 'csv'
                      ? 'bg-[#00df81]/15 text-[#00df81] border border-[#00df81]/40 shadow-sm font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Table2 size={14} />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={scrape}
              disabled={!url.trim() || loading}
              className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-bold tracking-wide transition-all duration-200 active:scale-[0.98] ${
                !url.trim() || loading
                  ? 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
                  : 'bg-[#00df81] hover:bg-[#00f59b] text-[#06190e] shadow-[0_0_24px_rgba(0,223,129,0.35)] hover:shadow-[0_0_32px_rgba(0,223,129,0.55)] cursor-pointer'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-[#06190e] border-t-transparent animate-spin" />
                  <span>Extracting Content...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Extract Data</span>
                  <ArrowRight size={15} className="ml-1 opacity-75" />
                </>
              )}
            </button>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="rounded-xl p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                  <span className="leading-relaxed font-mono">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Telemetry Stats & Bottom Actions */}
          <div className="pt-6 space-y-4">
            {/* Telemetry Metric Cards */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-black/50 border border-white/[0.08]">
              <div className="text-center">
                <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Pages</div>
                <div className="text-base font-bold font-mono text-[#00df81] mt-0.5">{pageCount}</div>
              </div>
              <div className="text-center border-x border-white/10">
                <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Words</div>
                <div className="text-base font-bold font-mono text-white mt-0.5">
                  {totalWords ? totalWords.toLocaleString() : '0'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Format</div>
                <div className="text-base font-bold font-mono text-[#00df81] uppercase mt-0.5">{format}</div>
              </div>
            </div>

            {/* Tactile Modern Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copy}
                disabled={!resultText}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 ${
                  !resultText
                    ? 'bg-white/[0.02] border border-white/[0.06] text-slate-600 cursor-not-allowed'
                    : 'bg-white/[0.05] hover:bg-white/[0.09] border border-white/15 hover:border-white/30 text-slate-200 hover:text-white cursor-pointer'
                }`}
              >
                {copied ? <Check size={14} className="text-[#00df81]" /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy Result'}</span>
              </button>

              <button
                type="button"
                onClick={download}
                disabled={!resultText}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 ${
                  !resultText
                    ? 'bg-white/[0.02] border border-white/[0.06] text-slate-600 cursor-not-allowed'
                    : 'bg-white/[0.05] hover:bg-white/[0.09] border border-white/15 hover:border-[#00df81]/50 text-slate-200 hover:text-white cursor-pointer'
                }`}
              >
                <Download size={14} className="text-[#00df81]" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </section>

        {/* Right Panel: Result Preview Canvas */}
        <section className="flex min-h-0 flex-col p-6 bg-[#06080d]/60">
          {/* Header Bar */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Terminal traffic light dots */}
              <div className="flex items-center gap-1.5 mr-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              </div>
              <span className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-1.5">
                <Terminal size={13} className="text-[#00df81]" />
                <span>scraped-docs.{format}</span>
              </span>
            </div>

            {jsonResult && (
              <span className="truncate text-xs font-mono text-slate-500 max-w-[260px]">
                {jsonResult.baseUrl}
              </span>
            )}
          </div>

          {/* Result Text Content or Modern Empty State */}
          {resultText ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-white/[0.08] bg-black/75 shadow-inner"
            >
              <pre className="h-full overflow-auto p-4 text-xs font-mono leading-relaxed text-slate-300 selection:bg-[#00df81]/30 selection:text-white">
                {resultText}
              </pre>
            </motion.div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/30 p-8 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/[0.03] border border-white/[0.08] mb-4 text-slate-500">
                <Layers size={24} className="text-[#00df81]/70" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">
                Extraction Preview Canvas
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-4 leading-relaxed">
                Paste any documentation, guide, or article URL on the left and click Extract Data to view clean structured data here.
              </p>
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                <span className="px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.08]">Single Page</span>
                <span>or</span>
                <span className="px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.08]">Crawl Entire Site</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
