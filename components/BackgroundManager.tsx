/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { db } from '@/lib/db';

type BackgroundMediaType = 'image' | 'video';

interface StoredBackgroundSetting {
  source: 'static' | 'custom';
  mediaType: BackgroundMediaType;
  path?: string;
  fileKey?: string;
  name?: string;
}

const BACKGROUND_SETTING_KEY = 'selected_background';
const CUSTOM_WALLPAPER_KEY = 'custom-wallpaper';

const DEFAULT_BACKGROUND: StoredBackgroundSetting = {
  source: 'static',
  mediaType: 'image',
  path: '/bg.png',
  name: 'Default',
};

function getMediaTypeFromPath(path: string): BackgroundMediaType {
  return /\.(mp4|webm|ogg)$/i.test(path) ? 'video' : 'image';
}

function getLegacyBackgroundSetting(value: string | null): StoredBackgroundSetting {
  if (!value || value === 'default' || value === '/images/BG.png') return DEFAULT_BACKGROUND;

  if (value === 'custom') {
    return {
      source: 'custom',
      mediaType: 'image',
      fileKey: CUSTOM_WALLPAPER_KEY,
    };
  }

  return {
    source: 'static',
    mediaType: value.startsWith('data:video/') ? 'video' : getMediaTypeFromPath(value),
    path: value,
  };
}

export function BackgroundManager() {
  const [bgType, setBgType] = useState<BackgroundMediaType>('image');
  const [bgUrl, setBgUrl] = useState<string>(DEFAULT_BACKGROUND.path!);
  const [opacity, setOpacity] = useState<number>(100);

  useEffect(() => {
    let blobUrl: string | null = null;

    const loadBackground = async () => {
      try {
        const savedOpacity = localStorage.getItem('wallpaper_opacity');
        if (savedOpacity !== null) {
          setOpacity(Math.max(0, Math.min(100, Number(savedOpacity))));
        }

        const savedSetting = await db.settings.get(BACKGROUND_SETTING_KEY);
        let backgroundSetting: StoredBackgroundSetting | null = null;

        if (savedSetting?.value) {
          try {
            backgroundSetting = JSON.parse(savedSetting.value) as StoredBackgroundSetting;
          } catch {
            backgroundSetting = null;
          }
        }

        if (!backgroundSetting) {
          const legacy = localStorage.getItem('selectedBackground');
          backgroundSetting = getLegacyBackgroundSetting(legacy);
        }

        // Clean up previous blob URL to prevent memory leaks
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
          blobUrl = null;
        }

        if (backgroundSetting.source === 'custom') {
          const file = await db.files.get(backgroundSetting.fileKey || CUSTOM_WALLPAPER_KEY);
          if (file && file.blob) {
            blobUrl = URL.createObjectURL(file.blob);
            setBgType(file.mimeType.startsWith('video/') ? 'video' : 'image');
            setBgUrl(blobUrl);
          } else {
            setBgType('image');
            setBgUrl(DEFAULT_BACKGROUND.path!);
          }
        } else if (backgroundSetting.path) {
          setBgType(backgroundSetting.mediaType || getMediaTypeFromPath(backgroundSetting.path));
          setBgUrl(backgroundSetting.path);
        } else {
          setBgType('image');
          setBgUrl(DEFAULT_BACKGROUND.path!);
        }
      } catch (err) {
        console.error('Failed to load background:', err);
        setBgType('image');
        setBgUrl(DEFAULT_BACKGROUND.path!);
      }
    };

    loadBackground();

    const handleBgChange = () => {
      loadBackground();
    };

    window.addEventListener('prism:background-change', handleBgChange);
    window.addEventListener('storage', handleBgChange);

    return () => {
      window.removeEventListener('prism:background-change', handleBgChange);
      window.removeEventListener('storage', handleBgChange);
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#090c12]">
      {bgType === 'image' && bgUrl && (
        <Image
          src={bgUrl}
          alt="Background"
          fill
          sizes="100vw"
          quality={70}
          unoptimized={bgUrl.startsWith('blob:') || bgUrl.startsWith('data:')}
          className="w-full h-full object-cover transition-opacity duration-300"
          style={{ opacity: opacity / 100 }}
        />
      )}
      {bgType === 'video' && bgUrl && (
        <video 
          src={bgUrl} 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="w-full h-full object-cover transition-opacity duration-300"
          style={{ opacity: opacity / 100 }}
        />
      )}
    </div>
  );
}
