/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
'use client';

/**
 * lib/mcp-catalog.tsx
 * ───────────────────
 * Comprehensive Catalog & Brand Asset Registry for Model Context Protocol (MCP) Servers.
 * Powers the MCP Hub in AgentSwarm with authentic brand vector logos,
 * capabilities, environment keys, and tool manifests for:
 *   1. Figma
 *   2. Google Drive
 *   3. Gmail
 *   4. GitHub
 *   5. Filesystem
 *   6. Terminal (Built-in)
 *   7. SQLite (Built-in)
 *   8. Memory Store (Built-in)
 */

import React, { type ReactNode } from 'react';
import { TerminalSquare } from 'lucide-react';

export interface McpToolManifest {
  name: string;
  signature: string;
  description: string;
  example: string;
}

export interface McpEnvKeyDef {
  key: string;
  label: string;
  description: string;
  placeholder: string;
  recommended?: boolean;
}

export interface McpServerMeta {
  id: string;
  name: string;
  displayName: string;
  subtitle: string;
  category: 'design' | 'storage' | 'communication' | 'developer' | 'workspace' | 'data';
  transport: 'stdio' | 'oauth' | 'in-process';
  defaultCommand: string;
  defaultArgs: string[];
  description: string;
  longDescription: string;
  primaryEnvKey: string;
  envKeys: McpEnvKeyDef[];
  capabilities: string[];
  tools: McpToolManifest[];
  brandColor: string;
  glowColor: string;
  badgeText: string;
  docsUrl: string;
  isBuiltIn?: boolean;
}

// ── Official Brand Vector Logos ───────────────────────────────────────────────

export function FigmaLogo({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 38 57" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE" />
      <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83" />
      <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262" />
      <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E" />
      <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF" />
    </svg>
  );
}

export function GoogleDriveLogo({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 87.3 78" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M6.6 66.85L10.45 73.5C11.25 74.9 12.4 76 13.75 76.8L27.5 53H0C0 54.55 0.4 56.1 1.2 57.5L6.6 66.85Z" fill="#0066DA" />
      <path d="M43.65 25L29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 48.5C0.4 49.9 0 51.45 0 53H27.5L43.65 25Z" fill="#00AC47" />
      <path d="M73.55 76.8C74.9 76 76.05 74.9 76.85 73.5L86.1 57.5C86.9 56.1 87.3 54.55 87.3 53H59.8L73.55 76.8Z" fill="#EA4335" />
      <path d="M43.65 25L57.4 1.2C56.05 0.4 54.5 0 52.9 0H34.4C32.8 0 31.25 0.45 29.9 1.2L43.65 25Z" fill="#00832D" />
      <path d="M59.8 53H27.5L13.75 76.8C15.1 77.6 16.65 78 18.25 78H69.05C70.65 78 72.2 77.55 73.55 76.8L59.8 53Z" fill="#2684FC" />
      <path d="M73.4 26.5L60.7 4.5C59.9 3.1 58.75 2 57.4 1.2L43.65 25L59.8 53H87.3C87.3 51.45 86.9 49.9 86.1 48.5L73.4 26.5Z" fill="#FFBA00" />
    </svg>
  );
}

export function GmailLogo({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M6 52V18L32 36L58 18V52C58 54.2 56.2 56 54 56H10C7.8 56 6 54.2 6 52Z" fill="#EAEAEA" opacity="0.1" />
      <path d="M6 18L32 36L58 18" stroke="#EA4335" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 18V50C6 52.2 7.8 54 10 54H16V25L6 18Z" fill="#4285F4" />
      <path d="M58 18V50C58 52.2 56.2 54 54 54H48V25L58 18Z" fill="#34A853" />
      <path d="M48 25V54H16V25L32 37L48 25Z" fill="#EA4335" />
      <path d="M10 10H54C56.2 10 58 11.8 58 14V18L32 36L6 18V14C6 11.8 7.8 10 10 10Z" fill="#FBBC04" />
      <path d="M6 14L32 32L58 14" stroke="#EA4335" strokeWidth="2.5" />
    </svg>
  );
}

