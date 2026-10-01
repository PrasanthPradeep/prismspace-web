/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
// lib/db.ts
// Centralized Dexie database for PrismSpace - client-side only
'use client';

import Dexie, { Table } from 'dexie';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Checklist {
  id?: number;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChecklistItem {
  id?: number;
  checklistId: number;
  text: string;
  completed: boolean;
  order: number;
  createdAt: number;
}

export interface FocusSession {
  id?: number;
  startedAt: number;
  durationMinutes: number;
  label: string;
  completed: boolean;
}

export interface FocusSettings {
  key: 'current'; // Single row
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  currentPhase: 'focus' | 'shortBreak' | 'longBreak';
  timeLeft: number;
  running: boolean;
  completedFocusSessionsInCycle: number;
  taskLabel: string;
  todayDate: string; // YYYY-MM-DD for stats reset
  todaySessions: number;
  todayFocusSeconds: number;
}

export interface Bookmark {
  id?: number;
  url: string;
  title: string;
  tags: string[];
  notes: string;
  createdAt: number;
  visitCount: number;
  lastVisitedAt: number | null;
}

export interface Habit {
  id?: number;
  name: string;
  icon: string;
  color: string;
  targetType: 'daily' | 'weekly';
  targetCount: number;
  createdAt: number;
}

export interface HabitLog {
  id?: number;
  habitId: number;
  date: string; // YYYY-MM-DD
  completions: number;
}

export interface RandomPickerHistory {
  id?: number;
  mode: string;
  input: string;
  result: string;
  createdAt: number;
}

export interface RandomPickerSettings {
  mode: string; // Primary key
  inputs: string; // JSON stringified inputs object
}

export interface Shortcut {
  id?: number;
  appName: string;
  category: string;
  action: string;
  keys: string[];
  pinned: boolean;
  custom: boolean;
}

export interface AiToolHistory {
  id?: number;
  toolType: 'writing' | 'language' | 'codeExplain' | 'codeTranslate' | 'decision';
  input: string;
  output: string;
  metadata?: string; // JSON string for tool-specific data
  createdAt: number;
}

export interface AgentChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface AgentChatMessage {
  id?: number;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  agentId?: string;
  status?: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: number;
}

export interface LanguageLearningStats {
  key: string; // 'wordsPracticed', 'sentencesCorrected', 'conversationCount', 'translationCount'
  value: number;
}

export interface AppSettings {
  key: string; // Primary key
  value: string; // JSON stringified value
}

export interface UserProfile {
  key: 'current'; // Single row
  username: string;
  avatar: string; // base64 encoded image or emoji
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredFile {
  key: string;
  blob: Blob;
  mimeType: string;
}

// ============================================================================
// DEXIE DATABASE CLASS
// ============================================================================

export class PrismDatabase extends Dexie {
  checklists!: Table<Checklist, number>;
  checklist_items!: Table<ChecklistItem, number>;
  focus_sessions!: Table<FocusSession, number>;
  focus_settings!: Table<FocusSettings, string>;
  bookmarks!: Table<Bookmark, number>;
  habits!: Table<Habit, number>;
  habit_logs!: Table<HabitLog, number>;
  random_picker_history!: Table<RandomPickerHistory, number>;
  random_picker_settings!: Table<RandomPickerSettings, string>;
  shortcuts!: Table<Shortcut, number>;
  ai_tool_history!: Table<AiToolHistory, number>;
  agent_chat_sessions!: Table<AgentChatSession, string>;
  agent_chat_messages!: Table<AgentChatMessage, number>;
  language_learning_stats!: Table<LanguageLearningStats, string>;
  settings!: Table<AppSettings, string>;
  user_profile!: Table<UserProfile, string>;
  files!: Table<StoredFile, string>;

  constructor() {
    super('PrismDB');
    
    this.version(1).stores({
      checklists: '++id, name, createdAt, updatedAt',
      checklist_items: '++id, checklistId, [checklistId+order], completed, createdAt',
      focus_sessions: '++id, startedAt, completed',
      focus_settings: '&key',
      bookmarks: '++id, url, createdAt, lastVisitedAt, visitCount, *tags',
      habits: '++id, name, createdAt',
      habit_logs: '++id, [habitId+date], habitId, date',
      random_picker_history: '++id, mode, createdAt',
      random_picker_settings: '&mode',
      shortcuts: '++id, appName, category, action, pinned, custom',
      ai_tool_history: '++id, toolType, createdAt',
      language_learning_stats: '&key',
      settings: '&key'
    });

    this.version(2).stores({
      checklists: '++id, name, createdAt, updatedAt',
      checklist_items: '++id, checklistId, [checklistId+order], completed, createdAt',
      focus_sessions: '++id, startedAt, completed',
      focus_settings: '&key',
      bookmarks: '++id, url, createdAt, lastVisitedAt, visitCount, *tags',
      habits: '++id, name, createdAt',
      habit_logs: '++id, [habitId+date], habitId, date',
      random_picker_history: '++id, mode, createdAt',
      random_picker_settings: '&mode',
      shortcuts: '++id, appName, category, action, pinned, custom',
      ai_tool_history: '++id, toolType, createdAt',
      language_learning_stats: '&key',
      settings: '&key',
      user_profile: '&key',
      files: '&key'
    });

    this.version(3).stores({
      checklists: '++id, name, createdAt, updatedAt',
      checklist_items: '++id, checklistId, [checklistId+order], completed, createdAt',
      focus_sessions: '++id, startedAt, completed',
      focus_settings: '&key',
      bookmarks: '++id, url, createdAt, lastVisitedAt, visitCount, *tags',
      habits: '++id, name, createdAt',
      habit_logs: '++id, [habitId+date], habitId, date',
      random_picker_history: '++id, mode, createdAt',
      random_picker_settings: '&mode',
      shortcuts: '++id, appName, category, action, pinned, custom',
      ai_tool_history: '++id, toolType, createdAt',
      agent_chat_sessions: '&id, updatedAt, createdAt',
      agent_chat_messages: '++id, sessionId, [sessionId+createdAt], agentId, role, createdAt',
      language_learning_stats: '&key',
      settings: '&key',
      user_profile: '&key',
      files: '&key'
    });
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const db = new PrismDatabase();

// ============================================================================
// MIGRATION HELPERS - Run once to migrate from localStorage
// ============================================================================

export async function migrateFromLocalStorage() {
  if (typeof window === 'undefined') return;

  // Check if migration already done
  const migrationDone = localStorage.getItem('prism_db_migration_done');
  if (migrationDone === 'true') return;

  try {
    // Migrate Checklists
    const checklistsData = localStorage.getItem('prism.checklists.v1');
    if (checklistsData) {
      const parsed = JSON.parse(checklistsData);
      if (parsed.checklists && Array.isArray(parsed.checklists)) {
        for (const list of parsed.checklists) {
          const checklistId = await db.checklists.add({
            name: list.name,
            createdAt: list.createdAt || Date.now(),
            updatedAt: Date.now()
          });
          
          if (list.items && Array.isArray(list.items)) {
            for (let i = 0; i < list.items.length; i++) {
              await db.checklist_items.add({
                checklistId: checklistId as number,
                text: list.items[i].text,
                completed: list.items[i].checked || false,
                order: i,
                createdAt: Date.now()
              });
            }
          }
        }
      }
    }

    // Migrate Focus Timer
    const focusData = localStorage.getItem('prism.focusTimer.v2');
    if (focusData) {
      const parsed = JSON.parse(focusData);
      await db.focus_settings.put({
        key: 'current',
        focusMinutes: parsed.focusMinutes || 25,
        shortBreakMinutes: parsed.shortBreakMinutes || 5,
        longBreakMinutes: parsed.longBreakMinutes || 15,
        sessionsBeforeLongBreak: parsed.sessionsBeforeLongBreak || 4,
        currentPhase: parsed.currentPhase || 'focus',
        timeLeft: parsed.timeLeft || 1500,
        running: parsed.running || false,
        completedFocusSessionsInCycle: parsed.completedFocusSessionsInCycle || 0,
        taskLabel: parsed.taskLabel || '',
        todayDate: parsed.stats?.date || new Date().toISOString().slice(0, 10),
        todaySessions: parsed.stats?.sessions || 0,
        todayFocusSeconds: parsed.stats?.focusSeconds || 0
      });
    }

    // Migrate Bookmarks
    const bookmarksData = localStorage.getItem('prism.bookmarks.v1');
    if (bookmarksData) {
      const parsed = JSON.parse(bookmarksData);
      if (Array.isArray(parsed)) {
        for (const bookmark of parsed) {
          await db.bookmarks.add({
            url: bookmark.url,
            title: bookmark.title,
            tags: bookmark.tags || [],
            notes: bookmark.notes || '',
            createdAt: bookmark.createdAt || Date.now(),
            visitCount: bookmark.visitCount || 0,
            lastVisitedAt: bookmark.lastVisited || null
          });
        }
      }
    }

    // Migrate Habits
    const habitsData = localStorage.getItem('prism.habits.v1');
    if (habitsData) {
      const parsed = JSON.parse(habitsData);
      if (Array.isArray(parsed)) {
        for (const habit of parsed) {
          const habitId = await db.habits.add({
            name: habit.name,
            icon: habit.icon,
            color: habit.color,
            targetType: habit.targetType || 'daily',
            targetCount: habit.targetCount || 1,
            createdAt: habit.createdAt || Date.now()
          });

          // Migrate habit history to logs
          if (habit.history && typeof habit.history === 'object') {
            for (const [date, completions] of Object.entries(habit.history)) {
              await db.habit_logs.add({
                habitId: habitId as number,
                date,
                completions: completions as number
              });
            }
          }
        }
      }
    }

    // Migrate Random Picker
    const pickerData = localStorage.getItem('prism.randomPicker.v2');
    if (pickerData) {
      const parsed = JSON.parse(pickerData);
      
      // Migrate history
      if (parsed.history && Array.isArray(parsed.history)) {
        for (const entry of parsed.history.slice(0, 30)) {
          await db.random_picker_history.add({
            mode: entry.mode,
            input: '',
            result: entry.result,
            createdAt: entry.at || Date.now()
          });
        }
      }

      // Migrate saved inputs
      if (parsed.inputs) {
        for (const [mode, inputs] of Object.entries(parsed.inputs)) {
          await db.random_picker_settings.put({
            mode,
            inputs: JSON.stringify(inputs)
          });
        }
      }
    }

    // Migrate Shortcuts (pinned ones)
    const shortcutsData = localStorage.getItem('prism.shortcuts.pins.v1');
    if (shortcutsData) {
      const pinned = JSON.parse(shortcutsData);
      // This will be handled by the useShortcuts hook which needs the app data
      await db.settings.put({
        key: 'pinned_shortcuts',
        value: JSON.stringify(pinned)
      });
    }

    // Migrate Language Learning Stats
    const llStats = localStorage.getItem('ll_stats');
    if (llStats) {
      const parsed = JSON.parse(llStats);
      await db.language_learning_stats.put({ key: 'wordsPracticed', value: parsed.w || 0 });
      await db.language_learning_stats.put({ key: 'sentencesCorrected', value: parsed.s || 0 });
      await db.language_learning_stats.put({ key: 'conversationCount', value: parsed.m || 0 });
      await db.language_learning_stats.put({ key: 'translationCount', value: parsed.t || 0 });
    }

    // Mark migration as complete
    localStorage.setItem('prism_db_migration_done', 'true');
    console.log('✅ PrismDB migration from localStorage completed successfully');
  } catch (error) {
    console.error('❌ PrismDB migration failed:', error);
    // Don't mark as done if migration fails, so it can be retried
  }
}

// ============================================================================
// INITIALIZE ON IMPORT (Client-side only)
// ============================================================================

if (typeof window !== 'undefined') {
  // Run migration asynchronously without blocking
  migrateFromLocalStorage().catch(console.error);
}
