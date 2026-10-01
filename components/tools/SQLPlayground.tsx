/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { GradientButton } from '@/components/kokonutui/gradient-button';
import { SQLIcon } from './ToolIcons';

interface SQLPlaygroundProps {
  onClose: () => void;
}

interface QueryResult {
  columns: string[];
  values: (string | number | null)[][];
}

interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: unknown;
  pk: number;
}

interface DBInstance {
  exec: (opts: {
    sql: string;
    rowMode: string;
    resultRows?: unknown[];
    callback?: (row: Record<string, unknown>) => void;
  }) => void;
}

interface SQLiteModule {
  oo1: { DB: new () => DBInstance };
  capi: {
    sqlite3_libversion: () => string;
    sqlite3_js_db_export: (ptr: unknown) => Uint8Array;
    sqlite3_deserialize: (...args: unknown[]) => void;
    SQLITE_DESERIALIZE_FREEONCLOSE: number;
    SQLITE_DESERIALIZE_RESIZEABLE: number;
  };
  wasm: { allocFromTypedArray: (arr: Uint8Array) => unknown };
}

declare global {
  interface Window {
    sqlite3InitModule?: (config: { print: typeof console.log; printErr: typeof console.error }) => Promise<SQLiteModule>;
  }
}

const STARTER_SQL = `-- Welcome to SQL Playground!
-- Press Ctrl+Enter or click Run to execute.

CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  role       TEXT    NOT NULL,
  created_at TEXT    DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO users (id, name, role) VALUES
  (1, 'Alice',   'admin'),
  (2, 'Bob',     'editor'),
  (3, 'Charlie', 'viewer'),
  (4, 'Diana',   'architect'),
  (5, 'Evan',    'developer');

SELECT * FROM users ORDER BY id ASC;
`;

const SAMPLE_PRESETS = [
  {
    name: 'Users & Roles',
    desc: 'Starter table with 5 sample users',
    sql: STARTER_SQL,
  },
  {
    name: 'E-Commerce (JOIN)',
    desc: 'Customers & orders relational join',
    sql: `-- Relational Schema: Customers & Orders
CREATE TABLE IF NOT EXISTS customers (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  name    TEXT    NOT NULL,
  tier    TEXT    DEFAULT 'standard',
  country TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  amount      REAL    NOT NULL,
  status      TEXT    DEFAULT 'completed',
  order_date  TEXT    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

INSERT OR IGNORE INTO customers (id, name, tier, country) VALUES
  (1, 'Apex Corp',   'enterprise', 'US'),
  (2, 'Veloce AI',   'pro',        'DE'),
  (3, 'Prism Space', 'enterprise', 'JP'),
  (4, 'Kite Data',   'starter',    'UK');

INSERT OR IGNORE INTO orders (id, customer_id, amount, status) VALUES
  (1, 1, 3400.00, 'completed'),
  (2, 1, 1250.50, 'completed'),
  (3, 2, 890.00,  'pending'),
  (4, 3, 5200.00, 'completed'),
  (5, 3, 1400.00, 'completed'),
  (6, 4, 320.00,  'refunded');

-- Aggregate Revenue by Customer
SELECT 
  c.name AS customer,
  UPPER(c.tier) AS tier,
  c.country,
  COUNT(o.id) AS order_count,
  PRINTF('$%.2f', SUM(o.amount)) AS total_spent
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id
ORDER BY SUM(o.amount) DESC;
`,
  },
  {
    name: 'Series Benchmark (1,000 Rows)',
    desc: 'Recursive CTE generating 1,000 records',
    sql: `-- High-Volume In-Memory CTE Benchmark
WITH RECURSIVE generate_series(value) AS (
  SELECT 1
  UNION ALL
  SELECT value + 1 FROM generate_series WHERE value < 1000
)
SELECT 
  value AS id,
  HEX(RANDOMBLOB(4)) AS device_uid,
  ROUND((ABS(RANDOM()) % 10000) / 100.0, 2) AS latency_ms,
  CASE (value % 4)
    WHEN 0 THEN 'ACTIVE'
    WHEN 1 THEN 'STANDBY'
    WHEN 2 THEN 'DEGRADED'
    ELSE 'OPTIMAL'
  END AS telemetry_status,
  DATETIME('now', printf('-%d seconds', value * 12)) AS timestamp
FROM generate_series;
`,
  },
];

const SCHEMA_SQL = `SELECT name FROM sqlite_schema
WHERE type = 'table'
  AND name NOT LIKE 'sqlite_%'
  AND name NOT LIKE 'sqlean_%'
ORDER BY name`;