export function GitHubLogo({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export function FilesystemLogo({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
        fill="rgba(0, 223, 129, 0.15)"
        stroke="#00DF81"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2 13h20" stroke="#00DF81" strokeWidth="1.5" strokeOpacity="0.7" />
      <circle cx="6" cy="16.5" r="1.25" fill="#00DF81" />
      <circle cx="10.5" cy="16.5" r="1.25" fill="#00DF81" />
    </svg>
  );
}

export function SqliteLogo({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="5" rx="9" ry="3" stroke="#38BDF8" strokeWidth="1.75" fill="rgba(56, 189, 248, 0.15)" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" stroke="#38BDF8" strokeWidth="1.75" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke="#38BDF8" strokeWidth="1.75" />
    </svg>
  );
}

export function MemoryLogo({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="#A78BFA" strokeWidth="1.75" fill="rgba(167, 139, 250, 0.15)" />
      <path d="M7 8h10M7 12h10M7 16h6" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="17" cy="16" r="1.5" fill="#A78BFA" />
    </svg>
  );
}

export function TerminalLogo({ className = 'size-5' }: { className?: string }) {
  return <TerminalSquare className={className} strokeWidth={1.75} />;
}

// ── MCP Server Definitions ───────────────────────────────────────────────────

export const MCP_SERVER_REGISTRY: Record<string, McpServerMeta> = {
  figma: {
    id: 'figma',
    name: 'figma',
    displayName: 'Figma',
    subtitle: 'Design System & Dev Mode',
    category: 'design',
    transport: 'stdio',
    defaultCommand: 'npx',
    defaultArgs: ['-y', '@modelcontextprotocol/server-figma'],
    description: 'Inspect Figma designs, components, styles, dev mode specs, and export production assets.',
    longDescription:
      'Empower swarm agents to read live Figma canvases, inspect frames, extract design tokens, colors, typographies, and generate component code directly from design links.',
    primaryEnvKey: 'FIGMA_API_TOKEN',
    envKeys: [
      {
        key: 'FIGMA_API_TOKEN',
        label: 'Personal Access Token',
        description: 'Generated from Figma Settings > Security > Personal access tokens',
        placeholder: 'figd_...',
        recommended: true,
      },
      {
        key: 'FIGMA_PERSONAL_ACCESS_TOKEN',
        label: 'Alternative Access Token Key',
        description: 'Compatible alias for Figma authentication token',
        placeholder: 'figd_...',
      },
    ],
    capabilities: ['Frames & Layers', 'Dev Mode Specs', 'Design Tokens', 'Asset Export', 'Variables'],
    tools: [
      {
        name: 'figma_get_file',
        signature: 'get_file(file_key, depth?)',
        description: 'Read complete document structure, frames, and components from a Figma file URL.',
        example: '{"tool": "figma_get_file", "arguments": {"file_key": "xY892klA"}}',
      },
      {
        name: 'figma_get_file_nodes',
        signature: 'get_file_nodes(file_key, ids[])',
        description: 'Get detailed node geometry, styles, and layout properties for specific frame IDs.',
        example: '{"tool": "figma_get_file_nodes", "arguments": {"file_key": "xY892klA", "ids": ["0:1"]}}',
      },
      {
        name: 'figma_get_image',
        signature: 'get_image(file_key, ids[], format)',
        description: 'Render and export frames or components as SVG or PNG images.',
        example: '{"tool": "figma_get_image", "arguments": {"file_key": "xY892klA", "ids": ["1:2"], "format": "svg"}}',
      },
      {
        name: 'figma_get_comments',
        signature: 'get_comments(file_key)',
        description: 'Retrieve design review comments and annotations from the canvas.',
        example: '{"tool": "figma_get_comments", "arguments": {"file_key": "xY892klA"}}',
      },
    ],
    brandColor: '#F24E1E',
    glowColor: 'rgba(242, 78, 30, 0.35)',
    badgeText: 'Design Sync',
    docsUrl: 'https://www.figma.com/developers/api#access-tokens',
  },

  google_drive: {
    id: 'google_drive',
    name: 'google_drive',
    displayName: 'Google Drive',
    subtitle: 'Docs, Sheets & Cloud Storage',
    category: 'storage',
    transport: 'stdio',
    defaultCommand: 'npx',
    defaultArgs: ['-y', '@modelcontextprotocol/server-gdrive'],
    description: 'Search, read, create, and manage Google Docs, Sheets, Slides, and Drive folder structures.',
    longDescription:
      'Seamlessly connect agents to your team’s Google Drive. Read specifications, extract spreadsheets data, index project assets, and export markdown summaries directly.',
    primaryEnvKey: 'GOOGLE_DRIVE_CREDENTIALS',
    envKeys: [
      {
        key: 'GOOGLE_DRIVE_CREDENTIALS',
        label: 'Service Account or OAuth Credentials',
        description: 'JSON credential string or path to Google Cloud service account key',
        placeholder: '{"type": "service_account", ...}',
        recommended: true,
      },
      {
        key: 'GDRIVE_API_KEY',
        label: 'Google Drive API Key',
        description: 'Public read-only key for shared public drive folders',
        placeholder: 'AIzaSy...',
      },
    ],
    capabilities: ['Docs & Sheets', 'File Search', 'Folder Trees', 'PDF Export', 'Cloud Storage'],
    tools: [
      {
        name: 'gdrive_search',
        signature: 'search_files(query, max_results?)',
        description: 'Search Drive files by name, full-text content, or MIME type.',
        example: '{"tool": "gdrive_search", "arguments": {"query": "name contains \'Architecture\'"}}',
      },
      {
        name: 'gdrive_read',
        signature: 'read_doc(file_id, format?)',
        description: 'Extract text and tabular data from Google Docs or Sheets.',
        example: '{"tool": "gdrive_read", "arguments": {"file_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"}}',
      },
      {
        name: 'gdrive_create',
        signature: 'create_file(name, mime_type, content)',
        description: 'Create a new Google Document, Sheet, or text file inside a folder.',
        example: '{"tool": "gdrive_create", "arguments": {"name": "Swarm Summary.txt", "content": "..."}}',
      },
    ],
    brandColor: '#0066DA',
    glowColor: 'rgba(0, 102, 218, 0.35)',
    badgeText: 'Cloud Sync',
    docsUrl: 'https://developers.google.com/drive/api/v3/about-sdk',
  },

  gmail: {
    id: 'gmail',
    name: 'gmail',
    displayName: 'Gmail',
    subtitle: 'Email Automation & Threads',
    category: 'communication',
    transport: 'oauth',
    defaultCommand: 'python',
    defaultArgs: ['google_oauth.py'],
    description: 'Read, search, draft, and send emails, manage labels and threads via Google OAuth.',
    longDescription:
      'Per-user Gmail integration running over Google OAuth. Agents can scan customer updates, summarize unread threads, craft responses, and dispatch notifications with human-in-the-loop review.',
    primaryEnvKey: 'GMAIL_CLIENT_SECRET',
    envKeys: [
      {
        key: 'GMAIL_CLIENT_SECRET',
        label: 'Google Client Secret',
        description: 'Client secret from Google Cloud Console OAuth 2.0 Credentials',
        placeholder: 'GOCSPX-...',
        recommended: true,
      },
      {
        key: 'GOOGLE_CLIENT_ID',
        label: 'Google Client ID',
        description: 'Client ID from Google Cloud Console OAuth 2.0 Credentials',
        placeholder: '...apps.googleusercontent.com',
      },
    ],
    capabilities: ['Inbox Search', 'Thread Summaries', 'Draft Creation', 'Send Mail', 'Label Mgmt'],
    tools: [
      {
        name: 'gmail_list_messages',
        signature: 'gmail_list_messages(query, max_results?)',
        description: 'Search messages using standard Gmail queries like "is:unread" or "from:github".',
        example: '{"tool": "gmail_list_messages", "arguments": {"query": "is:unread", "max_results": 5}}',
      },
      {
        name: 'gmail_get_message',
        signature: 'gmail_get_message(message_id, format?)',
        description: 'Retrieve full headers, subject, sender, and email body content.',
        example: '{"tool": "gmail_get_message", "arguments": {"message_id": "18cf4b3b2c1a"}}',
      },
      {
        name: 'send_email',
        signature: 'send_email(to, subject, body)',
        description: 'Send a formatted email through the authenticated user’s Gmail account.',
        example: '{"tool": "send_email", "arguments": {"to": "team@prismspace.dev", "subject": "Update", "body": "..."}}',
      },
      {
        name: 'gmail_list_labels',
        signature: 'gmail_list_labels()',
        description: 'List user mailboxes and custom classification labels.',
        example: '{"tool": "gmail_list_labels", "arguments": {}}',
      },
    ],
    brandColor: '#EA4335',
    glowColor: 'rgba(234, 67, 53, 0.35)',
    badgeText: '1-Click OAuth',
    docsUrl: 'https://developers.google.com/gmail/api/guides',
  },

  github: {
    id: 'github',
    name: 'github',
    displayName: 'GitHub',
    subtitle: 'Repositories, PRs & Codebase',
    category: 'developer',
    transport: 'stdio',
    defaultCommand: 'npx',
    defaultArgs: ['-y', '@modelcontextprotocol/server-github'],
    description: 'Access repositories, code trees, pull requests, issues, commits, branches, and code reviews.',
    longDescription:
      'Direct link to your GitHub repositories. Swarm agents can inspect open issues, examine pull request diffs, search across repositories, and create branches or PRs autonomously.',
    primaryEnvKey: 'GITHUB_PERSONAL_ACCESS_TOKEN',
    envKeys: [
      {
        key: 'GITHUB_PERSONAL_ACCESS_TOKEN',
        label: 'Personal Access Token (classic or fine-grained)',
        description: 'Generate with "repo", "read:org", and "workflow" scopes at github.com/settings/tokens',
        placeholder: 'ghp_... or github_pat_...',
        recommended: true,
      },
      {
        key: 'GITHUB_TOKEN',
        label: 'Alternative GitHub Token',
        description: 'Standard environment key used by CI/CD workflows',
        placeholder: 'ghp_...',
      },
    ],
    capabilities: ['Repo Inspection', 'Pull Requests', 'Issues & Milestones', 'Code Search', 'Commit Diffs'],
    tools: [
      {
        name: 'github_get_repo',
        signature: 'get_repo(owner, repo)',
        description: 'Fetch repository overview, star count, default branch, and description.',
        example: '{"tool": "github_get_repo", "arguments": {"owner": "NobinSijo7T", "repo": "prismspace-web"}}',
      },
      {
        name: 'github_search_code',
        signature: 'search_code(query, repo?)',
        description: 'Search source code across GitHub repositories using semantic symbols.',
        example: '{"tool": "github_search_code", "arguments": {"query": "AgentSwarm repo:NobinSijo7T/prismspace-web"}}',
      },
      {
        name: 'github_list_issues',
        signature: 'list_issues(owner, repo, state?)',
        description: 'List open or closed issues, bug reports, and discussion threads.',
        example: '{"tool": "github_list_issues", "arguments": {"owner": "NobinSijo7T", "repo": "prismspace-web", "state": "open"}}',
      },
      {
        name: 'github_create_pr',
        signature: 'create_pr(owner, repo, title, head, base, body?)',
        description: 'Open a new Pull Request with swarm-generated code changes.',
        example: '{"tool": "github_create_pr", "arguments": {"owner": "NobinSijo7T", "repo": "prismspace-web", "title": "MCP Hub", "head": "feat/mcp", "base": "main"}}',
      },
    ],
    brandColor: '#FFFFFF',
    glowColor: 'rgba(255, 255, 255, 0.25)',
    badgeText: 'Git Core',
    docsUrl: 'https://github.com/settings/tokens',
  },

  filesystem: {
    id: 'filesystem',
    name: 'filesystem',
    displayName: 'Filesystem',
    subtitle: 'Local Workspace Sandboxed IO',
    category: 'workspace',
    transport: 'stdio',
    defaultCommand: 'npx',
    defaultArgs: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
    description: 'Local sandboxed workspace filesystem access: search, read, write, edit, and inspect directory trees.',
    longDescription:
      'High-speed native filesystem engine. Allows agents to search files with glob patterns, grep contents, read source files, generate edits, create directories, and inspect project trees without leaving the swarm.',
    primaryEnvKey: 'ALLOWED_DIRECTORIES',
    envKeys: [
      {
        key: 'ALLOWED_DIRECTORIES',
        label: 'Allowed Directories (Root Path)',
        description: 'Comma-separated directory paths accessible by swarm agents (defaults to workspace root)',
        placeholder: 'c:\\Users\\nobin\\OneDrive\\Documents\\Projects\\PROJECT FILES\\prismspace-web',
        recommended: true,
      },
      {
        key: 'FILESYSTEM_ROOT_PATH',
        label: 'Filesystem Root Path',
        description: 'Custom base path override for file resolution',
        placeholder: '.',
      },
    ],
    capabilities: ['Read & Write', 'Grep Search', 'Directory Trees', 'Safe Sandboxing', 'File Metadata'],
    tools: [
      {
        name: 'read_file',
        signature: 'read_file(path)',
        description: 'Read the complete or sliced contents of any project file.',
        example: '{"tool": "read_file", "arguments": {"path": "components/AgentSwarm.tsx"}}',
      },
      {
        name: 'write_file',
        signature: 'write_file(path, content)',
        description: 'Create or overwrite a file with synthesized code or documentation.',
        example: '{"tool": "write_file", "arguments": {"path": "docs/mcp-guide.md", "content": "# MCP Guide..."}}',
      },
      {
        name: 'search_files',
        signature: 'search_files(pattern, target)',
        description: 'Find files matching a glob or grep for text patterns inside files.',
        example: '{"tool": "search_files", "arguments": {"pattern": "*.tsx", "target": "files"}}',
      },
      {
        name: 'list_directory_tree',
        signature: 'list_directory_tree(path, max_depth?)',
        description: 'Inspect hierarchical folders and file structures.',
        example: '{"tool": "list_directory_tree", "arguments": {"path": "components", "max_depth": 2}}',
      },
      {
        name: 'create_directory',
        signature: 'create_directory(path)',
        description: 'Ensure a folder and all its parent directories exist.',
        example: '{"tool": "create_directory", "arguments": {"path": "backend/hive/tools"}}',
      },
    ],
    brandColor: '#00DF81',
    glowColor: 'rgba(0, 223, 129, 0.4)',
    badgeText: 'Built-in Native',
    docsUrl: 'https://modelcontextprotocol.io/docs/concepts/servers',
    isBuiltIn: true,
  },

  terminal: {
    id: 'terminal',
    name: 'terminal',
    displayName: 'Terminal',
    subtitle: 'Native Workspace Command Runner',
    category: 'workspace',
    transport: 'in-process',
    defaultCommand: 'internal',
    defaultArgs: [],
    description: 'Run workspace commands for fast searches, builds, scripts, and file transfers.',
    longDescription:
      'Runs PowerShell on Windows and the native shell on Linux/macOS. File transfers use Robocopy on Windows and rsync when available, with live progress in the agent execution stream.',
    primaryEnvKey: '',
    envKeys: [],
    capabilities: ['PowerShell / Shell', 'Fast File Transfers', 'Live Progress', 'Workspace Boundaries'],
    tools: [
      {
        name: 'terminal',
        signature: 'terminal(command, cwd?, timeout?)',
        description: 'Run a bounded command in the workspace and return its output.',
        example: '{"tool": "terminal", "arguments": {"command": "rg -n TODO"}}',
      },
      {
        name: 'copy_file',
        signature: 'copy_file(source, destination)',
        description: 'Copy files or directories with the fastest available native utility.',
        example: '{"tool": "copy_file", "arguments": {"source": "assets", "destination": "backup/assets"}}',
      },
      {
        name: 'move_file',
        signature: 'move_file(source, destination)',
        description: 'Move files or directories with streamed progress.',
        example: '{"tool": "move_file", "arguments": {"source": "old.txt", "destination": "archive/old.txt"}}',
      },
      {
        name: 'system_info / disk_usage',
        signature: 'system_info() / disk_usage()',
        description: 'Inspect host identity, CPU, memory, load, and workspace disk capacity.',
        example: '{"tool": "system_info", "arguments": {}}',
      },
      {
        name: 'process tools',
        signature: 'list_processes(query?) / stop_process(pid)',
        description: 'Inspect processes and control a target process after approval.',
        example: '{"tool": "list_processes", "arguments": {"query": "node"}}',
      },
      {
        name: 'service tools',
        signature: 'list_services() / restart_service(name)',
        description: 'Inspect and manage Windows services or systemd services after approval.',
        example: '{"tool": "service_status", "arguments": {"name": "MyService"}}',
      },
      {
        name: 'package tools',
        signature: 'package_manager() / install_package(package)',
        description: 'Detect and install packages through winget, Chocolatey, Homebrew, or apt.',
        example: '{"tool": "package_manager", "arguments": {}}',
      },
      {
        name: 'environment tools',
        signature: 'get_environment(key) / set_environment(key, value)',
        description: 'Inspect or change environment values with approval for mutations.',
        example: '{"tool": "get_environment", "arguments": {"key": "PATH"}}',
      },
      {
        name: 'archive tools',
        signature: 'create_archive(source, archive) / extract_archive(archive, destination)',
        description: 'Create ZIP/TAR archives and extract them inside the workspace.',
        example: '{"tool": "create_archive", "arguments": {"source": "dist", "archive": "dist.zip"}}',
      },
      {
        name: 'network tools',
        signature: 'ping_host(host) / dns_lookup(host)',
        description: 'Run bounded connectivity and DNS diagnostics.',
        example: '{"tool": "dns_lookup", "arguments": {"host": "example.com"}}',
      },
      {
        name: 'scheduled task tools',
        signature: 'list_scheduled_tasks() / create_scheduled_task(...)',
        description: 'Inspect and manage Windows Task Scheduler entries.',
        example: '{"tool": "list_scheduled_tasks", "arguments": {}}',
      },
    ],
    brandColor: '#38BDF8',
    glowColor: 'rgba(56, 189, 248, 0.35)',
    badgeText: 'Native Runner',
    docsUrl: '',
    isBuiltIn: true,
  },

  sqlite: {
    id: 'sqlite',
    name: 'sqlite',
    displayName: 'SQLite',
    subtitle: 'Relational Database Engine',
    category: 'data',
    transport: 'in-process',
    defaultCommand: 'internal',
    defaultArgs: [],
    description: 'Structured local relational storage for persistence, telemetry, and fast queryable tables.',
    longDescription:
      'In-process SQLite engine for agent task checkpoints, structured query operations, tabular analysis, and runtime state persistence.',
    primaryEnvKey: 'SQLITE_DB_PATH',
    envKeys: [
      {
        key: 'SQLITE_DB_PATH',
        label: 'Database File Path',
        description: 'Path to local SQLite database file (e.g., .swarm/swarm.db)',
        placeholder: 'backend/swarm.db',
        recommended: true,
      },
    ],
    capabilities: ['SQL Queries', 'Schema Inspection', 'Table Creation', 'Transactions'],
    tools: [
      {
        name: 'read_query',
        signature: 'read_query(sql)',
        description: 'Execute a SELECT statement and return JSON rows.',
        example: '{"tool": "read_query", "arguments": {"sql": "SELECT * FROM agents LIMIT 5"}}',
      },
      {
        name: 'write_query',
        signature: 'write_query(sql)',
        description: 'Execute INSERT, UPDATE, DELETE, or schema modifications.',
        example: '{"tool": "write_query", "arguments": {"sql": "UPDATE settings SET active = 1"}}',
      },
      {
        name: 'list_tables',
        signature: 'list_tables()',
        description: 'List all existing database tables.',
        example: '{"tool": "list_tables", "arguments": {}}',
      },
    ],
    brandColor: '#38BDF8',
    glowColor: 'rgba(56, 189, 248, 0.35)',
    badgeText: 'In-Memory/File',
    docsUrl: 'https://sqlite.org',
    isBuiltIn: true,
  },

  memory: {
    id: 'memory',
    name: 'memory',
    displayName: 'Memory Store',
    subtitle: 'Persistent Knowledge & State',
    category: 'data',
    transport: 'in-process',
    defaultCommand: 'internal',
    defaultArgs: [],
    description: 'Cross-session key-value memory store for persisting facts, user preferences, and intermediate results.',
    longDescription:
      'Survives across agent sessions and runs. Use to recall user preferences, architectural rules, past bugs, and learned patterns.',
    primaryEnvKey: 'MEMORY_STORE_PATH',
    envKeys: [
      {
        key: 'MEMORY_STORE_PATH',
        label: 'Memory File Path',
        description: 'Optional path to persistent memory snapshot',
        placeholder: 'backend/.memory.json',
      },
    ],
    capabilities: ['Key-Value Store', 'Cross-Session Recall', 'Fast Lookup', 'Persistent Notes'],
    tools: [
      {
        name: 'set_memory',
        signature: 'set_memory(key, value)',
        description: 'Store an insight, decision, or fact under a named key.',
        example: '{"tool": "set_memory", "arguments": {"key": "preferred_theme", "value": "high-voltage"}}',
      },
      {
        name: 'get_memory',
        signature: 'get_memory(key)',
        description: 'Retrieve a stored value by key.',
        example: '{"tool": "get_memory", "arguments": {"key": "preferred_theme"}}',
      },
      {
        name: 'list_memory',
        signature: 'list_memory()',
        description: 'List all active keys and values.',
        example: '{"tool": "list_memory", "arguments": {}}',
      },
    ],
    brandColor: '#A78BFA',
    glowColor: 'rgba(167, 139, 250, 0.35)',
    badgeText: 'Continuous',
    docsUrl: 'https://modelcontextprotocol.io',
    isBuiltIn: true,
  },
};

// The 5 primary featured MCP servers requested by the user
export const FEATURED_MCP_SERVER_IDS = [
  'figma',
  'google_drive',
  'gmail',
  'github',
  'filesystem',
] as const;

export const FEATURED_MCP_SERVERS = FEATURED_MCP_SERVER_IDS.map(
  (id) => MCP_SERVER_REGISTRY[id],
);

export const ALL_MCP_SERVERS = Object.values(MCP_SERVER_REGISTRY);

export function getMcpServerMeta(serverName: string): McpServerMeta {
  const normalized = serverName.toLowerCase().replace(/[\s-]/g, '_');
  if (normalized in MCP_SERVER_REGISTRY) {
    return MCP_SERVER_REGISTRY[normalized];
  }

  // Alias lookups
  if (normalized === 'gdrive' || normalized === 'drive') {
    return MCP_SERVER_REGISTRY.google_drive;
  }
  if (normalized === 'gh' || normalized === 'git') {
    return MCP_SERVER_REGISTRY.github;
  }
  if (normalized === 'fs' || normalized === 'files' || normalized === 'workspace') {
    return MCP_SERVER_REGISTRY.filesystem;
  }

  // Generic fallback
  return {
    id: normalized,
    name: normalized,
    displayName: serverName.toUpperCase(),
    subtitle: 'Custom MCP Server',
    category: 'workspace',
    transport: 'stdio',
    defaultCommand: 'npx',
    defaultArgs: [],
    description: `Custom Model Context Protocol server '${serverName}'.`,
    longDescription: `Custom MCP tool provider for ${serverName}.`,
    primaryEnvKey: `${normalized.toUpperCase()}_API_TOKEN`,
    envKeys: [
      {
        key: `${normalized.toUpperCase()}_API_TOKEN`,
        label: 'API Token',
        description: `Authentication credential for ${serverName}`,
        placeholder: 'Token value...',
        recommended: true,
      },
    ],
    capabilities: ['MCP Tools'],
    tools: [],
    brandColor: '#00DF81',
    glowColor: 'rgba(0, 223, 129, 0.3)',
    badgeText: 'Custom MCP',
    docsUrl: 'https://modelcontextprotocol.io',
  };
}

export function renderMcpServerIcon(serverId: string, className = 'size-5'): ReactNode {
  const normalized = serverId.toLowerCase().replace(/[\s-]/g, '_');
  switch (normalized) {
    case 'figma':
      return <FigmaLogo className={className} />;
    case 'google_drive':
    case 'gdrive':
      return <GoogleDriveLogo className={className} />;
    case 'gmail':
      return <GmailLogo className={className} />;
    case 'github':
    case 'gh':
      return <GitHubLogo className={className} />;
    case 'filesystem':
    case 'fs':
      return <FilesystemLogo className={className} />;
    case 'sqlite':
      return <SqliteLogo className={className} />;
    case 'memory':
      return <MemoryLogo className={className} />;
    case 'terminal':
      return <TerminalLogo className={className} />;
    default:
      return <FilesystemLogo className={className} />;
  }
}

export function getMcpServerForEnvKey(envKey: string): McpServerMeta | undefined {
  const upper = envKey.toUpperCase();
  for (const server of ALL_MCP_SERVERS) {
    if (server.envKeys.some((e) => e.key.toUpperCase() === upper)) {
      return server;
    }
  }
  if (upper.includes('FIGMA')) return MCP_SERVER_REGISTRY.figma;
  if (upper.includes('DRIVE') || upper.includes('GDRIVE')) return MCP_SERVER_REGISTRY.google_drive;
  if (upper.includes('GMAIL')) return MCP_SERVER_REGISTRY.gmail;
  if (upper.includes('GITHUB') || upper.includes('GH_')) return MCP_SERVER_REGISTRY.github;
  if (upper.includes('FILE') || upper.includes('DIR')) return MCP_SERVER_REGISTRY.filesystem;
  if (upper.includes('SQLITE')) return MCP_SERVER_REGISTRY.sqlite;
  if (upper.includes('MEMORY')) return MCP_SERVER_REGISTRY.memory;
  return undefined;
}
