'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/db';

type BackgroundMediaType = 'image' | 'video';

interface StoredBackgroundSetting {
  source: 'static' | 'custom';
  mediaType: BackgroundMediaType;
  path?: string;
  fileKey?: string;
}

const BACKGROUND_SETTING_KEY = 'selected_background';
const CUSTOM_WALLPAPER_KEY = 'custom-wallpaper';

function getMediaTypeFromPath(path: string): BackgroundMediaType {
  return /\.(mp4|webm|ogg)$/i.test(path) ? 'video' : 'image';
}

function getLegacyBackgroundSetting(value: string | null): StoredBackgroundSetting | null {
  if (!value || value === 'default') return null;

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
  const [bgType, setBgType] = useState<BackgroundMediaType | null>(null);
  const [bgUrl, setBgUrl] = useState<string>('');
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
        const backgroundSetting = savedSetting
          ? (JSON.parse(savedSetting.value) as StoredBackgroundSetting)
          : getLegacyBackgroundSetting(localStorage.getItem('selectedBackground'));
        
        // Clean up previous blob URL to prevent memory leaks
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
          blobUrl = null;
        }

        if (!backgroundSetting) {
          setBgType(null);
          setBgUrl('');
        } else if (backgroundSetting.source === 'custom') {
          const file = await db.files.get(backgroundSetting.fileKey || CUSTOM_WALLPAPER_KEY);
          if (file && file.blob) {
            blobUrl = URL.createObjectURL(file.blob);
            if (file.mimeType.startsWith('video/')) {
              setBgType('video');
            } else {
              setBgType('image');
            }
            setBgUrl(blobUrl);
          }
        } else if (backgroundSetting.path) {
          setBgType(backgroundSetting.mediaType);
          setBgUrl(backgroundSetting.path);
        }
      } catch (err) {
        console.error('Failed to load background:', err);
      }
    };

    loadBackground();

    const handleBgChange = () => {
      loadBackground();
    };

    window.addEventListener('prism:background-change', handleBgChange);
    return () => {
      window.removeEventListener('prism:background-change', handleBgChange);
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, []);

  if (!bgType || !bgUrl) return null;

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-black">
      {bgType === 'image' && (
        <img
          src={bgUrl}
          alt="Background"
          className="w-full h-full object-cover transition-opacity duration-150"
          style={{ opacity: opacity / 100 }}
        />
      )}
      {bgType === 'video' && (
        <video 
          src={bgUrl} 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="w-full h-full object-cover transition-opacity duration-150"
          style={{ opacity: opacity / 100 }}
        />
      )}
    </div>
  );
}
