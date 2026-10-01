/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookmarkIcon } from './ToolIcons';
import Image from 'next/image';
import { Toolbar as KokonutToolbar, type ToolbarItem } from '@/components/kokonutui/toolbar';
import { Plus, Wand2, FileDown, Code2, RefreshCw } from 'lucide-react';

interface Bookmark {
  id: string;
  url: string;
  title: string;
  tags: string[];
  notes: string;
  createdAt: number;
  lastVisited: number | null;
}

interface BookmarkManagerProps {
  onClose?: () => void;
}

export function BookmarkManager({ onClose }: BookmarkManagerProps) {
  const STORAGE_KEY = 'prism.bookmarks.v1';
  
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [addMessage, setAddMessage] = useState('');
  const [bulkInput, setBulkInput] = useState('');

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setBookmarks(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      setBookmarks([]);
    }
  };

  const saveBookmarks = (newBookmarks: Bookmark[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newBookmarks));
    setBookmarks(newBookmarks);
  };

  const uid = () => Math.random().toString(36).slice(2, 10);

  const normalizeUrl = (rawUrl: string) => {
    try {
      const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : 'https://' + rawUrl);
      parsed.hash = '';
      return parsed.toString();
    } catch {
      return null;
    }
  };

  const titleFromUrl = (url: string) => {
    try {
      const normalized = normalizeUrl(url);
      if (!normalized) return '';
      const parsed = new URL(normalized);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  };

  const addBookmark = () => {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setAddMessage('Invalid URL');
      return;
    }
    
    if (bookmarks.some(b => b.url === normalized)) {
      setAddMessage('Duplicate bookmark');
      return;
    }

    const newTitle = title.trim() || titleFromUrl(normalized);
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    
    const newBookmark: Bookmark = {
      id: uid(),
      url: normalized,
      title: newTitle,
      tags: tagArray,
      notes: notes.trim(),
      createdAt: Date.now(),
      lastVisited: null,
    };

    saveBookmarks([newBookmark, ...bookmarks]);
    setUrl('');
    setTitle('');
    setTags('');
    setNotes('');
    setAddMessage('Bookmark added');
  };

  const bulkAdd = () => {
    const urls = bulkInput.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    let added = 0;
    
    const newBookmarks = [...bookmarks];
    
    urls.forEach(rawUrl => {
      const normalized = normalizeUrl(rawUrl);
      if (normalized && !newBookmarks.some(b => b.url === normalized)) {
        newBookmarks.unshift({
          id: uid(),
          url: normalized,
          title: titleFromUrl(normalized),
          tags: [],
          notes: '',
          createdAt: Date.now(),
          lastVisited: null,
        });
        added++;
      }
    });

    saveBookmarks(newBookmarks);
    setBulkInput('');
    setAddMessage(`Added ${added} bookmark(s)`);
  };

  const openBookmark = (id: string) => {
    const bookmark = bookmarks.find(b => b.id === id);
    if (!bookmark) return;
    
    const updated = bookmarks.map(b => 
      b.id === id ? { ...b, lastVisited: Date.now() } : b
    );
    saveBookmarks(updated);
    window.open(bookmark.url, '_blank', 'noopener');
  };

  const deleteBookmark = (id: string) => {
    saveBookmarks(bookmarks.filter(b => b.id !== id));
  };

  const allTags = () => {
    return [...new Set(bookmarks.flatMap(b => b.tags))].sort((a, b) => a.localeCompare(b));
  };

  const filteredBookmarks = () => {
    return bookmarks.filter(bookmark => {
      const haystack = [
        bookmark.title,
        bookmark.url,
        bookmark.notes,
        ...bookmark.tags
      ].join(' ').toLowerCase();
      
      const matchesSearch = !searchTerm || haystack.includes(searchTerm.toLowerCase());
      const matchesTag = !selectedTag || bookmark.tags.includes(selectedTag);
      
      return matchesSearch && matchesTag;
    });
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(bookmarks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prism-bookmarks.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportHtml = () => {
    const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
${bookmarks.map(b => `<DT><A HREF="${b.url}">${b.title}</A>`).join('\n')}
</DL><p>`;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prism-bookmarks.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFavicon = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return '';
    }
  };

  const toolbarItems: ToolbarItem[] = [
    {
      id: 'add',
      title: 'Add',
      icon: Plus,
      onClick: addBookmark,
    },
    {
      id: 'autofill',
      title: 'Autofill',
      icon: Wand2,
      onClick: () => setTitle(titleFromUrl(url)),
    },
    {
      id: 'export-json',
      title: 'Export JSON',
      icon: FileDown,
      onClick: exportJson,
    },
    {
      id: 'export-html',
      title: 'Export HTML',
      icon: Code2,
      onClick: exportHtml,
    },
    {
      id: 'reset',
      title: 'Reset Search',
      icon: RefreshCw,
      onClick: () => {
        setSearchTerm('');
        setSelectedTag('');
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-radial from-[#173145] via-[#0b0e13] to-[#0b0e13] text-white p-6">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center relative"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 223, 129, 0.15) 0%, rgba(5, 150, 105, 0.08) 100%)',
              border: '1px solid rgba(0, 223, 129, 0.25)',
              boxShadow: '0 0 16px rgba(0, 223, 129, 0.15)',
            }}
          >
            <BookmarkIcon size={26} glow />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Bookmark Manager
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Save, tag, search, import, and export local bookmarks. Works offline.
            </p>
          </div>
        </div>

        {/* KokonutUI Toolbar */}
        <KokonutToolbar
          items={toolbarItems}
          showToggle={false}
          notificationMessage={(item) => `${item.title} activated`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
        {/* Add Bookmark Panel */}
        <section className="bg-[rgba(18,24,33,0.94)] border border-[#283241] rounded-[18px] p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">Add Bookmark</h2>
          
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full bg-black/60 border border-white/10 focus:border-[#00df81] focus:ring-2 focus:ring-[#00df81]/20 outline-none transition-all rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 font-mono"
          />
          
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full bg-black/60 border border-white/10 focus:border-[#00df81] focus:ring-2 focus:ring-[#00df81]/20 outline-none transition-all rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500"
          />
          
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="tags, separated, by commas"
            className="w-full bg-black/60 border border-white/10 focus:border-[#00df81] focus:ring-2 focus:ring-[#00df81]/20 outline-none transition-all rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 font-mono"
          />
          
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes"
            className="w-full bg-black/60 border border-white/10 focus:border-[#00df81] focus:ring-2 focus:ring-[#00df81]/20 outline-none transition-all rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 min-h-[90px] resize-y"
          />
          
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setTitle(titleFromUrl(url))}
              className="bg-[#0f141b] border border-[#283241] rounded-xl px-3 py-2 hover:bg-[#1a2330] transition"
            >
              Autofill title
            </button>
            <button
              onClick={addBookmark}
              className="bg-[rgba(34,197,94,0.14)] border border-[rgba(34,197,94,0.42)] rounded-xl px-3 py-2 hover:bg-[rgba(34,197,94,0.2)] transition"
            >
              Add bookmark
            </button>
          </div>
          
          {addMessage && <p className="text-sm text-slate-400">{addMessage}</p>}
          
          <hr className="border-[#283241]" />
          
          <h3 className="text-lg font-bold">Bulk Import</h3>
          
          <textarea
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            placeholder="Paste one URL per line"
            className="w-full bg-[#0f141b] border border-[#283241] rounded-xl px-3 py-2 text-white min-h-[90px] resize-y"
          />
          
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={bulkAdd}
              className="bg-[#0f141b] border border-[#283241] rounded-xl px-3 py-2 hover:bg-[#1a2330] transition text-sm"
            >
              Bulk add
            </button>
            <button
              onClick={exportJson}
              className="bg-[#0f141b] border border-[#283241] rounded-xl px-3 py-2 hover:bg-[#1a2330] transition text-sm"
            >
              Export JSON
            </button>
            <button
              onClick={exportHtml}
              className="bg-[#0f141b] border border-[#283241] rounded-xl px-3 py-2 hover:bg-[#1a2330] transition text-sm"
            >
              Export HTML
            </button>
          </div>
        </section>

        {/* Bookmarks Display */}
        <section className="bg-[rgba(18,24,33,0.94)] border border-[#283241] rounded-[18px] p-[18px]">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3 mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title, URL, or notes"
              className="w-full bg-[#0f141b] border border-[#283241] rounded-xl px-3 py-2 text-white"
            />
            
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full bg-[#0f141b] border border-[#283241] rounded-xl px-3 py-2 text-white"
            >
              <option value="">All tags</option>
              {allTags().map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          {filteredBookmarks().length === 0 ? (
            <div className="text-center py-10 text-slate-400 border border-dashed border-[#283241] rounded-2xl">
              No bookmarks yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredBookmarks().map(bookmark => {
                  const domain = new URL(bookmark.url).hostname.replace(/^www\./, '');
                  
                  return (
                    <motion.article
                      key={bookmark.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="bg-[#0f141b] border border-[#283241] rounded-2xl p-4 space-y-3 hover:border-[#3a4658] transition"
                    >
                      <div className="grid grid-cols-[40px_1fr_auto] gap-3 items-center">
                        <Image
                          src={getFavicon(bookmark.url)}
                          alt=""
                          width={40}
                          height={40}
                          unoptimized
                          className="w-10 h-10 rounded-xl bg-[#1a2330]"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const div = document.createElement('div');
                            div.className = 'w-10 h-10 rounded-xl bg-[#1a2330] flex items-center justify-center font-bold';
                            div.textContent = bookmark.title.charAt(0).toUpperCase();
                            e.currentTarget.parentElement?.insertBefore(div, e.currentTarget);
                          }}
                        />
                        <div>
                          <strong className="block">{bookmark.title}</strong>
                          <div className="text-sm text-slate-400">{domain}</div>
                        </div>
                        <button
                          onClick={() => openBookmark(bookmark.id)}
                          className="bg-[#0f141b] border border-[#283241] rounded-xl px-3 py-1 text-sm hover:bg-[#1a2330] active:scale-95 transition"
                        >
                          Open
                        </button>
                      </div>
                      
                      <div className="text-sm text-slate-400 break-all">{bookmark.url}</div>
                      
                      <div className="flex flex-wrap gap-2">
                        {bookmark.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 rounded-full bg-[rgba(255,255,255,0.06)] text-xs text-slate-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      <div className="text-sm text-slate-400">
                        {bookmark.notes || 'No notes'}
                      </div>
                      
                      <div className="text-sm text-slate-400">
                        Last visited: {bookmark.lastVisited ? new Date(bookmark.lastVisited).toLocaleString() : 'Never'}
                      </div>
                      
                      <button
                        onClick={() => deleteBookmark(bookmark.id)}
                        className="bg-[#0f141b] border border-[#283241] rounded-xl px-3 py-1 text-sm hover:bg-[rgba(239,68,68,0.12)] hover:border-[rgba(239,68,68,0.4)] active:scale-95 transition"
                      >
                        Delete
                      </button>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
