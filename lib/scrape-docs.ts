/**
 * Copyright 2026 Nobin Sijo (NobinSijo7T).
 * SPDX-License-Identifier: Apache-2.0
 */
export type ScrapeOutputFormat = 'json' | 'csv';
export type ScrapeMode = 'single' | 'crawl';

export interface ScrapePage {
  url: string;
  title: string;
  description: string;
  content: string;
  markdown: string;
  html: string;
  wordCount: number;
}

export interface ScrapeResult {
  baseUrl: string;
  scrapedAt: string;
  totalPages: number;
  pages: ScrapePage[];
}

interface ScrapeOptions {
  url: string;
  mode?: ScrapeMode;
  maxPages?: number;
}

const USER_AGENT =
  'Mozilla/5.0 (compatible; PrismSpaceScraper/2.0; +https://prismspace.app)';
const DEFAULT_MAX_PAGES = 8;
const MAX_ALLOWED_PAGES = 20;
const FETCH_TIMEOUT_MS = 20_000;

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

export function normalizeScrapeUrl(rawUrl: string) {
  const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  const parsed = new URL(withProtocol);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP and HTTPS links are supported.');
  }
  parsed.hash = '';
  return parsed;
}

export function isBlockedHostname(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '::1' || host.endsWith('.local')) return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const private172 = host.match(/^172\.(\d+)\./);
  return Boolean(private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31);
}

// ---------------------------------------------------------------------------
// Text utilities
// ---------------------------------------------------------------------------

function decodeEntities(text: string) {
  const entities: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    mdash: '—', ndash: '–', lsquo: '\u2018', rsquo: '\u2019',
    ldquo: '\u201C', rdquo: '\u201D', hellip: '…', copy: '©',
    reg: '®', trade: '™',
  };
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
    if (entity[0] === '#') {
      const radix = entity[1]?.toLowerCase() === 'x' ? 16 : 10;
      const codePoint = Number.parseInt(entity.replace(/^#x?/i, ''), radix);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : '';
    }
    return entities[entity.toLowerCase()] ?? '';
  });
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// HTML stripping — remove noise elements but keep content-bearing tags
// ---------------------------------------------------------------------------

function stripNoise(html: string) {
  return html
    // Remove non-content elements
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    // Remove common layout chrome (but keep content areas inside them)
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, '')
    // Remove cookie banners / overlays by common class patterns
    .replace(/<div\b[^>]*class="[^"]*(?:cookie|banner|overlay|modal|popup)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    // Collapse comment nodes
    .replace(/<!--[\s\S]*?-->/g, '');
}

// ---------------------------------------------------------------------------
// Meta extraction
// ---------------------------------------------------------------------------

function getMeta(html: string, name: string): string {
  const byName = html.match(
    new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
  );
  if (byName?.[1]) return byName[1].trim();
  const byContent = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, 'i'),
  );
  return byContent?.[1]?.trim() ?? '';
}

function getDescription(html: string): string {
  return (
    getMeta(html, 'description') ||
    getMeta(html, 'og:description') ||
    getMeta(html, 'twitter:description') ||
    ''
  );
}

// ---------------------------------------------------------------------------
// Content extraction — multi-selector cascade
// ---------------------------------------------------------------------------

/**
 * Extract the inner HTML of the FIRST matching tag (handles nested tags
 * correctly by counting opening/closing pairs rather than relying on a
 * lazy regex that stops at the first closing tag).
 */
function extractTagContent(html: string, tagPattern: RegExp): string | null {
  const openMatch = tagPattern.exec(html);
  if (!openMatch) return null;

  const tagName = openMatch[0].match(/^<([a-z][a-z0-9]*)/i)?.[1] ?? '';
  const start = openMatch.index + openMatch[0].length;
  let depth = 1;
  let pos = start;

  while (pos < html.length && depth > 0) {
    const openIdx = html.indexOf(`<${tagName}`, pos);
    const closeIdx = html.indexOf(`</${tagName}>`, pos);

    if (closeIdx === -1) break; // malformed HTML

    if (openIdx !== -1 && openIdx < closeIdx) {
      depth++;
      pos = openIdx + tagName.length + 1;
    } else {
      depth--;
      if (depth === 0) return html.slice(start, closeIdx);
      pos = closeIdx + tagName.length + 3;
    }
  }

  return null;
}

/**
 * Try a sequence of content selectors, largest wins if multiple match.
 * Returns the best candidate inner HTML string.
 */
