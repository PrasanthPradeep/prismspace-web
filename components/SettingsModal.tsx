/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { ClockStyle } from './Clock';
import { ClockPreview } from './ClockPreview';
import { AvatarPicker } from './AvatarPicker';
import { AppleSwitch } from '@/components/unlumen-ui/apple-switch';
import ExposureSlider from '@/components/ui/smoothui/exposure-slider';
import { db, UserProfile } from '@/lib/db';
import ProfileCard from './ProfileCard';
import { CosmicButton } from '@/components/ui/cosmic-button';
import { getModernIconSvgDataUri } from '@/components/ui/ModernUserIcon';
import { generateLanyardTexture } from '@/lib/generateLanyardTexture';

const Lanyard = dynamic(() => import('@/components/Lanyard'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 580,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: 'linear-gradient(180deg, rgba(13, 21, 32, 0.6) 0%, rgba(5, 7, 10, 0.9) 100%)',
        borderRadius: 20,
      }}
    >
      <div
        style={{
          width: 220,
          height: 330,
          borderRadius: 16,
          border: '1px solid rgba(0, 223, 129, 0.25)',
          background: 'radial-gradient(circle at 50% 20%, rgba(0, 223, 129, 0.08) 0%, rgba(10, 16, 24, 0.7) 70%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          padding: 16,
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid #00df81', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          🔥
        </div>
        <div style={{ width: 100, height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ width: 140, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ width: '85%', height: 36, borderRadius: 8, background: 'rgba(0,223,129,0.08)', marginTop: 8 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,223,129,0.2)', borderTopColor: '#00df81', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#64748b', letterSpacing: '0.05em' }}>
          LOADING 3D BADGE...
        </span>
      </div>
    </div>
  ),
});

type SettingsSection = 'clock' | 'themes' | 'stats' | 'quotes' | 'extras' | 'profile';
type BackgroundMediaType = 'image' | 'video';

interface BackgroundChoice {
  name: string;
  path: string;
  mediaType: BackgroundMediaType;
}

interface StoredBackgroundSetting {
  source: 'static' | 'custom';
  mediaType: BackgroundMediaType;
  path?: string;
  fileKey?: string;
  name?: string;
}

const BACKGROUND_SETTING_KEY = 'selected_background';
const CUSTOM_WALLPAPER_KEY = 'custom-wallpaper';

const clockStyles: { name: string; value: ClockStyle }[] = [
  { name: 'Default', value: 'default' },
  { name: 'Minimal', value: 'minimal' },
  { name: 'Serif', value: 'serif' },
  { name: 'Handwritten', value: 'handwritten' },
  { name: 'Permanent Marker', value: 'minimal-light' },
  { name: 'Serif Condensed', value: 'serif-condensed' },
  { name: 'Bitcount Grid', value: 'bitcount' },
  { name: 'Corpta', value: 'corpta' },
  { name: 'Fenotype Wonder', value: 'fenotype' },
  { name: 'NCL Kemgor', value: 'nclkemgor' },
  { name: 'Westiva', value: 'westiva' },
  { name: 'Ammonite', value: 'ammonite' },
  { name: 'Crude', value: 'crude' },
  { name: 'Zombiess', value: 'zombiess' },
  { name: 'Xolonium', value: 'xolonium' },
  { name: 'Nemoy', value: 'nemoy' },
];

const backgrounds: BackgroundChoice[] = [
  { name: 'Default', path: '/bg.png', mediaType: 'image' },
  { name: 'Animated 1', path: '/images/bg-gifs/1.gif', mediaType: 'image' },
  { name: 'Animated 2', path: '/images/bg-gifs/2.gif', mediaType: 'image' },
  { name: 'Wallpaper 1', path: '/images/Wallpapers/1 (1).jpg', mediaType: 'image' },
  { name: 'Wallpaper 2', path: '/images/Wallpapers/1 (1).png', mediaType: 'image' },
  { name: 'Wallpaper 3', path: '/images/Wallpapers/1 (2).jpg', mediaType: 'image' },
  { name: 'Wallpaper 4', path: '/images/Wallpapers/1 (2).png', mediaType: 'image' },
  { name: 'Wallpaper 5', path: '/images/Wallpapers/1 (3).jpg', mediaType: 'image' },
  { name: 'Wallpaper 6', path: '/images/Wallpapers/1 (3).png', mediaType: 'image' },
  { name: 'Wallpaper 7', path: '/images/Wallpapers/1 (4).png', mediaType: 'image' },
];

function getMediaTypeFromMime(mimeType: string): BackgroundMediaType {
  return mimeType.startsWith('video/') ? 'video' : 'image';
}

function getMediaTypeFromPath(path: string): BackgroundMediaType {
  return /\.(mp4|webm|ogg)$/i.test(path) ? 'video' : 'image';
}

function toSelectedBackground(value: string): StoredBackgroundSetting {
  if (value === 'custom') {
    return {
      source: 'custom',
      mediaType: 'image',
      fileKey: CUSTOM_WALLPAPER_KEY,
    };
  }

  return {
    source: 'static',
    mediaType: getMediaTypeFromPath(value),
    path: value,
  };
}

