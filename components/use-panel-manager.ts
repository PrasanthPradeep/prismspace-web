'use client';

import { useCallback, useState } from 'react';
import type { PanelType } from './panel-types';

export function usePanelManager() {
  const [activePanel, setActivePanel] = useState<PanelType | null>(null);

  const openPanel = useCallback((panel: PanelType) => {
    setActivePanel(panel);
  }, []);

  const closePanel = useCallback(() => {
    setActivePanel(null);
  }, []);

  return { activePanel, openPanel, closePanel };
}
