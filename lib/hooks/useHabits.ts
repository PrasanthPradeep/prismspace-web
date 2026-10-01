/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
// lib/hooks/useHabits.ts
'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, Habit, HabitLog } from '../db';

export function useHabits() {
  const habits = useLiveQuery(() => db.habits.orderBy('createdAt').toArray());

  const addHabit = async (data: {
    name: string;
    icon: string;
    color: string;
    targetType: 'daily' | 'weekly';
    targetCount: number;
  }) => {
    const id = await db.habits.add({
      name: data.name,
      icon: data.icon,
      color: data.color,
      targetType: data.targetType,
      targetCount: data.targetCount,
      createdAt: Date.now()
    });
    return id;
  };

  const updateHabit = async (id: number, updates: Partial<Habit>) => {
    await db.habits.update(id, updates);
  };

  const deleteHabit = async (id: number) => {
    await db.habit_logs.where('habitId').equals(id).delete();
    await db.habits.delete(id);
  };

  const reorderHabits = async (orderedIds: number[]) => {
    // For display order, we could add an 'order' field in a future migration
    // For now, just keep creation order
  };

  const logCompletion = async (habitId: number, date?: string) => {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    
    const existing = await db.habit_logs
      .where('[habitId+date]')
      .equals([habitId, targetDate])
      .first();

    if (existing) {
      await db.habit_logs.update(existing.id!, {
        completions: existing.completions + 1
      });
    } else {
      await db.habit_logs.add({
        habitId,
        date: targetDate,
        completions: 1
      });
    }
  };

  const getCompletionsForDate = async (habitId: number, date: string) => {
    const log = await db.habit_logs
      .where('[habitId+date]')
      .equals([habitId, date])
      .first();
    return log?.completions || 0;
  };

  const getHabitLogs = async (habitId: number, days: number = 30) => {
    const logs = await db.habit_logs
      .where('habitId')
      .equals(habitId)
      .toArray();
    
    return logs.slice(-days);
  };

  const calculateStreak = async (habitId: number) => {
    const habit = await db.habits.get(habitId);
    if (!habit) return { current: 0, best: 0 };

    const logs = await db.habit_logs
      .where('habitId')
      .equals(habitId)
      .toArray();

    const logMap = new Map(logs.map(l => [l.date, l.completions]));

    let current = 0;
    let best = 0;
    let tempStreak = 0;

    if (habit.targetType === 'daily') {
      // Check consecutive days from today backwards
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toISOString().slice(0, 10);
        const completions = logMap.get(dateStr) || 0;

        if (completions >= 1) {
          if (i === current) current++;
          tempStreak++;
          best = Math.max(best, tempStreak);
        } else {
          tempStreak = 0;
        }
      }
    } else {
      // Weekly target: check if each week meets target
      const weeks = new Map<string, number>();
      logs.forEach(log => {
        const weekKey = getWeekKey(new Date(log.date));
        weeks.set(weekKey, (weeks.get(weekKey) || 0) + log.completions);
      });

      const sortedWeeks = Array.from(weeks.entries()).sort((a, b) => b[0].localeCompare(a[0]));
      
      for (let i = 0; i < sortedWeeks.length; i++) {
        if (sortedWeeks[i][1] >= habit.targetCount) {
          if (i === current) current++;
          tempStreak++;
          best = Math.max(best, tempStreak);
        } else {
          tempStreak = 0;
        }
      }
    }

    return { current, best };
  };

  const getCompletionRate = async (habitId: number, days: number = 30) => {
    const habit = await db.habits.get(habitId);
    if (!habit) return 0;

    let hits = 0;
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().slice(0, 10);
      const completions = await getCompletionsForDate(habitId, dateStr);

      if (habit.targetType === 'daily' && completions >= 1) {
        hits++;
      }
    }

    if (habit.targetType === 'weekly') {
      const weeks = Math.ceil(days / 7);
      const logs = await getHabitLogs(habitId, days);
      const weekMap = new Map<string, number>();
      
      logs.forEach(log => {
        const weekKey = getWeekKey(new Date(log.date));
        weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + log.completions);
      });

      hits = Array.from(weekMap.values()).filter(count => count >= habit.targetCount).length;
      return Math.round((hits / weeks) * 100);
    }

    return Math.round((hits / days) * 100);
  };

  const getHeatmapData = async (habitId: number, days: number = 30) => {
    const logs = await db.habit_logs
      .where('habitId')
      .equals(habitId)
      .toArray();

    const logMap = new Map(logs.map(l => [l.date, l.completions]));
    const today = new Date();
    const data: { date: string; completions: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().slice(0, 10);
      data.push({
        date: dateStr,
        completions: logMap.get(dateStr) || 0
      });
    }

    return data;
  };

  return {
    habits,
    addHabit,
    updateHabit,
    deleteHabit,
    reorderHabits,
    logCompletion,
    getCompletionsForDate,
    getHabitLogs,
    calculateStreak,
    getCompletionRate,
    getHeatmapData
  };
}

// Helper function to get week key (Monday-based)
function getWeekKey(date: Date): string {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Make Monday = 0
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}
