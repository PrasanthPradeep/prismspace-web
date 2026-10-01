/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
// lib/hooks/useRandomPickerHistory.ts
'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, RandomPickerHistory, RandomPickerSettings } from '../db';

export type PickerMode = 
  | 'Name Picker'
  | 'Number Generator'
  | 'Coin Flip'
  | 'Dice Roller'
  | 'List Randomizer'
  | 'Yes / No';

export interface NamePickerInputs {
  text: string;
  removePicked: boolean;
}

export interface NumberGeneratorInputs {
  min: number;
  max: number;
  qty: number;
  dupes: boolean;
}

export interface DiceRollerInputs {
  type: string; // 'd6', 'd20', etc.
  count: number;
}

export interface ListRandomizerInputs {
  text: string;
}

export function useRandomPickerHistory() {
  const history = useLiveQuery(() =>
    db.random_picker_history.orderBy('createdAt').reverse().limit(30).toArray()
  );

  const addHistory = async (mode: PickerMode, input: string, result: string) => {
    await db.random_picker_history.add({
      mode,
      input,
      result,
      createdAt: Date.now()
    });

    // Keep only last 30 entries
    const count = await db.random_picker_history.count();
    if (count > 30) {
      const oldest = await db.random_picker_history.orderBy('createdAt').first();
      if (oldest?.id) {
        await db.random_picker_history.delete(oldest.id);
      }
    }
  };

  const clearHistory = async () => {
    await db.random_picker_history.clear();
  };

  const getHistoryByMode = (mode: PickerMode, history: RandomPickerHistory[] | undefined) => {
    if (!history) return [];
    return history.filter(h => h.mode === mode);
  };

  // Settings management
  const getSavedInputs = async (mode: PickerMode) => {
    const settings = await db.random_picker_settings.get(mode);
    if (!settings) return null;
    try {
      return JSON.parse(settings.inputs);
    } catch {
      return null;
    }
  };

  const saveInputs = async (mode: PickerMode, inputs: any) => {
    await db.random_picker_settings.put({
      mode,
      inputs: JSON.stringify(inputs)
    });
  };

  const getNamePickerInputs = async (): Promise<NamePickerInputs> => {
    const saved = await getSavedInputs('Name Picker');
    return saved || { text: 'Alice\nBob\nCharlie', removePicked: true };
  };

  const saveNamePickerInputs = async (inputs: NamePickerInputs) => {
    await saveInputs('Name Picker', inputs);
  };

  const getNumberGeneratorInputs = async (): Promise<NumberGeneratorInputs> => {
    const saved = await getSavedInputs('Number Generator');
    return saved || { min: 1, max: 100, qty: 1, dupes: true };
  };

  const saveNumberGeneratorInputs = async (inputs: NumberGeneratorInputs) => {
    await saveInputs('Number Generator', inputs);
  };

  const getDiceRollerInputs = async (): Promise<DiceRollerInputs> => {
    const saved = await getSavedInputs('Dice Roller');
    return saved || { type: 'd6', count: 2 };
  };

  const saveDiceRollerInputs = async (inputs: DiceRollerInputs) => {
    await saveInputs('Dice Roller', inputs);
  };

  const getListRandomizerInputs = async (): Promise<ListRandomizerInputs> => {
    const saved = await getSavedInputs('List Randomizer');
    return saved || { text: 'Option A\nOption B\nOption C' };
  };

  const saveListRandomizerInputs = async (inputs: ListRandomizerInputs) => {
    await saveInputs('List Randomizer', inputs);
  };

  return {
    history,
    addHistory,
    clearHistory,
    getHistoryByMode,
    getNamePickerInputs,
    saveNamePickerInputs,
    getNumberGeneratorInputs,
    saveNumberGeneratorInputs,
    getDiceRollerInputs,
    saveDiceRollerInputs,
    getListRandomizerInputs,
    saveListRandomizerInputs
  };
}
