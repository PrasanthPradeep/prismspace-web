/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CanvasCamera } from '@/lib/bookmark-canvas/types';
import { clamp, ZOOM_STEP, MIN_SCALE, MAX_SCALE } from '@/lib/bookmark-canvas/types';

const STORAGE_KEY = 'prism-bookmark-canvas-camera';
const DEFAULT_CAMERA: CanvasCamera = { x: 0, y: 0, scale: 1 };

function loadCamera(): CanvasCamera {
  if (typeof window === 'undefined') return DEFAULT_CAMERA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return DEFAULT_CAMERA;
}

function saveCamera(camera: CanvasCamera): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(camera));
  } catch {
    // ignore
  }
}

export function useCanvas(
  canvasRef: React.RefObject<HTMLDivElement | null>,
  isPanToolActive: boolean = false
) {
  // Always start with default camera so SSR and initial client render match.
  // localStorage value is applied after hydration in useEffect below.
  const [camera, setCamera] = useState<CanvasCamera>(DEFAULT_CAMERA);
  const [hydrated, setHydrated] = useState(false);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, cx: 0, cy: 0 });
  const spaceHeld = useRef(false);

  const updateCamera = useCallback((updater: (prev: CanvasCamera) => CanvasCamera) => {
    setCamera((prev) => {
      const next = updater(prev);
      saveCamera(next);
      return next;
    });
  }, []);

  // After hydration, restore the saved camera position from localStorage.
  // This runs only on the client after the first render, so SSR HTML matches.
  useEffect(() => {
    const saved = loadCamera();
    setCamera(saved);
    setHydrated(true);
  }, []);

  // Zoom with mouse wheel
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const el = canvasRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      updateCamera((prev) => {
        const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
        const newScale = clamp(prev.scale + delta, MIN_SCALE, MAX_SCALE);
        const scaleDiff = newScale / prev.scale;

        return {
          scale: newScale,
          x: mouseX - (mouseX - prev.x) * scaleDiff,
          y: mouseY - (mouseY - prev.y) * scaleDiff,
        };
      });
    },
    [canvasRef, updateCamera]
  );

  // Pan with middle mouse, space+drag, or when pan tool is active
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      const isMiddle = e.button === 1;
      const isSpaceDrag = (spaceHeld.current || isPanToolActive) && e.button === 0;
      if (!isMiddle && !isSpaceDrag) return;
      e.preventDefault();
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY, cx: camera.x, cy: camera.y };
    },
    [camera.x, camera.y, isPanToolActive]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isPanning.current) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      updateCamera((prev) => ({
        ...prev,
        x: panStart.current.cx + dx,
        y: panStart.current.cy + dy,
      }));
    },
    [updateCamera]
  );

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // Space key for panning mode
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space' && !e.target?.toString().includes('Input') && 
        !(e.target instanceof HTMLInputElement) && 
        !(e.target instanceof HTMLTextAreaElement)) {
      spaceHeld.current = true;
      e.preventDefault();
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      spaceHeld.current = false;
    }
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    el.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      el.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, handleKeyDown, handleKeyUp, canvasRef]);

  const zoomIn = useCallback(() => {
    updateCamera((prev) => ({ ...prev, scale: clamp(prev.scale + ZOOM_STEP, MIN_SCALE, MAX_SCALE) }));
  }, [updateCamera]);

  const zoomOut = useCallback(() => {
    updateCamera((prev) => ({ ...prev, scale: clamp(prev.scale - ZOOM_STEP, MIN_SCALE, MAX_SCALE) }));
  }, [updateCamera]);

  const resetZoom = useCallback(() => {
    updateCamera(() => DEFAULT_CAMERA);
  }, [updateCamera]);

  const panTo = useCallback(
    (x: number, y: number) => {
      updateCamera((prev) => ({ ...prev, x, y }));
    },
    [updateCamera]
  );

  return {
    camera,
    isPanning: spaceHeld,
    zoomIn,
    zoomOut,
    resetZoom,
    panTo,
  };
}
