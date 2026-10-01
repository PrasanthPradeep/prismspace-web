/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
// lib/db-export.ts
// Full backup and restore utilities for PrismDB using dexie-export-import
'use client';

import { exportDB, importDB, importInto } from 'dexie-export-import';
import { db } from './db';

export interface ExportResult {
  success: boolean;
  message: string;
  blob?: Blob;
  filename?: string;
}

export interface ImportResult {
  success: boolean;
  message: string;
  tablesImported?: number;
  error?: string;
}

/**
 * Export entire database to a Blob
 */
export async function exportAllData(): Promise<ExportResult> {
  try {
    const blob = await exportDB(db);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `prism-backup-${timestamp}.json`;

    return {
      success: true,
      message: 'Database exported successfully',
      blob,
      filename
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Export failed: ${error.message || 'Unknown error'}`
    };
  }
}

/**
 * Download exported database as file
 */
export async function downloadBackup(): Promise<ExportResult> {
  const result = await exportAllData();
  
  if (result.success && result.blob && result.filename) {
    try {
      // Create download link
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return {
        success: true,
        message: `Backup downloaded as ${result.filename}`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Download failed: ${error.message}`
      };
    }
  }

  return result;
}

/**
 * Import database from File object (overwrites existing data)
 */
export async function importAllData(
  file: File,
  options?: {
    clearTablesBeforeImport?: boolean;
    progressCallback?: (progress: { totalTables: number; completedTables: number }) => void;
  }
): Promise<ImportResult> {
  try {
    // Read file as Blob
    const blob = new Blob([await file.arrayBuffer()], { type: 'application/json' });

    if (options?.clearTablesBeforeImport) {
      // Delete and recreate database for clean import
      await db.delete();
      // Wait a bit for IndexedDB to fully close
      await new Promise(resolve => setTimeout(resolve, 100));
      // Reopen with import
      await importDB(blob);
    } else {
      // Import into existing database (may merge data)
      await importInto(db, blob, {
        overwriteValues: true,
        clearTablesBeforeImport: options?.clearTablesBeforeImport || false
      });
    }

    // Count imported tables
    const tables = db.tables.length;

    return {
      success: true,
      message: 'Database imported successfully',
      tablesImported: tables
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Import failed',
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Export specific table to JSON
 */
export async function exportTable(tableName: string): Promise<ExportResult> {
  try {
    const table = (db as any)[tableName];
    if (!table) {
      return {
        success: false,
        message: `Table "${tableName}" not found`
      };
    }

    const data = await table.toArray();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const filename = `prism-${tableName}-${new Date().toISOString().slice(0, 10)}.json`;

    return {
      success: true,
      message: `Table ${tableName} exported successfully`,
      blob,
      filename
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Export failed: ${error.message}`
    };
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  try {
    const stats = await Promise.all(
      db.tables.map(async (table) => ({
        name: table.name,
        count: await table.count()
      }))
    );

    const totalRecords = stats.reduce((sum, table) => sum + table.count, 0);

    // Estimate size (rough approximation)
    let estimatedSizeKB = 0;
    for (const table of db.tables) {
      const sample = await table.limit(10).toArray();
      if (sample.length > 0) {
        const avgSize = JSON.stringify(sample).length / sample.length;
        const tableCount = await table.count();
        estimatedSizeKB += (avgSize * tableCount) / 1024;
      }
    }

    return {
      tables: stats,
      totalRecords,
      estimatedSizeKB: Math.round(estimatedSizeKB),
      databaseName: db.name,
      version: db.verno
    };
  } catch (error: any) {
    console.error('Failed to get database stats:', error);
    return null;
  }
}

/**
 * Clear all data from database (keep structure)
 */
export async function clearAllData(): Promise<ImportResult> {
  try {
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) {
        await table.clear();
      }
    });

    return {
      success: true,
      message: 'All data cleared successfully',
      tablesImported: 0
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to clear data',
      error: error.message
    };
  }
}

/**
 * Validate backup file before import
 */
export async function validateBackupFile(file: File): Promise<{
  valid: boolean;
  message: string;
  details?: {
    databaseName?: string;
    version?: number;
    tables?: string[];
  };
}> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Check if it's a Dexie export format
    if (!data.databaseName || !data.tables) {
      return {
        valid: false,
        message: 'Invalid backup file format'
      };
    }

    if (data.databaseName !== db.name) {
      return {
        valid: false,
        message: `Backup is for database "${data.databaseName}", but current database is "${db.name}"`
      };
    }

    const tableNames = data.tables.map((t: any) => t.name);

    return {
      valid: true,
      message: 'Valid backup file',
      details: {
        databaseName: data.databaseName,
        version: data.databaseVersion,
        tables: tableNames
      }
    };
  } catch (error: any) {
    return {
      valid: false,
      message: `File validation failed: ${error.message}`
    };
  }
}
