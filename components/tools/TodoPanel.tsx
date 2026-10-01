/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CornerDownLeft, Plus } from 'lucide-react';
import { TodoIcon } from './ToolIcons';
import {
  getAllTodos,
  addTodo,
  updateTodo,
  deleteTodo,
  deleteCompletedTodos,
  getTodoStats,
  type Todo,
} from '@/lib/indexeddb/todo-db';

interface TodoPanelProps {
  onClose: () => void;
}

// ── Icons ──────────────────────────────────────────────────────────────────

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const FilterIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
  </svg>
);

// ── TodoPanel ──────────────────────────────────────────────────────────────

type FilterType = 'all' | 'pending' | 'completed';
type PriorityType = 'low' | 'medium' | 'high';

export function TodoPanel({ onClose }: TodoPanelProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedPriority, setSelectedPriority] = useState<PriorityType>('medium');
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, high: 0, medium: 0, low: 0 });
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load todos from IndexedDB
  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      const [allTodos, todoStats] = await Promise.all([
        getAllTodos(),
        getTodoStats(),
      ]);
      setTodos(allTodos);
      setStats(todoStats);
    } catch (error) {
      console.error('Failed to load todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTodo = async () => {
    const text = newTodoText.trim();
    if (!text) return;

    try {
      const newTodo = await addTodo({
        text,
        completed: false,
        priority: selectedPriority,
      });
      setTodos((prev) => [newTodo, ...prev]);
      setStats((prev) => ({
        ...prev,
        total: prev.total + 1,
        pending: prev.pending + 1,
        [selectedPriority]: prev[selectedPriority] + 1,
      }));
      setNewTodoText('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to add todo:', error);
    }
  };

  const handleToggleTodo = async (id: string, completed: boolean) => {
    try {
      await updateTodo(id, { completed: !completed });
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !completed, updatedAt: Date.now() } : t))
      );
      setStats((prev) => ({
        ...prev,
        completed: completed ? prev.completed - 1 : prev.completed + 1,
        pending: completed ? prev.pending + 1 : prev.pending - 1,
      }));
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  };

  const handleDeleteTodo = async (id: string, priority: PriorityType, completed: boolean) => {
    try {
      await deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
      setStats((prev) => ({
        ...prev,
        total: prev.total - 1,
        [completed ? 'completed' : 'pending']: prev[completed ? 'completed' : 'pending'] - 1,
        [priority]: prev[priority] - 1,
      }));
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const handleClearCompleted = async () => {
    try {
      const count = await deleteCompletedTodos();
      if (count > 0) {
        await loadTodos();
      }
    } catch (error) {
      console.error('Failed to clear completed todos:', error);
    }
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === 'completed') return todo.completed;
    if (filter === 'pending') return !todo.completed;
    return true;
  });

  const getPriorityColor = (priority: PriorityType) => {
    switch (priority) {
      case 'high':
        return { bg: 'rgba(248, 113, 113, 0.12)', border: 'rgba(248, 113, 113, 0.3)', text: '#f87171' };
      case 'medium':
        return { bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.3)', text: '#fbbf24' };
      case 'low':
        return { bg: 'rgba(96, 165, 250, 0.12)', border: 'rgba(96, 165, 250, 0.3)', text: '#60a5fa' };
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#090c12',
        color: '#fff',
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes todo-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.95); }
        }

        @keyframes todo-glow-pulse {
          0%, 100% { box-shadow: 0 0 6px rgba(0, 223, 129, 0.4); }
          50% { box-shadow: 0 0 12px rgba(0, 223, 129, 0.7); }
        }

        .todo-input::placeholder {
          color: rgba(255, 255, 255, 0.2);
        }

        .todo-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .todo-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .todo-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
        }

        .todo-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 223, 129, 0.2);
        }

        .todo-btn {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .todo-btn:active {
          transform: scale(0.96);
        }

        .todo-checkbox {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 6px;
          border: 2px solid rgba(255, 255, 255, 0.15);
          background: transparent;
          cursor: pointer;
          position: relative;
          transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.12s ease-out;
          flex-shrink: 0;
        }

        .todo-checkbox:hover {
          border-color: rgba(0, 223, 129, 0.4);
          background: rgba(0, 223, 129, 0.05);
        }

        .todo-checkbox:active {
          transform: scale(0.92);
        }

        .todo-checkbox::after {
          content: '';
          position: absolute;
          left: 5px;
          top: 2px;
          width: 5px;
          height: 9px;
          border: solid #000000;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg) scale(0.4);
          opacity: 0;
          transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1), opacity 120ms ease-out;
        }

        .todo-checkbox:checked {
          background: #00df81;
          border-color: #00df81;
        }

        .todo-checkbox:checked::after {
          transform: rotate(45deg) scale(1);
          opacity: 1;
        }

        @media (prefers-reduced-motion: reduce) {
          .todo-checkbox,
          .todo-checkbox::after {
            transition: none !important;
          }
        }
      `}</style>

      {/* Top energy rail */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(0, 223, 129, 0.4) 50%, transparent 100%)',
          zIndex: 10,
        }}
      />

      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          background: 'rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* Left: Title group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Modern Tool Emblem */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(0, 223, 129, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)',
              border: '1px solid rgba(0, 223, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              position: 'relative',
              boxShadow: '0 0 12px rgba(0, 223, 129, 0.15)',
            }}
          >
            <TodoIcon size={20} glow />
            {/* Pulse dot */}
            {stats.pending > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#fbbf24',
                  animation: 'todo-glow-pulse 2s infinite ease-in-out',
                }}
              />
            )}
          </div>

          {/* Title and subtitle */}
          <div>
            <div style={{ 
              fontSize: 15, 
              fontWeight: 700, 
              color: '#ffffff',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}>
              To-Do List
            </div>
            <div style={{ 
              fontSize: 10, 
              color: 'rgba(0, 223, 129, 0.5)', 
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              marginTop: 2,
            }}>
              Task Manager
            </div>
          </div>
        </div>

        {/* Right: Stats + Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Stats panel */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '6px 12px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#00df81', fontWeight: 700 }}>{stats.completed}</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: 10 }}>done</span>
            </div>
            <div style={{ width: 1, height: 12, background: 'rgba(255, 255, 255, 0.08)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>{stats.pending}</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: 10 }}>left</span>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            title="Close to-do list"
            className="todo-btn"
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'rgba(255, 255, 255, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 60, 60, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(255, 60, 60, 0.3)';
              e.currentTarget.style.color = '#ff6b6b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)';
            }}
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* ── Add new todo input ── */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          background: 'rgba(0, 0, 0, 0.15)',
        }}
      >
        <div className="flex gap-2 mb-3">
          <div
            className="group relative flex items-center flex-1 rounded-xl bg-black/60 border border-white/10 transition-all duration-200 focus-within:border-[#00df81] focus-within:ring-2 focus-within:ring-[#00df81]/20"
            style={{
              boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div className="pl-3.5 pr-2 text-slate-400 group-focus-within:text-[#00df81] transition-colors">
              <Plus size={16} />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTodo();
              }}
              placeholder="Add a new task..."
              className="w-full bg-transparent py-2.5 pr-14 text-xs font-sans text-white placeholder:text-slate-500 outline-none"
            />
            <div className="absolute right-2.5 flex items-center gap-1 pointer-events-none">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-white/5 border border-white/10 flex items-center gap-0.5">
                <CornerDownLeft size={10} />
                <span>↵</span>
              </span>
            </div>
          </div>

          <button
            onClick={handleAddTodo}
            disabled={!newTodoText.trim()}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 flex-shrink-0 ${
              !newTodoText.trim()
                ? 'bg-white/5 border border-white/10 text-slate-600 cursor-not-allowed'
                : 'bg-[#00df81] hover:bg-[#00f59b] text-[#06190e] shadow-[0_0_16px_rgba(0,223,129,0.35)] cursor-pointer'
            }`}
            title="Add task"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Priority selector */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span
            style={{
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
              color: 'rgba(255, 255, 255, 0.3)',
              letterSpacing: '0.05em',
              fontWeight: 600,
            }}
          >
            PRIORITY:
          </span>
          {(['low', 'medium', 'high'] as PriorityType[]).map((p) => {
            const colors = getPriorityColor(p);
            const isSelected = selectedPriority === p;
            return (
              <button
                key={p}
                onClick={() => setSelectedPriority(p)}
                className="todo-btn"
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: isSelected ? colors.bg : 'rgba(255, 255, 255, 0.02)',
                  border: isSelected ? `1px solid ${colors.border}` : '1px solid rgba(255, 255, 255, 0.06)',
                  color: isSelected ? colors.text : 'rgba(255, 255, 255, 0.4)',
                  fontSize: 10,
                  fontWeight: isSelected ? 700 : 600,
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          background: 'rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <FilterIcon />
          {(['all', 'pending', 'completed'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="todo-btn"
              style={{
                padding: '5px 12px',
                borderRadius: 7,
                background: filter === f ? 'rgba(0, 223, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                border: filter === f ? '1px solid rgba(0, 223, 129, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                color: filter === f ? '#00df81' : 'rgba(255, 255, 255, 0.4)',
                fontSize: 11,
                fontWeight: filter === f ? 700 : 600,
                fontFamily: "'Space Grotesk', sans-serif",
                letterSpacing: '-0.01em',
                textTransform: 'capitalize',
                cursor: 'pointer',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {stats.completed > 0 && (
          <button
            onClick={handleClearCompleted}
            className="todo-btn"
            style={{
              padding: '5px 10px',
              borderRadius: 7,
              background: 'rgba(255, 60, 60, 0.08)',
              border: '1px solid rgba(255, 60, 60, 0.2)',
              color: '#ff6b6b',
              fontSize: 10,
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <TrashIcon />
            Clear Completed
          </button>
        )}
      </div>

      {/* ── Todo list ── */}
      <div
        className="todo-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
        }}
      >
        {loading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'rgba(255, 255, 255, 0.3)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
            }}
          >
            Loading tasks...
          </div>
        ) : filteredTodos.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 48, opacity: 0.2 }}>✓</div>
            <div
              style={{
                color: 'rgba(255, 255, 255, 0.3)',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {filter === 'completed' ? 'No completed tasks' : filter === 'pending' ? 'No pending tasks' : 'No tasks yet'}
            </div>
            <div
              style={{
                color: 'rgba(255, 255, 255, 0.2)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
              }}
            >
              {todos.length === 0 ? 'Add your first task above' : 'Try a different filter'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <AnimatePresence mode="popLayout">
              {filteredTodos.map((todo) => {
                const colors = getPriorityColor(todo.priority);
                return (
                  <motion.div
                    key={todo.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      position: 'relative',
                    }}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => handleToggleTodo(todo.id, todo.completed)}
                      className="todo-checkbox"
                    />

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: todo.completed ? 'rgba(255, 255, 255, 0.3)' : '#ffffff',
                          fontSize: 13,
                          fontWeight: 600,
                          fontFamily: "'Space Grotesk', sans-serif",
                          textDecoration: todo.completed ? 'line-through' : 'none',
                          wordBreak: 'break-word',
                          transition: 'color 150ms ease, opacity 150ms ease',
                        }}
                      >
                        {todo.text}
                      </div>
                    </div>

                    {/* Priority badge */}
                    <div
                      style={{
                        padding: '2px 8px',
                        borderRadius: 5,
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                        color: colors.text,
                        fontSize: 9,
                        fontWeight: 700,
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {todo.priority}
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteTodo(todo.id, todo.priority, todo.completed)}
                      className="todo-btn"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        color: 'rgba(255, 255, 255, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 60, 60, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(255, 60, 60, 0.3)';
                        e.currentTarget.style.color = '#ff6b6b';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.3)';
                      }}
                    >
                      <TrashIcon />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Footer stats ── */}
      {todos.length > 0 && (
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.04)',
            background: 'rgba(0, 0, 0, 0.2)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            color: 'rgba(255, 255, 255, 0.3)',
            letterSpacing: '0.04em',
          }}
        >
          <span>
            {filteredTodos.length} {filteredTodos.length === 1 ? 'TASK' : 'TASKS'} SHOWN
          </span>
          <span style={{ color: 'rgba(0, 223, 129, 0.3)' }}>
            STORED IN INDEXEDDB
          </span>
        </div>
      )}
    </div>
  );
}
