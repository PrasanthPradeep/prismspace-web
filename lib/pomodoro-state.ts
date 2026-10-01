/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
export const POMODORO_STATE_KEY = 'prism:pomodoro-state';

export interface PomodoroState {
  modeId: 'focus' | 'short' | 'long';
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  endsAt: number | null;
}

export function getRemainingSeconds(state: PomodoroState, now = Date.now()): number {
  if (!state.isRunning || !state.endsAt) return state.remainingSeconds;
  return Math.max(0, Math.ceil((state.endsAt - now) / 1000));
}

export function loadPomodoroState(): PomodoroState | null {
  if (typeof window === 'undefined') return null;

  try {
    const value = sessionStorage.getItem(POMODORO_STATE_KEY);
    if (!value) return null;
    const state = JSON.parse(value) as PomodoroState;
    if (
      !Number.isFinite(state.totalSeconds) ||
      !Number.isFinite(state.remainingSeconds) ||
      typeof state.isRunning !== 'boolean'
    ) {
      return null;
    }

    return {
      ...state,
      remainingSeconds: getRemainingSeconds(state),
      isRunning: state.isRunning && getRemainingSeconds(state) > 0,
      endsAt: getRemainingSeconds(state) > 0 ? state.endsAt : null,
    };
  } catch {
    return null;
  }
}

export function savePomodoroState(state: PomodoroState) {
  sessionStorage.setItem(POMODORO_STATE_KEY, JSON.stringify(state));
}
