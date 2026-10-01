/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import { useState, useEffect } from 'react';

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface Checklist {
  id: string;
  name: string;
  createdAt: number;
  items: ChecklistItem[];
}

interface ChecklistManagerProps {
  onClose?: () => void;
}

const templates: Record<string, string[]> = {
  'Travel Packing': ['Passport', 'Wallet', 'Phone charger', 'Clothes', 'Toiletries', 'Medications', 'Tickets', 'Headphones'],
  'House Cleaning': ['Make the bed', 'Vacuum floors', 'Clean kitchen counters', 'Take out trash', 'Wipe bathroom mirror', 'Laundry', 'Dust shelves'],
  'Weekly Review': ['Review calendar', 'Capture loose notes', 'Close open loops', 'Plan next week', 'Review goals', 'Clean desktop'],
  'Grocery Basics': ['Milk', 'Eggs', 'Bread', 'Rice', 'Vegetables', 'Fruit', 'Coffee', 'Soap'],
};

export function ChecklistManager({ onClose }: ChecklistManagerProps) {
  const STORAGE_KEY = 'prism.checklists.v1';
  
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [activeChecklistId, setActiveChecklistId] = useState<string | null>(null);
  const [newChecklistName, setNewChecklistName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(Object.keys(templates)[0]);
  const [newItemText, setNewItemText] = useState('');
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.checklists && Array.isArray(parsed.checklists)) {
          setChecklists(parsed.checklists);
          setActiveChecklistId(parsed.activeChecklistId || parsed.checklists[0]?.id || null);
        }
      }
    } catch {}
  };

  const saveState = (lists: Checklist[], activeId: string | null) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      checklists: lists,
      activeChecklistId: activeId,
    }));
    setChecklists(lists);
    setActiveChecklistId(activeId);
  };

  const uid = () => Math.random().toString(36).slice(2, 10);

  const createChecklist = (name: string, items: string[] = []) => {
    const newChecklist: Checklist = {
      id: uid(),
      name,
      createdAt: Date.now(),
      items: items.map((text, index) => ({
        id: uid() + index,
        text,
        checked: false,
      })),
    };
    
    const newLists = [newChecklist, ...checklists];
    saveState(newLists, newChecklist.id);
  };

  const activeChecklist = checklists.find(c => c.id === activeChecklistId) || null;

  const addItem = () => {
    if (!activeChecklist || !newItemText.trim()) return;
    
    const updatedLists = checklists.map(c => {
      if (c.id === activeChecklistId) {
        return {
          ...c,
          items: [...c.items, { id: uid(), text: newItemText.trim(), checked: false }],
        };
      }
      return c;
    });
    
    saveState(updatedLists, activeChecklistId);
    setNewItemText('');
  };

  const toggleItem = (itemId: string) => {
    if (!activeChecklist) return;
    
    const updatedLists = checklists.map(c => {
      if (c.id === activeChecklistId) {
        const updatedItems = c.items.map(item =>
          item.id === itemId ? { ...item, checked: !item.checked } : item
        );
        // Sort: unchecked first, checked last
        updatedItems.sort((a, b) => Number(a.checked) - Number(b.checked));
        return { ...c, items: updatedItems };
      }
      return c;
    });
    
    saveState(updatedLists, activeChecklistId);
  };

  const updateItemText = (itemId: string, text: string) => {
    if (!activeChecklist) return;
    
    const updatedLists = checklists.map(c => {
      if (c.id === activeChecklistId) {
        return {
          ...c,
          items: c.items.map(item =>
            item.id === itemId ? { ...item, text } : item
          ),
        };
      }
      return c;
    });
    
    saveState(updatedLists, activeChecklistId);
  };

  const removeItem = (itemId: string) => {
    if (!activeChecklist) return;
    
    const updatedLists = checklists.map(c => {
      if (c.id === activeChecklistId) {
        return {
          ...c,
          items: c.items.filter(item => item.id !== itemId),
        };
      }
      return c;
    });
    
    saveState(updatedLists, activeChecklistId);
  };

  const deleteChecklist = () => {
    if (!activeChecklistId) return;
    
    const updatedLists = checklists.filter(c => c.id !== activeChecklistId);
    const newActiveId = updatedLists[0]?.id || null;
    saveState(updatedLists, newActiveId);
  };

  const handleDrop = (targetItemId: string) => {
    if (!draggedItemId || !activeChecklist || draggedItemId === targetItemId) return;
    
    const items = [...activeChecklist.items];
    const fromIndex = items.findIndex(item => item.id === draggedItemId);
    const toIndex = items.findIndex(item => item.id === targetItemId);
    
    const [movedItem] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, movedItem);
    
    const updatedLists = checklists.map(c =>
      c.id === activeChecklistId ? { ...c, items } : c
    );
    
    saveState(updatedLists, activeChecklistId);
    setDraggedItemId(null);
  };

  const getProgress = () => {
    if (!activeChecklist) return { completed: 0, total: 0, percent: 0 };
    
    const total = activeChecklist.items.length;
    const completed = activeChecklist.items.filter(item => item.checked).length;
    const percent = total ? (completed / total) * 100 : 0;
    
    return { completed, total, percent };
  };

  const progress = getProgress();

  return (
    <div className="min-h-screen bg-gradient-radial from-[#12202a] via-[#0b0d0f] to-[#0b0d0f] text-white">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] min-h-screen">
        {/* Sidebar */}
        <aside className="bg-[rgba(7,10,13,0.88)] border-r border-[#28313a] p-6">
          <h1 className="text-2xl font-bold mb-2">Checklist Manager</h1>
          <p className="text-sm text-slate-400 mb-4">
            Named checklists, templates, drag-and-drop, and printable pages.
          </p>
          
          <div className="bg-[rgba(18,22,26,0.94)] border border-[#28313a] rounded-2xl p-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newChecklistName}
                onChange={(e) => setNewChecklistName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newChecklistName.trim()) {
                    createChecklist(newChecklistName.trim());
                    setNewChecklistName('');
                  }
                }}
                placeholder="New checklist name"
                className="flex-1 bg-[#0e1317] border border-[#28313a] rounded-lg px-3 py-2 text-white"
              />
              <button
                onClick={() => {
                  if (newChecklistName.trim()) {
                    createChecklist(newChecklistName.trim());
                    setNewChecklistName('');
                  }
                }}
                className="bg-[rgba(34,197,94,0.14)] border border-[rgba(34,197,94,0.45)] rounded-lg px-3 py-2 hover:bg-[rgba(34,197,94,0.2)] transition"
              >
                Create
              </button>
            </div>
            
            <div className="flex gap-2">
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="flex-1 bg-[#0e1317] border border-[#28313a] rounded-lg px-3 py-2 text-white"
              >
                {Object.keys(templates).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (selectedTemplate && templates[selectedTemplate]) {
                    createChecklist(selectedTemplate, templates[selectedTemplate]);
                  }
                }}
                className="bg-[#10171c] border border-[#28313a] rounded-lg px-3 py-2 hover:bg-[#1a2330] transition"
              >
                Use Template
              </button>
            </div>
          </div>
          
          <div className="mt-4 space-y-2">
            {checklists.map(checklist => {
              const done = checklist.items.filter(item => item.checked).length;
              const isActive = checklist.id === activeChecklistId;
              
              return (
                <button
                  key={checklist.id}
                  onClick={() => setActiveChecklistId(checklist.id)}
                  className={`w-full text-left p-3 rounded-xl border transition ${
                    isActive
                      ? 'bg-[rgba(34,197,94,0.08)] border-[rgba(34,197,94,0.45)]'
                      : 'bg-[#0d1217] border-[#28313a] hover:bg-[#10171c]'
                  }`}
                >
                  <strong className="block">{checklist.name}</strong>
                  <div className="text-sm text-slate-400 mt-1">
                    {done}/{checklist.items.length} complete
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Content */}
        <main className="p-6 space-y-5">
          <section className="bg-[rgba(18,22,26,0.94)] border border-[#28313a] rounded-2xl p-4">
            <div className="flex justify-between items-start flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-bold">
                  {activeChecklist ? activeChecklist.name : 'No checklist selected'}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {activeChecklist
                    ? 'Drag to reorder. Checked items automatically move to the bottom.'
                    : 'Create a list or load a template.'}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => window.print()}
                  className="bg-[#10171c] border border-[#28313a] rounded-lg px-3 py-2 hover:bg-[#1a2330] transition"
                >
                  Print
                </button>
                <button
                  onClick={deleteChecklist}
                  className="bg-[rgba(239,68,68,0.12)] border border-[rgba(239,68,68,0.4)] rounded-lg px-3 py-2 hover:bg-[rgba(239,68,68,0.18)] transition"
                >
                  Delete checklist
                </button>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between items-center text-sm text-slate-400 mb-2">
                <span>Progress</span>
                <span>{progress.completed} of {progress.total} done</span>
              </div>
              <div className="h-2.5 rounded-full bg-[#0c1014] border border-[#28313a] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#22c55e] to-[#4ade80] transition-all duration-200"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          </section>

          <section className="bg-[rgba(18,22,26,0.94)] border border-[#28313a] rounded-2xl p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addItem();
                }}
                placeholder="Add an item and press Enter"
                className="flex-1 bg-[#0e1317] border border-[#28313a] rounded-lg px-3 py-2 text-white"
              />
              <button
                onClick={addItem}
                className="bg-[rgba(34,197,94,0.14)] border border-[rgba(34,197,94,0.45)] rounded-lg px-4 py-2 hover:bg-[rgba(34,197,94,0.2)] transition"
              >
                Add Item
              </button>
            </div>
          </section>

          <section className="bg-[rgba(18,22,26,0.94)] border border-[#28313a] rounded-2xl p-4">
            {!activeChecklist || activeChecklist.items.length === 0 ? (
              <div className="text-center py-7 text-slate-400 border border-dashed border-[#28313a] rounded-2xl">
                No items yet. Add one above or load a template.
              </div>
            ) : (
              <ul className="space-y-2">
                {activeChecklist.items.map(item => (
                  <li
                    key={item.id}
                    draggable
                    onDragStart={() => setDraggedItemId(item.id)}
                    onDragEnd={() => setDraggedItemId(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(item.id)}
                    className={`grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center p-3 bg-[#0f1418] border border-[#28313a] rounded-xl cursor-grab ${
                      item.checked ? 'opacity-60' : ''
                    }`}
                  >
                    <span className="text-slate-400 text-lg select-none">::</span>
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => updateItemText(item.id, e.target.value)}
                      className={`bg-transparent border-0 text-white outline-none ${
                        item.checked ? 'line-through text-slate-400' : ''
                      }`}
                    />
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleItem(item.id)}
                      className="w-4 h-4"
                    />
                    <button
                      onClick={() => removeItem(item.id)}
                      className="bg-[#10171c] border border-[#28313a] rounded-lg px-2 py-1 text-sm hover:bg-[rgba(239,68,68,0.12)] hover:border-[rgba(239,68,68,0.4)] transition"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-[rgba(18,22,26,0.94)] border border-[#28313a] rounded-2xl p-4">
            <h3 className="text-lg font-bold mb-3">Template Library</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Object.entries(templates).map(([name, items]) => (
                <div
                  key={name}
                  className="p-4 bg-[#0f1418] border border-[#28313a] rounded-xl space-y-2"
                >
                  <strong className="block">{name}</strong>
                  <div className="text-sm text-slate-400">{items.length} items</div>
                  <button
                    onClick={() => createChecklist(name, items)}
                    className="w-full bg-[#10171c] border border-[#28313a] rounded-lg px-3 py-1 text-sm hover:bg-[#1a2330] transition"
                  >
                    Create checklist
                  </button>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
