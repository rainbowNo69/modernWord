// ABOUTME: Cloudflare Pages Functions 共用的上游抓取与解析逻辑
// ABOUTME: 与本地 Express 版 server/routes/index.ts 等价，只是把 https.get 换成 fetch、内存缓存换成 Cache API

export interface ShowSummary {
  id: string;
  title: string;
}

export interface Episode {
  season: number;
  episode: number;
  title: string;
  id: string;
}

export type EpisodeList = Record<number, Episode[]>;

export const BASE_URL = 'https://www.springfieldspringfield.co.uk';
const DEFAULT_SHOW = 'modern-family';
const SHOW_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,60}$/;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const UPSTREAM_TIMEOUT_MS = 15000;
// Cache API 需要一个绝对 URL 作 key，用固定假域名隔离命名空间
const CACHE_ORIGIN = 'https://cache.modern-word.internal';

// 上游状态码需要区分 404（剧/集不存在）与其它错误
export class UpstreamError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'UpstreamError';
    this.status = status;
  }
}

/**
 * Workers 的 Cache API：按数据中心缓存，等同于原来的内存 LRU，
 * 但不会随 isolate 回收而丢失，也不需要 KV。
 */
function getCache(): Cache | null {
  try {
    if (typeof caches === 'undefined') {
      return null;
    }
    const storage = caches as CacheStorage & { default?: Cache };
    return storage.default ?? null;
  } catch {
    return null;
  }
}

async function requestUpstream(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });

  if (res.status >= 400) {
    throw new UpstreamError(`HTTP ${res.status} for ${url}`, res.status);
  }

  return await res.text();
}

export async function fetchPage(url: string): Promise<string> {
  const cache = getCache();
  const cacheKey = new Request(`${CACHE_ORIGIN}/html/${encodeURIComponent(url)}`, { method: 'GET' });

  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      return await hit.text();
    }
  }

  const html = await requestUpstream(url);

  if (cache) {
    await cache.put(
      cacheKey,
      new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
        },
      })
    );
  }

  return html;
}

export function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

export function normalizeShowId(input: unknown): string | null {
  if (typeof input !== 'string') {
    return null;
  }
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  return SHOW_ID_PATTERN.test(normalized) ? normalized : null;
}

export function resolveShowId(input: unknown): string {
  return normalizeShowId(input) ?? DEFAULT_SHOW;
}

// 解析站内搜索结果页（tv_show_episode_scripts.php?search=xxx）
export function parseShowSearch(html: string): ShowSummary[] {
  const results: ShowSummary[] = [];
  const seen = new Set<string>();
  const linkRegex = /<a\b[^>]*href="[^"]*episode_scripts\.php\?tv-show=([^"&]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    // 页面导航里也有指向 the-simpsons 的链接，用 script-list-item 标记区分真正的搜索结果
    if (!match[0].includes('script-list-item')) {
      continue;
    }
    const id = decodeURIComponent(match[1]).toLowerCase();
    const title = decodeEntities(match[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (!title || seen.has(id)) {
      continue;
    }
    seen.add(id);
    results.push({ id, title });
  }

  return results;
}

// 解析某部剧的季/集索引页
export function parseEpisodeIndex(html: string, showId: string): EpisodeList {
  const result: EpisodeList = {};
  const escapedShow = showId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lineRegex = new RegExp(
    `<a[^>]*href="[^"]*view_episode_scripts\\.php\\?tv-show=${escapedShow}&(?:amp;)?episode=s(\\d+)e(\\d+)"[^>]*>([^<]*)</a>`,
    'gi'
  );

  let match;
  while ((match = lineRegex.exec(html)) !== null) {
    const season = parseInt(match[1], 10);
    const episode = parseInt(match[2], 10);
    let title = decodeEntities(match[3]).trim();

    title = title.replace(/^\s*[\d.]+\s*/, '').trim();
    if (!title) {
      title = `S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
    }

    if (!result[season]) {
      result[season] = [];
    }

    result[season].push({
      season,
      episode,
      title,
      id: `s${String(season).padStart(2, '0')}e${String(episode).padStart(2, '0')}`,
    });
  }

  return result;
}

// 解析单集剧本页
export function parseTranscript(html: string): string[] {
  const containerMatch = html.match(/<div\s+class="scrolling-script-container"[^>]*>([\s\S]*?)<\/div>/i);
  if (!containerMatch) {
    return [];
  }

  let content = containerMatch[1];
  content = content.replace(/<br\s*\/?>/gi, '\n');
  content = content.replace(/<[^>]+>/g, '');
  content = decodeEntities(content);

  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