function getMainHtml(html: string): string {
  // Ordered list of selectors to try (most specific first)
  const selectors: RegExp[] = [
    /<main\b[^>]*>/i,
    /<article\b[^>]*>/i,
    // Common doc-site content wrappers
    /<div\b[^>]*\bid=["'](?:content|main-content|docs-content|page-content|article-body)[^"']*["'][^>]*>/i,
    /<div\b[^>]*\bclass=["'][^"']*\b(?:prose|markdown|article|content|post-content|entry-content|doc-content|page-body|main-body)[^"']*["'][^>]*>/i,
    /<section\b[^>]*\bclass=["'][^"']*\b(?:content|docs|body|text)[^"']*["'][^>]*>/i,
    // Role-based
    /<(?:div|section)\b[^>]*\brole=["']main["'][^>]*>/i,
  ];

  const candidates: string[] = [];

  for (const selector of selectors) {
    const content = extractTagContent(html, selector);
    if (content && content.trim().length > 200) {
      candidates.push(content);
    }
  }

  if (candidates.length > 0) {
    // Pick the longest (most content-rich) candidate
    return candidates.reduce((a, b) => (a.length >= b.length ? a : b));
  }

  // Last resort: strip <head> and return <body>
  const bodyContent = extractTagContent(html, /<body\b[^>]*>/i);
  return bodyContent ?? html;
}

// ---------------------------------------------------------------------------
// Title extraction
// ---------------------------------------------------------------------------

function cleanText(htmlOrText: string) {
  return decodeEntities(
    htmlOrText
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|section|article|main|li|tr|h[1-6]|blockquote)\>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim(),
  );
}

function getTitle(html: string): string {
  // Try <h1> in the content area first
  const h1 = cleanText(extractTagContent(html, /<h1\b[^>]*>/i) ?? '');
  if (h1) return h1;

  // Then <title> tag
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = cleanText(titleMatch?.[1] ?? '');

  // Strip common suffixes like " | SiteName" or " — SiteName"
  const stripped = title.replace(/\s*[\|—–-]\s*.{2,40}$/, '').trim();
  return stripped || title || 'Untitled';
}

// ---------------------------------------------------------------------------
// HTML → Markdown conversion (improved)
// ---------------------------------------------------------------------------

function htmlToMarkdown(html: string): string {
  let md = html;

  // ---- Code blocks (pre > code) ----
  md = md.replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_, code: string) => {
    const lang = (html.match(/class="[^"]*language-(\w+)/) ?? [])[1] ?? '';
    return `\n\n\`\`\`${lang}\n${cleanText(code)}\n\`\`\`\n\n`;
  });

  // ---- Headings ----
  md = md.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level: string, text: string) => {
    return `\n\n${'#'.repeat(Number(level))} ${cleanText(text)}\n\n`;
  });

  // ---- Blockquotes ----
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, text: string) => {
    const lines = cleanText(text).split('\n');
    return '\n\n' + lines.map((l) => `> ${l}`).join('\n') + '\n\n';
  });

  // ---- Tables ----
  md = md.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableBody: string) => {
    const rows: string[][] = [];
    const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;
    while ((rowMatch = rowPattern.exec(tableBody)) !== null) {
      const cells: string[] = [];
      const cellPattern = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch: RegExpExecArray | null;
      while ((cellMatch = cellPattern.exec(rowMatch[1])) !== null) {
        cells.push(cleanText(cellMatch[1]).replace(/\n/g, ' '));
      }
      rows.push(cells);
    }
    if (rows.length === 0) return '';
    const maxCols = Math.max(...rows.map((r) => r.length));
    const header = rows[0];
    const separator = Array(maxCols).fill('---');
    const body = rows.slice(1);
    const toRow = (cells: string[]) =>
      `| ${cells.map((c) => c || '').concat(Array(maxCols - cells.length).fill('')).join(' | ')} |`;
    return '\n\n' + [toRow(header), toRow(separator), ...body.map(toRow)].join('\n') + '\n\n';
  });

  // ---- Inline bold / italic / code ----
  md = md.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, (_, t: string) => `**${cleanText(t)}**`);
  md = md.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, (_, t: string) => `_${cleanText(t)}_`);
  md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, t: string) => `\`${cleanText(t)}\``);

  // ---- Links ----
  md = md.replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, text: string) => {
    const label = cleanText(text);
    return label ? `[${label}](${href})` : href;
  });

  // ---- Images (include alt text) ----
  md = md.replace(/<img[^>]+alt=["']([^"']*)["'][^>]+src=["']([^"']+)["'][^>]*\/?>/gi,
    (_, alt: string, src: string) => (alt ? `![${alt}](${src})` : ''),
  );
  md = md.replace(/<img[^>]+src=["']([^"']+)["'][^>]+alt=["']([^"']*)["'][^>]*\/?>/gi,
    (_, src: string, alt: string) => (alt ? `![${alt}](${src})` : ''),
  );

  // ---- Lists ----
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, text: string) => `\n- ${cleanText(text)}`);
  md = md.replace(/<\/[ou]l>/gi, '\n');

  // ---- Paragraphs & divs ----
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, text: string) => `\n\n${cleanText(text)}\n\n`);
  md = md.replace(/<\/(?:div|section|article|main)>/gi, '\n');

  // ---- Horizontal rules ----
  md = md.replace(/<hr\s*\/?>/gi, '\n\n---\n\n');

  // ---- Final clean ----
  md = cleanText(md);

  return md;
}

