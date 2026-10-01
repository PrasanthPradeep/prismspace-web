/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { ModernUserIcon, ModernIconVariant } from './ui/ModernUserIcon';

interface AvatarPickerProps {
  currentAvatar: string;
  onAvatarChange: (avatar: string) => void;
}

export const MODERN_AVATARS: { id: string; name: string; variant: ModernIconVariant; tag: string }[] = [
  { id: 'modern:zenith', name: 'Zenith Minimal', variant: 'zenith', tag: 'Pure Sleek' },
  { id: 'modern:mono', name: 'Mono Contour', variant: 'mono', tag: 'Minimal Line' },
  { id: 'modern:minimal', name: 'Minimal Luxe', variant: 'minimal', tag: 'Platinum' },
  { id: 'modern:cyber', name: 'Cyber Operator', variant: 'cyber', tag: 'Neon Visor' },
  { id: 'modern:prism', name: 'Prism Hologram', variant: 'prism', tag: 'Refraction' },
  { id: 'modern:matrix', name: 'Neural Matrix', variant: 'matrix', tag: 'Digital Wire' },
  { id: 'modern:phantom', name: 'Stealth Obsidian', variant: 'phantom', tag: 'Cyan Glow' },
];

const EMOJI_AVATARS = [
  '😀', '😎', '🤓', '😜', '🤩', '😇', '🥳', '🤗',
  '🚀', '⭐', '🔥', '💎', '🎨', '🎭', '🎮', '🎯',
  '🦄', '🦊', '🐱', '🐶', '🐼', '🐧', '🦁', '🐯',
  '👾', '🤖', '👽', '🌈', '⚡', '💫', '✨', '🌟',
];

export function AvatarPicker({ currentAvatar, onAvatarChange }: AvatarPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const isImage = currentAvatar?.startsWith('data:image/') || currentAvatar?.startsWith('/') || currentAvatar?.startsWith('http');
  const isModern = !currentAvatar || currentAvatar === '👤' || currentAvatar === 'default' || currentAvatar === 'user' || currentAvatar.startsWith('modern:');
  const modernVariant = currentAvatar?.startsWith('modern:') ? currentAvatar.replace('modern:', '') : 'zenith';
  const isEmoji = !isImage && !isModern && (currentAvatar?.length <= 4);

  const [tab, setTab] = useState<'modern' | 'emoji' | 'upload'>(isModern ? 'modern' : isImage ? 'upload' : 'emoji');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('File is too large! Please upload an image smaller than 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onAvatarChange(result);
        setShowPicker(false);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative">
      {/* Avatar Display */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/20 hover:border-[#00df81]/60 transition-all group shadow-lg"
      >
        {isImage ? (
          <Image
            src={currentAvatar}
            alt="Avatar"
            width={96}
            height={96}
            unoptimized
            className="w-full h-full object-cover"
          />
        ) : isModern ? (
          <div className="w-full h-full flex items-center justify-center bg-[#090d16]">
            <ModernUserIcon variant={modernVariant} className="w-full h-full" />
          </div>
        ) : isEmoji ? (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
            {currentAvatar}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#090d16]">
            <ModernUserIcon variant="zenith" className="w-full h-full" />
          </div>
        )}

        {/* Edit Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
          <span className="text-xs font-semibold text-[#00df81] tracking-wide uppercase">Edit</span>
        </div>
      </button>

      {/* Picker Modal */}
      {showPicker && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPicker(false)}
          />

          {/* Picker Content */}
          <div className="absolute left-0 top-28 z-50 w-88 bg-[#090c12] border border-white/10 rounded-xl shadow-2xl p-4 backdrop-blur-xl">
            {/* Tabs */}
            <div className="flex gap-1.5 mb-4 p-1 bg-black/40 rounded-lg border border-white/5">
              <button
                onClick={() => setTab('modern')}
                className={`flex-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  tab === 'modern'
                    ? 'bg-[#00df81]/20 text-[#00df81] border border-[#00df81]/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ✨ Modern
              </button>
              <button
                onClick={() => setTab('emoji')}
                className={`flex-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  tab === 'emoji'
                    ? 'bg-[#00df81]/20 text-[#00df81] border border-[#00df81]/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                😀 Emoji
              </button>
              <button
                onClick={() => setTab('upload')}
                className={`flex-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  tab === 'upload'
                    ? 'bg-[#00df81]/20 text-[#00df81] border border-[#00df81]/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📷 Upload
              </button>
            </div>

            {/* Modern Tab */}
            {tab === 'modern' && (
              <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
                {MODERN_AVATARS.map((item) => {
                  const isSelected =
                    (currentAvatar === item.id) ||
                    (item.id === 'modern:cyber' && (currentAvatar === '👤' || !currentAvatar || currentAvatar === 'default'));

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onAvatarChange(item.id);
                        setShowPicker(false);
                      }}
                      className={`flex items-center gap-3 p-2 rounded-lg text-left transition-all border ${
                        isSelected
                          ? 'bg-[#00df81]/10 border-[#00df81]/50 shadow-[0_0_12px_rgba(0,223,129,0.15)]'
                          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/15'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-[#00df81]/30">
                        <ModernUserIcon variant={item.variant} className="w-full h-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                          <span className="text-[10px] font-mono text-[#00df81] uppercase px-1.5 py-0.5 rounded bg-[#00df81]/10">
                            {item.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">Preset vector icon</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Emoji Grid */}
            {tab === 'emoji' && (
              <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto">
                {EMOJI_AVATARS.map((emoji, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onAvatarChange(emoji);
                      setShowPicker(false);
                    }}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all hover:bg-white/10 ${
                      currentAvatar === emoji ? 'bg-[#00df81]/25 ring-2 ring-[#00df81]' : 'bg-[#0f141b]'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Upload Tab */}
            {tab === 'upload' && (
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-3 bg-[#00df81] hover:bg-[#00f590] text-black font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00df81]/20"
                >
                  <span>📁</span>
                  Choose Image
                </button>
                <p className="text-xs text-slate-400 text-center">
                  Max 5MB • PNG, JPG, GIF
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
