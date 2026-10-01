/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import NumberFlow from '@number-flow/react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, Settings2, X, Check } from 'lucide-react';
import { PomodoroIcon } from './ToolIcons';
import { useEffect, useRef, useState } from 'react';
import { getRemainingSeconds, loadPomodoroState, savePomodoroState } from '@/lib/pomodoro-state';

interface PomodoroTimerProps {
  onClose: () => void;
}

// ── Session modes ────────────────────────────────────────────────────────────
const MODES = [
  { id: 'focus',      label: 'Focus',       minutes: 25, kicker: '// DEEP WORK' },
  { id: 'short',      label: 'Short Break', minutes: 5,  kicker: '// SHORT BREAK' },
  { id: 'long',       label: 'Long Break',  minutes: 15, kicker: '// LONG BREAK' },
] as const;

type ModeId = (typeof MODES)[number]['id'];

export function PomodoroTimer({ onClose: _onClose }: PomodoroTimerProps) {
  const [savedTimer] = useState(() => loadPomodoroState());
  const savedModeId = savedTimer?.modeId && MODES.some((mode) => mode.id === savedTimer.modeId)
    ? savedTimer.modeId
    : 'focus';
  const savedCount = savedTimer ? getRemainingSeconds(savedTimer) : 25 * 60;
  const [modeId, setModeId]             = useState<ModeId>(savedModeId);
  const [totalSeconds, setTotalSeconds] = useState(savedTimer?.totalSeconds ?? 25 * 60);
  const [count, setCount]               = useState(savedCount);
  const [isPaused, setIsPaused]         = useState(!(savedTimer?.isRunning && savedCount > 0));
  const [resetTrigger, setResetTrigger] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [draftMinutes, setDraftMinutes] = useState(25);
  const inputRef = useRef<HTMLInputElement>(null);
  const completionNotifiedRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const endsAtRef = useRef<number | null>(savedTimer?.isRunning ? savedTimer.endsAt : null);

  // Countdown
  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => {
      setCount((c) => {
        if (c <= 1) { setIsPaused(true); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isPaused]);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      return;
    }
    setCount(totalSeconds);
    setIsPaused(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetTrigger]);

  useEffect(() => {
    const active = !isPaused && count > 0;
    if (active && !endsAtRef.current) {
      endsAtRef.current = Date.now() + count * 1000;
    }
    if (!active) endsAtRef.current = null;

    const state = {
      modeId,
      totalSeconds,
      remainingSeconds: count,
      isRunning: active,
      endsAt: endsAtRef.current,
    };
    savePomodoroState(state);
    window.dispatchEvent(
      new CustomEvent('prism:pomodoro-state', {
        detail: { active, remainingSeconds: count, endsAt: endsAtRef.current },
      }),
    );
  }, [count, isPaused, modeId, totalSeconds]);

  useEffect(() => {
    if (!isPaused) {
      completionNotifiedRef.current = false;
      return;
    }

    if (count !== 0 || completionNotifiedRef.current) return;

    completionNotifiedRef.current = true;
    window.dispatchEvent(
      new CustomEvent('prism:island-event', {
        detail: {
          title: 'Focus session complete',
          subtitle: 'Pomodoro timer finished',
          duration: 4000,
        },
      }),
    );
  }, [count, isPaused]);


  const handleReset = () => {
    setCount(totalSeconds);
    setIsPaused(true);
    setResetTrigger((p) => p + 1);
  };

  const openSettings = () => {
    setDraftMinutes(Math.round(totalSeconds / 60));
    setShowSettings(true);
    setTimeout(() => inputRef.current?.select(), 80);
  };

  const applySettings = (e?: React.MouseEvent) => {
    e?.preventDefault();
    const mins = Math.max(1, Math.min(99, draftMinutes));
    const matchingMode = MODES.find((m) => m.minutes === mins);
    if (matchingMode) setModeId(matchingMode.id);
    const newTotal = mins * 60;
    const durationChanged = newTotal !== totalSeconds;

    if (durationChanged) {
      setTotalSeconds(newTotal);
      setCount(newTotal);
      setIsPaused(true);
      setResetTrigger((p) => p + 1);
    }

    setShowSettings(false);
  };

  const minutes    = Math.floor(count / 60);
  const seconds    = count % 60;
  const progress   = totalSeconds > 0 ? count / totalSeconds : 1;
  const R          = 130;
  const circumference = 2 * Math.PI * R;
  const dashOffset    = circumference * (1 - progress);
  const isRunning  = !isPaused && count > 0;
  const isDone     = count === 0;
  const currentMode = MODES.find(m => m.id === modeId)!;

  const statusLabel = isDone ? 'COMPLETE' : isRunning ? 'RUNNING' : count === totalSeconds ? 'READY' : 'PAUSED';

  return (
    <div className="pt-root">
      <style>{`
        /* ── PrismSpace Pomodoro Timer ── */
        .pt-root {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 400px;
          background: #090c12;
          background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 24px 24px;
          color: #f1f5f9;
          font-family: 'Space Grotesk', sans-serif;
          overflow: hidden;
          padding: 32px 24px;
        }

        /* Glow bg blob */
        .pt-glow-blob {
          position: absolute;
          width: 340px;
          height: 340px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,223,129,0.06) 0%, transparent 70%);
          pointer-events: none;
          transition: opacity 0.6s ease;
        }

        /* Top bar */
        .pt-topbar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .pt-kicker {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #00df81;
          background: #000;
          padding: 3px 9px 4px;
          border-radius: 4px;
        }

        .pt-close-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s;
        }

        .pt-close-btn:hover {
          background: rgba(244,63,94,0.12);
          border-color: rgba(244,63,94,0.3);
          color: #f43f5e;
        }


        /* Ring stage */
        .pt-ring-stage {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 28px;
        }

        .pt-ring-glow {
          position: absolute;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          pointer-events: none;
          transition: opacity 0.6s ease;
        }

        /* Timer digits */
        .pt-digits-wrap {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .pt-digits {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 68px;
          font-weight: 900;
          letter-spacing: -0.05em;
          line-height: 1;
          color: #ffffff;
          user-select: none;
        }

        .pt-colon {
          opacity: 0.4;
          animation: pt-blink 1s step-end infinite;
        }

        @keyframes pt-blink {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.1; }
        }

        .pt-colon-static {
          opacity: 0.3;
        }

        .pt-status-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          user-select: none;
          transition: color 0.3s ease;
        }

        .pt-status-running { color: #00df81; }
        .pt-status-paused  { color: #64748b; }
        .pt-status-ready   { color: #94a3b8; }
        .pt-status-done    { color: #f59e0b; }

        /* Progress pct */
        .pt-progress-pct {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          color: #475569;
          letter-spacing: 0.05em;
        }

        /* Controls */
        .pt-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .pt-btn-play {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #00df81;
          border: none;
          cursor: pointer;
          color: #000;
          box-shadow: 0 0 20px rgba(0,223,129,0.35);
          transition: all 0.15s ease;
        }

        .pt-btn-play:hover {
          background: #00f590;
          box-shadow: 0 0 30px rgba(0,223,129,0.5);
          transform: scale(1.05);
        }

        .pt-btn-play:active { transform: scale(0.95); }

        .pt-btn-ghost {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(0,223,129,0.06);
          border: 1px solid rgba(0,223,129,0.15);
          color: #00df81;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .pt-btn-ghost:hover {
          background: rgba(0,223,129,0.12);
          border-color: rgba(0,223,129,0.3);
          box-shadow: 0 0 14px rgba(0,223,129,0.2);
        }

        /* Session telemetry row */
        .pt-telemetry-row {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-top: 20px;
          padding: 8px 16px;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 8px;
        }

        .pt-telem-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .pt-telem-val {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          font-weight: 700;
          color: #00df81;
          letter-spacing: 0.02em;
        }

        .pt-telem-key {
          font-family: 'JetBrains Mono', monospace;
          font-size: 8.5px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #475569;
        }

        .pt-telem-divider {
          width: 1px;
          height: 24px;
          background: rgba(255,255,255,0.06);
        }

        /* ── Settings Panel ── */
        .pt-settings-overlay {
          position: fixed;
          inset: 0;
          z-index: 40;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(8px);
        }

        .pt-settings-panel {
          position: fixed;
          z-index: 50;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: min(90vw, 320px);
          background: #090c12;
          background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 24px 24px;
          border: 1px solid rgba(0,223,129,0.2);
          border-radius: 16px;
          box-shadow: 0 30px 70px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,223,129,0.06);
          padding: 22px;
          font-family: 'Space Grotesk', sans-serif;
          color: #f1f5f9;
        }

        .pt-settings-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .pt-settings-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #00df81;
          background: #000;
          padding: 3px 9px 4px;
          border-radius: 4px;
        }

        .pt-settings-section-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: #475569;
          margin-bottom: 8px;
        }

        .pt-duration-input {
          width: 100%;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(0,223,129,0.2);
          border-radius: 10px;
          padding: 10px 14px;
          font-family: 'Space Grotesk', monospace;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: #00df81;
          text-align: center;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          -moz-appearance: textfield;
          margin-bottom: 8px;
        }

        .pt-duration-input:focus {
          border-color: #00df81;
          box-shadow: 0 0 0 3px rgba(0,223,129,0.08);
        }

        .pt-duration-input::-webkit-inner-spin-button,
        .pt-duration-input::-webkit-outer-spin-button { -webkit-appearance: none; }

        .pt-preset-grid {
          display: flex;
          gap: 5px;
          margin-bottom: 18px;
        }

        .pt-preset-btn {
          flex: 1;
          padding: 5px 0;
          border-radius: 7px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.03);
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s;
          letter-spacing: 0.04em;
        }

        .pt-preset-btn.active {
          background: rgba(0,223,129,0.1);
          border-color: rgba(0,223,129,0.3);
          color: #00df81;
        }

        .pt-preset-btn:hover:not(.active) {
          background: rgba(255,255,255,0.06);
          color: #94a3b8;
        }

        .pt-apply-btn {
          width: 100%;
          padding: 12px 16px;
          background: linear-gradient(135deg, #00df81 0%, #00b86b 100%);
          color: #040d08;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 20px rgba(0, 223, 129, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .pt-apply-btn:hover {
          background: linear-gradient(135deg, #10f896 0%, #00df81 100%);
          box-shadow: 0 6px 28px rgba(0, 223, 129, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.5);
          transform: translateY(-1.5px);
        }

        .pt-apply-btn:active {
          transform: translateY(0.5px) scale(0.985);
          box-shadow: 0 2px 10px rgba(0, 223, 129, 0.25);
        }

        @media (prefers-reduced-motion: reduce) {
          .pt-colon { animation: none; }
          .pt-btn-play:hover { transform: none; }
        }
      `}</style>

      {/* Top bar */}
      <div className="pt-topbar">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 223, 129, 0.15) 0%, rgba(16, 185, 129, 0.08) 100%)',
              border: '1px solid rgba(0, 223, 129, 0.25)',
              boxShadow: '0 0 10px rgba(0, 223, 129, 0.15)',
            }}
          >
            <PomodoroIcon size={16} glow />
          </div>
          <span className="pt-kicker">{currentMode.kicker}</span>
        </div>
        <button className="pt-close-btn" onClick={() => setShowSettings(true)} title="Settings">
          <Settings2 size={13} />
        </button>
      </div>

      {/* Ambient glow */}
      <div className="pt-glow-blob" style={{ opacity: isRunning ? 1 : 0.4 }} />

      {/* Ring + digits */}
      <div className="pt-ring-stage">
        {/* Ring glow when running */}
        {isRunning && (
          <div
            className="pt-ring-glow"
            style={{ boxShadow: '0 0 60px rgba(0,223,129,0.15), 0 0 120px rgba(0,223,129,0.06)' }}
          />
        )}

        <svg width="290" height="290" viewBox="0 0 290 290">
          {/* Track */}
          <circle
            cx="145" cy="145" r={R}
            fill="none"
            strokeWidth="3"
            stroke="rgba(0,223,129,0.08)"
          />
          {/* Progress arc */}
          <circle
            cx="145" cy="145" r={R}
            fill="none"
            strokeWidth="3"
            stroke="#00df81"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '145px 145px',
              transition: 'stroke-dashoffset 1s linear',
              filter: isRunning ? 'drop-shadow(0 0 8px rgba(0,223,129,0.7))' : 'none',
            }}
          />
          {/* Tick marks (every 5 min) */}
          {Array.from({ length: 12 }, (_, i) => {
            const angle = (i * 30 - 90) * (Math.PI / 180);
            const inner = R - 8, outer = R + 4;
            return (
              <line
                key={i}
                x1={145 + inner * Math.cos(angle)} y1={145 + inner * Math.sin(angle)}
                x2={145 + outer * Math.cos(angle)} y2={145 + outer * Math.sin(angle)}
                stroke="rgba(0,223,129,0.15)" strokeWidth="1.5"
              />
            );
          })}
        </svg>

        {/* Center content */}
        <div className="pt-digits-wrap">
          <div className="pt-digits">
            <NumberFlow value={minutes} />
            <span className={isRunning ? 'pt-colon' : 'pt-colon-static'}>:</span>
            <NumberFlow value={seconds} format={{ minimumIntegerDigits: 2 }} />
          </div>
          <span className={`pt-status-label pt-status-${isDone ? 'done' : isRunning ? 'running' : count === totalSeconds ? 'ready' : 'paused'}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="pt-controls">
        {/* Reset */}
        <motion.button
          className="pt-btn-ghost"
          aria-label="Reset timer"
          onClick={handleReset}
          whileTap={{ scale: 0.88 }}
        >
          <Plus className="rotate-45" size={16} />
        </motion.button>

        {/* Play / Pause */}
        <motion.button
          className="pt-btn-play"
          aria-label="Play or pause timer"
          onClick={() => setIsPaused(p => !p)}
          whileTap={{ scale: 0.9 }}
        >
          <AnimatePresence initial={false} mode="wait">
            {isPaused ? (
              <motion.svg
                key="play"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.1 }}
                viewBox="0 0 12 14" fill="currentColor" className="h-5 w-5"
              >
                <path d="M0.9375 13.2422C1.25 13.2422 1.51562 13.1172 1.82812 12.9375L10.9375 7.67188C11.5859 7.28906 11.8125 7.03906 11.8125 6.625C11.8125 6.21094 11.5859 5.96094 10.9375 5.58594L1.82812 0.3125C1.51562 0.132812 1.25 0.015625 0.9375 0.015625C0.359375 0.015625 0 0.453125 0 1.13281V12.1172C0 12.7969 0.359375 13.2422 0.9375 13.2422Z" />
              </motion.svg>
            ) : (
              <motion.svg
                key="pause"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.1 }}
                viewBox="0 0 10 13" fill="currentColor" className="h-5 w-5"
              >
                <path d="M1.03906 12.7266H2.82031C3.5 12.7266 3.85938 12.3672 3.85938 11.6797V1.03906C3.85938 0.328125 3.5 0 2.82031 0H1.03906C0.359375 0 0 0.359375 0 1.03906V11.6797C0 12.3672 0.359375 12.7266 1.03906 12.7266ZM6.71875 12.7266H8.49219C9.17969 12.7266 9.53125 12.3672 9.53125 11.6797V1.03906C9.53125 0.328125 9.17969 0 8.49219 0H6.71875C6.03125 0 5.67188 0.359375 5.67188 1.03906V11.6797C5.67188 12.3672 6.03125 12.7266 6.71875 12.7266Z" />
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Settings */}
        <motion.button
          className="pt-btn-ghost"
          aria-label="Edit timer settings"
          onClick={openSettings}
          whileTap={{ scale: 0.88 }}
        >
          <Settings2 size={15} />
        </motion.button>
      </div>

      {/* Telemetry row */}
      <div className="pt-telemetry-row">
        <div className="pt-telem-item">
          <span className="pt-telem-val">{Math.round(totalSeconds / 60)}m</span>
          <span className="pt-telem-key">Duration</span>
        </div>
        <div className="pt-telem-divider" />
        <div className="pt-telem-item">
          <span className="pt-telem-val">{Math.round((1 - progress) * 100)}%</span>
          <span className="pt-telem-key">Elapsed</span>
        </div>
        <div className="pt-telem-divider" />
        <div className="pt-telem-item">
          <span className="pt-telem-val">{Math.floor(count / 60)}m {count % 60}s</span>
          <span className="pt-telem-key">Remaining</span>
        </div>
      </div>

      {/* ── Settings Overlay ── */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              className="pt-settings-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
            />
            <motion.div
              className="pt-settings-panel"
              initial={{ opacity: 0, scale: 0.93, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 12 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="pt-settings-header">
                <span className="pt-settings-title">Timer Config</span>
                <button
                  className="pt-close-btn"
                  onClick={() => setShowSettings(false)}
                  title="Close settings"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Duration */}
              <div style={{ marginBottom: 16 }}>
                <div className="pt-settings-section-label">Duration (minutes)</div>
                <input
                  ref={inputRef}
                  type="number"
                  min={1}
                  max={99}
                  value={draftMinutes}
                  onChange={e => setDraftMinutes(parseInt(e.target.value) || 1)}
                  className="pt-duration-input"
                />
                <div className="pt-preset-grid">
                  {[5, 15, 25, 45, 60].map(m => (
                    <button
                      key={m}
                      className={`pt-preset-btn${draftMinutes === m ? ' active' : ''}`}
                      onClick={() => setDraftMinutes(m)}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode quick-set */}
              <div style={{ marginBottom: 20 }}>
                <div className="pt-settings-section-label">Session Mode</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {MODES.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setDraftMinutes(m.minutes); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: `1px solid ${draftMinutes === m.minutes ? 'rgba(0,223,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        background: draftMinutes === m.minutes ? 'rgba(0,223,129,0.08)' : 'rgba(255,255,255,0.02)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontFamily: 'Space Grotesk', fontSize: 12, fontWeight: 600, color: draftMinutes === m.minutes ? '#f1f5f9' : '#64748b' }}>
                        {m.label}
                      </span>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 700, color: draftMinutes === m.minutes ? '#00df81' : '#475569' }}>
                        {m.minutes}m
                      </span>
                      {draftMinutes === m.minutes && (
                        <Check size={11} style={{ color: '#00df81', marginLeft: 6 }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="pt-apply-btn"
                onClick={applySettings}
              >
                <Check size={14} strokeWidth={2.5} />
                Apply Settings
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
