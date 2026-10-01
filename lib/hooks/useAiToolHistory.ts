/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
// lib/hooks/useAiToolHistory.ts
'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, AiToolHistory } from '../db';

export type AiToolType = 'writing' | 'language' | 'codeExplain' | 'codeTranslate' | 'decision';

export function useAiToolHistory(toolType?: AiToolType) {
  // If toolType provided, filter; otherwise get all
  const history = useLiveQuery(() => {
    if (toolType) {
      return db.ai_tool_history
        .where('toolType')
        .equals(toolType)
        .reverse()
        .limit(50)
        .toArray();
    }
    return db.ai_tool_history.orderBy('createdAt').reverse().limit(50).toArray();
  }, [toolType]);

  const addEntry = async (
    toolType: AiToolType,
    input: string,
    output: string,
    metadata?: Record<string, any>
  ) => {
    const id = await db.ai_tool_history.add({
      toolType,
      input,
      output,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      createdAt: Date.now()
    });

    // Keep only last 100 entries per tool type
    const count = await db.ai_tool_history.where('toolType').equals(toolType).count();
    if (count > 100) {
      const oldest = await db.ai_tool_history
        .where('toolType')
        .equals(toolType)
        .first();
      if (oldest?.id) {
        await db.ai_tool_history.delete(oldest.id);
      }
    }

    return id;
  };

  const getEntry = async (id: number) => {
    return await db.ai_tool_history.get(id);
  };

  const deleteEntry = async (id: number) => {
    await db.ai_tool_history.delete(id);
  };

  const clearHistory = async (toolType?: AiToolType) => {
    if (toolType) {
      await db.ai_tool_history.where('toolType').equals(toolType).delete();
    } else {
      await db.ai_tool_history.clear();
    }
  };

  const searchHistory = (query: string, history: AiToolHistory[] | undefined) => {
    if (!history) return [];
    if (!query.trim()) return history;

    const lowerQuery = query.toLowerCase();
    return history.filter(entry => {
      const searchText = [entry.input, entry.output].join(' ').toLowerCase();
      return searchText.includes(lowerQuery);
    });
  };

  const exportHistory = async (toolType?: AiToolType) => {
    let entries: AiToolHistory[];
    
    if (toolType) {
      entries = await db.ai_tool_history.where('toolType').equals(toolType).toArray();
    } else {
      entries = await db.ai_tool_history.toArray();
    }

    return JSON.stringify(entries, null, 2);
  };

  const getStats = async (toolType: AiToolType) => {
    const entries = await db.ai_tool_history.where('toolType').equals(toolType).toArray();
    
    const totalEntries = entries.length;
    const totalInputChars = entries.reduce((sum, e) => sum + e.input.length, 0);
    const totalOutputChars = entries.reduce((sum, e) => sum + e.output.length, 0);
    const avgInputLength = totalEntries > 0 ? Math.round(totalInputChars / totalEntries) : 0;
    const avgOutputLength = totalEntries > 0 ? Math.round(totalOutputChars / totalEntries) : 0;

    return {
      totalEntries,
      totalInputChars,
      totalOutputChars,
      avgInputLength,
      avgOutputLength
    };
  };

  return {
    history,
    addEntry,
    getEntry,
    deleteEntry,
    clearHistory,
    searchHistory,
    exportHistory,
    getStats
  };
}

// Specialized hooks for each tool type
export function useWritingAssistantHistory() {
  return useAiToolHistory('writing');
}

export function useLanguageLearningHistory() {
  return useAiToolHistory('language');
}

export function useCodeExplainerHistory() {
  return useAiToolHistory('codeExplain');
}

export function useCodeTranslatorHistory() {
  return useAiToolHistory('codeTranslate');
}

export function useDecisionAnalyzerHistory() {
  return useAiToolHistory('decision');
}
