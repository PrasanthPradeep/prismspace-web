/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
// lib/hooks/useFocusTimer.ts
'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, FocusSession, FocusSettings } from '../db';

const DEFAULT_SETTINGS: FocusSettings = {
  key: 'current',
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  currentPhase: 'focus',
  timeLeft: 25 * 60,
  running: false,
  completedFocusSessionsInCycle: 0,
  taskLabel: '',
  todayDate: new Date().toISOString().slice(0, 10),
  todaySessions: 0,
  todayFocusSeconds: 0
};

export function useFocusTimer() {
  const settings = useLiveQuery(async () => {
    let current = await db.focus_settings.get('current');
    if (!current) {
      await db.focus_settings.put(DEFAULT_SETTINGS);
      current = DEFAULT_SETTINGS;
    }
    
    // Reset daily stats if new day
    const today = new Date().toISOString().slice(0, 10);
    if (current.todayDate !== today) {
      current.todayDate = today;
      current.todaySessions = 0;
      current.todayFocusSeconds = 0;
      await db.focus_settings.update('current', {
        todayDate: today,
        todaySessions: 0,
        todayFocusSeconds: 0
      });
    }
    
    return current;
  });

  const recentSessions = useLiveQuery(() =>
    db.focus_sessions.orderBy('startedAt').reverse().limit(10).toArray()
  );

  const updateSettings = async (updates: Partial<FocusSettings>) => {
    await db.focus_settings.update('current', updates);
  };

  const startTimer = async () => {
    await db.focus_settings.update('current', { running: true });
  };

  const pauseTimer = async () => {
    await db.focus_settings.update('current', { running: false });
  };

  const resetTimer = async (phase?: 'focus' | 'shortBreak' | 'longBreak') => {
    const current = await db.focus_settings.get('current');
    if (!current) return;

    const targetPhase = phase || current.currentPhase;
    let timeLeft = 0;
    
    if (targetPhase === 'focus') timeLeft = current.focusMinutes * 60;
    else if (targetPhase === 'shortBreak') timeLeft = current.shortBreakMinutes * 60;
    else if (targetPhase === 'longBreak') timeLeft = current.longBreakMinutes * 60;

    await db.focus_settings.update('current', {
      currentPhase: targetPhase,
      timeLeft,
      running: false
    });
  };

  const completeSession = async () => {
    const current = await db.focus_settings.get('current');
    if (!current) return;

    // Log completed session
    if (current.currentPhase === 'focus') {
      await db.focus_sessions.add({
        startedAt: Date.now() - (current.focusMinutes * 60 - current.timeLeft) * 1000,
        durationMinutes: current.focusMinutes,
        label: current.taskLabel || 'Focus Session',
        completed: true
      });

      const newCycleCount = current.completedFocusSessionsInCycle + 1;
      const isLongBreak = newCycleCount >= current.sessionsBeforeLongBreak;

      await db.focus_settings.update('current', {
        completedFocusSessionsInCycle: isLongBreak ? 0 : newCycleCount,
        todaySessions: current.todaySessions + 1,
        currentPhase: isLongBreak ? 'longBreak' : 'shortBreak',
        timeLeft: isLongBreak ? current.longBreakMinutes * 60 : current.shortBreakMinutes * 60,
        running: false
      });
    } else {
      // After break, go back to focus
      await db.focus_settings.update('current', {
        currentPhase: 'focus',
        timeLeft: current.focusMinutes * 60,
        running: false
      });
    }
  };

  const tick = async () => {
    const current = await db.focus_settings.get('current');
    if (!current || !current.running) return;

    const newTimeLeft = Math.max(0, current.timeLeft - 1);
    const updates: Partial<FocusSettings> = { timeLeft: newTimeLeft };

    // Track focus time for stats
    if (current.currentPhase === 'focus') {
      updates.todayFocusSeconds = current.todayFocusSeconds + 1;
    }

    await db.focus_settings.update('current', updates);

    // Auto-complete when time runs out
    if (newTimeLeft === 0) {
      await completeSession();
    }
  };

  const skipSession = async () => {
    await completeSession();
  };

  const setTaskLabel = async (label: string) => {
    await db.focus_settings.update('current', { taskLabel: label });
  };

  const getSessionStats = async (days: number = 7) => {
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    const sessions = await db.focus_sessions
      .where('startedAt')
      .above(since)
      .toArray();

    const totalMinutes = sessions.reduce((sum, s) => sum + (s.completed ? s.durationMinutes : 0), 0);
    const completedCount = sessions.filter(s => s.completed).length;

    return {
      totalSessions: sessions.length,
      completedSessions: completedCount,
      totalMinutes,
      averagePerDay: Math.round(totalMinutes / days)
    };
  };

  return {
    settings,
    recentSessions,
    updateSettings,
    startTimer,
    pauseTimer,
    resetTimer,
    completeSession,
    skipSession,
    setTaskLabel,
    tick,
    getSessionStats
  };
}