// ---------------------------------------------------------------------------
// Link discovery (crawl mode)
// ---------------------------------------------------------------------------

function absolutizeLink(href: string, currentUrl: URL) {
  try {
    const url = new URL(href, currentUrl);
    url.hash = '';
    return url;
  } catch {
    return null;
  }
}

function discoverLinks(html: string, currentUrl: URL, baseUrl: URL) {
  const links = new Set<string>();
  const anchorPattern = /<a[^>]+href=["']([^"'#?][^"']*?)["'][^>]*>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const href = match[1];
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
      continue;
    }

    const link = absolutizeLink(href, currentUrl);
    if (!link) continue;

    // Must be same origin
    if (link.origin !== baseUrl.origin) continue;

    // Skip binary/media files
    if (/\.(png|jpe?g|gif|svg|webp|avif|pdf|zip|tar|gz|mp4|mov|avi|mp3|woff2?|ttf|eot)$/i.test(link.pathname)) {
      continue;
    }

    // Must share at least the base path (relaxed — same origin is enough for crawl)
    links.add(link.toString());
  }

  return [...links];
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchHtml(url: URL) {
  const response = await fetch(url.toString(), {
    cache: 'no-store',
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url.toString()} (${response.status} ${response.statusText})`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    throw new Error(`Expected an HTML page, received ${contentType}.`);
  }

  return response.text();
}

// ---------------------------------------------------------------------------
// Page parser
// ---------------------------------------------------------------------------

export function parseScrapePage(url: string, rawHtml: string): ScrapePage {
  const description = getDescription(rawHtml);
  const cleaned = stripNoise(rawHtml);
  const mainHtml = getMainHtml(cleaned);
  const title = getTitle(cleaned);
  const markdown = htmlToMarkdown(mainHtml);
  const content = cleanText(mainHtml);
  const finalMarkdown = markdown.startsWith('#') ? markdown : `# ${title}\n\n${markdown}`.trim();

  return {
    url,
    title,
    description,
    content,
    markdown: finalMarkdown,
    html: mainHtml.trim(),
    wordCount: countWords(content),
  };
}

// ---------------------------------------------------------------------------
// Main scrape orchestrator
// ---------------------------------------------------------------------------

export async function scrapeDocs(options: ScrapeOptions): Promise<ScrapeResult> {
  const baseUrl = normalizeScrapeUrl(options.url);
  if (isBlockedHostname(baseUrl.hostname)) {
    throw new Error('Local and private network URLs are blocked for safety.');
  }

  const mode = options.mode ?? 'single';
  const maxPages = Math.min(Math.max(options.maxPages ?? DEFAULT_MAX_PAGES, 1), MAX_ALLOWED_PAGES);
  const queue = [baseUrl.toString()];
  const visited = new Set<string>();
  const pages: ScrapePage[] = [];

  while (queue.length > 0 && pages.length < maxPages) {
    const next = queue.shift();
    if (!next || visited.has(next)) continue;
    visited.add(next);

    const currentUrl = new URL(next);
    const html = await fetchHtml(currentUrl);
    pages.push(parseScrapePage(currentUrl.toString(), html));

    if (mode === 'crawl') {
      for (const link of discoverLinks(html, currentUrl, baseUrl)) {
        if (!visited.has(link) && !queue.includes(link) && pages.length + queue.length < maxPages * 2) {
          queue.push(link);
        }
      }
    }
  }

  return {
    baseUrl: baseUrl.toString(),
    scrapedAt: new Date().toISOString(),
    totalPages: pages.length,
    pages,
  };
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

function csvCell(value: string | number) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export function scrapeResultToCsv(result: ScrapeResult) {
  const header = ['title', 'url', 'description', 'wordCount', 'content', 'markdown', 'html'];
  const rows = result.pages.map((page) => [
    page.title,
    page.url,
    page.description,
    page.wordCount,
    page.content,
    page.markdown,
    page.html,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}