export function SQLPlayground({ onClose }: SQLPlaygroundProps) {
  // Engine state
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [sqliteVersion, setSqliteVersion] = useState('');
  const sqliteRef = useRef<SQLiteModule | null>(null);
  const dbRef = useRef<DBInstance | null>(null);

  // Editor / results state
  const [sql, setSql] = useState(STARTER_SQL);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [tableMeta, setTableMeta] = useState<Record<string, ColumnInfo[]>>({});
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<{ type: 'idle' | 'ok' | 'error' | 'running'; msg: string }>({
    type: 'idle',
    msg: 'Initializing SQLite...',
  });
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Refresh Tables & Columns ─────────────────────────────────────────
  const refreshSchema = useCallback((db: DBInstance) => {
    try {
      const tableRows: unknown[] = [];
      db.exec({ sql: SCHEMA_SQL, rowMode: 'object', resultRows: tableRows });
      const tbls = (tableRows as { name: string }[]).map((r) => r.name);
      setTables(tbls);

      const metas: Record<string, ColumnInfo[]> = {};
      for (const t of tbls) {
        try {
          const colRows: unknown[] = [];
          db.exec({
            sql: `PRAGMA table_info("${t.replace(/"/g, '""')}");`,
            rowMode: 'object',
            resultRows: colRows,
          });
          metas[t] = colRows as ColumnInfo[];
        } catch {
          metas[t] = [];
        }
      }
      setTableMeta(metas);
    } catch (err) {
      console.error('Schema refresh error:', err);
    }
  }, []);

  // ── Execute SQL ─────────────────────────────────────────────────────
  const execute = useCallback(() => {
    const db = dbRef.current;
    if (!db) return;

    const query = (() => {
      const textarea = textareaRef.current;
      if (!textarea) return sql;
      const sel = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd).trim();
      return sel || sql;
    })();

    if (!query.trim()) {
      setStatus({ type: 'idle', msg: 'No query provided' });
      return;
    }

    setStatus({ type: 'running', msg: 'Executing query...' });
    const t0 = performance.now();

    try {
      const rows: unknown[] = [];
      db.exec({ sql: query, rowMode: 'object', resultRows: rows });
      const ms = Math.round((performance.now() - t0) * 10) / 10;
      setElapsed(ms);

      if (!rows.length) {
        setResult(null);
        setStatus({ type: 'ok', msg: `Statement executed (0 rows returned) · ${ms}ms` });
      } else {
        const columns = Object.keys(rows[0] as object);
        const values = (rows as Record<string, unknown>[]).map((r) =>
          columns.map((c) => r[c] as string | number | null)
        );
        setResult({ columns, values });
        setStatus({
          type: 'ok',
          msg: `${rows.length} row${rows.length === 1 ? '' : 's'} returned · ${ms}ms`,
        });
      }

      refreshSchema(db);
    } catch (e) {
      const ms = Math.round((performance.now() - t0) * 10) / 10;
      setElapsed(ms);
      const msg = e instanceof Error ? e.message.split('\n')[0] : String(e);
      setResult(null);
      setStatus({ type: 'error', msg });
    }
  }, [sql, refreshSchema]);

  // ── Load SQLite WASM ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (!window.sqlite3InitModule) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            s.src = '/sqlite/sqlean.js';
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Failed to load sqlean.js'));
            document.head.appendChild(s);
          });
        }
        if (!window.sqlite3InitModule) throw new Error('sqlite3InitModule not found');
        const sqlite3 = await window.sqlite3InitModule({ print: console.log, printErr: console.error });
        if (cancelled) return;
        sqliteRef.current = sqlite3;
        const db = new sqlite3.oo1.DB();
        dbRef.current = db;
        const ver = sqlite3.capi.sqlite3_libversion();
        setSqliteVersion(ver);
        setReady(true);
        setStatus({ type: 'idle', msg: `SQLite ${ver} WASM ready` });

        // Auto execute initial starter SQL to populate initial tables
        try {
          const rows: unknown[] = [];
          db.exec({ sql: STARTER_SQL, rowMode: 'object', resultRows: rows });
          if (rows.length) {
            const columns = Object.keys(rows[0] as object);
            const values = (rows as Record<string, unknown>[]).map((r) =>
              columns.map((c) => r[c] as string | number | null)
            );
            setResult({ columns, values });
            setStatus({ type: 'ok', msg: `${rows.length} rows returned · initial seed` });
          }
          refreshSchema(db);
        } catch {
          // Ignore initial seed query error if any
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load SQLite WASM');
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshSchema]);

  // ── Show a table's content ──────────────────────────────────────────
  const showTable = useCallback(
    (table: string) => {
      const q = `SELECT * FROM "${table}" LIMIT 100;`;
      setSql(q);
      const db = dbRef.current;
      if (!db) return;
      setTimeout(() => {
        try {
          const t0 = performance.now();
          const rows: unknown[] = [];
          db.exec({ sql: q, rowMode: 'object', resultRows: rows });
          const ms = Math.round((performance.now() - t0) * 10) / 10;
          setElapsed(ms);
          if (rows.length) {
            const columns = Object.keys(rows[0] as object);
            const values = (rows as Record<string, unknown>[]).map((r) =>
              columns.map((c) => r[c] as string | number | null)
            );
            setResult({ columns, values });
            setStatus({
              type: 'ok',
              msg: `${rows.length} row${rows.length === 1 ? '' : 's'} from "${table}" · ${ms}ms`,
            });
          } else {
            setResult(null);
            setStatus({ type: 'ok', msg: `Table "${table}" is empty · ${ms}ms` });
          }
        } catch (e) {
          setResult(null);
          setStatus({ type: 'error', msg: e instanceof Error ? e.message : String(e) });
        }
      }, 20);
    },
    []
  );

  // ── Keyboard shortcut ───────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.keyCode === 13)) {
        e.preventDefault();
        execute();
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const el = e.currentTarget;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const next = el.value.substring(0, start) + '  ' + el.value.substring(end);
        setSql(next);
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = start + 2;
        });
      }
    },
    [execute]
  );

  // ── Import .db or .sql file ─────────────────────────────────────────
  const handleFileImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !sqliteRef.current) return;
      const sqlite3 = sqliteRef.current;
      const isSql = file.name.endsWith('.sql');
      const reader = new FileReader();

      reader.onload = () => {
        try {
          const newDb = (() => {
            if (isSql) {
              const db = new sqlite3.oo1.DB();
              db.exec({ sql: reader.result as string, rowMode: 'object' });
              return db;
            } else {
              const bytes = new Uint8Array(reader.result as ArrayBuffer);
              const p = sqlite3.wasm.allocFromTypedArray(bytes);
              const db = new sqlite3.oo1.DB();
              sqlite3.capi.sqlite3_deserialize(
                (db as unknown as { pointer: unknown }).pointer,
                'main',
                p,
                bytes.length,
                bytes.length,
                sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE | sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE
              );
              return db;
            }
          })();

          dbRef.current = newDb;
          refreshSchema(newDb);
          setResult(null);
          setStatus({
            type: 'ok',
            msg: `Imported "${file.name}" successfully`,
          });
        } catch (err) {
          setStatus({
            type: 'error',
            msg: err instanceof Error ? err.message : 'File import failed',
          });
        }
      };

      isSql ? reader.readAsText(file) : reader.readAsArrayBuffer(file);
      e.target.value = '';
    },
    [refreshSchema]
  );

  // ── Export current result as CSV ────────────────────────────────────
  const exportCsv = useCallback(() => {
    if (!result) return;
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [result.columns, ...result.values].map((row) => row.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `query_results_${Date.now()}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  // ── Copy Result as JSON ─────────────────────────────────────────────
  const copyJson = useCallback(() => {
    if (!result) return;
    const objects = result.values.map((row) => {
      const obj: Record<string, unknown> = {};
      result.columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
    navigator.clipboard.writeText(JSON.stringify(objects, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [result]);

  // ── Format SQL Keywords ─────────────────────────────────────────────
  const formatCode = useCallback(() => {
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'INSERT INTO', 'INSERT OR IGNORE INTO', 'VALUES',
      'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE IF NOT EXISTS', 'CREATE TABLE',
      'DROP TABLE IF EXISTS', 'DROP TABLE', 'ALTER TABLE', 'ADD COLUMN', 'LEFT JOIN',
      'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN', 'JOIN', 'ON', 'GROUP BY', 'ORDER BY',
      'HAVING', 'LIMIT', 'OFFSET', 'UNION ALL', 'UNION', 'AND', 'OR', 'NOT', 'IN',
      'IS NULL', 'IS NOT NULL', 'AS', 'DISTINCT', 'CASE', 'WHEN', 'THEN', 'ELSE',
      'END', 'PRIMARY KEY', 'AUTOINCREMENT', 'DEFAULT', 'PRAGMA', 'WITH RECURSIVE',
      'WITH', 'ASC', 'DESC', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROUND', 'HEX',
      'PRINTF', 'DATETIME', 'CURRENT_TIMESTAMP'
    ];
    let formatted = sql;
    keywords.forEach((kw) => {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      formatted = formatted.replace(regex, kw);
    });
    setSql(formatted);
  }, [sql]);

  // ── Reset database ──────────────────────────────────────────────────
  const resetDb = useCallback(() => {
    if (!sqliteRef.current) return;
    try {
      dbRef.current = new sqliteRef.current.oo1.DB();
      setTables([]);
      setTableMeta({});
      setResult(null);
      setSql(STARTER_SQL);
      setStatus({ type: 'ok', msg: 'Database reset to clean in-memory instance' });
    } catch {
      setStatus({ type: 'error', msg: 'Reset failed' });
    }
  }, []);

  // ── Load Preset Query ───────────────────────────────────────────────
  const loadPreset = useCallback(
    (presetSql: string) => {
      setSql(presetSql);
      setShowPresets(false);
      const db = dbRef.current;
      if (!db) return;
      setTimeout(() => {
        try {
          const t0 = performance.now();
          const rows: unknown[] = [];
          db.exec({ sql: presetSql, rowMode: 'object', resultRows: rows });
          const ms = Math.round((performance.now() - t0) * 10) / 10;
          setElapsed(ms);
          if (rows.length) {
            const columns = Object.keys(rows[0] as object);
            const values = (rows as Record<string, unknown>[]).map((r) =>
              columns.map((c) => r[c] as string | number | null)
            );
            setResult({ columns, values });
            setStatus({
              type: 'ok',
              msg: `${rows.length} rows returned · ${ms}ms`,
            });
          } else {
            setResult(null);
            setStatus({ type: 'ok', msg: `Preset executed (0 rows) · ${ms}ms` });
          }
          refreshSchema(db);
        } catch (e) {
          setResult(null);
          setStatus({ type: 'error', msg: e instanceof Error ? e.message : String(e) });
        }
      }, 30);
    },
    [refreshSchema]
  );

  return (
    <div className="sql-root">
      {/* ── High-Voltage Header Bar ── */}
      <header className="sql-header">
        <div className="sql-header-left">
          <div className="sql-engine-icon-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SQLIcon size={20} glow />
            <span className="sql-pulse-dot" />
          </div>

          <div className="sql-title-group">
            <div className="sql-badge-group">
              <span className="sql-tag-sqlite">SQLite {sqliteVersion || 'WASM'}</span>
            </div>
          </div>
        </div>

        <div className="sql-header-actions">
          {/* Preset Queries Dropdown */}
          <div className="sql-dropdown-wrap">
            <button
              className="sql-action-btn sql-action-btn-secondary"
              onClick={() => setShowPresets((p) => !p)}
              title="Load sample schema and queries"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span>Presets</span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                style={{ transform: showPresets ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showPresets && (
              <div className="sql-presets-menu">
                <div className="sql-presets-menu-header">{'// SAMPLE DATASETS'}</div>
                {SAMPLE_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    className="sql-preset-item"
                    onClick={() => loadPreset(p.sql)}
                  >
                    <div className="sql-preset-title">{p.name}</div>
                    <div className="sql-preset-desc">{p.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Import file */}
          <label className="sql-action-btn sql-action-btn-secondary" title="Import SQLite .db, .sqlite or .sql file">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Import</span>
            <input type="file" accept=".db,.sqlite,.sql" onChange={handleFileImport} style={{ display: 'none' }} />
          </label>

          {/* Reset database */}
          <button className="sql-action-btn sql-action-btn-secondary" onClick={resetDb} title="Reset database to fresh in-memory state">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span>Reset</span>
          </button>

          {/* Close button */}
          <button className="sql-action-btn sql-action-close" onClick={onClose} title="Close SQL Playground">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Main Layout (Sidebar + Center Console) ── */}
      <div className="sql-body">
        {/* ── Sidebar: Schema Explorer ── */}
        <aside className="sql-sidebar">
          <div className="sql-sidebar-header">
            <div className="sql-sidebar-title">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
              <span>SCHEMA EXPLORER</span>
            </div>
            <span className="sql-table-count-badge">{tables.length} {tables.length === 1 ? 'TABLE' : 'TABLES'}</span>
          </div>

          <div className="sql-sidebar-content">
            {tables.length === 0 ? (
              <div className="sql-sidebar-empty">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
                <div className="sql-empty-title">No tables found</div>
                <p className="sql-empty-hint">Execute a <code>CREATE TABLE</code> query or choose a preset dataset.</p>
                <button
                  className="sql-empty-action-btn"
                  onClick={() => loadPreset(STARTER_SQL)}
                >
                  Load Starter Schema
                </button>
              </div>
            ) : (
              <div className="sql-table-tree">
                {tables.map((t) => {
                  const cols = tableMeta[t] || [];
                  const isExpanded = expandedTables[t] !== false; // expanded by default

                  return (
                    <div key={t} className="sql-table-node">
                      <div
                        className="sql-table-row"
                        onClick={() => showTable(t)}
                        title={`Click to query SELECT * FROM "${t}" LIMIT 100`}
                      >
                        <button
                          className="sql-table-expand-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedTables((prev) => ({ ...prev, [t]: !isExpanded }));
                          }}
                          title={isExpanded ? 'Collapse columns' : 'Expand columns'}
                        >
                          <svg
                            width="9"
                            height="9"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>

                        <span className="sql-table-icon">⊞</span>
                        <span className="sql-table-name">{t}</span>
                        <span className="sql-table-col-count">{cols.length}</span>

                        <span className="sql-table-quick-run" title="Run SELECT">
                          SELECT
                        </span>
                      </div>

                      {isExpanded && cols.length > 0 && (
                        <div className="sql-col-list">
                          {cols.map((c) => (
                            <div
                              key={c.name}
                              className="sql-col-item"
                              onClick={() => {
                                setSql((prev) => prev + `\nSELECT "${c.name}" FROM "${t}" LIMIT 50;\n`);
                              }}
                              title={`Insert "${c.name}" into editor`}
                            >
                              <span className="sql-col-bullet">•</span>
                              <span className="sql-col-name">{c.name}</span>
                              <span className="sql-col-type">{c.type || 'ANY'}</span>
                              {Boolean(c.pk) && <span className="sql-pk-badge">PK</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* ── Main Workspace ── */}
        <main className="sql-main">
          {/* Editor Header */}
          <section className="sql-editor-section">
            <div className="sql-editor-toolbar">
              <div className="sql-editor-label-group">
                <span className="sql-editor-prompt-symbol">&gt;</span>
                <span className="sql-editor-title">SQL QUERY CONSOLE</span>
              </div>

              <div className="sql-editor-hints">
                <span className="sql-key-pill"><kbd>Ctrl+↵</kbd> Run</span>
                <span className="sql-key-pill"><kbd>Tab</kbd> Indent</span>
                <span className="sql-key-pill"><kbd>Selection</kbd> Partial Run</span>

                <button className="sql-mini-btn" onClick={formatCode} title="Format SQL keywords to uppercase">
                  Format
                </button>
                <button
                  className="sql-mini-btn"
                  onClick={() => setSql('')}
                  title="Clear SQL Editor"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Code Textarea with Line Numbers */}
            <div className="sql-code-container">
              <div className="sql-line-gutter" aria-hidden>
                {sql.split('\n').map((_, i) => (
                  <div key={i} className="sql-line-num">
                    {i + 1}
                  </div>
                ))}
              </div>

              <textarea
                ref={textareaRef}
                className="sql-textarea"
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                disabled={!ready}
                placeholder={ready ? 'Enter SQLite statement here...' : 'Initializing SQLite WASM engine...'}
              />
            </div>

            {/* High-Voltage Run Bar */}
            <div className="sql-run-bar">
              <GradientButton
                className="h-9 px-4 text-xs font-mono tracking-wider"
                onClick={execute}
                loading={status.type === 'running'}
                disabled={!ready || status.type === 'running'}
                title="Execute SQL query (Ctrl+Enter)"
                variant="emerald"
                icon={
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                }
              >
                {status.type === 'running' ? 'RUNNING...' : 'RUN QUERY'}
              </GradientButton>

              {/* Status Telemetry */}
              <div className={`sql-telemetry-pill sql-telemetry-${status.type}`}>
                {status.type === 'ok' && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {status.type === 'error' && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                )}
                {status.type === 'running' && <span className="sql-running-spinner" />}
                {status.type === 'idle' && <span className="sql-idle-dot" />}
                <span className="sql-status-text">{loadError || status.msg}</span>
              </div>

              {/* Results Action Bar */}
              <div className="sql-run-actions">
                {result && (
                  <>
                    <button
                      className="sql-action-btn sql-action-btn-secondary"
                      onClick={copyJson}
                      title="Copy result rows as formatted JSON"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                    </button>

                    <button
                      className="sql-action-btn sql-action-btn-secondary"
                      onClick={exportCsv}
                      title="Export current result dataset as CSV"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span>Export CSV</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* ── Results Section ── */}
          <section className="sql-results-section">
            {!ready && !loadError && (
              <div className="sql-results-empty-state">
                <div className="sql-loader-ring" />
                <div className="sql-empty-title">INITIALIZING SQLITE WASM...</div>
                <div className="sql-empty-hint">Loading sqlean.js module in browser memory</div>
              </div>
            )}

            {loadError && (
              <div className="sql-results-error-state">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div className="sql-error-title">WASM MODULE LOAD ERROR</div>
                <pre className="sql-error-details">{loadError}</pre>
              </div>
            )}

            {ready && status.type === 'error' && (
              <div className="sql-results-error-state">
                <div className="sql-error-banner">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fb7185" strokeWidth="2.5">
                    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span className="sql-error-title">EXECUTION ERROR</span>
                  {elapsed !== null && <span className="sql-error-time">{elapsed}ms</span>}
                </div>
                <pre className="sql-error-details">{status.msg}</pre>
              </div>
            )}

            {ready && !result && status.type !== 'error' && (
              <div className="sql-results-empty-state">
                <div className="sql-empty-icon-box">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                </div>
                <div className="sql-empty-title">AWAITING QUERY EXECUTION</div>
                <p className="sql-empty-hint">
                  Execute a query above or click any table in the schema explorer to preview records.
                </p>
                <div className="sql-empty-shortcuts">
                  <span>Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to run statement</span>
                </div>
              </div>
            )}

            {ready && result && (
              <div className="sql-grid-wrapper">
                {/* Result header telemetry */}
                <div className="sql-grid-meta-bar">
                  <div className="sql-grid-meta-left">
                    <span className="sql-meta-dot" />
                    <span className="sql-meta-info">
                      OUTPUT DATASET: <strong>{result.values.length}</strong> {result.values.length === 1 ? 'row' : 'rows'} × <strong>{result.columns.length}</strong> columns
                    </span>
                  </div>
                  {elapsed !== null && (
                    <div className="sql-grid-meta-right">
                      <span className="sql-meta-time">Query took <strong>{elapsed}ms</strong></span>
                    </div>
                  )}
                </div>

                {/* Table Data Grid */}
                <div className="sql-table-scroll-container">
                  <table className="sql-data-table">
                    <thead>
                      <tr>
                        <th className="sql-th-index">#</th>
                        {result.columns.map((col, idx) => (
                          <th key={col} className="sql-th">
                            <span className="sql-th-name">{col}</span>
                            <span className="sql-th-idx">c{idx + 1}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.values.map((row, ri) => (
                        <tr key={ri} className={ri % 2 === 0 ? 'sql-tr-even' : 'sql-tr-odd'}>
                          <td className="sql-td-index">{ri + 1}</td>
                          {row.map((cell, ci) => (
                            <td key={ci} className={`sql-td ${cell === null ? 'sql-td-null' : ''}`}>
                              {cell === null ? (
                                <span className="sql-null-tag">NULL</span>
                              ) : typeof cell === 'number' ? (
                                <span className="sql-num-val">{cell}</span>
                              ) : (
                                String(cell)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* ── High-Voltage Scoped Styling ── */}
      <style>{`
        /* ── Root Layout ── */
        .sql-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          background-color: #090c12;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          background-size: 24px 24px;
          color: #f1f5f9;
          font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 13px;
          overflow: hidden;
          position: relative;
        }

        /* ── Header ── */
        .sql-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          height: 48px;
          background: rgba(9, 12, 18, 0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
          gap: 12px;
          z-index: 20;
        }

        .sql-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sql-engine-icon-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 6px;
          background: rgba(0, 223, 129, 0.08);
          border: 1px solid rgba(0, 223, 129, 0.25);
          color: #00df81;
        }

        .sql-pulse-dot {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #00df81;
          box-shadow: 0 0 8px #00df81;
          animation: sql-pulse 2s infinite ease-in-out;
        }

        @keyframes sql-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.6; }
        }

        .sql-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sql-title-main {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: -0.02em;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .sql-title-word {
          background: #000000;
          color: #00df81;
          padding: 1px 7px 2px;
          border-radius: 4px;
          font-size: 13px;
          letter-spacing: 0.02em;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }

        .sql-title-accent {
          color: #00df81;
        }

        .sql-badge-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sql-tag-sqlite {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          background: rgba(0, 223, 129, 0.1);
          color: #00df81;
          border: 1px solid rgba(0, 223, 129, 0.25);
          border-radius: 4px;
          padding: 1.5px 7px;
          letter-spacing: 0.03em;
        }

        .sql-tag-status {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: #94a3b8;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 4px;
          padding: 1.5px 7px;
        }

        .sql-tag-status-text {
          color: #64748b;
        }

        .sql-mini-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #00df81;
        }

        .sql-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* ── Action Buttons ── */
        .sql-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 28px;
          padding: 0 10px;
          border-radius: 6px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          border: none;
          white-space: nowrap;
        }

        .sql-action-btn-secondary {
          background: rgba(255, 255, 255, 0.04);
          color: #cbd5e1;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .sql-action-btn-secondary:hover {
          background: rgba(0, 223, 129, 0.1);
          border-color: rgba(0, 223, 129, 0.3);
          color: #00df81;
        }

        .sql-action-close {
          background: rgba(255, 255, 255, 0.04);
          color: #94a3b8;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0 8px;
        }

        .sql-action-close:hover {
          background: rgba(244, 63, 94, 0.15);
          border-color: rgba(244, 63, 94, 0.3);
          color: #f43f5e;
        }

        /* Presets Menu */
        .sql-dropdown-wrap {
          position: relative;
        }

        .sql-presets-menu {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          width: 260px;
          background: #0b0f17;
          border: 1px solid rgba(0, 223, 129, 0.25);
          border-radius: 8px;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
          padding: 6px;
          z-index: 50;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sql-presets-menu-header {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #64748b;
          padding: 6px 8px 3px 8px;
        }

        .sql-preset-item {
          display: flex;
          flex-direction: column;
          text-align: left;
          gap: 2px;
          padding: 7px 9px;
          border-radius: 6px;
          background: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .sql-preset-item:hover {
          background: rgba(0, 223, 129, 0.08);
          border-color: rgba(0, 223, 129, 0.2);
        }

        .sql-preset-title {
          font-size: 12px;
          font-weight: 600;
          color: #f1f5f9;
        }

        .sql-preset-item:hover .sql-preset-title {
          color: #00df81;
        }

        .sql-preset-desc {
          font-size: 10.5px;
          color: #64748b;
        }

        /* ── Body Grid ── */
        .sql-body {
          display: grid;
          grid-template-columns: 240px 1fr;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        /* ── Sidebar: Schema Explorer ── */
        .sql-sidebar {
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }

        .sql-sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.015);
        }

        .sql-sidebar-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: #00df81;
        }

        .sql-table-count-badge {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9.5px;
          color: #94a3b8;
          background: rgba(255, 255, 255, 0.04);
          padding: 1px 6px;
          border-radius: 4px;
        }

        .sql-sidebar-content {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .sql-sidebar-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 28px 12px;
          gap: 8px;
          color: #64748b;
        }

        .sql-empty-title {
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
        }

        .sql-empty-hint {
          font-size: 11px;
          line-height: 1.4;
          color: #64748b;
          margin: 0;
        }

        .sql-empty-hint code {
          color: #00df81;
          background: rgba(0, 223, 129, 0.08);
          padding: 1px 4px;
          border-radius: 3px;
          font-family: 'JetBrains Mono', monospace;
        }

        .sql-empty-action-btn {
          margin-top: 6px;
          padding: 5px 10px;
          font-size: 11px;
          font-weight: 600;
          border-radius: 5px;
          background: rgba(0, 223, 129, 0.1);
          color: #00df81;
          border: 1px solid rgba(0, 223, 129, 0.25);
          cursor: pointer;
          transition: all 0.15s;
        }

        .sql-empty-action-btn:hover {
          background: #00df81;
          color: #000000;
        }

        .sql-table-tree {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sql-table-node {
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.04);
          overflow: hidden;
          transition: border-color 0.15s;
        }

        .sql-table-node:hover {
          border-color: rgba(0, 223, 129, 0.25);
        }

        .sql-table-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          cursor: pointer;
          user-select: none;
          transition: background 0.15s;
        }

        .sql-table-row:hover {
          background: rgba(0, 223, 129, 0.06);
        }

        .sql-table-expand-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          height: 14px;
          padding: 0;
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
        }

        .sql-table-expand-btn:hover {
          color: #00df81;
        }

        .sql-table-icon {
          color: #00df81;
          font-size: 13px;
        }

        .sql-table-name {
          flex: 1;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11.5px;
          font-weight: 600;
          color: #f1f5f9;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sql-table-col-count {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9.5px;
          color: #64748b;
          background: rgba(255, 255, 255, 0.03);
          padding: 1px 5px;
          border-radius: 3px;
        }

        .sql-table-quick-run {
          font-family: 'JetBrains Mono', monospace;
          font-size: 9px;
          font-weight: 700;
          color: #00df81;
          background: rgba(0, 223, 129, 0.12);
          padding: 1px 4px;
          border-radius: 3px;
          opacity: 0;
          transition: opacity 0.15s;
        }

        .sql-table-row:hover .sql-table-quick-run {
          opacity: 1;
        }

        .sql-col-list {
          padding: 2px 8px 6px 24px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: rgba(0, 0, 0, 0.2);
          border-top: 1px solid rgba(255, 255, 255, 0.03);
        }

        .sql-col-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.12s;
        }

        .sql-col-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
        }

        .sql-col-bullet {
          color: #475569;
          font-size: 10px;
        }

        .sql-col-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sql-col-type {
          font-size: 9.5px;
          color: #64748b;
        }

        .sql-pk-badge {
          font-size: 8.5px;
          font-weight: 700;
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.15);
          padding: 0 3px;
          border-radius: 2px;
        }

        /* ── Main Workspace ── */
        .sql-main {
          display: grid;
          grid-template-rows: auto 1fr;
          min-height: 0;
          overflow: hidden;
        }

        /* ── Editor Section ── */
        .sql-editor-section {
          display: flex;
          flex-direction: column;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: #06080d;
        }

        .sql-editor-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 7px 14px;
          background: rgba(255, 255, 255, 0.015);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          gap: 12px;
        }

        .sql-editor-label-group {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .sql-editor-prompt-symbol {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 800;
          font-size: 13px;
          color: #00df81;
        }

        .sql-editor-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: #475569;
        }

        .sql-editor-hints {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sql-key-pill {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #64748b;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .sql-key-pill kbd {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 3px;
          padding: 1px 4px;
          color: #cbd5e1;
        }

        .sql-mini-btn {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.04);
          color: #94a3b8;
          border: 1px solid rgba(255, 255, 255, 0.08);
          cursor: pointer;
          transition: all 0.12s;
        }

        .sql-mini-btn:hover {
          background: rgba(0, 223, 129, 0.1);
          color: #00df81;
          border-color: rgba(0, 223, 129, 0.25);
        }

        .sql-code-container {
          display: grid;
          grid-template-columns: 42px 1fr;
          min-height: 160px;
          max-height: 240px;
          background: #06080d;
          overflow: hidden;
        }

        .sql-line-gutter {
          display: flex;
          flex-direction: column;
          padding: 12px 0;
          background: rgba(0, 0, 0, 0.4);
          border-right: 1px solid rgba(255, 255, 255, 0.06);
          user-select: none;
          text-align: right;
          padding-right: 10px;
          overflow: hidden;
        }

        .sql-line-num {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          line-height: 1.6;
          color: #475569;
        }

        .sql-textarea {
          font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
          font-size: 12.5px;
          line-height: 1.6;
          padding: 12px 14px;
          background: transparent;
          border: none;
          outline: none;
          color: #f1f5f9;
          resize: none;
          overflow-y: auto;
          tab-size: 2;
          caret-color: #00df81;
        }

        .sql-textarea::selection {
          background: rgba(0, 223, 129, 0.25);
          color: #ffffff;
        }

        .sql-textarea::placeholder {
          color: #475569;
        }

        /* ── High-Voltage Run Bar ── */
        .sql-run-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 14px;
          background: rgba(9, 12, 18, 0.9);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          flex-wrap: wrap;
        }

        .sql-run-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          height: 32px;
          padding: 0 16px;
          border-radius: 6px;
          background: #00df81;
          color: #000000;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 16px rgba(0, 223, 129, 0.35);
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .sql-run-btn:hover:not(:disabled) {
          background: #00f590;
          box-shadow: 0 0 24px rgba(0, 223, 129, 0.5);
          transform: translateY(-1px);
        }

        .sql-run-btn:active:not(:disabled) {
          transform: translateY(1px);
        }

        .sql-run-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          box-shadow: none;
        }

        .sql-telemetry-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 5px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sql-telemetry-idle {
          color: #94a3b8;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .sql-telemetry-ok {
          color: #00df81;
          background: rgba(0, 223, 129, 0.08);
          border: 1px solid rgba(0, 223, 129, 0.25);
        }

        .sql-telemetry-error {
          color: #fb7185;
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.25);
        }

        .sql-telemetry-running {
          color: #facc15;
          background: rgba(250, 204, 21, 0.1);
          border: 1px solid rgba(250, 204, 21, 0.25);
        }

        .sql-idle-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #00df81;
        }

        .sql-running-spinner {
          width: 10px;
          height: 10px;
          border: 2px solid rgba(250, 204, 21, 0.3);
          border-top-color: #facc15;
          border-radius: 50%;
          animation: sql-spin 0.6s linear infinite;
        }

        .sql-status-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sql-run-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
        }

        /* ── Results Section ── */
        .sql-results-section {
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-height: 0;
          position: relative;
          background: #090c12;
        }

        .sql-results-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 32px 20px;
          gap: 12px;
          text-align: center;
          color: #64748b;
        }

        .sql-empty-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: #475569;
        }

        .sql-loader-ring {
          width: 32px;
          height: 32px;
          border: 2px solid rgba(0, 223, 129, 0.15);
          border-top-color: #00df81;
          border-radius: 50%;
          animation: sql-spin 0.7s linear infinite;
        }

        @keyframes sql-spin {
          to { transform: rotate(360deg); }
        }

        .sql-empty-shortcuts {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          color: #475569;
        }

        .sql-empty-shortcuts kbd {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          padding: 1px 5px;
          color: #94a3b8;
        }

        /* Error States */
        .sql-results-error-state {
          margin: 16px;
          padding: 16px;
          border-radius: 8px;
          background: rgba(244, 63, 94, 0.06);
          border: 1px solid rgba(244, 63, 94, 0.25);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .sql-error-banner {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .sql-error-title {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          color: #fb7185;
          letter-spacing: 0.05em;
        }

        .sql-error-time {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          color: #f43f5e;
          margin-left: auto;
        }

        .sql-error-details {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          line-height: 1.5;
          color: #fecdd3;
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
        }

        /* ── Grid Wrapper ── */
        .sql-grid-wrapper {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          overflow: hidden;
        }

        .sql-grid-meta-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 16px;
          background: rgba(0, 0, 0, 0.4);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-family: 'JetBrains Mono', monospace;
          font-size: 10.5px;
          flex-shrink: 0;
        }

        .sql-grid-meta-left {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #94a3b8;
        }

        .sql-meta-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #00df81;
        }

        .sql-meta-info strong {
          color: #ffffff;
        }

        .sql-grid-meta-right {
          color: #64748b;
        }

        .sql-meta-time strong {
          color: #00df81;
        }

        .sql-table-scroll-container {
          flex: 1;
          overflow: auto;
          min-height: 0;
        }

        .sql-data-table {
          width: 100%;
          border-collapse: collapse;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
        }

        .sql-data-table thead tr {
          position: sticky;
          top: 0;
          background: #0b0f17;
          z-index: 10;
        }

        .sql-th-index {
          padding: 8px 12px;
          text-align: right;
          font-size: 10px;
          color: #475569;
          border-bottom: 1px solid rgba(0, 223, 129, 0.25);
          width: 44px;
          user-select: none;
        }

        .sql-th {
          padding: 8px 14px;
          text-align: left;
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: #00df81;
          border-bottom: 1px solid rgba(0, 223, 129, 0.2);
          white-space: nowrap;
          user-select: none;
        }

        .sql-th-idx {
          font-size: 9px;
          color: #475569;
          font-weight: 400;
          margin-left: 6px;
        }

        .sql-td-index {
          padding: 6px 12px;
          text-align: right;
          color: #475569;
          font-size: 10.5px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          border-right: 1px solid rgba(255, 255, 255, 0.03);
          user-select: none;
        }

        .sql-td {
          padding: 6px 14px;
          color: #cbd5e1;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          white-space: nowrap;
          max-width: 360px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sql-tr-even td {
          background: transparent;
        }

        .sql-tr-odd td {
          background: rgba(255, 255, 255, 0.015);
        }

        .sql-data-table tr:hover td {
          background: rgba(0, 223, 129, 0.04);
        }

        .sql-num-val {
          color: #00df81;
          font-weight: 600;
        }

        .sql-null-tag {
          font-style: italic;
          font-size: 9.5px;
          color: #64748b;
          background: rgba(255, 255, 255, 0.04);
          padding: 1px 5px;
          border-radius: 3px;
        }

        /* ── Scrollbars ── */
        .sql-root ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .sql-root ::-webkit-scrollbar-track {
          background: transparent;
        }

        .sql-root ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 3px;
        }

        .sql-root ::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 223, 129, 0.3);
        }
      `}</style>
    </div>
  );
}
