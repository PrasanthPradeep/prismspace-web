/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
// components/DataBackup.tsx
'use client';

import { useState, useRef } from 'react';
import {
  downloadBackup,
  importAllData,
  getDatabaseStats,
  clearAllData,
  validateBackupFile,
  type ImportResult
} from '@/lib/db-export';
import { GradientButton } from '@/components/kokonutui/gradient-button';
import { CosmicButton } from '@/components/ui/cosmic-button';

export function DataBackup() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStats = async () => {
    const dbStats = await getDatabaseStats();
    setStats(dbStats);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setMessage(null);

    try {
      const result = await downloadBackup();
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `Export failed: ${error.message}` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setMessage(null);

    try {
      // Validate file first
      const validation = await validateBackupFile(file);
      if (!validation.valid) {
        setMessage({ type: 'error', text: validation.message });
        setIsImporting(false);
        return;
      }

      // Confirm before proceeding
      const confirmed = window.confirm(
        `This will replace all current data with the backup file.\n\n` +
        `Backup contains:\n${validation.details?.tables?.join(', ')}\n\n` +
        `Are you sure you want to continue?`
      );

      if (!confirmed) {
        setMessage({ type: 'info', text: 'Import cancelled' });
        setIsImporting(false);
        return;
      }

      // Import data
      const result = await importAllData(file, {
        clearTablesBeforeImport: true
      });

      if (result.success) {
        setMessage({
          type: 'success',
          text: `${result.message}. ${result.tablesImported} tables imported. Please refresh the page.`
        });
        
        // Reload stats
        await loadStats();
      } else {
        setMessage({ type: 'error', text: `${result.message}: ${result.error || 'Unknown error'}` });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `Import failed: ${error.message}` });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClearData = async () => {
    if (!showConfirmClear) {
      setShowConfirmClear(true);
      return;
    }

    const confirmed = window.confirm(
      'This will DELETE ALL DATA from the database!\n\n' +
      'This action cannot be undone.\n\n' +
      'Are you absolutely sure?'
    );

    if (!confirmed) {
      setShowConfirmClear(false);
      return;
    }

    try {
      const result = await clearAllData();
      
      if (result.success) {
        setMessage({ type: 'success', text: 'All data cleared successfully. Please refresh the page.' });
        await loadStats();
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `Clear failed: ${error.message}` });
    } finally {
      setShowConfirmClear(false);
    }
  };

  return (
    <div className="glass-dark rounded-2xl p-6 w-full max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4 text-white">🗄️ Database Backup & Restore</h2>
      
      <p className="text-sm text-gray-300 mb-6">
        Export your entire PrismSpace database to a single JSON file, or restore from a previous backup.
        All tables, indexes, and data are included.
      </p>

      {/* Stats */}
      {stats && (
        <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3">Database Statistics</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-400">Total Records:</span>
              <span className="ml-2 text-white font-mono">{stats.totalRecords.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-400">Estimated Size:</span>
              <span className="ml-2 text-white font-mono">{stats.estimatedSizeKB.toLocaleString()} KB</span>
            </div>
          </div>
          <details className="mt-3">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
              Show table breakdown
            </summary>
            <div className="mt-2 space-y-1">
              {stats.tables.map((table: any) => (
                <div key={table.name} className="text-xs flex justify-between">
                  <span className="text-gray-400">{table.name}</span>
                  <span className="text-white font-mono">{table.count}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {!stats && (
        <CosmicButton
          as="button"
          onClick={loadStats}
          className="mb-6"
        >
          Load Statistics
        </CosmicButton>
      )}

      {/* Action Buttons */}
      <div className="space-y-3 mb-6">
        <GradientButton
          onClick={handleExport}
          loading={isExporting}
          disabled={isExporting}
          variant="emerald"
          className="w-full h-12 text-sm font-semibold"
        >
          {isExporting ? 'Exporting...' : '📥 Export All Data'}
        </GradientButton>

        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImport}
            disabled={isImporting}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
          />
          <GradientButton
            loading={isImporting}
            disabled={isImporting}
            variant="emerald"
            className="w-full h-12 text-sm font-semibold"
          >
            {isImporting ? 'Importing...' : '📤 Import from Backup'}
          </GradientButton>
        </div>

        <CosmicButton
          as="button"
          onClick={handleClearData}
          className="w-full"
        >
          {showConfirmClear ? '⚠️ Click Again to Confirm DELETE' : '🗑️ Clear All Data'}
        </CosmicButton>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`p-4 rounded-xl border ${
            message.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-200'
              : message.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-200'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-200'
          }`}
        >
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
        <h3 className="text-xs font-semibold text-white mb-2">💡 Tips</h3>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Backups are stored as JSON files you can open in any text editor</li>
          <li>• Import will completely replace all existing data</li>
          <li>• You can schedule regular backups using browser extensions</li>
          <li>• After importing, refresh the page to see changes</li>
        </ul>
      </div>
    </div>
  );
}