function getSelectionId(setting: StoredBackgroundSetting | null | undefined) {
  if (!setting) return '/bg.png';
  if (setting.source === 'custom') return 'custom';
  if (setting.path === '/images/BG.png' || setting.path === '/bg.png') return '/bg.png';
  return setting.path || '/bg.png';
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('clock');
  const [clockFormat, setClockFormat] = useState<'12' | '24'>('24');
  const [clockStyle, setClockStyle] = useState<ClockStyle>('default');
  const [clockColor, setClockColor] = useState('#ffffff');
  const [colorHistory, setColorHistory] = useState<string[]>([]);
  const [selectedBg, setSelectedBg] = useState('/bg.png');
  const [customPreviewUrl, setCustomPreviewUrl] = useState<string | null>(null);
  const [customMediaType, setCustomMediaType] = useState<BackgroundMediaType>('image');
  const [dynamicGreetings, setDynamicGreetings] = useState(true);
  const [showGreetings, setShowGreetings] = useState(true);
  const [dynamicIsland, setDynamicIsland] = useState(true);
  const [dynamicIslandSeconds, setDynamicIslandSeconds] = useState(false);
  const [dynamicIslandExpand, setDynamicIslandExpand] = useState(true);
  const [wallpaperOpacity, setWallpaperOpacity] = useState(100);
  const [devtoolsOpacity, setDevtoolsOpacity] = useState(100);

  // Profile states
  const [username, setUsername] = useState('User');
  const [avatar, setAvatar] = useState('modern:cyber');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState('');

  // Profile card extra fields
  const [cardHandle, setCardHandle] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('profile_card_handle') || '' : ''));
  const [cardTitle, setCardTitle] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('profile_card_title') || 'PrismSpace User' : 'PrismSpace User'));
  const [cardTagline, setCardTagline] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('profile_card_tagline') || 'You code it. Now orchestrate.' : 'You code it. Now orchestrate.'));
  const [cardAvatarUrl, setCardAvatarUrl] = useState('');
  const [cardTags, setCardTags] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('profile_card_tags');
        if (stored) return JSON.parse(stored);
      } catch (e) {}
    }
    return ['AI/ML', 'Cybersecurity', 'Full-stack'];
  });
  const [newTagInput, setNewTagInput] = useState('');

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim().replace(/^#/, '');
    if (!trimmed) return;
    if (cardTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) return;
    if (cardTags.length >= 8) return;
    const updated = [...cardTags, trimmed];
    setCardTags(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('profile_card_tags', JSON.stringify(updated));
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = cardTags.filter((t) => t !== tagToRemove);
    setCardTags(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('profile_card_tags', JSON.stringify(updated));
    }
  };

  const lanyardFrontImage = useMemo(() => {
    if (activeSection !== 'profile' || typeof window === 'undefined') return '';
    return generateLanyardTexture({
      name: username,
      title: cardTitle,
      tagline: cardTagline,
      tags: cardTags,
      handle: cardHandle || username.toLowerCase().replace(/\s+/g, ''),
      avatar: cardAvatarUrl || (avatar.startsWith('modern:') || !avatar ? '🔥' : avatar),
    });
  }, [activeSection, username, cardTitle, cardTagline, cardTags, cardHandle, cardAvatarUrl, avatar]);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [activeSection]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isEditingUsername) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isEditingUsername]);

  useEffect(() => {
    return () => {
      if (customPreviewUrl) URL.revokeObjectURL(customPreviewUrl);
    };
  }, [customPreviewUrl]);

  useEffect(() => {
    // Load saved settings
    const savedFormat = (localStorage.getItem('clockFormat') || '24') as '12' | '24';
    const savedStyle = (localStorage.getItem('clockStyle') || 'default') as ClockStyle;
    const savedColor = localStorage.getItem('clockColor') || '#ffffff';
    const savedHistory = JSON.parse(localStorage.getItem('colorHistory') || '[]');
    const savedDynamicGreetings = localStorage.getItem('dynamicGreetings') !== 'false';
    const savedShowGreetings = localStorage.getItem('showGreetings') !== 'false';

    setClockFormat(savedFormat);
    setClockStyle(savedStyle);
    setClockColor(savedColor);
    setColorHistory(savedHistory);
    setDynamicGreetings(savedDynamicGreetings);
    setShowGreetings(savedShowGreetings);
    setDynamicIsland(localStorage.getItem('dynamicIsland') !== 'false');
    setDynamicIslandSeconds(localStorage.getItem('dynamicIslandSeconds') === 'true');
    setDynamicIslandExpand(localStorage.getItem('dynamicIslandExpand') !== 'false');
    const savedOpacity = localStorage.getItem('wallpaper_opacity');
    if (savedOpacity !== null) {
      setWallpaperOpacity(Math.max(0, Math.min(100, Number(savedOpacity))));
    }
    const savedDevtoolsOpacity = localStorage.getItem('devtools_opacity');
    if (savedDevtoolsOpacity !== null) {
      setDevtoolsOpacity(Math.max(10, Math.min(100, Number(savedDevtoolsOpacity))));
    }

    // Load user profile
    const loadProfile = async () => {
      try {
        const profile = await db.user_profile.get('current');
        if (profile) {
          setUsername(profile.username);
          setAvatar(profile.avatar === '👤' ? 'modern:cyber' : profile.avatar);
        } else {
          // Create default profile
          const now = new Date();
          await db.user_profile.put({
            key: 'current',
            username: 'User',
            avatar: 'modern:cyber',
            createdAt: now,
            updatedAt: now,
          });
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    };

    loadProfile();

    let isMounted = true;
    let previewUrl: string | null = null;

    const loadBackgroundSetting = async () => {
      try {
        const savedSetting = await db.settings.get(BACKGROUND_SETTING_KEY);
        const parsedSetting = savedSetting
          ? (JSON.parse(savedSetting.value) as StoredBackgroundSetting)
          : null;
        const legacyBg = localStorage.getItem('selectedBackground');
        const nextSetting = parsedSetting || toSelectedBackground(legacyBg || '/bg.png');

        if (!parsedSetting && legacyBg) {
          await db.settings.put({
            key: BACKGROUND_SETTING_KEY,
            value: JSON.stringify(nextSetting),
          });
        }

        if (nextSetting.source === 'custom') {
          const file = await db.files.get(nextSetting.fileKey || CUSTOM_WALLPAPER_KEY);
          if (file?.blob) {
            previewUrl = URL.createObjectURL(file.blob);
            if (isMounted) {
              setCustomPreviewUrl(previewUrl);
              setCustomMediaType(getMediaTypeFromMime(file.mimeType));
            }
          }
        }

        if (isMounted) {
          setSelectedBg(getSelectionId(nextSetting));
        }
      } catch (err) {
        console.error('Failed to load background setting:', err);
      }
    };

    loadBackgroundSetting();

    return () => {
      isMounted = false;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, []);

  const handleFormatChange = (format: '12' | '24') => {
    setClockFormat(format);
    localStorage.setItem('clockFormat', format);
    window.location.reload();
  };

  const handleStyleChange = (style: ClockStyle) => {
    setClockStyle(style);
    localStorage.setItem('clockStyle', style);
    window.location.reload();
  };

  const handleColorChange = (color: string) => {
    setClockColor(color);
    localStorage.setItem('clockColor', color);

    // Add to history
    const newHistory = [color, ...colorHistory.filter(c => c !== color)].slice(0, 10);
    setColorHistory(newHistory);
    localStorage.setItem('colorHistory', JSON.stringify(newHistory));

    window.location.reload();
  };

  const clearColorHistory = () => {
    setColorHistory([]);
    localStorage.removeItem('colorHistory');
  };

  const handleWallpaperOpacityChange = (val: number) => {
    setWallpaperOpacity(val);
    localStorage.setItem('wallpaper_opacity', val.toString());
    window.dispatchEvent(new CustomEvent('prism:background-change'));
  };

  const handleDevtoolsOpacityChange = (val: number) => {
    setDevtoolsOpacity(val);
    localStorage.setItem('devtools_opacity', val.toString());
    window.dispatchEvent(new CustomEvent('prism:devtools-opacity-change'));
  };

  const handleBackgroundChange = async (bgPath: string) => {
    const background = backgrounds.find((item) => item.path === bgPath);
    const setting: StoredBackgroundSetting = background
      ? {
        source: 'static',
        mediaType: background.mediaType,
        path: background.path,
        name: background.name,
      }
      : toSelectedBackground(bgPath);

    setSelectedBg(getSelectionId(setting));
    localStorage.setItem('selectedBackground', bgPath);
    await db.settings.put({
      key: BACKGROUND_SETTING_KEY,
      value: JSON.stringify(setting),
    });
    window.dispatchEvent(new CustomEvent('prism:background-change'));
  };

  const handleCustomBackgroundSelect = async () => {
    const file = await db.files.get(CUSTOM_WALLPAPER_KEY);
    if (!file?.blob) return;

    const setting: StoredBackgroundSetting = {
      source: 'custom',
      mediaType: getMediaTypeFromMime(file.mimeType),
      fileKey: CUSTOM_WALLPAPER_KEY,
    };

    setSelectedBg('custom');
    localStorage.setItem('selectedBackground', 'custom');
    setCustomMediaType(setting.mediaType);
    await db.settings.put({
      key: BACKGROUND_SETTING_KEY,
      value: JSON.stringify(setting),
    });
    window.dispatchEvent(new CustomEvent('prism:background-change'));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        alert('Please upload an image, GIF, or video file.');
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        alert("File is too large! Please upload a file smaller than 50MB.");
        return;
      }

      try {
        await db.files.put({
          key: CUSTOM_WALLPAPER_KEY,
          blob: file,
          mimeType: file.type
        });
        await db.settings.put({
          key: BACKGROUND_SETTING_KEY,
          value: JSON.stringify({
            source: 'custom',
            mediaType: getMediaTypeFromMime(file.type),
            fileKey: CUSTOM_WALLPAPER_KEY,
            name: file.name,
          } satisfies StoredBackgroundSetting),
        });

        localStorage.setItem('selectedBackground', 'custom');
        if (customPreviewUrl) URL.revokeObjectURL(customPreviewUrl);
        setCustomPreviewUrl(URL.createObjectURL(file));
        setCustomMediaType(getMediaTypeFromMime(file.type));
        setSelectedBg('custom');
        window.dispatchEvent(new CustomEvent('prism:background-change'));
      } catch (err) {
        console.error('Failed to save custom wallpaper:', err);
        alert('Failed to save custom wallpaper.');
      }
    }
  };

  const navItems: { id: SettingsSection; icon: string; label: string }[] = [
    { id: 'clock', icon: '🕐', label: 'Clock' },
    { id: 'themes', icon: '🎨', label: 'Themes' },
    { id: 'stats', icon: '📊', label: 'Stats' },
    { id: 'quotes', icon: '💬', label: 'Quotes' },
    { id: 'extras', icon: '⚡', label: 'Extras' },
    { id: 'profile', icon: '👤', label: 'Profile' },
  ];

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(16px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{`
        /* ── PrismSpace Settings Modal Design System ── */
        .sm-root {
          display: flex;
          width: 100%;
          max-width: 1100px;
          max-height: 90vh;
          border-radius: 20px;
          overflow: hidden;
          background: #090c12;
          background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 24px 24px;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,223,129,0.08);
          font-family: 'Space Grotesk', sans-serif;
          color: #f1f5f9;
        }

        /* Sidebar */
        .sm-sidebar {
          width: 220px;
          flex-shrink: 0;
          background: rgba(0,0,0,0.5);
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          padding: 24px 14px;
          overflow-y: auto;
        }

        .sm-logo-wrap {
          padding: 0 6px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .sm-logo-version {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: #00df81;
          background: rgba(0, 223, 129, 0.08);
          border: 1px solid rgba(0, 223, 129, 0.22);
          padding: 2px 6px;
          border-radius: 4px;
          line-height: 1.2;
          flex-shrink: 0;
        }

        .sm-nav-section-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: #475569;
          padding: 0 10px;
          margin-bottom: 6px;
          margin-top: 4px;
        }

        .sm-nav-btn {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          text-align: left;
          font-family: 'Space Grotesk', sans-serif;
          margin-bottom: 2px;
          outline: none;
        }

        .sm-nav-btn:hover:not(.active) {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.06);
        }

        .sm-nav-pill {
          position: absolute;
          inset: 0;
          border-radius: 8px;
          background: rgba(0,223,129,0.08);
          border: 1px solid rgba(0,223,129,0.25);
          pointer-events: none;
          z-index: 0;
          box-shadow: 0 0 16px rgba(0, 223, 129, 0.08);
        }

        .sm-nav-icon {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 6px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
          color: #64748b;
          transition: all 0.2s ease;
        }

        .sm-nav-btn.active .sm-nav-icon {
          background: rgba(0,223,129,0.12);
          border-color: rgba(0,223,129,0.3);
          color: #00df81;
        }

        .sm-nav-label {
          position: relative;
          z-index: 1;
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          transition: color 0.2s ease;
        }

        .sm-nav-btn.active .sm-nav-label {
          color: #f1f5f9;
        }

        .sm-nav-btn:hover:not(.active) .sm-nav-label {
          color: #cbd5e1;
        }

        .sm-nav-indicator {
          position: relative;
          z-index: 1;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #00df81;
          margin-left: auto;
          box-shadow: 0 0 6px #00df81;
          flex-shrink: 0;
        }

        /* Content Area */
        .sm-content {
          flex: 1;
          overflow-y: auto;
          padding: 32px 36px;
          position: relative;
          min-width: 0;
        }

        .sm-content::-webkit-scrollbar { width: 5px; }
        .sm-content::-webkit-scrollbar-track { background: transparent; }
        .sm-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 3px; }
        .sm-content::-webkit-scrollbar-thumb:hover { background: rgba(0,223,129,0.3); }

        /* Section Headers */
        .sm-section-kicker {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: #00df81;
          background: #000;
          padding: 3px 10px 4px;
          border-radius: 4px;
          margin-bottom: 12px;
        }

        .sm-section-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #ffffff;
          line-height: 1.1;
          margin-bottom: 6px;
        }

        .sm-section-desc {
          font-size: 13px;
          font-weight: 400;
          color: #64748b;
          margin-bottom: 28px;
          line-height: 1.5;
        }

        /* Cards / Panels */
        .sm-panel {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          padding: 20px;
          transition: border-color 0.15s;
        }

        .sm-panel-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #94a3b8;
          margin-bottom: 16px;
        }

        /* Toggle Rows */
        .sm-toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-radius: 10px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          transition: all 0.15s ease;
        }

        .sm-toggle-row:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.09);
        }

        .sm-toggle-label {
          font-size: 13px;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 2px;
        }

        .sm-toggle-desc {
          font-size: 11.5px;
          color: #64748b;
          line-height: 1.4;
        }

        /* Format / Selector Cards */
        .sm-format-card {
          flex: 1;
          padding: 20px;
          border-radius: 12px;
          border: 2px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.02);
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .sm-format-card:hover {
          border-color: rgba(0,223,129,0.3);
          background: rgba(0,223,129,0.04);
        }

        .sm-format-card.selected {
          border-color: #00df81;
          background: rgba(0,223,129,0.08);
          box-shadow: 0 0 24px rgba(0,223,129,0.15);
        }

        .sm-format-time {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 36px;
          font-weight: 800;
          letter-spacing: -0.04em;
          color: #ffffff;
          margin-bottom: 6px;
          line-height: 1;
        }

        .sm-format-card.selected .sm-format-time {
          color: #00df81;
        }

        .sm-format-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }

        .sm-format-card.selected .sm-format-label {
          color: #00df81;
        }

        .sm-format-check {
          float: right;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #00df81;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: -4px;
        }

        /* Color input */
        .sm-color-input-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
        }

        .sm-color-swatch {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          padding: 0;
          background: transparent;
          flex-shrink: 0;
        }

        .sm-color-text-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          font-weight: 600;
          color: #f1f5f9;
          letter-spacing: 0.04em;
        }

        .sm-color-reset-btn {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #64748b;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 6px;
          padding: 5px 10px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .sm-color-reset-btn:hover {
          color: #f1f5f9;
          border-color: rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.07);
        }

        .sm-history-swatch {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 2px solid rgba(255,255,255,0.1);
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        .sm-history-swatch:hover {
          border-color: rgba(0,223,129,0.5);
          transform: scale(1.1);
          box-shadow: 0 0 12px rgba(0,223,129,0.25);
        }

        /* Clock style grid */
        .sm-clock-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .sm-clock-card {
          position: relative;
          overflow: hidden;
          border-radius: 14px;
          aspect-ratio: 16/11;
          cursor: pointer;
          border: 2px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.02);
          transition: all 0.2s ease;
        }

        .sm-clock-card:hover {
          border-color: rgba(255,255,255,0.2);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }

        .sm-clock-card.selected {
          border-color: #00df81;
          box-shadow: 0 0 32px rgba(0,223,129,0.2);
        }

        .sm-clock-card-label {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 10px 12px;
          backdrop-filter: blur(12px);
          background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: #94a3b8;
        }

        .sm-clock-card.selected .sm-clock-card-label {
          color: #00df81;
          background: linear-gradient(to top, rgba(0,223,129,0.15), transparent);
        }

        .sm-clock-card-check {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #00df81;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 10px rgba(0,223,129,0.5);
        }

        /* Background grid */
        .sm-bg-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }

        .sm-bg-thumb {
          aspect-ratio: 16/9;
          border-radius: 10px;
          overflow: hidden;
          border: 2px solid rgba(255,255,255,0.08);
          cursor: pointer;
          transition: all 0.18s ease;
          position: relative;
        }

        .sm-bg-thumb:hover {
          border-color: rgba(255,255,255,0.25);
          transform: scale(1.02);
        }

        .sm-bg-thumb.selected {
          border-color: #00df81;
          box-shadow: 0 0 16px rgba(0,223,129,0.35);
        }

        .sm-bg-custom-label {
          position: absolute;
          top: 6px;
          left: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 8.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #00df81;
          background: rgba(0,0,0,0.7);
          border: 1px solid rgba(0,223,129,0.3);
          padding: 2px 6px;
          border-radius: 3px;
        }

        /* Upload button */
        .sm-upload-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 8px;
          padding: 8px 14px;
          cursor: pointer;
          transition: all 0.15s;
          margin-bottom: 14px;
        }

        .sm-upload-btn:hover {
          background: rgba(0,223,129,0.08);
          border-color: rgba(0,223,129,0.3);
          color: #00df81;
        }

        /* Slider card */
        .sm-slider-card {
          background: rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          padding: 18px 20px;
          margin-top: 16px;
        }

        .sm-slider-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .sm-slider-title {
          font-size: 13px;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 2px;
        }

        .sm-slider-subtitle {
          font-size: 11px;
          color: #64748b;
        }

        .sm-slider-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 700;
          color: #00df81;
          background: rgba(0,223,129,0.1);
          border: 1px solid rgba(0,223,129,0.25);
          padding: 3px 10px;
          border-radius: 6px;
          letter-spacing: 0.04em;
        }

        /* Close button */
        .sm-close-btn {
          position: absolute;
          top: 24px;
          right: 28px;
          z-index: 20;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
        }

        .sm-close-btn:hover {
          background: rgba(244,63,94,0.12);
          border-color: rgba(244,63,94,0.3);
          color: #f43f5e;
        }

        /* Profile section inputs */
        .sm-input {
          width: 100%;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 9px 12px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px;
          color: #f1f5f9;
          outline: none;
          transition: border-color 0.15s;
        }

        .sm-input:focus {
          border-color: rgba(0,223,129,0.4);
          box-shadow: 0 0 0 3px rgba(0,223,129,0.08);
        }

        .sm-input-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #475569;
          margin-bottom: 6px;
          display: block;
        }

        .sm-save-btn {
          padding: 8px 16px;
          background: #00df81;
          color: #000;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 12px;
          font-weight: 700;
          border: none;
          border-radius: 7px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .sm-save-btn:hover {
          background: #00f590;
          box-shadow: 0 0 16px rgba(0,223,129,0.4);
        }

        .sm-cancel-btn {
          padding: 8px 16px;
          background: rgba(255,255,255,0.05);
          color: #94a3b8;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 7px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .sm-cancel-btn:hover {
          background: rgba(255,255,255,0.09);
          color: #f1f5f9;
        }

        .sm-edit-btn {
          padding: 8px 14px;
          background: rgba(0,223,129,0.08);
          color: #00df81;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          border: 1px solid rgba(0,223,129,0.25);
          border-radius: 7px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .sm-edit-btn:hover {
          background: rgba(0,223,129,0.14);
          box-shadow: 0 0 12px rgba(0,223,129,0.2);
        }

        .sm-handle-prefix {
          display: flex;
          align-items: center;
        }

        .sm-handle-at {
          padding: 9px 12px;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.1);
          border-right: none;
          border-radius: 8px 0 0 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          color: #475569;
        }

        .sm-handle-input {
          flex: 1;
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0 8px 8px 0;
          padding: 9px 12px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px;
          color: #f1f5f9;
          outline: none;
          transition: border-color 0.15s;
        }

        .sm-handle-input:focus {
          border-color: rgba(0,223,129,0.4);
        }

        .sm-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }

        .sm-meta-row:last-child {
          border-bottom: none;
        }

        .sm-meta-key {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          color: #475569;
        }

        .sm-meta-val {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          color: #94a3b8;
        }

        .sm-preview-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #475569;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sm-preview-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #00df81;
          box-shadow: 0 0 6px #00df81;
          animation: sm-pulse 2s infinite;
        }

        @keyframes sm-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }

        .sm-upload-icon-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #00df81;
          background: rgba(0,223,129,0.08);
          border: 1px solid rgba(0,223,129,0.2);
          border-radius: 7px;
          padding: 6px 12px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .sm-upload-icon-btn:hover {
          background: rgba(0,223,129,0.14);
          box-shadow: 0 0 12px rgba(0,223,129,0.2);
        }
      `}</style>

      <motion.div
        className="sm-root"
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="sm-sidebar">
          <div className="sm-logo-wrap">
            <Image
              src="/Logo/new_logo_wide.png"
              alt="PrismSpace"
              width={130}
              height={31}
              priority
              className="h-[25px] w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
            />
            <span className="sm-logo-version">v2.0</span>
          </div>

          <div className="sm-nav-section-label">System Config</div>
          <nav>
            {navItems.map(item => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`sm-nav-btn${isActive ? ' active' : ''}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeSettingsNavPill"
                      className="sm-nav-pill"
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 38,
                      }}
                    />
                  )}
                  <span className="sm-nav-icon">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      {item.id === 'clock' && <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>}
                      {item.id === 'themes' && <><circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 1 0 20" /><path d="M2 12h10" /></>}
                      {item.id === 'stats' && <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>}
                      {item.id === 'quotes' && <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>}
                      {item.id === 'extras' && <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></>}
                      {item.id === 'profile' && <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>}
                    </svg>
                  </span>
                  <span className="sm-nav-label">{item.label}</span>
                  {isActive && <span className="sm-nav-indicator" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="sm-content" ref={contentRef}>
          <button onClick={onClose} className="sm-close-btn" title="Close settings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{ minHeight: '100%', willChange: 'opacity, transform' }}
          >

          {/* Clock Section */}
          {activeSection === 'clock' && (
            <div style={{ paddingRight: 80 }}>
              <div className="sm-section-kicker">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                Clock
              </div>
              <h2 className="sm-section-title">Clock Settings</h2>
              <p className="sm-section-desc">Customize how time is displayed on your dashboard</p>

              {/* Format */}
              <div className="sm-panel" style={{ marginBottom: 20 }}>
                <div className="sm-panel-title">Time Format</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => handleFormatChange('12')} className={`sm-format-card${clockFormat === '12' ? ' selected' : ''}`}>
                    {clockFormat === '12' && <span className="sm-format-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg></span>}
                    <div className="sm-format-time">2:24</div>
                    <div className="sm-format-label">12-hour</div>
                  </button>
                  <button onClick={() => handleFormatChange('24')} className={`sm-format-card${clockFormat === '24' ? ' selected' : ''}`}>
                    {clockFormat === '24' && <span className="sm-format-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg></span>}
                    <div className="sm-format-time">14:24</div>
                    <div className="sm-format-label">24-hour</div>
                  </button>
                </div>
              </div>

              {/* Color */}
              <div className="sm-panel" style={{ marginBottom: 20 }}>
                <div className="sm-panel-title">Clock Color</div>
                <div className="sm-color-input-wrap" style={{ marginBottom: 12 }}>
                  <input type="color" value={clockColor} onChange={(e) => handleColorChange(e.target.value)} className="sm-color-swatch" style={{ backgroundColor: clockColor }} />
                  <input type="text" value={clockColor} onChange={(e) => handleColorChange(e.target.value)} className="sm-color-text-input" maxLength={7} placeholder="#ffffff" />
                  <CosmicButton as="button" onClick={() => handleColorChange('#ffffff')} className="h-7 text-[11px] px-2.5 shrink-0">Reset</CosmicButton>
                </div>
                {colorHistory.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#475569' }}>Recent Colors</span>
                      <button onClick={clearColorHistory} style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: '#475569', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Clear</button>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {colorHistory.map((color, i) => (
                        <button key={i} onClick={() => handleColorChange(color)} className="sm-history-swatch" style={{ backgroundColor: color }} title={color} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Clock Style */}
              <div className="sm-panel">
                <div className="sm-panel-title">Clock Typography</div>
                <div className="sm-clock-grid">
                  {clockStyles.map((style) => {
                    const isSelected = clockStyle === style.value;
                    return (
                      <button
                        key={style.value}
                        onClick={() => handleStyleChange(style.value)}
                        className={`sm-clock-card${isSelected ? ' selected' : ''}`}
                      >
                        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                          <ClockPreview style={style.value} color={clockColor} />
                        </div>
                        {isSelected && (
                          <div className="sm-clock-card-check">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                          </div>
                        )}
                        <div className="sm-clock-card-label">{style.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Themes Section */}
          {activeSection === 'themes' && (
            <div style={{ paddingRight: 80 }}>
              <div className="sm-section-kicker">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 2a10 10 0 0 1 0 20" /><path d="M2 12h10" /></svg>
                Themes
              </div>
              <h2 className="sm-section-title">Appearance</h2>
              <p className="sm-section-desc">Wallpapers, transparency, and DevTools overlay settings</p>

              {/* Upload */}
              <div className="sm-panel" style={{ marginBottom: 20 }}>
                <div className="sm-panel-title">Wallpaper Source</div>
                <input type="file" accept="image/*,image/gif,video/mp4,video/webm,video/ogg" onChange={handleFileUpload} className="hidden" id="wallpaperUpload" />
                <label htmlFor="wallpaperUpload" className="sm-upload-btn">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                  Upload GIF / Video / Image
                </label>

                <div className="sm-bg-grid">
                  {customPreviewUrl && (
                    <button onClick={handleCustomBackgroundSelect} className={`sm-bg-thumb${selectedBg === 'custom' ? ' selected' : ''}`} title="Custom wallpaper">
                      {customMediaType === 'video' ? (
                        <video src={customPreviewUrl} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Image
                          src={customPreviewUrl}
                          alt="Custom wallpaper"
                          width={160}
                          height={90}
                          unoptimized
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                      <span className="sm-bg-custom-label">Custom</span>
                    </button>
                  )}
                  {backgrounds.map((bg, i) => (
                    <button key={i} onClick={() => handleBackgroundChange(bg.path)} className={`sm-bg-thumb${selectedBg === bg.path ? ' selected' : ''}`} title={bg.name}>
                      {bg.mediaType === 'video' ? (
                        <video src={bg.path} muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Image
                          src={bg.path}
                          alt={bg.name}
                          width={160}
                          height={90}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wallpaper opacity */}
              <div className="sm-slider-card">
                <div className="sm-slider-header">
                  <div>
                    <div className="sm-slider-title">Wallpaper Transparency</div>
                    <div className="sm-slider-subtitle">Adjust background opacity live</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                  <ExposureSlider min={0} max={100} step={5} value={wallpaperOpacity} onChange={handleWallpaperOpacityChange} accentColor="#00df81" showIndicator={true} />
                </div>
              </div>

              {/* DevTools opacity */}
              <div className="sm-slider-card">
                <div className="sm-slider-header">
                  <div>
                    <div className="sm-slider-title">DevTools Transparency</div>
                    <div className="sm-slider-subtitle">Adjust DevTools panel opacity live</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                  <ExposureSlider min={10} max={100} step={5} value={devtoolsOpacity} onChange={handleDevtoolsOpacityChange} accentColor="#00df81" showIndicator={true} />
                </div>
              </div>
            </div>
          )}

          {/* Quotes Section */}
          {activeSection === 'quotes' && (
            <div style={{ paddingRight: 80 }}>
              <div className="sm-section-kicker">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                Quotes
              </div>
              <h2 className="sm-section-title">Greetings & Quotes</h2>
              <p className="sm-section-desc">Control how the dashboard greets you each session</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="sm-toggle-row">
                  <div>
                    <div className="sm-toggle-label">Dynamic greetings</div>
                    <div className="sm-toggle-desc">Context-aware greetings based on time of day</div>
                  </div>
                  <AppleSwitch checked={dynamicGreetings} onCheckedChange={(checked) => { setDynamicGreetings(checked); localStorage.setItem('dynamicGreetings', checked.toString()); }} size="sm" aria-label="Show dynamic greetings" />
                </div>

                <div className="sm-toggle-row">
                  <div>
                    <div className="sm-toggle-label">Show greetings</div>
                    <div className="sm-toggle-desc">Display the greeting block on the dashboard</div>
                  </div>
                  <AppleSwitch checked={showGreetings} onCheckedChange={(checked) => { setShowGreetings(checked); localStorage.setItem('showGreetings', checked.toString()); window.location.reload(); }} size="sm" aria-label="Show greetings" />
                </div>
              </div>
            </div>
          )}

          {/* Extras Section */}
          {activeSection === 'extras' && (
            <div style={{ paddingRight: 80 }}>
              <div className="sm-section-kicker">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                Extras
              </div>
              <h2 className="sm-section-title">System Extras</h2>
              <p className="sm-section-desc">Fine-tune Dynamic Island and OS-level behaviour</p>

              <div className="sm-panel">
                <div className="sm-panel-title">Dynamic Island</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="sm-toggle-row">
                    <div>
                      <div className="sm-toggle-label">Enable Dynamic Island</div>
                      <div className="sm-toggle-desc">Floating time pill at the top of the screen</div>
                    </div>
                    <AppleSwitch checked={dynamicIsland} onCheckedChange={(checked) => { setDynamicIsland(checked); localStorage.setItem('dynamicIsland', checked.toString()); window.dispatchEvent(new CustomEvent('prism:island-settings')); }} size="sm" aria-label="Enable Dynamic Island" />
                  </div>
                  <div className="sm-toggle-row">
                    <div>
                      <div className="sm-toggle-label">Show seconds</div>
                      <div className="sm-toggle-desc">Display seconds in the collapsed pill</div>
                    </div>
                    <AppleSwitch checked={dynamicIslandSeconds} onCheckedChange={(checked) => { setDynamicIslandSeconds(checked); localStorage.setItem('dynamicIslandSeconds', checked.toString()); window.dispatchEvent(new CustomEvent('prism:island-settings')); }} size="sm" aria-label="Show seconds in Dynamic Island" />
                  </div>
                  <div className="sm-toggle-row">
                    <div>
                      <div className="sm-toggle-label">Auto-expand on events</div>
                      <div className="sm-toggle-desc">Expand when app notifications arrive</div>
                    </div>
                    <AppleSwitch checked={dynamicIslandExpand} onCheckedChange={(checked) => { setDynamicIslandExpand(checked); localStorage.setItem('dynamicIslandExpand', checked.toString()); window.dispatchEvent(new CustomEvent('prism:island-settings')); }} size="sm" aria-label="Auto-expand Dynamic Island on events" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Section */}
          {activeSection === 'stats' && (
            <div style={{ paddingRight: 80 }}>
              <div className="sm-section-kicker">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                Stats
              </div>
              <h2 className="sm-section-title">Statistics</h2>
              <p className="sm-section-desc">Telemetry and usage analytics — coming soon</p>
              <div className="sm-panel" style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: 0.5 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00df81" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: '#64748b' }}>{'// Dashboard telemetry panel — under construction'}</span>
              </div>
            </div>
          )}

          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div>
              <div className="sm-section-kicker">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                Profile
              </div>
              <h2 className="sm-section-title">User Profile</h2>
              <p className="sm-section-desc" style={{ marginBottom: 20 }}>Manage your identity across PrismSpace OS</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 24, alignItems: 'start' }}>
                {/* LEFT: editor */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* Avatar */}
                  <div className="sm-panel">
                    <div className="sm-panel-title">Avatar</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <AvatarPicker
                        currentAvatar={avatar}
                        onAvatarChange={async (newAvatar) => {
                          setAvatar(newAvatar);
                          setCardAvatarUrl('');
                          await db.user_profile.update('current', { avatar: newAvatar, updatedAt: new Date() });
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Choose an emoji or upload a photo</p>
                        <label htmlFor="profile-card-img-upload" className="sm-upload-icon-btn">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                          Upload image
                          <input id="profile-card-img-upload" type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (ev) => { setCardAvatarUrl(ev.target?.result as string); }; reader.readAsDataURL(file); }} />
                        </label>
                        {cardAvatarUrl && (
                          <button onClick={() => setCardAvatarUrl('')} style={{ marginLeft: 8, fontFamily: 'JetBrains Mono', fontSize: 10, color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}>✕ Remove</button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Display Name */}
                  <div className="sm-panel">
                    <div className="sm-panel-title">Display Name</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isEditingUsername ? (
                        <>
                          <input
                            type="text"
                            value={tempUsername}
                            onChange={(e) => setTempUsername(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                const trimmed = tempUsername.trim();
                                if (trimmed) { setUsername(trimmed); await db.user_profile.update('current', { username: trimmed, updatedAt: new Date() }); setIsEditingUsername(false); }
                              } else if (e.key === 'Escape') { setIsEditingUsername(false); }
                            }}
                            className="sm-input"
                            style={{ flex: 1 }}
                            placeholder="Enter display name"
                            autoFocus
                          />
                          <CosmicButton as="button" onClick={async () => { const t = tempUsername.trim(); if (t) { setUsername(t); await db.user_profile.update('current', { username: t, updatedAt: new Date() }); setIsEditingUsername(false); } }} className="h-8 text-xs px-3">Save</CosmicButton>
                          <button onClick={() => setIsEditingUsername(false)} className="sm-cancel-btn">Cancel</button>
                        </>
                      ) : (
                        <>
                          <div className="sm-input" style={{ flex: 1, cursor: 'default' }}>{username}</div>
                          <CosmicButton as="button" onClick={() => { setTempUsername(username); setIsEditingUsername(true); }} className="h-8 text-xs px-3">Edit</CosmicButton>
                        </>
                      )}
                    </div>
                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#475569', marginTop: 8 }}>Appears on your profile card and dashboard greeting</p>
                  </div>

                  {/* Handle & Title */}
                  <div className="sm-panel">
                    <div className="sm-panel-title">Card Details</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label className="sm-input-label">@Handle</label>
                        <div className="sm-handle-prefix">
                          <span className="sm-handle-at">@</span>
                          <input type="text" value={cardHandle} placeholder={username.toLowerCase().replace(/\s+/g, '')} onChange={(e) => setCardHandle(e.target.value.replace(/\s+/g, '').toLowerCase())} className="sm-handle-input" />
                        </div>
                      </div>
                      <div>
                        <label className="sm-input-label">Title / Role</label>
                        <input
                          type="text"
                          value={cardTitle}
                          onChange={(e) => {
                            setCardTitle(e.target.value);
                            localStorage.setItem('profile_card_title', e.target.value);
                          }}
                          className="sm-input"
                          placeholder="e.g. Software Engineer"
                        />
                      </div>
                      <div>
                        <label className="sm-input-label">Tagline</label>
                        <input
                          type="text"
                          value={cardTagline}
                          onChange={(e) => {
                            setCardTagline(e.target.value);
                            localStorage.setItem('profile_card_tagline', e.target.value);
                          }}
                          className="sm-input"
                          placeholder="e.g. You code it. Now orchestrate."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Profile Tags & Skills */}
                  <div className="sm-panel">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div className="sm-panel-title" style={{ margin: 0 }}>Profile Tags & Skills</div>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#00df81', background: 'rgba(0,223,129,0.1)', padding: '2px 8px', borderRadius: 12, border: '1px solid rgba(0,223,129,0.25)' }}>
                        {cardTags.length} / 8 tags
                      </span>
                    </div>
                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: '#64748b', marginBottom: 12 }}>
                      Skills, technologies, and specializations printed directly onto your 3D badge.
                    </p>

                    {/* Active tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, minHeight: 32 }}>
                      {cardTags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(0, 223, 129, 0.35)',
                            padding: '4px 10px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontFamily: 'JetBrains Mono',
                            color: '#e2e8f0',
                          }}
                        >
                          <span style={{ color: '#00df81', fontWeight: 600 }}>#</span>
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            title={`Remove ${tag}`}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '0 2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 14,
                              lineHeight: 1,
                              borderRadius: 4,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {cardTags.length === 0 && (
                        <span style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', padding: '4px 0' }}>
                          No tags added yet. Add some below!
                        </span>
                      )}
                    </div>

                    {/* Add Tag Input */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag(newTagInput);
                          }
                        }}
                        placeholder="Add a tag (e.g. Rust, UI/UX, WebGL)..."
                        className="sm-input"
                        style={{ flex: 1, fontSize: 12 }}
                        maxLength={20}
                      />
                      <CosmicButton
                        as="button"
                        onClick={() => handleAddTag(newTagInput)}
                        disabled={!newTagInput.trim() || cardTags.length >= 8}
                        className="h-8 text-xs px-3"
                      >
                        + Add
                      </CosmicButton>
                    </div>

                    {/* Quick suggestion pills */}
                    <div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                        Suggestions:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {['React', 'Next.js', 'TypeScript', 'AI/ML', 'Full-stack', 'Python', 'Cybersecurity', 'Rust', 'UI/UX', 'Cloud'].map((suggestion) => {
                          const isAlreadyAdded = cardTags.some((t) => t.toLowerCase() === suggestion.toLowerCase());
                          if (isAlreadyAdded) return null;
                          return (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => handleAddTag(suggestion)}
                              style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px dashed rgba(255, 255, 255, 0.15)',
                                color: '#94a3b8',
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontFamily: 'JetBrains Mono',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(0, 223, 129, 0.5)';
                                e.currentTarget.style.color = '#00df81';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                                e.currentTarget.style.color = '#94a3b8';
                              }}
                            >
                              + {suggestion}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Account info */}
                  <div className="sm-panel">
                    <div className="sm-panel-title">Account Metadata</div>
                    <div className="sm-meta-row">
                      <span className="sm-meta-key">Profile created</span>
                      <span className="sm-meta-val">{new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="sm-meta-row">
                      <span className="sm-meta-key">Last updated</span>
                      <span className="sm-meta-val">{new Date().toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT: live 3D Lanyard card preview */}
                <div style={{ position: 'sticky', top: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="sm-preview-label" style={{ alignSelf: 'flex-start', marginBottom: 8 }}>
                    <span className="sm-preview-dot" />
                    Live 3D ID Badge
                  </div>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 420,
                      height: 640,
                      borderRadius: 20,
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      background: 'radial-gradient(ellipse at 50% 12%, rgba(0, 223, 129, 0.06) 0%, rgba(7, 11, 17, 0.95) 75%)',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <Lanyard
                      frontImage={lanyardFrontImage}
                      transparent={true}
                      position={[0, -1.45, 12.2]}
                      cardScale={3.3}
                      lanyardWidth={1.3}
                    />
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontFamily: 'JetBrains Mono',
                      fontSize: 11,
                      color: '#64748b',
                    }}
                  >
                    <span style={{ color: '#00df81' }}>●</span> Click &amp; drag badge to swing physics
                  </div>
                </div>
              </div>
            </div>
          )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
