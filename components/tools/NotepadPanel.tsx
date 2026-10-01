/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NotepadIcon } from './ToolIcons';
import { CosmicButton } from '@/components/ui/cosmic-button';

interface Note {
  id: number;
  title: string;
  content: string;
}

interface NotepadPanelProps {
  onClose: () => void;
}

// ── Inline SVG icons (no extra dep) ──────────────────────────────────────────

const BoldIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
  </svg>
);

const ItalicIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="4" x2="10" y2="4"/>
    <line x1="14" y1="20" x2="5" y2="20"/>
    <line x1="15" y1="4" x2="9" y2="20"/>
  </svg>
);

const ListIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="6" x2="20" y2="6"/>
    <line x1="9" y1="12" x2="20" y2="12"/>
    <line x1="9" y1="18" x2="20" y2="18"/>
    <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/>
    <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="14" height="14" rx="2"/>
    <polyline points="7 12 10 15 14 9"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

// ── NotepadPanel ──────────────────────────────────────────────────────────────

export function NotepadPanel({ onClose }: NotepadPanelProps) {
  const [notes, setNotes] = useState<Note[]>([
    { id: Date.now(), title: 'Your ideas here', content: '' },
  ]);
  const [currentTab, setCurrentTab] = useState(0);
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [saved, setSaved] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Tab renaming state
  const [editingTabIdx, setEditingTabIdx] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const isCommittingRef = useRef(false);

  // Focus and select input text when entering rename mode
  useEffect(() => {
    if (editingTabIdx !== null) {
      const focusAndSelect = () => {
        if (editInputRef.current) {
          editInputRef.current.focus();
          editInputRef.current.select();
        }
      };
      focusAndSelect();
      const raf = requestAnimationFrame(focusAndSelect);
      return () => cancelAnimationFrame(raf);
    }
  }, [editingTabIdx]);

  // Load from localStorage
  useEffect(() => {
    const raw = localStorage.getItem('notepadTabs');
    if (raw) {
      try {
        const loaded: Note[] = JSON.parse(raw);
        if (loaded.length > 0) {
          setNotes(loaded);
          setContent(loaded[0].content);
        }
      } catch {}
    }
  }, []);

  // Stats + auto-save
  useEffect(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    setWordCount(words);
    setCharCount(content.length);
    setSaved(false);

    const timer = setTimeout(() => {
      setNotes((prev) => {
        const next = [...prev];
        if (next[currentTab]) {
          next[currentTab] = { ...next[currentTab], content };
          localStorage.setItem('notepadTabs', JSON.stringify(next));
        }
        return next;
      });
      setSaved(true);
    }, 800);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const switchTab = (index: number) => {
    if (editingTabIdx !== null && editingTabIdx !== index) {
      commitRename(editingTabIdx, editingTitle);
    }
    setNotes((prev) => {
      const next = [...prev];
      if (next[currentTab]) {
        next[currentTab] = { ...next[currentTab], content };
      }
      setCurrentTab(index);
      setContent(next[index]?.content ?? '');
      return next;
    });
  };

  const startEditingTab = (index: number, currentTitle: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (index !== currentTab) {
      switchTab(index);
    }
    setEditingTabIdx(index);
    setEditingTitle(currentTitle);
  };

  const commitRename = (index: number, newTitle: string) => {
    if (isCommittingRef.current) return;
    isCommittingRef.current = true;
    const trimmed = newTitle.trim();
    const finalTitle = trimmed || notes[index]?.title || `Note ${index + 1}`;
    setNotes((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = {
          ...next[index],
          title: finalTitle,
          ...(index === currentTab ? { content } : {}),
        };
        localStorage.setItem('notepadTabs', JSON.stringify(next));
      }
      return next;
    });
    setEditingTabIdx(null);
    setTimeout(() => {
      isCommittingRef.current = false;
    }, 60);
  };

  const cancelRename = () => {
    isCommittingRef.current = true;
    setEditingTabIdx(null);
    setTimeout(() => {
      isCommittingRef.current = false;
    }, 60);
  };

  const addNewTab = () => {
    setEditingTabIdx(null);
    const newNote: Note = {
      id: Date.now(),
      title: `Note ${notes.length + 1}`,
      content: '',
    };
    setNotes((prev) => {
      const next = [...prev, newNote];
      setCurrentTab(next.length - 1);
      setContent('');
      localStorage.setItem('notepadTabs', JSON.stringify(next));
      return next;
    });
  };

  const deleteTab = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (notes.length === 1) return;
    setEditingTabIdx(null);
    setNotes((prev) => {
      const next = prev.filter((_, i) => i !== index);
      localStorage.setItem('notepadTabs', JSON.stringify(next));
      const newIdx = Math.min(currentTab, next.length - 1);
      setCurrentTab(newIdx);
      setContent(next[newIdx]?.content ?? '');
      return next;
    });
  };

  const downloadNote = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${notes[currentTab]?.title ?? 'note'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatText = (format: 'bold' | 'italic' | 'bullet' | 'checkbox') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = content.substring(start, end);

    const map: Record<string, string> = {
      bold: `**${sel}**`,
      italic: `*${sel}*`,
      bullet: `\n• ${sel}`,
      checkbox: `\n☐ ${sel}`,
    };

    const next =
      content.substring(0, start) + map[format] + content.substring(end);
    setContent(next);

    // Restore caret after state update
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + map[format].length;
      ta.setSelectionRange(pos, pos);
    });
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
        @keyframes notepad-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.95); }
        }

        @keyframes notepad-glow-pulse {
          0%, 100% { box-shadow: 0 0 6px rgba(0, 223, 129, 0.4); }
          50% { box-shadow: 0 0 12px rgba(0, 223, 129, 0.7); }
        }

        .notepad-textarea::placeholder {
          color: rgba(255, 255, 255, 0.15);
          letter-spacing: 0.01em;
        }

        .notepad-textarea::-webkit-scrollbar {
          width: 8px;
        }

        .notepad-textarea::-webkit-scrollbar-track {
          background: transparent;
        }

        .notepad-textarea::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
        }

        .notepad-textarea::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 223, 129, 0.2);
        }

        .notepad-btn {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .notepad-btn:active {
          transform: scale(0.96);
        }

        .notepad-tab {
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .notepad-rename-input::selection {
          background: rgba(0, 223, 129, 0.35);
          color: #ffffff;
        }

        .notepad-rename-input:focus {
          border-color: #00df81 !important;
          box-shadow: 0 0 12px rgba(0, 223, 129, 0.4) !important;
        }
      `}</style>

      {/* Top electric mint energy rail */}
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
          {/* Notepad icon with glow */}
          {/* Modern Tool Emblem */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(0, 223, 129, 0.12) 0%, rgba(2, 132, 199, 0.08) 100%)',
              border: '1px solid rgba(0, 223, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              position: 'relative',
              boxShadow: '0 0 12px rgba(0, 223, 129, 0.15)',
            }}
          >
            <NotepadIcon size={20} glow />
            {/* Status pulse dot */}
            <div
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#00df81',
                animation: saved ? 'notepad-glow-pulse 2s infinite ease-in-out' : 'none',
              }}
            />
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
              Notepad
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
              Writing Console
            </div>
          </div>
        </div>

        {/* Right: Stats + Controls */}
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
              <span style={{ color: '#00df81', fontWeight: 700 }}>{wordCount}</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: 10 }}>words</span>
            </div>
            <div style={{ width: 1, height: 12, background: 'rgba(255, 255, 255, 0.08)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 700 }}>{charCount}</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: 10 }}>chars</span>
            </div>
          </div>

          {/* Save status */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 10px',
              borderRadius: 7,
              background: saved ? 'rgba(0, 223, 129, 0.06)' : 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${saved ? 'rgba(0, 223, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)'}`,
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 600,
              color: saved ? '#00df81' : 'rgba(255, 255, 255, 0.3)',
              letterSpacing: '0.05em',
            }}
          >
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: saved ? '#00df81' : 'rgba(255, 255, 255, 0.2)',
                animation: saved ? 'none' : 'notepad-pulse 1.2s infinite',
              }}
            />
            {saved ? 'SAVED' : 'SAVING'}
          </motion.div>

          {/* Download button */}
          <CosmicButton
            as="button"
            onClick={downloadNote}
            title="Download note"
            className="w-[34px] h-[34px] min-w-0 min-h-0 p-0"
          >
            <DownloadIcon />
          </CosmicButton>

          {/* Close button */}
          <button
            onClick={onClose}
            title="Close notepad"
            className="notepad-btn"
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

      {/* ── Toolbar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          background: 'rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Format buttons */}
        {(
          [
            { key: 'bold', label: 'Bold', icon: <BoldIcon /> },
            { key: 'italic', label: 'Italic', icon: <ItalicIcon /> },
            { key: 'bullet', label: 'Bullet list', icon: <ListIcon /> },
            { key: 'checkbox', label: 'Checkbox', icon: <CheckIcon /> },
          ] as const
        ).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => formatText(key)}
            title={label}
            className="notepad-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              height: 32,
              padding: '0 11px',
              borderRadius: 7,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif",
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 223, 129, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(0, 223, 129, 0.25)';
              e.currentTarget.style.color = '#00df81';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)';
            }}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Markdown hint */}
        <div
          style={{
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            color: 'rgba(0, 223, 129, 0.3)',
            letterSpacing: '0.04em',
            fontWeight: 500,
          }}
        >
          MARKDOWN SUPPORTED
        </div>
      </div>

      {/* ── Tabs ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 18px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          background: 'rgba(0, 0, 0, 0.1)',
        }}
      >
        <AnimatePresence mode="popLayout">
          {notes.map((note, idx) => {
            const isActive = idx === currentTab;
            const isEditing = editingTabIdx === idx;
            return (
              <motion.div
                key={note.id}
                role="tab"
                tabIndex={0}
                aria-selected={isActive}
                title={isEditing ? undefined : 'Double-click to rename'}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => {
                  if (!isEditing) {
                    switchTab(idx);
                  }
                }}
                onDoubleClick={(e) => startEditingTab(idx, note.title, e)}
                onKeyDown={(e) => {
                  if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
                    switchTab(idx);
                  }
                }}
                className="notepad-tab"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: isEditing ? '4px 8px' : '7px 13px',
                  borderRadius: 8,
                  border: isActive
                    ? '1px solid rgba(0, 223, 129, 0.25)'
                    : '1px solid rgba(255, 255, 255, 0.06)',
                  background: isActive
                    ? 'rgba(0, 223, 129, 0.08)'
                    : 'rgba(255, 255, 255, 0.02)',
                  color: isActive ? '#00df81' : 'rgba(255, 255, 255, 0.45)',
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 500,
                  cursor: isEditing ? 'default' : 'pointer',
                  whiteSpace: 'nowrap',
                  fontFamily: "'Space Grotesk', sans-serif",
                  flexShrink: 0,
                  letterSpacing: '-0.01em',
                  position: 'relative',
                  userSelect: isEditing ? 'text' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive && !isEditing) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive && !isEditing) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.45)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                  }
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 8,
                      background: 'rgba(0, 223, 129, 0.08)',
                      border: '1px solid rgba(0, 223, 129, 0.25)',
                      zIndex: -1,
                    }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
                {isEditing ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();
                        e.stopPropagation();
                        commitRename(idx, editingTitle);
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        e.stopPropagation();
                        cancelRename();
                      }
                    }}
                    onBlur={() => commitRename(idx, editingTitle)}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={(e) => e.stopPropagation()}
                    maxLength={40}
                    className="notepad-rename-input"
                    style={{
                      background: 'rgba(0, 0, 0, 0.55)',
                      border: '1px solid rgba(0, 223, 129, 0.5)',
                      borderRadius: 5,
                      color: '#00df81',
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "'Space Grotesk', sans-serif",
                      padding: '2px 7px',
                      outline: 'none',
                      minWidth: 70,
                      width: `${Math.max(70, Math.min(200, (editingTitle.length + 1) * 8.5))}px`,
                      boxShadow: '0 0 10px rgba(0, 223, 129, 0.25)',
                      caretColor: '#00df81',
                    }}
                  />
                ) : (
                  <span onDoubleClick={(e) => startEditingTab(idx, note.title, e)}>
                    {note.title}
                  </span>
                )}
                {notes.length > 1 && !isEditing && (
                  <span
                    role="button"
                    title="Close tab"
                    onClick={(e) => deleteTab(idx, e)}
                    onDoubleClick={(e) => e.stopPropagation()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      color: 'rgba(255, 255, 255, 0.25)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      marginLeft: 2,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ff6b6b';
                      e.currentTarget.style.background = 'rgba(255, 60, 60, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.25)';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <CloseIcon />
                  </span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Add new tab */}
        <CosmicButton
          as="button"
          onClick={addNewTab}
          title="New note"
          className="w-8 h-8 min-w-0 min-h-0 p-0"
        >
          <PlusIcon />
        </CosmicButton>

      </div>

      {/* ── Editor area ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '18px',
          overflow: 'hidden',
        }}
      >
        <motion.div
          animate={{
            boxShadow: isFocused 
              ? '0 0 0 1px rgba(0, 223, 129, 0.2), 0 8px 32px rgba(0, 0, 0, 0.4)'
              : '0 0 0 1px rgba(255, 255, 255, 0.05), 0 4px 16px rgba(0, 0, 0, 0.2)',
          }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            flex: 1,
            display: 'flex',
            borderRadius: 12,
            overflow: 'hidden',
            background: 'rgba(0, 0, 0, 0.3)',
          }}
        >
          <textarea
            ref={textareaRef}
            id="noteEditor"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Start writing your thoughts..."
            className="notepad-textarea"
            style={{
              flex: 1,
              width: '100%',
              background: 'transparent',
              border: 'none',
              padding: '22px 24px',
              color: 'rgba(255, 255, 255, 0.92)',
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: 14,
              lineHeight: 1.8,
              resize: 'none',
              outline: 'none',
              caretColor: '#00df81',
            }}
          />
        </motion.div>

        {/* Footer stats */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 10,
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            color: 'rgba(255, 255, 255, 0.2)',
            letterSpacing: '0.04em',
          }}
        >
          <span>
            {content.split('\n').length} {content.split('\n').length === 1 ? 'LINE' : 'LINES'}
          </span>
          <span style={{ color: 'rgba(0, 223, 129, 0.3)' }}>
            AUTO-SAVE ENABLED
          </span>
        </div>
      </div>
    </div>
  );
}
