'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ClockStyle } from './Clock';
import { ClockPreview } from './ClockPreview';
import { AvatarPicker } from './AvatarPicker';
import { AppleSwitch } from '@/components/unlumen-ui/apple-switch';
import ExposureSlider from '@/components/ui/smoothui/exposure-slider';
import { db, UserProfile } from '@/lib/db';
import ProfileCard from './ProfileCard';

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
  { name: 'Default', path: '/images/BG.png', mediaType: 'image' },
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
  if (!setting) return '/images/BG.png';
  return setting.source === 'custom' ? 'custom' : setting.path || '/images/BG.png';
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('clock');
  const [clockFormat, setClockFormat] = useState<'12' | '24'>('24');
  const [clockStyle, setClockStyle] = useState<ClockStyle>('default');
  const [clockColor, setClockColor] = useState('#ffffff');
  const [colorHistory, setColorHistory] = useState<string[]>([]);
  const [selectedBg, setSelectedBg] = useState('/images/BG.png');
  const [customPreviewUrl, setCustomPreviewUrl] = useState<string | null>(null);
  const [customMediaType, setCustomMediaType] = useState<BackgroundMediaType>('image');
  const [dynamicGreetings, setDynamicGreetings] = useState(true);
  const [showGreetings, setShowGreetings] = useState(true);
  const [matrixDisplay, setMatrixDisplay] = useState(true);
  const [dynamicIsland, setDynamicIsland] = useState(true);
  const [dynamicIslandSeconds, setDynamicIslandSeconds] = useState(false);
  const [dynamicIslandExpand, setDynamicIslandExpand] = useState(true);
  const [wallpaperOpacity, setWallpaperOpacity] = useState(100);
  const [devtoolsOpacity, setDevtoolsOpacity] = useState(100);
  
  // Profile states
  const [username, setUsername] = useState('User');
  const [avatar, setAvatar] = useState('👤');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  
  // Profile card extra fields
  const [cardHandle, setCardHandle] = useState('');
  const [cardTitle, setCardTitle] = useState('PrismSpace User');
  const [cardAvatarUrl, setCardAvatarUrl] = useState('');

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
    const savedMatrixDisplay = localStorage.getItem('matrixDisplay') !== 'false';
    
    setClockFormat(savedFormat);
    setClockStyle(savedStyle);
    setClockColor(savedColor);
    setColorHistory(savedHistory);
    setDynamicGreetings(savedDynamicGreetings);
    setShowGreetings(savedShowGreetings);
    setMatrixDisplay(savedMatrixDisplay);
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
          setAvatar(profile.avatar);
        } else {
          // Create default profile
          const now = new Date();
          await db.user_profile.put({
            key: 'current',
            username: 'User',
            avatar: '👤',
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
        const nextSetting = parsedSetting || toSelectedBackground(legacyBg || '/images/BG.png');

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-lg z-[1000] flex items-center justify-center p-4">
      <div className="glass-dark rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex">
        {/* Sidebar */}
        <div className="w-64 bg-black/50 p-6 flex flex-col overflow-y-auto">
          <div className="mb-8">
            <Image src="/images/prism-logo.svg" alt="Prism" width={40} height={40} />
          </div>
          
          <nav className="flex-1 space-y-2">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
                  activeSection === item.id ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <span>{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-6 space-y-2">
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto relative">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 rounded-lg bg-white/10 
                       hover:bg-white/20 flex items-center justify-center text-2xl transition-all"
          >
            ×
          </button>

          {/* Clock Section */}
          {activeSection === 'clock' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-semibold mb-6">Clock Format</h2>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleFormatChange('12')}
                    className={`flex-1 p-6 rounded-xl border-2 transition-all ${
                      clockFormat === '12'
                        ? 'border-pink-500 bg-pink-500/10'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    <div className="text-4xl font-semibold mb-2">2:24</div>
                    <div>12-hour</div>
                  </button>
                  <button
                    onClick={() => handleFormatChange('24')}
                    className={`flex-1 p-6 rounded-xl border-2 transition-all ${
                      clockFormat === '24'
                        ? 'border-pink-500 bg-pink-500/10'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    <div className="text-4xl font-semibold mb-2">14:24</div>
                    <div>24-hour</div>
                  </button>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-6">Clock Color</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={clockColor}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="w-20 h-12 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={clockColor}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="flex-1 px-4 py-2 bg-white/10 rounded-lg border border-white/20 text-white"
                      maxLength={7}
                      placeholder="#ffffff"
                    />
                    <button
                      onClick={() => handleColorChange('#ffffff')}
                      className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all"
                    >
                      Reset
                    </button>
                  </div>

                  {colorHistory.length > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-white/60">Recent Colors:</span>
                        <button
                          onClick={clearColorHistory}
                          className="text-xs text-white/60 hover:text-white transition-all"
                        >
                          Clear History
                        </button>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {colorHistory.map((color, i) => (
                          <button
                            key={i}
                            onClick={() => handleColorChange(color)}
                            className="w-10 h-10 rounded-lg border-2 border-white/20 hover:border-white/40 transition-all"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-6">Clock Style</h2>
                <p className="text-white/60 text-sm mb-8">
                  Choose the perfect typography to match your vibe
                </p>
                <div className="grid grid-cols-3 gap-5">
                  {clockStyles.map((style) => {
                    const isSelected = clockStyle === style.value;
                    return (
                      <button
                        key={style.value}
                        onClick={() => handleStyleChange(style.value)}
                        className={`group relative overflow-hidden rounded-2xl transition-all duration-300 ${
                          isSelected
                            ? 'ring-2 ring-pink-500 ring-offset-2 ring-offset-black/50 shadow-[0_0_40px_rgba(236,72,153,0.3)]'
                            : 'ring-1 ring-white/10 hover:ring-white/30 hover:shadow-[0_8px_32px_rgba(255,255,255,0.08)]'
                        }`}
                        style={{ aspectRatio: '16/11' }}
                      >
                        {/* Background gradient overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-300 ${
                          isSelected
                            ? 'from-pink-500/20 via-purple-500/10 to-transparent opacity-100'
                            : 'from-white/5 to-transparent opacity-0 group-hover:opacity-100'
                        }`} />
                        
                        {/* Clock preview component */}
                        <div className="relative h-full w-full overflow-hidden">
                          <div className={`absolute inset-0 w-full h-full transition-all duration-300 pointer-events-none ${isSelected ? 'scale-110 brightness-110' : 'scale-100'}`}>
                            <ClockPreview style={style.value} color={clockColor} />
                          </div>
                          
                          {/* Gloss effect */}
                          <div className={`absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 
                                         group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${
                            isSelected ? 'opacity-40' : ''
                          }`} />
                        </div>

                        {/* Label with backdrop */}
                        <div className={`absolute bottom-0 left-0 right-0 p-3.5 backdrop-blur-xl transition-all duration-300 ${
                          isSelected
                            ? 'bg-gradient-to-t from-pink-500/30 via-pink-500/20 to-transparent'
                            : 'bg-gradient-to-t from-black/60 via-black/40 to-transparent group-hover:from-black/70'
                        }`}>
                          <div className={`text-sm font-medium transition-all duration-300 ${
                            isSelected 
                              ? 'text-white' 
                              : 'text-white/80 group-hover:text-white'
                          }`}>
                            {style.name}
                          </div>
                          
                          {/* Selection indicator */}
                          {isSelected && (
                            <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-pink-500 
                                          flex items-center justify-center animate-in zoom-in-0 duration-200">
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Hover shine effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent 
                                        translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Themes Section */}
          {activeSection === 'themes' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-semibold mb-6">Themes</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 rounded-xl border-2 border-pink-500 bg-pink-500/10">
                    <div className="text-5xl font-semibold mb-2">12:34</div>
                    <div>Home</div>
                  </div>
                  <div className="p-6 rounded-xl border-2 border-white/20 hover:border-white/40 transition-all cursor-pointer">
                    <div className="text-4xl font-semibold mb-2">⏱️ 25:00</div>
                    <div>Focus</div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-6">Background</h2>
                <div className="mb-4">
                  <input
                    type="file"
                    accept="image/*,image/gif,video/mp4,video/webm,video/ogg"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="wallpaperUpload"
                  />
                  <label
                    htmlFor="wallpaperUpload"
                    className="inline-block px-6 py-3 bg-white/10 rounded-lg hover:bg-white/20 transition-all cursor-pointer"
                  >
                    Upload GIF or Video Wallpaper
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {customPreviewUrl && (
                    <button
                      onClick={handleCustomBackgroundSelect}
                      className={`group relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                        selectedBg === 'custom'
                          ? 'border-pink-500'
                          : 'border-white/20 hover:border-white/40'
                      }`}
                      title="Custom wallpaper"
                    >
                      {customMediaType === 'video' ? (
                        <video
                          src={customPreviewUrl}
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={customPreviewUrl}
                          alt="Custom wallpaper"
                          className="w-full h-full object-cover"
                        />
                      )}
                      <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-1 text-[11px] font-medium text-white">
                        Custom
                      </span>
                    </button>
                  )}
                  {backgrounds.map((bg, i) => (
                    <button
                      key={i}
                      onClick={() => handleBackgroundChange(bg.path)}
                      className={`aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                        selectedBg === bg.path
                          ? 'border-pink-500'
                          : 'border-white/20 hover:border-white/40'
                      }`}
                      title={bg.name}
                    >
                      {bg.mediaType === 'video' ? (
                        <video
                          src={bg.path}
                          muted
                          loop
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={bg.path}
                          alt={bg.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </button>
                  ))}
                </div>

                {/* Wallpaper Opacity / Exposure Slider */}
                <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-white">Wallpaper Transparency / Exposure</h3>
                      <p className="text-xs text-white/60">Drag ticker to adjust background transparency live</p>
                    </div>
                    <span className="text-sm font-mono font-semibold px-3 py-1 bg-white/10 rounded-lg text-pink-400">
                      {wallpaperOpacity}%
                    </span>
                  </div>
                  <div className="flex justify-center py-2 overflow-x-hidden">
                    <ExposureSlider
                      min={0}
                      max={100}
                      step={5}
                      value={wallpaperOpacity}
                      onChange={handleWallpaperOpacityChange}
                      accentColor="#ec4899"
                      showIndicator={true}
                    />
                  </div>
                </div>

                {/* DevTools Opacity / Exposure Slider */}
                <div className="mt-4 p-6 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-white">DevTools Transparency / Exposure</h3>
                      <p className="text-xs text-white/60">Drag ticker to adjust DevTools panel transparency live</p>
                    </div>
                    <span className="text-sm font-mono font-semibold px-3 py-1 bg-white/10 rounded-lg text-emerald-400">
                      {devtoolsOpacity}%
                    </span>
                  </div>
                  <div className="flex justify-center py-2 overflow-x-hidden">
                    <ExposureSlider
                      min={10}
                      max={100}
                      step={5}
                      value={devtoolsOpacity}
                      onChange={handleDevtoolsOpacityChange}
                      accentColor="#10b981"
                      showIndicator={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quotes Section */}
          {activeSection === 'quotes' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-6">Quotes & Greetings</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div>
                    <div className="font-medium mb-1">Show dynamic greetings</div>
                    <div className="text-sm text-white/60">Turn off for generic greetings.</div>
                  </div>
                  <AppleSwitch
                    checked={dynamicGreetings}
                    onCheckedChange={(checked) => {
                      setDynamicGreetings(checked);
                      localStorage.setItem('dynamicGreetings', checked.toString());
                    }}
                    size="sm"
                    aria-label="Show dynamic greetings"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div>
                    <div className="font-medium mb-1">Show greetings</div>
                    <div className="text-sm text-white/60">Turn off to hide dashboard greetings.</div>
                  </div>
                  <AppleSwitch
                    checked={showGreetings}
                    onCheckedChange={(checked) => {
                      setShowGreetings(checked);
                      localStorage.setItem('showGreetings', checked.toString());
                      window.location.reload();
                    }}
                    size="sm"
                    aria-label="Show greetings"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Extras Section */}
          {activeSection === 'extras' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-6">Extras</h2>
              
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <div>
                  <div className="font-medium mb-1">Matrix Display</div>
                  <div className="text-sm text-white/60">Show animated matrix display in bottom corner. Click to cycle animations.</div>
                </div>
                <AppleSwitch
                  checked={matrixDisplay}
                  onCheckedChange={(checked) => {
                    setMatrixDisplay(checked);
                    localStorage.setItem('matrixDisplay', checked.toString());
                    window.location.reload();
                  }}
                  size="sm"
                  aria-label="Matrix Display"
                />
              </div>

              <div className="mt-6">
                <h3 className="text-base font-semibold mb-4 text-white/70 uppercase tracking-widest text-xs">Dynamic Island</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div>
                      <div className="font-medium mb-1">Enable Dynamic Island</div>
                      <div className="text-sm text-white/60">Show the floating time pill at the top of the screen.</div>
                    </div>
                    <AppleSwitch
                      checked={dynamicIsland}
                      onCheckedChange={(checked) => {
                        setDynamicIsland(checked);
                        localStorage.setItem('dynamicIsland', checked.toString());
                        window.dispatchEvent(new CustomEvent('prism:island-settings'));
                      }}
                      size="sm"
                      aria-label="Enable Dynamic Island"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div>
                      <div className="font-medium mb-1">Show seconds</div>
                      <div className="text-sm text-white/60">Display seconds in the collapsed time pill.</div>
                    </div>
                    <AppleSwitch
                      checked={dynamicIslandSeconds}
                      onCheckedChange={(checked) => {
                        setDynamicIslandSeconds(checked);
                        localStorage.setItem('dynamicIslandSeconds', checked.toString());
                        window.dispatchEvent(new CustomEvent('prism:island-settings'));
                      }}
                      size="sm"
                      aria-label="Show seconds in Dynamic Island"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                    <div>
                      <div className="font-medium mb-1">Auto-expand on events</div>
                      <div className="text-sm text-white/60">Expand the island when app notifications arrive.</div>
                    </div>
                    <AppleSwitch
                      checked={dynamicIslandExpand}
                      onCheckedChange={(checked) => {
                        setDynamicIslandExpand(checked);
                        localStorage.setItem('dynamicIslandExpand', checked.toString());
                        window.dispatchEvent(new CustomEvent('prism:island-settings'));
                      }}
                      size="sm"
                      aria-label="Auto-expand Dynamic Island on events"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Placeholder Sections */}
          {activeSection === 'stats' && (
            <div>
              <h2 className="text-2xl font-semibold mb-6">
                {navItems.find(i => i.id === activeSection)?.label}
              </h2>
              <p className="text-white/60">Settings for this section coming soon...</p>
            </div>
          )}

          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-6">Profile</h2>

              <div className="grid grid-cols-[1fr_320px] gap-6 items-start">
                {/* LEFT: editor */}
                <div className="space-y-5">

                  {/* Avatar */}
                  <div className="bg-white/5 rounded-xl p-5">
                    <h3 className="text-base font-semibold mb-4">Avatar</h3>
                    <div className="flex items-center gap-5">
                      <AvatarPicker
                        currentAvatar={avatar}
                        onAvatarChange={async (newAvatar) => {
                          setAvatar(newAvatar);
                          setCardAvatarUrl('');
                          await db.user_profile.update('current', {
                            avatar: newAvatar,
                            updatedAt: new Date(),
                          });
                        }}
                      />
                      <div className="flex-1">
                        <p className="text-sm text-white/60 mb-2">Choose an emoji or upload a photo</p>
                        <label
                          htmlFor="profile-card-img-upload"
                          className="inline-flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{
                            background: 'rgba(255,255,255,0.07)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: 'rgba(255,255,255,0.7)',
                          }}
                        >
                          📷 Upload image
                          <input
                            id="profile-card-img-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const url = ev.target?.result as string;
                                setCardAvatarUrl(url);
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                        {cardAvatarUrl && (
                          <button
                            onClick={() => setCardAvatarUrl('')}
                            className="ml-2 text-xs text-white/40 hover:text-white/70 transition-colors"
                          >
                            ✕ Remove photo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Display Name */}
                  <div className="bg-white/5 rounded-xl p-5">
                    <h3 className="text-base font-semibold mb-4">Display Name</h3>
                    <div className="flex items-center gap-3">
                      {isEditingUsername ? (
                        <>
                          <input
                            type="text"
                            value={tempUsername}
                            onChange={(e) => setTempUsername(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter') {
                                const trimmed = tempUsername.trim();
                                if (trimmed) {
                                  setUsername(trimmed);
                                  await db.user_profile.update('current', {
                                    username: trimmed,
                                    updatedAt: new Date(),
                                  });
                                  setIsEditingUsername(false);
                                }
                              } else if (e.key === 'Escape') {
                                setIsEditingUsername(false);
                              }
                            }}
                            className="flex-1 px-4 py-2 bg-[#0f141b] border border-[#283341] rounded text-white text-sm focus:outline-none focus:border-purple-500/50"
                            placeholder="Enter display name"
                            autoFocus
                          />
                          <button
                            onClick={async () => {
                              const trimmed = tempUsername.trim();
                              if (trimmed) {
                                setUsername(trimmed);
                                await db.user_profile.update('current', {
                                  username: trimmed,
                                  updatedAt: new Date(),
                                });
                                setIsEditingUsername(false);
                              }
                            }}
                            className="px-4 py-2 bg-purple-500/90 hover:bg-purple-500 text-white font-medium rounded transition-colors text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setIsEditingUsername(false)}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded transition-colors text-sm"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex-1 px-4 py-2 bg-[#0f141b] border border-[#283341] rounded text-white text-sm">
                            {username}
                          </div>
                          <button
                            onClick={() => {
                              setTempUsername(username);
                              setIsEditingUsername(true);
                            }}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded transition-colors text-sm"
                          >
                            Edit
                          </button>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-white/40 mt-2">Appears on your profile card and dashboard greeting</p>
                  </div>

                  {/* Handle & Title */}
                  <div className="bg-white/5 rounded-xl p-5 space-y-4">
                    <h3 className="text-base font-semibold">Card Details</h3>
                    <div>
                      <label className="block text-xs text-white/50 mb-1.5 font-medium">@Handle</label>
                      <div className="flex items-center">
                        <span className="px-3 py-2 bg-white/5 border border-r-0 border-white/10 rounded-l text-white/40 text-sm">@</span>
                        <input
                          type="text"
                          value={cardHandle}
                          placeholder={username.toLowerCase().replace(/\s+/g, '')}
                          onChange={(e) => setCardHandle(e.target.value.replace(/\s+/g, '').toLowerCase())}
                          className="flex-1 px-3 py-2 bg-[#0f141b] border border-white/10 rounded-r text-white text-sm focus:outline-none focus:border-purple-500/50"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1.5 font-medium">Title / Role</label>
                      <input
                        type="text"
                        value={cardTitle}
                        onChange={(e) => setCardTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0f141b] border border-white/10 rounded text-white text-sm focus:outline-none focus:border-purple-500/50"
                        placeholder="e.g. Software Engineer"
                      />
                    </div>
                  </div>

                  {/* Account info */}
                  <div className="bg-white/5 rounded-xl p-5">
                    <h3 className="text-base font-semibold mb-3">Account</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Profile created</span>
                        <span className="text-white">{new Date().toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Last updated</span>
                        <span className="text-white">{new Date().toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT: live card preview */}
                <div className="sticky top-0">
                  <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-4">Live Preview</p>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      transform: 'scale(0.78)',
                      transformOrigin: 'top center',
                    }}
                  >
                    <ProfileCard
                      name={username}
                      handle={cardHandle || username.toLowerCase().replace(/\s+/g, '')}
                      title={cardTitle}
                      status="Online"
                      avatarUrl={
                        cardAvatarUrl ||
                        (avatar.startsWith('data:image') || avatar.startsWith('http')
                          ? avatar
                          : `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${avatar}</text></svg>`)
                      }
                      contactText="Message"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
